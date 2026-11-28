import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Guards against the failure mode this repo actually has: the schema lives in
 * Supabase and the code lives here, with nothing checking that they agree.
 *
 * These tests read the real source files. Adding a table, a filter column or a
 * policy in code without shipping the matching migration fails the suite.
 */

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SERVER_DIR = join(ROOT, "server");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

function readMigrations() {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => ({ file: f, sql: readFileSync(join(MIGRATIONS_DIR, f), "utf8") }));
}

function serverSources() {
  return readdirSync(SERVER_DIR)
    .filter((f) => f.endsWith(".mjs") && !f.endsWith(".test.mjs"))
    .map((f) => ({ file: f, src: readFileSync(join(SERVER_DIR, f), "utf8") }));
}

/**
 * Only the modules reachable from an entrypoint are checked.
 *
 * server/ carries a second, parallel implementation of most stores under
 * *-cloudflare.mjs. Reachability is computed per entrypoint, not asserted by
 * hand, so a fork module pulled into a live path is checked from that commit
 * onward. Both roots are checked: handler.mjs is what `npm start` and Vercel
 * run, handler-cloudflare.mjs is what Cloudflare Pages actually deploys (see
 * AGENTS.md, "Production is the Cloudflare fork"). Checking only the first is
 * how five undeclared tables in the deployed tree stayed green.
 */
function sourcesReachableFrom(root) {
  const seen = new Set();
  const queue = [root];
  const sources = serverSources();
  const byName = new Map(sources.map((s) => [s.file, s]));

  while (queue.length) {
    const file = queue.shift();
    if (seen.has(file)) continue;
    seen.add(file);
    const entry = byName.get(file);
    if (!entry) continue;
    for (const m of entry.src.matchAll(/from "\.\/([\w.-]+\.mjs)"/g)) {
      if (!m[1].endsWith(".test.mjs")) queue.push(m[1]);
    }
  }
  return sources.filter((s) => seen.has(s.file));
}

const VERCEL_SOURCES = sourcesReachableFrom("handler.mjs");
const FORK_SOURCES = sourcesReachableFrom("handler-cloudflare.mjs");
const ROOTS = [
  ["handler.mjs", VERCEL_SOURCES],
  ["handler-cloudflare.mjs", FORK_SOURCES],
];

/** @returns {Map<string, string[]>} table -> column names */
function parseTables(migrations) {
  const tables = new Map();
  for (const { sql } of migrations) {
    for (const match of sql.matchAll(/create table if not exists public\.(\w+)\s*\(([\s\S]*?)\n\);/g)) {
      const [, table, body] = match;
      const columns = body
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith("--") && !/^(create |alter |constraint|primary key|unique\(|foreign key)/i.test(line))
        .map((line) => line.split(/\s+/)[0].replace(/,/g, ""))
        .filter((token) => /^[a-z_][a-z0-9_]*$/.test(token));
      const existing = tables.get(table) ?? [];
      tables.set(table, [...new Set([...existing, ...columns])]);
    }
    for (const match of sql.matchAll(/alter table (?:if exists )?public\.(\w+)\s+add column (?:if not exists )?(\w+)\s+/gi)) {
      const [, table, column] = match;
      if (!tables.has(table)) continue;
      const existing = tables.get(table);
      tables.set(table, [...new Set([...existing, column])]);
    }
  }
  return tables;
}

const MIGRATIONS = readMigrations();
const TABLES = parseTables(MIGRATIONS);

/**
 * Tables the deployed fork names that no migration declares. This must stay
 * empty: adding a name files a bug rather than fixing one, and a name that
 * gains a migration fails the stale-list test until it is dropped. It was empty
 * for the first time when ops-tasks-cloudflare.mjs was removed — before that it
 * carried ops_tasks, ops_audit_log and profiles.
 */
const FORK_PENDING_TABLES = [];

test("both entrypoints are walked, and they are not the same tree", () => {
  const vercel = VERCEL_SOURCES.map((s) => s.file);
  const fork = FORK_SOURCES.map((s) => s.file);
  assert.ok(vercel.includes("handler.mjs"), "handler.mjs is the local/Vercel entrypoint");
  assert.ok(vercel.includes("enquiries.mjs"), "the resolver's stores are reachable from the handler");
  assert.ok(vercel.includes("store.mjs"));
  assert.ok(fork.includes("handler-cloudflare.mjs"), "the deployed entrypoint must be checked");
  assert.notDeepEqual(
    [...vercel].sort(),
    [...fork].sort(),
    "the two entrypoints reach the same modules, so one of the walks is not real",
  );
  assert.ok(
    !vercel.includes("handler-cloudflare.mjs"),
    "the forks must stay separate trees; handler.mjs importing the Cloudflare fork would serve the wrong stores",
  );
});

/** Tables the code names directly, plus those held in *_TABLE constants. */
function tablesReferencedInCode(sources) {
  const found = new Map();
  // supabaseRequest("GET", ...) passes the verb first; it is not a table name.
  const METHODS = /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/;
  for (const { file, src } of sources) {
    for (const m of src.matchAll(/(?:sbFetch|supabaseFetch|supabaseRequest|cfSbFetch|sbRest)\(\s*[`"'](\w+)/g)) {
      if (!METHODS.test(m[1])) found.set(m[1], file);
    }
    for (const m of src.matchAll(/(?:from|table)\(\s*["'`](\w+)["'`]/g)) {
      found.set(m[1], file);
    }
    for (const m of src.matchAll(/\w*_TABLE\s*=\s*["'`](\w+)["'`]/g)) {
      found.set(m[1], file);
    }
    // Hand-built PostgREST URLs: fetch(`${REST_BASE}/<table>?…`). The helpers
    // above are not used on this path, so a table reached only this way stayed
    // invisible here — which is how the three whatsapp_* tables shipped with
    // no migration. Only literal names match: `${REST_BASE}/${table}` with a
    // variable does not, and `${AUTH_BASE}/…` paths are not tables.
    for (const m of src.matchAll(/\$\{\w*REST_BASE\}\/([a-z_][a-z0-9_]*)/g)) {
      found.set(m[1], file);
    }
  }
  return found;
}

test("the parser sees the schema at all", () => {
  assert.ok(TABLES.size >= 10, `expected the migrations to define the core tables, saw ${TABLES.size}`);
  for (const table of ["leads", "clients", "tickets", "quiz_audits", "health_probe"]) {
    assert.ok(TABLES.has(table), `migration parser missed ${table}`);
    assert.ok(TABLES.get(table).includes("id"), `${table} should have an id column`);
  }
});

test("additive company columns are parsed from append-only migrations", () => {
  assert.ok(
    TABLES.get("companies")?.includes("is_staff"),
    "the catalog staff flag must be declared by an additive companies migration",
  );
});

test("additive columns do not make an undeclared table look declared", () => {
  const parsed = parseTables([{
    sql: "alter table public.undeclared_table add column if not exists id text;",
  }]);
  assert.equal(parsed.has("undeclared_table"), false);
});

for (const [root, sources] of ROOTS) {
  test(`every table named by code reachable from ${root} exists in the migrations`, () => {
    const referenced = tablesReferencedInCode(sources);
    assert.ok(referenced.size >= 5, `expected to find table references, found ${referenced.size}`);
    const pending = root === "handler-cloudflare.mjs" ? FORK_PENDING_TABLES : [];
    for (const [table, file] of referenced) {
      assert.ok(
        TABLES.has(table) || pending.includes(table),
        `${file} writes to "${table}" but no migration creates public.${table}`,
      );
    }
  });
}

test("the fork's pending-table list only holds what is still undeclared", () => {
  const declared = FORK_PENDING_TABLES.filter((t) => TABLES.has(t));
  assert.deepEqual(
    declared,
    [],
    `${declared.join(", ")} now has a migration — drop it from FORK_PENDING_TABLES`,
  );
});

test("every filter column used against a table is declared for it", () => {
  const problems = [];
  for (const [, sources] of ROOTS) {
    for (const { file, src } of sources) {
      for (const m of src.matchAll(/[`"'](\w+)\?(\w+)=(?:eq|in|gte|lte|is)\./g)) {
        const [, table, column] = m;
        if (!TABLES.has(table)) continue; // covered by the table test
        if (!TABLES.get(table).includes(column)) {
          problems.push(`${file}: ${table}.${column} is filtered on but not in the migration`);
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("every explicit select list names real columns", () => {
  const problems = [];
  for (const [, sources] of ROOTS) {
    for (const { file, src } of sources) {
      for (const m of src.matchAll(/[`"'](\w+)[?&]select=([\w,]+)(?=[&`"'])/g)) {
        const [, table, list] = m;
        if (!TABLES.has(table)) continue;
        for (const column of list.split(",")) {
          if (column === "*") continue;
          if (!TABLES.get(table).includes(column)) {
            problems.push(`${file}: ${table}.${column} is selected but not in the migration`);
          }
        }
      }
    }
  }
  assert.deepEqual(problems, []);
});

test("RLS is enabled on every table the migrations create", () => {
  const enabled = new Set();
  for (const { sql } of MIGRATIONS) {
    for (const m of sql.matchAll(/alter table (?:if exists )?public\.(\w+) enable row level security/g)) {
      enabled.add(m[1]);
    }
  }
  const missing = [...TABLES.keys()].filter((t) => !enabled.has(t));
  assert.deepEqual(missing, [], "tables created without RLS: an exposed anon key reaches them");
});

/**
 * A `create policy` with no `to` clause applies to role `public`, which anon
 * and authenticated both inherit — so it grants access to anyone holding the
 * public anon key. The comment claiming "service role bypasses" is true and
 * beside the point. This is how audit_log and proposal_versions were exposed
 * in 202610270001 until 202610280001 dropped those policies.
 */
test("no policy is created without an explicit target role", () => {
  const created = [];
  const dropped = new Set();
  for (const { file, sql } of MIGRATIONS) {
    for (const m of sql.matchAll(/create policy "([^"]*)" on public\.(\w+)\s([\s\S]*?);/g)) {
      created.push({ file, name: m[1], table: m[2], body: m[3] });
    }
    for (const m of sql.matchAll(/drop policy if exists "([^"]*)" on public\.(\w+)/g)) {
      dropped.add(`${m[2]}::${m[1]}`);
    }
  }

  const problems = created
    .filter((p) => !dropped.has(`${p.table}::${p.name}`))
    .filter((p) => !/\bto\s+(anon|authenticated|service_role)\b/.test(p.body))
    .map((p) => `${p.file}: policy "${p.name}" on public.${p.table} has no \`to\` clause, so it grants access to role public`);

  assert.deepEqual(problems, []);
});

function nextContinuedStringQuote(sql, start) {
  let index = start;
  let sawNewline = false;
  while (index < sql.length) {
    const char = sql[index];
    if (/\s/.test(char)) {
      if (char === "\n" || char === "\r") sawNewline = true;
      index += 1;
      continue;
    }
    if (sql.startsWith("--", index)) {
      while (index < sql.length && sql[index] !== "\n") index += 1;
      continue;
    }
    if (sql.startsWith("/*", index)) {
      let depth = 1;
      index += 2;
      while (index < sql.length && depth > 0) {
        if (sql.startsWith("/*", index)) {
          depth += 1;
          index += 2;
        } else if (sql.startsWith("*/", index)) {
          depth -= 1;
          index += 2;
        } else {
          if (sql[index] === "\n" || sql[index] === "\r") sawNewline = true;
          index += 1;
        }
      }
      continue;
    }
    if (!sawNewline) return -1;
    if (char === "'") return index;
    return -1;
  }
  return -1;
}

/**
 * Remove SQL comments without mistaking comment markers inside quoted strings
 * or identifiers for comments. Block comments are nested in PostgreSQL. Keeping
 * line breaks and replacing comment bytes with spaces prevents tokens on either
 * side of a comment from being joined into a different statement.
 */
function stripSqlComments(sql) {
  let output = "";
  let index = 0;
  let quote = null;
  let escapeString = false;
  let continuedEscapeAt = -1;
  let blockDepth = 0;

  while (index < sql.length) {
    const char = sql[index];
    const next = sql[index + 1];

    if (blockDepth > 0) {
      if (sql.startsWith("/*", index)) {
        output += "  ";
        index += 2;
        blockDepth += 1;
      } else if (sql.startsWith("*/", index)) {
        output += "  ";
        index += 2;
        blockDepth -= 1;
      } else {
        output += char === "\n" || char === "\r" ? char : " ";
        index += 1;
      }
      continue;
    }

    if (quote === "'" || quote === '"') {
      output += char;
      if (escapeString && char === "\\" && next !== undefined) {
        output += next;
        index += 2;
        continue;
      }
      if (char === quote) {
        if (next === quote) {
          output += next;
          index += 2;
          continue;
        }
        quote = null;
        continuedEscapeAt = escapeString ? nextContinuedStringQuote(sql, index + 1) : -1;
        escapeString = false;
      }
      index += 1;
      continue;
    }

    if (quote) {
      if (sql.startsWith(quote, index)) {
        output += quote;
        index += quote.length;
        quote = null;
      } else {
        output += char;
        index += 1;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      while (index < sql.length && sql[index] !== "\n") {
        output += " ";
        index += 1;
      }
      continue;
    }

    if (char === "/" && next === "*") {
      output += "  ";
      index += 2;
      blockDepth = 1;
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      escapeString = char === "'"
        && (index === continuedEscapeAt || (
          index > 0
          && /[eE]/.test(sql[index - 1])
          && (index < 2 || !/[a-z0-9_$]/i.test(sql[index - 2]))
        ));
      continuedEscapeAt = -1;
      output += char;
      index += 1;
      continue;
    }

    if (char === "$") {
      const marker = sql.slice(index).match(/^\$(?:[a-z_][a-z0-9_]*)?\$/i)?.[0];
      if (marker) {
        quote = marker;
        output += marker;
        index += marker.length;
        continue;
      }
    }

    output += char;
    index += 1;
  }

  return output;
}

const CLIENT_UPDATE_LOCKDOWN_FILE = "202611280001_lock_down_client_updates.sql";
const LOCKDOWN_CLIENT_UPDATES = `
revoke update on public.clients from authenticated;
drop policy if exists "Clients can update own data" on public.clients;
`;
function sqlTokenText(tokens) {
  return tokens.map((token) => {
    if (token.type === "identifier") return `"${token.value.replace(/"/g, '""')}"`;
    if (token.type === "string") return "'…'";
    if (token.type === "dollar") return `${token.marker}…${token.marker}`;
    return token.value;
  }).join(" ");
}

function readSqlQuoted(sql, start, quote, escapedOverride) {
  let value = "";
  let index = start + 1;
  const inferredEscape = quote === "'"
    && start > 0
    && /[eE]/.test(sql[start - 1])
    && (start < 2 || !/[a-z0-9_$]/i.test(sql[start - 2]));
  const escaped = quote === "'" && (escapedOverride ?? inferredEscape);

  while (index < sql.length) {
    const char = sql[index];
    if (escaped && char === "\\" && index + 1 < sql.length) {
      value += char + sql[index + 1];
      index += 2;
      continue;
    }
    if (char === quote) {
      if (sql[index + 1] === quote) {
        value += quote;
        index += 2;
        continue;
      }
      return { value, end: index + 1, escaped, closed: true };
    }
    value += char;
    index += 1;
  }
  return { value, end: index, escaped, closed: false };
}

/** Decode PostgreSQL E-string escapes before tokenizing a DO body as SQL. */
function decodeSqlEscapeString(value) {
  const encoder = new TextEncoder();
  const bytes = [];
  let index = 0;
  while (index < value.length) {
    const codePoint = value.codePointAt(index);
    const char = String.fromCodePoint(codePoint);
    if (char !== "\\" || index + char.length >= value.length) {
      bytes.push(...encoder.encode(char));
      index += char.length;
      continue;
    }

    const next = value[index + 1];
    const simple = { b: 8, f: 12, n: 10, r: 13, t: 9, v: 11 };
    if (Object.hasOwn(simple, next)) {
      bytes.push(simple[next]);
      index += 2;
      continue;
    }

    const escaped = value.slice(index + 1).match(/^([0-7]{1,3}|[xX][0-9a-fA-F]{1,2}|u[0-9a-fA-F]{4}|U[0-9a-fA-F]{8})/);
    if (escaped) {
      const digits = escaped[1];
      if (/^[0-7]/.test(digits)) {
        bytes.push(Number.parseInt(digits, 8));
      } else if (digits[0] === "x" || digits[0] === "X") {
        bytes.push(Number.parseInt(digits.slice(1), 16));
      } else {
        const unicode = Number.parseInt(digits.slice(1), 16);
        if (unicode >= 0xd800 && unicode <= 0xdbff) {
          const lowStart = index + 6;
          const low = value.slice(lowStart).match(/^\\u([0-9a-fA-F]{4})/);
          const lowSurrogate = low ? Number.parseInt(low[1], 16) : -1;
          if (lowSurrogate < 0xdc00 || lowSurrogate > 0xdfff) return null;
          const combined = 0x10000 + ((unicode - 0xd800) << 10) + (lowSurrogate - 0xdc00);
          bytes.push(...encoder.encode(String.fromCodePoint(combined)));
          index = lowStart + low[0].length;
          continue;
        }
        if (unicode === 0 || unicode > 0x10ffff || (unicode >= 0xdc00 && unicode <= 0xdfff)) return null;
        bytes.push(...encoder.encode(String.fromCodePoint(unicode)));
      }
      index += digits.length + 1;
      continue;
    }

    const escapedCodePoint = value.codePointAt(index + 1);
    bytes.push(...encoder.encode(String.fromCodePoint(escapedCodePoint)));
    index += 1 + String.fromCodePoint(escapedCodePoint).length;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bytes));
  } catch {
    return null;
  }
}

function readSqlUnicodeIdentifier(sql, start) {
  let value = "";
  let index = start + 3; // U&"
  while (index < sql.length) {
    const char = sql[index];
    if (char === '"') {
      if (sql[index + 1] === '"') {
        value += '"';
        index += 2;
        continue;
      }
      return { value, end: index + 1, closed: true };
    }
    value += char;
    index += 1;
  }
  return { value, end: index, closed: false };
}

function decodeSqlUnicodeIdentifier(value, escape = "\\") {
  let output = "";
  let index = 0;
  while (index < value.length) {
    const char = String.fromCodePoint(value.codePointAt(index));
    if (char !== escape) {
      output += char;
      index += char.length;
      continue;
    }

    const escapeEnd = index + char.length;
    const escaped = value.slice(escapeEnd).match(/^(\+[0-9a-f]{6}|[0-9a-f]{4})/i);
    if (escaped) {
      const codePoint = Number.parseInt(escaped[1].replace(/^\+/, ""), 16);
      if (codePoint <= 0x10ffff) output += String.fromCodePoint(codePoint);
      index = escapeEnd + escaped[0].length;
      continue;
    }
    if (value.startsWith(escape, escapeEnd)) {
      output += escape;
      index = escapeEnd + escape.length;
      continue;
    }

    // Preserve malformed escapes rather than guessing a different identifier.
    output += escape;
    index = escapeEnd;
  }
  return output;
}

function skipSqlWhitespace(sql, index) {
  while (index < sql.length && /\s/.test(sql[index])) index += 1;
  return index;
}

function readSqlUnicodeEscapeClause(sql, start) {
  let index = skipSqlWhitespace(sql, start);
  if (!/^UESCAPE\b/i.test(sql.slice(index))) return null;
  index = skipSqlWhitespace(sql, index + "UESCAPE".length);

  let quoteIndex = index;
  if ((sql[quoteIndex] === "e" || sql[quoteIndex] === "E") && sql[quoteIndex + 1] === "'") quoteIndex += 1;
  if (sql[quoteIndex] !== "'") return null;

  let value = "";
  let escaped = false;
  let end = quoteIndex;
  while (true) {
    const quoted = readSqlQuoted(sql, end, "'", end === quoteIndex ? undefined : escaped);
    if (!quoted.closed) return null;
    if (end === quoteIndex) escaped = quoted.escaped;
    value += quoted.value;
    end = quoted.end;

    const next = skipSqlWhitespace(sql, end);
    if (sql[next] !== "'" || !/[\r\n]/.test(sql.slice(end, next))) break;
    end = next;
  }

  const decoded = escaped ? decodeSqlEscapeString(value) : value;
  if (decoded === null || [...decoded].length !== 1) return null;
  return { value: decoded, end };
}

/** Tokenize SQL without letting quoted semicolons become statement boundaries. */
function tokenizeSql(sql) {
  const tokens = [];
  let index = 0;

  while (index < sql.length) {
    const char = sql[index];
    if (/\s/.test(char)) {
      index += 1;
      continue;
    }
    if ((char === "u" || char === "U") && sql[index + 1] === "&" && sql[index + 2] === '"') {
      const quoted = readSqlUnicodeIdentifier(sql, index);
      const uescape = readSqlUnicodeEscapeClause(sql, quoted.end);
      tokens.push({
        type: "identifier",
        value: decodeSqlUnicodeIdentifier(quoted.value, uescape?.value),
      });
      index = uescape?.end ?? quoted.end;
      continue;
    }
    if ((char === "e" || char === "E") && sql[index + 1] === "'") {
      const quoted = readSqlQuoted(sql, index + 1, "'");
      tokens.push({ type: "string", value: quoted.value, escaped: true, closed: quoted.closed, start: index, end: quoted.end });
      index = quoted.end;
      continue;
    }
    if (char === "'" || char === '"') {
      const previous = tokens.at(-1);
      const continuedEscape = char === "'"
        && previous?.type === "string"
        && previous.closed !== false
        && previous.escaped === true
        && /[\r\n]/.test(sql.slice(previous.end, index));
      const quoted = readSqlQuoted(sql, index, char, continuedEscape);
      tokens.push({ type: char === '"' ? "identifier" : "string", value: quoted.value, escaped: quoted.escaped, closed: quoted.closed, start: index, end: quoted.end });
      index = quoted.end;
      continue;
    }
    if (char === "$") {
      const marker = sql.slice(index).match(/^\$(?:[a-z_][a-z0-9_]*)?\$/i)?.[0];
      if (marker) {
        const bodyStart = index + marker.length;
        const bodyEnd = sql.indexOf(marker, bodyStart);
        if (bodyEnd >= 0) {
          tokens.push({ type: "dollar", marker, body: sql.slice(bodyStart, bodyEnd) });
          index = bodyEnd + marker.length;
          continue;
        }
      }
    }
    if (/[a-z_]/i.test(char)) {
      const start = index;
      index += 1;
      while (index < sql.length && /[a-z0-9_$]/i.test(sql[index])) index += 1;
      tokens.push({ type: "word", value: sql.slice(start, index).toLowerCase() });
      continue;
    }
    if (/[0-9]/.test(char)) {
      const start = index;
      index += 1;
      while (index < sql.length && /[0-9]/.test(sql[index])) index += 1;
      tokens.push({ type: "number", value: sql.slice(start, index) });
      continue;
    }
    tokens.push({ type: "symbol", value: char });
    index += 1;
  }
  return tokens;
}

/**
 * Return the code body only for the DO forms this guard understands. PostgreSQL
 * concatenates adjacent string constants separated by a newline (comments are
 * whitespace here), so continued ordinary/E strings must be scanned as one body.
 * Anything else is rejected by the caller instead of being silently skipped.
 */
function readSqlDoBody(statement, source) {
  let bodyIndex = 1;
  if (isSqlWord(statement[bodyIndex], "language")) {
    const language = statement[bodyIndex + 1];
    if (language?.type !== "string" && sqlIdentifier(language) === null) return null;
    if (language?.type === "string" && language.closed === false) return null;
    bodyIndex += 2;
  }

  const first = statement[bodyIndex];
  if (!first) return null;
  if (first.type === "dollar") {
    return bodyIndex === statement.length - 1 ? first.body : null;
  }
  if (first.type !== "string" || first.closed === false) return null;

  let body = first.value;
  let end = bodyIndex + 1;
  while (end < statement.length) {
    const next = statement[end];
    if (next.type !== "string" || next.closed === false || source[next.start] !== "'") return null;
    const separator = source.slice(statement[end - 1].end, next.start);
    if (!/[\r\n]/.test(separator)) return null;
    body += next.value;
    end += 1;
  }
  return first.escaped ? decodeSqlEscapeString(body) : body;
}

/**
 * Split real SQL statements, then recursively scan recognized DO bodies as
 * PL/pgSQL. Unsupported DO body forms become explicit problem tokens so callers
 * can fail closed rather than treating unparsed code as harmless.
 */
function sqlStatements(sql) {
  const source = stripSqlComments(sql);
  const statements = [];
  let current = [];
  for (const token of tokenizeSql(source)) {
    if (token.type === "symbol" && token.value === ";") {
      if (current.length) statements.push(current);
      current = [];
    } else {
      current.push(token);
    }
  }
  if (current.length) statements.push(current);

  const expanded = [];
  for (const statement of statements) {
    expanded.push(statement);
    if (statement.some((token, index) => index > 0 && isSqlWord(token, "do"))) {
      expanded.push([{ type: "unsupported-do", value: `nested DO: ${sqlTokenText(statement)}` }]);
      continue;
    }
    if (!isSqlWord(statement[0], "do")) continue;
    const body = readSqlDoBody(statement, source);
    if (body === null) {
      expanded.push([{ type: "unsupported-do", value: sqlTokenText(statement) }]);
      continue;
    }
    expanded.push(...sqlStatements(body));
  }
  return expanded;
}

function isSqlWord(token, word) {
  return token?.type === "word" && token.value === word;
}

function sqlIdentifier(token) {
  if (token?.type === "identifier") return token.value;
  if (token?.type === "word") return token.value;
  return null;
}

function findSqlSequence(tokens, sequence, start = 0) {
  for (let index = start; index <= tokens.length - sequence.length; index += 1) {
    if (sequence.every((word, offset) => isSqlWord(tokens[index + offset], word))) return index;
  }
  return -1;
}

function parseSqlName(tokens, index) {
  const first = sqlIdentifier(tokens[index]);
  if (first === null) return null;
  const parts = [first];
  let end = index + 1;
  if (tokens[end]?.value === ".") {
    const second = sqlIdentifier(tokens[end + 1]);
    if (second === null) return null;
    parts.push(second);
    end += 2;
  }
  return { parts, end };
}

/** Unqualified clients is conservatively public.clients for this guard. */
function isPublicClients(name) {
  if (!name) return false;
  if (name.parts.length === 1) return name.parts[0] === "clients";
  return name.parts.length === 2 && name.parts[0] === "public" && name.parts[1] === "clients";
}

function parseSqlRoleList(tokens, start = 0) {
  const roles = [];
  let index = start;
  while (index < tokens.length) {
    if (isSqlWord(tokens[index], "group")) index += 1;
    const role = sqlIdentifier(tokens[index]);
    if (role === null) break;
    roles.push(role);
    index += 1;
    if (tokens[index]?.value !== ",") break;
    index += 1;
  }
  return { roles, end: index };
}

/**
 * Grantees precede WITH. PostgreSQL 16 permits ADMIN/INHERIT/SET followed by
 * OPTION/TRUE/FALSE, so none of those option tokens may hide a role before them.
 */
function sqlGrantees(tokens, toIndex) {
  let end = tokens.length;
  for (let index = toIndex + 1; index < tokens.length; index += 1) {
    if (isSqlWord(tokens[index], "with")
      || (isSqlWord(tokens[index], "granted") && isSqlWord(tokens[index + 1], "by"))) {
      end = index;
      break;
    }
  }
  return parseSqlRoleList(tokens.slice(toIndex + 1, end)).roles;
}

function rolesIncludeAuthenticatedOrPublic(roles) {
  return roles.includes("authenticated") || roles.includes("public");
}

function grantsUpdateOrAll(tokens) {
  return tokens.some((token) => isSqlWord(token, "update") || isSqlWord(token, "all"));
}

function grantObjectTargetsClients(tokens) {
  let index = isSqlWord(tokens[0], "table") ? 1 : 0;
  if (["all", "tables", "in", "schema"].every((word, offset) => isSqlWord(tokens[index + offset], word))) {
    index += 4;
    while (index < tokens.length) {
      const schema = sqlIdentifier(tokens[index]);
      if (schema === null) return false;
      if (schema === "public") return true;
      index += 1;
      if (tokens[index]?.value !== ",") return false;
      index += 1;
    }
    return false;
  }

  while (index < tokens.length) {
    const name = parseSqlName(tokens, index);
    if (!name) return false;
    if (isPublicClients(name) && (name.end === tokens.length || tokens[name.end].value === ",")) return true;
    index = name.end;
    if (tokens[index]?.value !== ",") return false;
    index += 1;
  }
  return false;
}

function sqlGrantClauses(tokens) {
  const clauses = [];
  for (let index = 0; index < tokens.length; index += 1) {
    if (!isSqlWord(tokens[index], "grant")) continue;
    const toIndex = findSqlSequence(tokens, ["to"], index + 1);
    if (toIndex < 0) continue;
    const onIndex = findSqlSequence(tokens, ["on"], index + 1);
    if (onIndex >= 0 && onIndex < toIndex) {
      clauses.push({
        kind: "privilege",
        privileges: tokens.slice(index + 1, onIndex),
        objects: tokens.slice(onIndex + 1, toIndex),
        grantees: sqlGrantees(tokens, toIndex),
      });
      continue;
    }
    const roles = parseSqlRoleList(tokens, index + 1).roles;
    if (roles.length) clauses.push({ kind: "membership", roles, grantees: sqlGrantees(tokens, toIndex) });
  }
  return clauses;
}

function policyHeader(tokens) {
  let depth = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.value === "(") depth += 1;
    else if (token.value === ")") depth = Math.max(0, depth - 1);
    else if (depth === 0 && (isSqlWord(token, "using")
      || (isSqlWord(token, "with") && isSqlWord(tokens[index + 1], "check")))) {
      return tokens.slice(0, index);
    }
  }
  return tokens;
}

function createPolicyReopensClients(tokens) {
  const create = findSqlSequence(tokens, ["create", "policy"]);
  if (create < 0) return null;
  let index = create + 2;
  if (isSqlWord(tokens[index], "if") && isSqlWord(tokens[index + 1], "not") && isSqlWord(tokens[index + 2], "exists")) index += 3;
  const name = sqlIdentifier(tokens[index]);
  if (name === null || !isSqlWord(tokens[index + 1], "on")) return null;
  index += 2;
  if (isSqlWord(tokens[index], "table")) index += 1;
  const table = parseSqlName(tokens, index);
  if (!isPublicClients(table)) return null;

  const header = policyHeader(tokens.slice(table.end));
  const forIndex = findSqlSequence(header, ["for"]);
  const commandToken = header[forIndex + 1];
  const command = forIndex >= 0 && ["all", "select", "insert", "update", "delete"].includes(commandToken?.value)
    ? commandToken.value
    : "all";
  if (command !== "all" && command !== "update") return null;
  const toIndex = findSqlSequence(header, ["to"]);
  if (toIndex >= 0 && !rolesIncludeAuthenticatedOrPublic(sqlGrantees(header, toIndex))) return null;
  return name;
}

function alterPolicyTargetsClients(tokens) {
  const alter = findSqlSequence(tokens, ["alter", "policy"]);
  if (alter < 0) return false;
  let index = alter + 2;
  if (isSqlWord(tokens[index], "if") && isSqlWord(tokens[index + 1], "exists")) index += 2;
  if (sqlIdentifier(tokens[index]) === null || !isSqlWord(tokens[index + 1], "on")) return false;
  index += 2;
  if (isSqlWord(tokens[index], "table")) index += 1;
  return isPublicClients(parseSqlName(tokens, index));
}

function alterClientTableActions(tokens) {
  const alter = findSqlSequence(tokens, ["alter", "table"]);
  if (alter < 0) return null;
  let index = alter + 2;
  if (isSqlWord(tokens[index], "if") && isSqlWord(tokens[index + 1], "exists")) index += 2;
  if (isSqlWord(tokens[index], "only")) index += 1;
  const table = parseSqlName(tokens, index);
  if (!isPublicClients(table)) return null;
  const actions = tokens.slice(table.end);
  return {
    ownership: findSqlSequence(actions, ["owner", "to"]) >= 0,
    weakensRls: findSqlSequence(actions, ["disable", "row", "level", "security"]) >= 0
      || findSqlSequence(actions, ["no", "force", "row", "level", "security"]) >= 0,
  };
}

function revokesClientUpdateFromAuthenticated(tokens) {
  const revoke = findSqlSequence(tokens, ["revoke"]);
  if (revoke < 0 || !isSqlWord(tokens[revoke + 1], "update")) return false;
  const onIndex = findSqlSequence(tokens, ["on"], revoke + 2);
  const fromIndex = findSqlSequence(tokens, ["from"], onIndex + 1);
  if (onIndex < 0 || fromIndex < 0) return false;
  return grantObjectTargetsClients(tokens.slice(onIndex + 1, fromIndex))
    && parseSqlRoleList(tokens, fromIndex + 1).roles.includes("authenticated");
}

function dropsLegacyClientUpdatePolicy(tokens) {
  const drop = findSqlSequence(tokens, ["drop", "policy"]);
  if (drop < 0) return false;
  let index = drop + 2;
  if (isSqlWord(tokens[index], "if") && isSqlWord(tokens[index + 1], "exists")) index += 2;
  if (tokens[index]?.type !== "identifier" || tokens[index].value !== "Clients can update own data") return false;
  if (!isSqlWord(tokens[index + 1], "on")) return false;
  index += 2;
  if (isSqlWord(tokens[index], "table")) index += 1;
  return isPublicClients(parseSqlName(tokens, index));
}

/**
 * Guard the append-only client-update lockdown without modelling PostgreSQL's
 * ACL state. Once the lockdown migration has run, any later statement that can
 * grant client updates or alter a client policy is rejected, even if a later
 * statement in the same migration would revoke or drop it again.
 */
function clientUpdateAccessProblems(migrations) {
  const lockdownIndex = migrations.findIndex(({ file }) => file === CLIENT_UPDATE_LOCKDOWN_FILE);
  if (lockdownIndex < 0) {
    return [`missing append-only client update lockdown migration ${CLIENT_UPDATE_LOCKDOWN_FILE}`];
  }

  const lockdownStatements = sqlStatements(migrations[lockdownIndex].sql);
  const problems = [];
  for (const tokens of lockdownStatements) {
    if (tokens[0]?.type === "unsupported-do") {
      problems.push(`${CLIENT_UPDATE_LOCKDOWN_FILE}: unsupported DO body form: ${tokens[0].value}`);
    }
  }
  if (!lockdownStatements.some(revokesClientUpdateFromAuthenticated)) {
    problems.push(`${CLIENT_UPDATE_LOCKDOWN_FILE}: must revoke UPDATE on public.clients from authenticated`);
  }
  if (!lockdownStatements.some(dropsLegacyClientUpdatePolicy)) {
    problems.push(`${CLIENT_UPDATE_LOCKDOWN_FILE}: must drop policy "Clients can update own data" on public.clients`);
  }

  for (const { file, sql } of migrations.slice(lockdownIndex + 1)) {
    for (const tokens of sqlStatements(sql)) {
      if (tokens[0]?.type === "unsupported-do") {
        problems.push(`${file}: unsupported DO body form after the update lockdown: ${tokens[0].value}`);
        continue;
      }
      const tableActions = alterClientTableActions(tokens);
      if (tableActions?.ownership) {
        problems.push(`${file}: ALTER TABLE public.clients ownership change is forbidden after the update lockdown`);
      }
      if (tableActions?.weakensRls) {
        problems.push(`${file}: ALTER TABLE public.clients weakens RLS or FORCE ROW LEVEL SECURITY after the update lockdown`);
      }

      const defaultPrivileges = findSqlSequence(tokens, ["alter", "default", "privileges"]) >= 0;
      for (const clause of sqlGrantClauses(tokens)) {
        if (!rolesIncludeAuthenticatedOrPublic(clause.grantees)) continue;
        if (clause.kind === "membership") {
          problems.push(`${file}: GRANT ${sqlTokenText(clause.roles.map((role) => ({ type: "word", value: role })))} TO authenticated/PUBLIC reopens client updates through role membership`);
          continue;
        }
        if (!grantsUpdateOrAll(clause.privileges)) continue;
        if (defaultPrivileges) {
          problems.push(`${file}: ALTER DEFAULT PRIVILEGES ${sqlTokenText(clause.privileges)} ON ${sqlTokenText(clause.objects)} reopens authenticated/PUBLIC client updates`);
        } else if (grantObjectTargetsClients(clause.objects)) {
          problems.push(`${file}: GRANT ${sqlTokenText(clause.privileges)} ON ${sqlTokenText(clause.objects)} reopens authenticated/PUBLIC client updates`);
        }
      }

      const policyName = createPolicyReopensClients(tokens);
      if (policyName !== null) {
        problems.push(`${file}: CREATE POLICY ${sqlTokenText([{ type: "word", value: policyName }])} reopens authenticated/PUBLIC client updates`);
      }
      if (alterPolicyTargetsClients(tokens)) {
        problems.push(`${file}: ALTER POLICY on public.clients is forbidden after the update lockdown`);
      }
    }
  }

  return problems;
}

function problemsAfterLockdown(sql) {
  return clientUpdateAccessProblems([
    { file: CLIENT_UPDATE_LOCKDOWN_FILE, sql: LOCKDOWN_CLIENT_UPDATES },
    { file: "202611280002_fixture.sql", sql },
  ]);
}

const OPEN_CLIENT_UPDATE_GRANTS = [
  ["table-level UPDATE with grant option", "grant update on public.clients to authenticated with grant option;"],
  ["unqualified clients", "grant update on clients to authenticated;"],
  ["unqualified table clients", "grant update on table clients to authenticated;"],
  ["unqualified quoted clients", 'grant update on "clients" to authenticated;'],
  ["column-level UPDATE", "grant update (role, tier, status, password_hash) on public.clients to authenticated;"],
  ["UPDATE in a privilege list", "grant select, update on public.clients to authenticated;"],
  ["UPDATE granted inside a procedural DO block", "do $$ begin grant update on public.clients to authenticated; end $$;"],
  ["UPDATE granted inside a tagged dollar-quoted DO block", "do $guard$ begin grant update on clients to authenticated; end $guard$;"],
  ["UPDATE granted inside an ordinary string DO body", "do 'begin grant update on clients to authenticated; end';"],
  ["UPDATE granted inside a language-selected string DO body", "do language plpgsql 'begin grant update on public.clients to authenticated; end';"],
  ["UPDATE granted inside an E-string DO body with an escaped keyword", "do e'begin grant up\\x64ate on public.clients to authenticated; end';"],
  ["UPDATE granted inside a newline-continued ordinary string DO body", "do 'begin grant update on public.clients'\n' to authenticated; end';"],
  ["UPDATE granted inside a comment-separated E-string DO continuation", "do e'begin grant up\\x64ate on public.clients'\n  /* continue */\n  ' to authenticated; end';"],
  ["UPDATE granted inside an E-string continuation whose later pieces omit E", "do E'begin grant up'\n'\\x64ate on public.clients to authenticated; end';"],
  ["UPDATE granted inside an E-string continuation with escaped quotes", "do E'begin perform '\n'\\'ignored\\'; grant update on public.clients to authenticated; end';"],
  ["UPDATE granted inside a string-valued LANGUAGE DO body", "do language 'plpgsql' 'begin grant update on public.clients to authenticated; end';"],
  ["UPDATE granted inside an E-string DO body with a vertical-tab separator", "do e'begin grant\\vupdate on public.clients\\vto authenticated; end';"],
  ["UPDATE granted to a Unicode quoted identifier", 'grant update on U&"clients" to authenticated;'],
  ["UPDATE granted to a Unicode-escaped client identifier", "grant update on U&\"cl\\0069ents\" to authenticated;"],
  ["UPDATE granted to a custom-escaped Unicode client identifier", "grant update on U&\"cl!0069ents\" UESCAPE '!' to authenticated;"],
  ["UPDATE granted with a continued UESCAPE literal", "grant update on U&\"clients\" UESCAPE '!'\n'' to authenticated;"],
  ["UPDATE granted to a schema-qualified Unicode client with a continued E-string UESCAPE", "grant update on public.U&\"clients\" UESCAPE e'!'\n'' to authenticated;"],
  ["UPDATE granted with an E-string UESCAPE continued into an ordinary escape piece", "grant update on U&\"cl!0069ents\" UESCAPE E''\n'\\x21' to authenticated;"],
  ["UPDATE granted with a UESCAPE composed from UTF-8 byte escapes", "grant update on U&\"clé0069ents\" UESCAPE e'\\xc3\\xa9' to authenticated;"],
  ["UPDATE granted with a UESCAPE composed from octal UTF-8 bytes", "grant update on U&\"clé0069ents\" UESCAPE e'\\303\\251' to authenticated;"],
  ["UPDATE granted with an astral UESCAPE character", "grant update on U&\"cl😀0069ents\" UESCAPE e'\\U0001F600'\n'' to authenticated;"],
  ["UPDATE granted with a surrogate-pair UESCAPE character", "grant update on U&\"cl😀0069ents\" UESCAPE e'\\uD83D\\uDE00' to authenticated;"],
  ["a real dollar-body grant after a single-quoted decoy", "do $$ begin perform 'grant select on public.clients to authenticated'; grant update on public.clients to authenticated; end $$;"],
  ["table-level ALL PRIVILEGES", "grant all privileges on table public.clients to authenticated;"],
  ["schema-wide UPDATE", "grant update on all tables in schema public to authenticated;"],
  ["schema-wide ALL PRIVILEGES", "grant all privileges on all tables in schema public to authenticated;"],
  ["UPDATE in a role list with grant option", "grant update on public.clients to anon, authenticated with grant option;"],
  ["ALL in a role list with grant option", "grant all on public.clients to authenticated, service_role with grant option;"],
  ["UPDATE granted to PUBLIC", "grant update on public.clients to public;"],
  ["quoted authenticated with spaced qualification", 'grant update (role) on table public . clients to "authenticated";'],
  ["quoted table identifiers", 'grant update on "public"."clients" to authenticated;'],
  ["a quoted schema-wide grant", 'grant update on all tables in schema "public" to authenticated;'],
  ["clients first in a table list", "grant update on public.clients, public.leads to authenticated;"],
  ["clients in the middle of a table list", "grant update on public.leads, public.clients, public.tickets to authenticated;"],
  ["clients last in a table list", "grant update on public.leads, public.tickets, public.clients to authenticated;"],
  ["column-level UPDATE across a table list", "grant update (role, tier) on public.leads, public.clients, public.tickets to authenticated;"],
  ["UPDATE with public in a schema list", "grant update on all tables in schema audit, public, private to authenticated;"],
  ["a decoy grantor in the role list", 'grant update on public.clients to "granted by decoy", authenticated;'],
  ["a semicolon in a quoted grantee before authenticated", 'grant update on public.clients to "x;y", authenticated;'],
  ["a semicolon in a quoted grantee before PUBLIC", 'grant update on public.clients to "x;y", public;'],
  ["a semicolon in a quoted grantee after authenticated", 'grant update on public.clients to authenticated, "x;y";'],
];

for (const [name, grant] of OPEN_CLIENT_UPDATE_GRANTS) {
  test(`client update guard rejects ${name} after lockdown`, () => {
    const problems = problemsAfterLockdown(grant);
    assert.ok(problems.some((problem) => /GRANT/.test(problem)), `${name} was not detected: ${problems.join("; ")}`);
  });
}

const OPEN_CLIENT_UPDATE_POLICIES = [
  ["a renamed UPDATE policy", 'create policy "Renamed client update" on public.clients for update to authenticated using (true);'],
  ["an unquoted UPDATE policy name", "create policy renamed_client_update on public.clients for update to authenticated using (true);"],
  ["an UPDATE policy on unqualified clients", "create policy unqualified_update on clients for update to authenticated using (true);"],
  ["an UPDATE policy on unqualified quoted clients", 'create policy "Quoted unqualified update" on "clients" for update to authenticated using (true);'],
  ["a FOR ALL policy", 'create policy "All client commands" on public.clients for all to authenticated using (true);'],
  ["an implicit FOR ALL policy", 'create policy "Implicit all commands" on public.clients to authenticated using (true);'],
  ["an UPDATE policy with a role list", 'create policy "Shared client update" on public.clients for update to anon, authenticated using (true);'],
  ["an UPDATE policy with the default PUBLIC target", 'create policy "Public client update" on public.clients for update using (true);'],
  ["an UPDATE policy explicitly targeting PUBLIC", 'create policy "Public client update" on public.clients for update to public using (true);'],
  ["an UPDATE policy on quoted table identifiers", 'create policy "Quoted client update" on "public"."clients" for update to authenticated using (true);'],
  ["quoted keyword-like roles around authenticated", 'create policy "Keyword client roles" on public.clients for update to "using", authenticated, "with check" using (true);'],
  ["a quoted WITH CHECK role before authenticated", 'create policy "Keyword client roles" on public.clients for update to "with check", authenticated, "using" with check (true);'],
  ["a quoted CREATE POLICY name containing a semicolon", 'create policy "Client; update" on public.clients for update to authenticated using (true);'],
  ["a semicolon in a quoted policy role before authenticated", 'create policy "Client policy" on public.clients for update to "x;y", authenticated using (true);'],
  ["a semicolon in a quoted policy role before PUBLIC", 'create policy "Client policy" on public.clients for update to "x;y", public using (true);'],
  ["an UPDATE policy inside a tagged dollar-quoted DO body", 'do $guard$ begin create policy "Procedural update" on clients for update to authenticated using (true); end $guard$;'],
  ["an UPDATE policy inside a language-selected string DO body", "do language plpgsql 'begin create policy p on clients for update to public using (true); end';"],
  ["an UPDATE policy inside a newline-continued ordinary string DO body", "do 'begin create policy p'\n' on public.clients for update to authenticated using (true); end';"],
  ["an UPDATE policy inside a comment-separated E-string DO continuation", "do e'begin create pol\\x69cy p'\n  /* continue */\n  ' on public.clients for update to public using (true); end';"],
  ["an UPDATE policy inside a string-valued LANGUAGE DO body", "do language 'plpgsql' 'begin create policy p on clients for update to public using (true); end';"],
  ["an UPDATE policy inside an E-string DO body with a vertical-tab separator", "do e'begin create\\vpolicy p on public.clients for update to authenticated using (true); end';"],
  ["an UPDATE policy on a Unicode quoted client identifier", 'create policy unicode_update on U&"clients" for update to authenticated using (true);'],
  ["an UPDATE policy on a Unicode-escaped client identifier", "create policy unicode_escaped_update on U&\"cl\\0069ents\" for update to public using (true);"],
  ["an UPDATE policy on a custom-escaped Unicode client identifier", "create policy unicode_custom_update on U&\"cl!0069ents\" UESCAPE '!' for update to authenticated using (true);"],
  ["an UPDATE policy with a continued UESCAPE literal", "create policy continued_uescape on public.U&\"clients\" UESCAPE '!'\n'' for update to authenticated using (true);"],
  ["an UPDATE policy with a comment-separated continued E-string UESCAPE", "create policy continued_escape_string on U&\"clients\" UESCAPE e'!'\n/* continue */\n'' for update to public using (true);"],
];

for (const [name, policy] of OPEN_CLIENT_UPDATE_POLICIES) {
  test(`client update guard rejects ${name} after lockdown`, () => {
    const problems = problemsAfterLockdown(policy);
    assert.ok(problems.some((problem) => /CREATE POLICY/.test(problem)), `${name} was not detected: ${problems.join("; ")}`);
  });
}

const OPEN_CLIENT_UPDATE_OWNERSHIP_AND_RLS = [
  ["client ownership changed to a new role", "alter table public.clients owner to client_owner;"],
  ["unqualified client ownership changed", "alter table clients owner to client_owner;"],
  ["unqualified quoted client ownership changed", 'alter table "clients" owner to client_owner;'],
  ["client ownership changed with quoted identifiers", 'alter table "public"."clients" owner to "client owner";'],
  ["client ownership changed to a role containing a semicolon", 'alter table public.clients owner to "client;owner";'],
  ["client ownership changed in a combined ALTER TABLE", "alter table public.clients enable row level security, owner to client_owner;"],
  ["client RLS disabled", "alter table public.clients disable row level security;"],
  ["unqualified client RLS disabled", "alter table clients disable row level security;"],
  ["client FORCE ROW LEVEL SECURITY removed", "alter table public.clients no force row level security;"],
  ["client RLS disabled with IF EXISTS", "alter table if exists only public.clients disable row level security;"],
  ["client RLS disabled inside an ordinary string DO body", "do 'begin alter table clients disable row level security; end';"],
  ["client RLS disabled inside a newline-continued ordinary string DO body", "do 'begin alter table'\n' public.clients disable row level security; end';"],
  ["client RLS disabled inside a comment-separated E-string DO continuation", "do e'begin alter table'\n  /* continue */\n  ' public.clients disable row level security; end';"],
  ["client RLS disabled inside a string-valued LANGUAGE DO body", "do language 'plpgsql' 'begin alter table clients disable row level security; end';"],
  ["client RLS disabled inside an E-string DO body with a vertical-tab separator", "do e'begin alter table public.clients\\vdisable row level security; end';"],
  ["client RLS disabled on a Unicode quoted client identifier", 'alter table U&"clients" disable row level security;'],
  ["client RLS disabled on a Unicode-escaped client identifier", "alter table U&\"cl\\0069ents\" disable row level security;"],
  ["client RLS disabled on a custom-escaped Unicode client identifier", "alter table U&\"cl!0069ents\" UESCAPE '!' disable row level security;"],
  ["client RLS disabled with a continued UESCAPE literal", "alter table public.U&\"clients\" UESCAPE '!'\n'' disable row level security;"],
  ["client RLS disabled with a comment-separated continued E-string UESCAPE", "alter table U&\"clients\" UESCAPE e'!'\n/* continue */\n'' disable row level security;"],
];

for (const [name, sql] of OPEN_CLIENT_UPDATE_OWNERSHIP_AND_RLS) {
  test(`client update guard rejects ${name} after lockdown`, () => {
    const problems = problemsAfterLockdown(sql);
    assert.ok(problems.length > 0, `${name} was not detected: ${problems.join("; ")}`);
  });
}

const OPEN_CLIENT_UPDATE_DEFAULT_PRIVILEGES = [
  ["default UPDATE privileges for authenticated", "alter default privileges in schema public grant update on tables to authenticated;"],
  ["default ALL privileges for PUBLIC", "alter default privileges grant all privileges on tables to public;"],
  ["default UPDATE privileges for a quoted authenticated role", 'alter default privileges for role postgres in schema public grant update on tables to "authenticated";'],
  ["default UPDATE privileges in a role-targeted schema", "alter default privileges for role postgres, app_owner in schema public grant update on tables to authenticated;"],
  ["default UPDATE with a semicolon in a quoted grantee", 'alter default privileges in schema public grant update on tables to "x;y", authenticated;'],
  ["default ALL with a semicolon in a quoted grantee", 'alter default privileges in schema public grant all on tables to "x;y", public;'],
];

for (const [name, sql] of OPEN_CLIENT_UPDATE_DEFAULT_PRIVILEGES) {
  test(`client update guard rejects ${name} after lockdown`, () => {
    const problems = problemsAfterLockdown(sql);
    assert.ok(problems.some((problem) => /ALTER DEFAULT PRIVILEGES/.test(problem)), `${name} was not detected: ${problems.join("; ")}`);
  });
}

const OPEN_CLIENT_UPDATE_ROLE_MEMBERSHIPS = [
  ["a role granted to authenticated", "grant client_owner to authenticated;"],
  ["a role granted to PUBLIC", "grant client_owner to public;"],
  ["a quoted role granted to authenticated with admin option", 'grant "client owner" to authenticated with admin option;'],
  ["a role granted in a role list", "grant client_owner to anon, authenticated, public with grant option;"],
  ["a role granted to a quoted authenticated role", 'grant client_owner to "authenticated" granted by postgres;'],
  ["PostgreSQL 16 WITH INHERIT TRUE", "grant client_owner to authenticated with inherit true;"],
  ["PostgreSQL 16 WITH ADMIN TRUE", "grant client_owner to authenticated with admin true;"],
  ["PostgreSQL 16 WITH INHERIT FALSE", "grant client_owner to authenticated with inherit false;"],
  ["PostgreSQL 16 WITH SET TRUE", "grant client_owner to authenticated with set true;"],
  ["PostgreSQL 16 WITH ADMIN OPTION", "grant client_owner to authenticated with admin option;"],
  ["PostgreSQL 16 WITH INHERIT OPTION", "grant client_owner to authenticated with inherit option;"],
  ["PostgreSQL 16 WITH SET OPTION", "grant client_owner to authenticated with set option;"],
  ["PostgreSQL 16 WITH ADMIN FALSE", "grant client_owner to authenticated with admin false;"],
  ["PostgreSQL 16 WITH SET FALSE", "grant client_owner to authenticated with set false;"],
  ["role and option combinations", "grant client_owner, client_writer to anon, authenticated with inherit false;"],
  ["membership options before GRANTED BY", "grant client_owner to authenticated with set true granted by postgres;"],
  ["a semicolon in a quoted membership grantee", 'grant client_owner to "x;y", authenticated with admin option;'],
  ["a semicolon in a quoted membership grantee before PUBLIC", 'grant "client;owner" to "x;y", public with inherit true;'],
];

for (const [name, sql] of OPEN_CLIENT_UPDATE_ROLE_MEMBERSHIPS) {
  test(`client update guard rejects ${name} after lockdown`, () => {
    const problems = problemsAfterLockdown(sql);
    assert.ok(problems.some((problem) => /role membership/.test(problem)), `${name} was not detected: ${problems.join("; ")}`);
  });
}

const UNSUPPORTED_CLIENT_UPDATE_DO_BODIES = [
  ["a U& string DO body containing a GRANT", "do U&'begin grant update on public.clients to authenticated; end';"],
  ["a U& string DO body containing a CREATE POLICY", "do U&'begin create policy p on public.clients for update to public using (true); end' UESCAPE '!';"],
  ["a U& string DO body containing an RLS change", "do U&'begin alter table public.clients disable row level security; end';"],
  ["an unrecognized future DO body form", "do future_body('grant update on public.clients to authenticated');"],
  ["a nested U& DO body containing a GRANT", "do $$ begin do U&'begin grant update on public.clients to authenticated; end'; end $$;"],
  ["a nested U& DO body containing a CREATE POLICY", "do $$ begin do U&'begin create policy p on public.clients for update to public using (true); end'; end $$;"],
  ["a nested U& DO body containing an RLS change", "do $$ begin do U&'begin alter table public.clients disable row level security; end'; end $$;"],
  ["a nested DO introduced by an E-string continuation whose later pieces omit E", "do E'begin '\n'\\x64o $$ begin grant update on public.clients to authenticated; end $$; end';"],
  ["an invalid E-prefixed continuation after an E-string DO body", "do E'begin grant update on public.clients'\nE' to authenticated; end';"],
];

for (const [name, sql] of UNSUPPORTED_CLIENT_UPDATE_DO_BODIES) {
  test(`client update guard fails closed on ${name} after lockdown`, () => {
    const problems = problemsAfterLockdown(sql);
    assert.ok(
      problems.some((problem) => /unsupported DO body/i.test(problem)),
      `${name} was not reported as unsupported: ${problems.join("; ")}`,
    );
  });
}

test("client update guard rejects the reviewer's role grant plus client owner-change sequence", () => {
  const sql = `
    create role client_owner;
    grant client_owner to authenticated;
    alter table public.clients owner to client_owner;
  `;
  const problems = problemsAfterLockdown(sql);
  assert.ok(problems.some((problem) => /role membership/.test(problem)), problems.join("; "));
  assert.ok(problems.some((problem) => /ownership/.test(problem)), problems.join("; "));
});

const OPEN_CLIENT_UPDATE_ALTER_POLICIES = [
  ["changed UPDATE expressions", 'alter policy "Clients can update own data" on public.clients using (true) with check (true);'],
  ["a differently named policy changed to target PUBLIC", 'alter policy "Renamed client policy" on public.clients to public;'],
  ["a policy renamed back to the update policy name", 'alter policy "Renamed client policy" on public.clients rename to "Clients can update own data";'],
  ["a policy on quoted table identifiers", 'alter policy "Quoted client policy" on "public"."clients" to authenticated;'],
  ["a policy on unqualified clients", 'alter policy "Unqualified client policy" on clients to authenticated;'],
  ["a quoted ALTER POLICY name containing a semicolon", 'alter policy "Client; update" on public.clients to authenticated;'],
];

for (const [name, policy] of OPEN_CLIENT_UPDATE_ALTER_POLICIES) {
  test(`client update guard rejects ${name} after lockdown`, () => {
    const problems = problemsAfterLockdown(policy);
    assert.ok(problems.some((problem) => /ALTER POLICY/.test(problem)), `${name} was not detected: ${problems.join("; ")}`);
  });
}

test("client update guard ignores reopening statements in SQL comments", () => {
  const sql = `
    -- grant update on public.clients to authenticated;
    -- create policy "Commented client update" on public.clients for update to authenticated using (true);
    -- alter policy "Commented client update" on public.clients using (true);
    /* grant update (role, tier) on public.clients to authenticated; */
    /* create policy "Commented client update" on public.clients for update to public using (true); */
    /* outer comment /* nested grant update on all tables in schema public to authenticated; */ still commented */
  `;
  assert.deepEqual(problemsAfterLockdown(sql), []);
});

test("client update guard strips comments without stripping quoted policy names", () => {
  const sql = `
    create policy "Renamed -- /* client update */" on public.clients
      for update to authenticated using (true);
    grant /* comment */ update on /* comment */ public.clients to authenticated;
  `;
  const problems = problemsAfterLockdown(sql);
  assert.equal(problems.length, 2, problems.join("; "));
  assert.ok(problems.some((problem) => /CREATE POLICY/.test(problem)));
  assert.ok(problems.some((problem) => /GRANT/.test(problem)));
});

const FAIL_CLOSED_CLIENT_UPDATE_SEQUENCES = [
  [
    "a GRANT followed by a REVOKE",
    "grant update on public.clients to authenticated; revoke update on public.clients from authenticated;",
  ],
  [
    "a column GRANT followed by a table REVOKE",
    "grant update (role) on public.clients to authenticated; revoke update on public.clients from authenticated;",
  ],
  [
    "a GRANT followed by REVOKE GRANT OPTION",
    "grant update on public.clients to authenticated; revoke grant option for update on public.clients from authenticated;",
  ],
  [
    "an UPDATE policy followed by DROP POLICY",
    'create policy "Rotating policy" on public.clients for update to authenticated using (true); drop policy "Rotating policy" on public.clients;',
  ],
];

for (const [name, sql] of FAIL_CLOSED_CLIENT_UPDATE_SEQUENCES) {
  test(`client update guard fails closed on ${name}`, () => {
    const problems = problemsAfterLockdown(sql);
    assert.ok(problems.length > 0, `${name} was not detected`);
  });
}

test("client update guard allows later statements that do not reopen updates", () => {
  const sql = `
    revoke update on public.clients from authenticated;
    revoke update on public.clients from public;
    drop policy if exists "Clients can update own data" on public.clients;
    grant select on public.clients to authenticated;
    grant select on public.leads, public.clients to authenticated;
    grant update on public.clients to anon;
    grant update on public.clients to anon granted by authenticated;
    grant update on public.leads, public.tickets to authenticated;
    grant update on public.clients_archive, public.leads to authenticated;
    grant update on all tables in schema audit, private to authenticated;
    grant select on public.clients to authenticated; grant update on public.leads to authenticated;
    create policy "Clients can read own data" on public.clients for select to authenticated using (true);
    create policy "Anonymous lead insert" on public.leads for insert to anon with check (true);
    create policy "Quoted keyword roles read" on public.clients for select to "using", authenticated, "with check" using (true);
    create policy "Quoted keyword role only" on public.clients for update to "using" using (true);
    alter table public.clients enable row level security;
    alter table public.clients force row level security;
    alter table public.leads owner to client_owner;
    alter table public.leads disable row level security;
    alter table public.leads no force row level security;
    alter default privileges in schema public grant select on tables to authenticated;
    alter default privileges in schema public revoke update on tables from authenticated;
    alter default privileges in schema public grant update on tables to anon;
    grant client_reader to service_role;
    grant client_reader to anon;
    grant client_reader to service_role with admin option;
    grant client_owner to "authenticated;decoy" with inherit true;
    grant client_owner to "x;y" with set true;
    grant client_owner to "with" with admin false;
    grant usage on schema public to authenticated;
    grant update on public.clients to "x;y";
    grant update on public.clients to "authenticated;decoy";
    grant update on audit.clients to authenticated;
    grant update on "audit"."clients" to authenticated;
    grant update on clients_archive to authenticated;
    grant update on all tables in schema "pu;blic" to authenticated;
    create policy "Archive update" on clients_archive for update to authenticated using (true);
    create policy "Other schema update" on audit.clients for update to authenticated using (true);
    create policy "Quoted decoy role" on public.clients for update to "authenticated;decoy" using (true);
    create policy "Quoted semicolon role" on public.clients for update to "x;y" using (true);
    alter table clients_archive owner to client_owner;
    alter table audit.clients disable row level security;
    alter default privileges in schema public grant update on tables to "x;y";
    alter default privileges in schema public grant all on tables to "authenticated;decoy";
    select 'grant update on public.clients to authenticated;';
    select 'create policy "String decoy" on public.clients for update to public using (true);';
    select E'escaped \\' quote; grant update on public.clients to authenticated';
    grant update on U&"leads" to authenticated;
    create policy "Unicode leads update" on U&"l\\0065ads" for update to authenticated using (true);
    alter table U&"leads" disable row level security;
    grant update on U&"le!0061ds" UESCAPE '!' to authenticated;
    create policy "Unicode custom leads update" on U&"le!0061ds" UESCAPE '!' for update to authenticated using (true);
    alter table U&"le!0061ds" UESCAPE '!' disable row level security;
    grant update on U&"leads" UESCAPE '!'
      '' to authenticated;
    create policy "Unicode continued UESCAPE leads update" on public.U&"leads" UESCAPE e'!'
      '' for update to authenticated using (true);
    alter table U&"leads" UESCAPE '!'
      /* continue */
      '' disable row level security;
    do 'begin perform ''grant update on public.clients to authenticated''; end';
    do e'begin perform \\'grant update on public.clients to authenticated\\'; end';
    do 'begin perform ''grant update on public.clients'''
      /* continue */
      ' to authenticated''; end';
    do $$ begin
      perform 'grant update on public.clients to authenticated';
      grant select on public.clients to authenticated;
    end $$;
  `;
  assert.deepEqual(problemsAfterLockdown(sql), []);
});

test("client update guard requires both statements in the append-only lockdown migration", () => {
  const cases = [
    ["the authenticated UPDATE revoke", 'drop policy if exists "Clients can update own data" on public.clients;', "must revoke UPDATE"],
    ["the legacy policy drop", "revoke update on public.clients from authenticated;", "must drop policy"],
  ];

  for (const [name, sql, expected] of cases) {
    const problems = clientUpdateAccessProblems([{ file: CLIENT_UPDATE_LOCKDOWN_FILE, sql }]);
    assert.ok(problems.some((problem) => problem.includes(expected)), `${name} was not required: ${problems.join("; ")}`);
  }
});

test("client update guard recognizes unqualified clients and quoted role lists in the lockdown", () => {
  const cases = [
    "revoke update on clients from authenticated; drop policy if exists \"Clients can update own data\" on clients;",
    'revoke update on public.clients from "x;y", authenticated; drop policy if exists "Clients can update own data" on public.clients;',
  ];
  for (const sql of cases) {
    assert.deepEqual(clientUpdateAccessProblems([{ file: CLIENT_UPDATE_LOCKDOWN_FILE, sql }]), []);
  }
});

test("client update guard requires the append-only lockdown migration", () => {
  const problems = clientUpdateAccessProblems([]);
  assert.match(problems.join("\n"), /missing append-only client update lockdown migration/);
});

test("the final migrations lock down direct client profile updates", () => {
  assert.deepEqual(clientUpdateAccessProblems(MIGRATIONS), []);
});

test("migrations are timestamp-ordered and never edited in place", () => {
  const names = MIGRATIONS.map((m) => m.file);
  assert.deepEqual(names, [...names].sort(), "migration filenames must sort in apply order");
  for (const name of names) {
    assert.match(name, /^\d{8}\d{4}_[a-z0-9_]+\.sql$/, `${name} must be <date><seq>_snake_case.sql`);
  }
});
