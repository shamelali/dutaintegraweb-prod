import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");
const WEB_DIR = join(ROOT, "Web");

/**
 * The 17 standalone pages under public/ are translated by public/js/site.js: a
 * dictionary `var T = { key: { en, bm } }` plus applyTranslations(), which walks
 * [data-i18n] and writes textContent (innerHTML with data-i18n-html).
 *
 * Nothing checked that the pages and the dictionary agreed. Four failures this
 * guards, all of them live when these tests were written:
 *
 * 1. applyTranslations falls back to entry.en when bm is missing, so a
 *    half-filled entry only looks translated until you toggle.
 * 2. A key attached to the wrong element changes meaning on toggle —
 *    ontrac.html labelled itself "Autonomous Ops" in BM because its hero label
 *    borrowed that nav key, and its feed subtitle was replaced by the
 *    Autonomous Ops sentence. No string is missing, so nothing errors.
 * 3. data-i18n on a <meta> is inert: querySelectorAll finds it, textContent on
 *    a void element renders nothing, and the tag reads as translated.
 * 4. The nav on every page linked at quiz.html/services.html/about.html/
 *    pricing.html/contact.html after those twins were removed, so the primary
 *    CTA landed on React Router's NotFoundPage — see the link test below.
 */

const VOID_TAGS = new Set(["meta", "link", "br", "img", "input", "hr", "source"]);

function dictionary() {
  const src = readFileSync(join(PUBLIC_DIR, "js", "site.js"), "utf8");
  const marker = src.indexOf("var T = {");
  assert.ok(marker >= 0, "public/js/site.js no longer declares `var T = {` — update this reader");
  const open = src.indexOf("{", marker);
  let depth = 0, quote = null, escaped = false, end = -1;
  // Everything outside a string literal or a comment, so the shape check cannot
  // trip over a parenthesis inside the copy or inside a `// ---- NAV ----` banner.
  let skeleton = "";
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue; }
    if (ch === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i); if (i < 0) break; i++; continue; }
    skeleton += ch;
    if (ch === "'" || ch === '"' || ch === "`") { quote = ch; continue; }
    if (ch === "{") depth++;
    else if (ch === "}" && --depth === 0) { end = i; break; }
  }
  assert.ok(end > open, "could not find the close of `var T` in public/js/site.js");
  assert.match(skeleton.trim(), /^\{\s*[a-zA-Z_$][\w$]*\s*:/, "var T no longer opens with a key: { en, bm } entry");
  assert.doesNotMatch(skeleton, /=|=>|\bfunction\b|\bimport\b|\brequire\b|\beval\b|[([]/,
    "the var T slice reaches code outside its string values — read it explicitly instead of evaluating it");
  return new Function(`return (${src.slice(open, end + 1)})`)();
}

function htmlPages(dir) {
  return readdirSync(dir).filter((f) => f.endsWith(".html")).sort();
}

/** Every file under public/ as a forward-slash relative path, one level deep enough for the real tree. */
function publicFiles() {
  const out = new Set();
  for (const e of readdirSync(PUBLIC_DIR, { withFileTypes: true })) {
    if (e.isFile()) out.add(e.name);
    else if (e.isDirectory()) {
      for (const f of readdirSync(join(PUBLIC_DIR, e.name), { recursive: true, encoding: "utf8" })) {
        if (f.includes("\0")) continue;
        out.add(`${e.name}/${f}`.replace(/\\/g, "/"));
      }
    }
  }
  return out;
}

/** Pages that actually load the translator. index.html (the React shell) does not. */
function translatedPages(dir) {
  return htmlPages(dir).filter((f) => readFileSync(join(dir, f), "utf8").includes("js/site.js"));
}

/** The element a data-i18n sits on, and the text a reader sees before JS runs. */
function keyedElements(html) {
  const out = [];
  for (const m of html.matchAll(/<([a-z][a-z0-9]*)\b([^>]*?\bdata-i18n(?:-html)?="([^"]+)"[^>]*)>/gi)) {
    const [, tag, , key] = m;
    if (VOID_TAGS.has(tag.toLowerCase()) || m[0].endsWith("/>")) out.push({ tag, key, inner: null, inert: true });
    else out.push({ tag, key, inner: elementBody(html, m.index, tag), inert: false });
  }
  return out;
}

function elementBody(html, start, tag) {
  const open = new RegExp(`<${tag}\\b`, "gi");
  const close = new RegExp(`</${tag}\\s*>`, "gi");
  let depth = 0, i = start;
  while (i < html.length) {
    open.lastIndex = i;
    close.lastIndex = i;
    const o = open.exec(html);
    const c = close.exec(html);
    if (!c) return null;
    if (o && o.index < c.index) { depth++; i = o.index + 1; continue; }
    if (--depth === 0) return html.slice(start, c.index);
    i = c.index + 1;
  }
  return null;
}

/** Collapse to what applyTranslations would leave visible, ignoring the markup it overwrites. */
function normalise(html) {
  return html
    .replace(/^<[^>]*>/, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&rarr;/g, "→")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const T = dictionary();

test("site.js dictionary: every entry carries both languages", () => {
  const thin = Object.entries(T).filter(([, v]) => !v || !v.en || !v.bm).map(([k]) => k);
  assert.deepEqual(thin, [], "applyTranslations() falls back to entry.en when bm is missing, so these render English in BM mode");
});

test("static pages: every data-i18n key resolves in the dictionary", () => {
  const problems = [];
  for (const page of translatedPages(PUBLIC_DIR)) {
    const html = readFileSync(join(PUBLIC_DIR, page), "utf8");
    for (const el of keyedElements(html)) {
      const entry = T[el.key];
      if (!entry) problems.push(`${page} -> ${el.key} (not in public/js/site.js)`);
      else if (!entry.en || !entry.bm) problems.push(`${page} -> ${el.key} (entry is missing ${entry.en ? "bm" : "en"})`);
    }
  }
  assert.deepEqual(problems, []);
});

test("static pages: no data-i18n on an element the translator cannot write", () => {
  const inert = [];
  for (const page of translatedPages(PUBLIC_DIR)) {
    for (const el of keyedElements(readFileSync(join(PUBLIC_DIR, page), "utf8"))) {
      if (el.inert) inert.push(`${page} -> <${el.tag} data-i18n="${el.key}">`);
    }
  }
  assert.deepEqual(inert, [], "textContent on a void element renders nothing — the attribute only looks like translation");
});

test("static pages: the dictionary's English is the page's English", () => {
  const drift = [];
  for (const page of translatedPages(PUBLIC_DIR)) {
    const html = readFileSync(join(PUBLIC_DIR, page), "utf8");
    for (const el of keyedElements(html)) {
      if (el.inert || el.inner === null) continue;
      const entry = T[el.key];
      if (!entry) continue;
      const shown = normalise(el.inner);
      if (shown !== normalise(entry.en)) {
        drift.push(`${page}  data-i18n="${el.key}"\n     dictionary: ${normalise(entry.en).slice(0, 80)}\n     page text : ${shown.slice(0, 80)}`);
      }
    }
  }
  assert.deepEqual(drift, [], "a key borrowed from another page rewrites this page's copy when the language toggles");
});

/**
 * Cloudflare Pages answers every unmatched path with the SPA shell — public/_redirects
 * ends in `/* /index.html 200` — so a link to a removed static twin returns 200 and
 * React Router lands on NotFoundPage. The browser never shows a 404; only the content
 * is missing. `/ms/<x>` is also redirected to `/<x>` by the first _redirects rule, so
 * the Malay prefix inherits whatever the unprefixed path resolves to.
 */
test("static pages: every <a> href resolves to a real file or a React route", () => {
  const app = readFileSync(join(ROOT, "web-new", "src", "App.tsx"), "utf8");
  const routes = [...app.matchAll(/\{\s*path:\s*"([^"]+)"\s*,\s*element:/g)].map((m) => m[1]);
  assert.ok(routes.length > 10, `parsed only ${routes.length} routes out of web-new/src/App.tsx — update this reader`);
  const cleanRoutes = routes.map((r) => r.replace(/\/:.*$/, ""));

  const files = publicFiles();
  const staticClean = new Set(
    [...files].filter((p) => p.endsWith(".html") && !p.startsWith("preview/")).map((p) => "/" + p.slice(0, -5)),
  );

  // public/_redirects maps /ms/* -> /*, so a /ms path is alive exactly when the
  // same path without the prefix is.
  const resolves = (clean) =>
    cleanRoutes.some((r) => clean === r || clean.startsWith(r + "/")) ||
    staticClean.has(clean) ||
    files.has(clean.replace(/^\//, "")) ||
    clean === "/ms" ||
    (clean.startsWith("/ms/") && resolves(clean.slice(3)));

  const dead = [];
  for (const page of htmlPages(PUBLIC_DIR)) {
    const html = readFileSync(join(PUBLIC_DIR, page), "utf8");
    for (const m of html.matchAll(/<a\b[^>]*?href="([^"]*)"/gi)) {
      const raw = m[1];
      if (/^(https?:|mailto:|tel:|javascript:|\/\/|data:)/i.test(raw) || raw.startsWith("#") || raw === "") continue;
      const trimmed = raw.split("#")[0].split("?")[0];
      // Browsers clamp ".." at the root, so href="../assets/x.webp" requests /assets/x.webp.
      const pathOnly = trimmed.replace(/^(?:\.\.\/|\.\/)+/, "").replace(/^\/+/, "");
      if (pathOnly === "") continue;
      if (pathOnly.includes(".")) {
        if (!files.has(pathOnly)) dead.push(`${page} -> ${raw} (no public/${pathOnly})`);
      } else if (!resolves("/" + pathOnly)) {
        dead.push(`${page} -> ${raw} (no React route, no static page)`);
      }
    }
  }
  assert.deepEqual(dead, []);
});

/**
 * Previously, audit.html was styled by public/css/styles.css, which had not been
 * committed. Now that public/css/styles.css exists and is deployed, this list is
 * empty and all static pages resolve their local stylesheets.
 */
const PAGES_MISSING_THEIR_STYLESHEET = [];

test("static pages: missing stylesheets are exactly the documented list", () => {
  const files = publicFiles();
  const offenders = [];
  for (const page of htmlPages(PUBLIC_DIR)) {
    const html = readFileSync(join(PUBLIC_DIR, page), "utf8");
    const missing = [...html.matchAll(/<link\b[^>]*>/gi)]
      .filter((m) => /rel="stylesheet"/.test(m[0]))
      .map((m) => (m[0].match(/href="([^"]*)"/) || [])[1])
      .filter(Boolean)
      .filter((href) => !/^(https?:)?\/\//.test(href))
      .filter((href) => !files.has(href.replace(/^(?:\.\.?\/)+/, "").replace(/^\/+/, "").split("?")[0]));
    if (missing.length) offenders.push(`${page}: ${missing.join(", ")}`);
  }
  assert.deepEqual(offenders.map((o) => o.split(":")[0]).sort(), PAGES_MISSING_THEIR_STYLESHEET,
    `untracked stylesheets: ${offenders.join(" | ")} — if styles.css landed, drop the entry from PAGES_MISSING_THEIR_STYLESHEET`);
});

test("audit stylesheet covers interactive and report state classes", () => {
  const css = readFileSync(join(PUBLIC_DIR, "css/styles.css"), "utf8");
  const requiredClasses = [
    ".is-on",
    ".is-pass",
    ".is-warn",
    ".is-fail",
    ".spinner",
    ".audit-error-card",
    ".score-ring",
  ];
  for (const cls of requiredClasses) {
    assert.ok(css.includes(cls), `css/styles.css must cover required class ${cls}`);
  }
});

test("Web/ and public/ carry the same static files", () => {
  // Pages deploys public/, Vercel deploys Web/. sync-web.mjs only rewrites
  // index.html and assets/, so everything else here is hand-maintained twice —
  // robots.txt and sitemap.xml had already drifted apart, and the two bundles
  // are compared too because a half-synced tree ships the old app to one host.
  const EXEMPT = new Set(["_headers", "_redirects"]);
  const walk = (dir) =>
    readdirSync(dir, { recursive: true, encoding: "utf8", withFileTypes: false })
      .filter((p) => !p.includes("\0") && statSync(join(dir, p)).isFile());
  const aFiles = new Set(walk(PUBLIC_DIR));
  const bFiles = new Set(walk(WEB_DIR));

  const diff = [];
  for (const p of aFiles) {
    if (EXEMPT.has(p)) continue;
    if (!bFiles.has(p)) diff.push(`${p}: only in public/`);
    else if (!readFileSync(join(PUBLIC_DIR, p)).equals(readFileSync(join(WEB_DIR, p)))) diff.push(`${p}: bytes differ`);
  }
  for (const p of bFiles) if (!EXEMPT.has(p) && !aFiles.has(p)) diff.push(`${p}: only in Web/`);
  assert.deepEqual([...diff].sort(), [], "a page fixed in one tree and not the other is how these two drift");
});
