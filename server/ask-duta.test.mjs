import test, { after, afterEach, before, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handle } from "./handler.mjs";
import { resetAuthRateLimit } from "./auth.mjs";
import { WEBSITE_LEAD_SOURCES } from "./enquiries.mjs";
import { WEBSITE_LEAD_SOURCES as WEBSITE_LEAD_SOURCES_CF } from "./enquiries-cloudflare.mjs";
import { answerLocally, DI_FACTS } from "./knowledge/duta-integra.mjs";
import { llmConfigured } from "./ai.mjs";

/**
 * Ask Duta — the public assistant on /api/ask-duta.
 *
 * Everything runs over a real HTTP server so the routing in handler.mjs is
 * exercised, not just the handler function. The "model" is a real local server:
 * a globalThis.fetch stub would also stub the fetch these tests use to call the
 * API, which is how provider tests end up proving nothing.
 */

const ASK_LIMIT = 10;

let server;
let base;
let model;
let modelBase;
let lastModelBody = null;
let modelMode = "ok";
let ipCounter = 0;

function nextIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter % 250}`;
}

async function ask(message, headers = {}, init = {}) {
  const res = await fetch(`${base}/api/ask-duta`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": nextIp(), ...headers },
    body: JSON.stringify({ message, ...init }),
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

before(async () => {
  model = createServer((req, res) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      lastModelBody = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      if (modelMode === "fail") {
        // A body that names internals — the endpoint must never forward it.
        res.writeHead(503, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: "no such table: public.ai_actions via service_role key" }));
        return;
      }
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { role: "assistant", content: "Model jawab: audit percuma 30 minit." } }] }));
    });
  });
  await new Promise((done) => model.listen(0, "127.0.0.1", done));
  modelBase = `http://127.0.0.1:${model.address().port}`;

  server = createServer(handle);
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((done) => server.close(done));
  server.closeAllConnections?.();
  await new Promise((done) => model.close(done));
  model.closeAllConnections?.();
});

beforeEach(async () => {
  process.env.DATA_DIR = await mkdtemp(join(tmpdir(), "ask-duta-"));
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  // Default posture: no configured model, so the rule path and the hand-off are
  // what production will hit until LLM_* keys are added.
  delete process.env.LLM_BASE_URL;
  delete process.env.LLM_API_KEY;
  delete process.env.OLLAMA_HOST;
  lastModelBody = null;
  modelMode = "ok";
  resetAuthRateLimit();
});

afterEach(async () => {
  if (process.env.DATA_DIR) await rm(process.env.DATA_DIR, { recursive: true, force: true });
});

describe("route contract", () => {
  test("GET is refused before any work", async () => {
    const res = await fetch(`${base}/api/ask-duta`, { headers: { "x-forwarded-for": nextIp() } });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get("cache-control"), "no-store");
  });

  test("no session is required — the marketing visitor is anonymous", async () => {
    const { status, body } = await ask("what does it cost?", {}, { lang: "en" });
    assert.equal(status, 200);
    assert.equal(body.answered, true);
  });

  test("empty, oversized, and unparseable bodies are 400", async () => {
    assert.equal((await ask("   ")).status, 400);
    assert.equal((await ask("x".repeat(2001))).status, 400);
    const bad = await fetch(`${base}/api/ask-duta`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": nextIp() },
      body: "{not json",
    });
    assert.equal(bad.status, 400);
  });

  test("an oversized body is refused at 413, not buffered whole", async () => {
    // The message-length check above runs after parsing, so before the read was
    // bounded, 2 MB from an anonymous caller became 2 MB of isolate memory per
    // request — on workerd, shared with every other /api call in flight.
    const res = await fetch(`${base}/api/ask-duta`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": nextIp() },
      body: JSON.stringify({ message: "x".repeat(40 * 1024) }),
    });
    assert.equal(res.status, 413);
    assert.equal((await res.json()).error, "Payload too large");
  });
});

describe("rule path, with no model configured", () => {
  test("prices come from the curated facts", async () => {
    const { body } = await ask("how much is the Growth plan?", {}, { lang: "en" });
    assert.equal(body.source, "rule");
    assert.equal(body.topic, "pricing");
    assert.match(body.answer, /RM 1,490/);
  });

  test("a Malay question is answered in Malay, not in translated English scaffolding", async () => {
    const { body } = await ask("apa harga pelan?", {}, { lang: "bm" });
    assert.equal(body.answered, true);
    assert.match(body.answer, /RM 690 \/ bulan/);
    for (const english of ["No setup fee", "One-time setup", "Sales automation", " from "]) {
      assert.ok(!body.answer.includes(english), `BM answer leaked English: ${english}`);
    }
  });

  test("the unknown question is reported as unknown and hands off to a person", async () => {
    const { body } = await ask("do you file my GST returns", {}, { lang: "en" });
    assert.equal(body.answered, false);
    assert.equal(body.source, "handoff");
    assert.match(body.answer, /wa\.me\/601154034051/);
    // The duta-ceo contract: read-only. It must not claim to have done anything.
    assert.ok(!/we (have |will )?(filed|sent|booked|submitted)/i.test(body.answer), body.answer);
  });

  test("a missing registration number is admitted, never invented", async () => {
    assert.equal(DI_FACTS.ssmNumber, null);
    const { body } = await ask("what is your SSM number?", {}, { lang: "en" });
    assert.match(body.answer, /will not guess/i);
    assert.ok(!/\bD\d{4}/.test(body.answer), "must not fabricate a registration number");
  });

  test("metered by source IP, not by a session", async () => {
    const ip = nextIp();
    for (let i = 0; i < ASK_LIMIT; i += 1) {
      const res = await fetch(`${base}/api/ask-duta`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": ip },
        body: JSON.stringify({ message: "what does it cost" }),
      });
      assert.equal(res.status, 200, `request ${i + 1} should be allowed`);
    }
    const blocked = await fetch(`${base}/api/ask-duta`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ message: "what does it cost" }),
    });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get("retry-after")) > 0);
    // A different visitor is unaffected.
    const other = await fetch(`${base}/api/ask-duta`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": nextIp() },
      body: JSON.stringify({ message: "what does it cost" }),
    });
    assert.equal(other.status, 200);
  });
});

describe("model upgrade path", () => {
  test("llmConfigured is false unless both base URL and key are present", () => {
    assert.equal(llmConfigured(), false);
    process.env.LLM_BASE_URL = modelBase;
    assert.equal(llmConfigured(), false, "half-configured must not count as configured");
    process.env.LLM_API_KEY = "test-key";
    assert.equal(llmConfigured(), true);
  });

  test("an unmatched question goes to the model with the Duta Integra DATA block", async () => {
    process.env.LLM_BASE_URL = modelBase;
    process.env.LLM_API_KEY = "test-key";
    process.env.LLM_MODEL = "test-model";
    const { body } = await ask("do you support Salesforce migrations?", {}, { lang: "en" });
    assert.equal(body.source, "model");
    assert.equal(body.answered, true);
    assert.match(body.answer, /Model jawab/);
    const system = lastModelBody.messages[0].content;
    assert.match(system, /You are Ask Duta/);
    assert.match(system, /Duta Integra Solutions Sdn Bhd/);
    assert.match(system, /RM 1490|RM 1,490/, "the DATA block must carry the real tier price");
    assert.equal(lastModelBody.messages[1].content, "do you support Salesforce migrations?");
  });

  test("a failing model falls back to the hand-off and never leaks the provider error", async () => {
    process.env.LLM_BASE_URL = modelBase;
    process.env.LLM_API_KEY = "test-key";
    modelMode = "fail";
    const { status, body } = await ask("do you support Salesforce migrations?", {}, { lang: "en" });
    assert.equal(status, 200);
    assert.equal(body.source, "handoff");
    const raw = JSON.stringify(body);
    for (const leak of ["service_role", "ai_actions", "no such table", "503", "127.0.0.1"]) {
      assert.ok(!raw.includes(leak), `response leaked provider detail: ${leak}`);
    }
  });

  test("a rule answer never calls the model, even when one is configured", async () => {
    process.env.LLM_BASE_URL = modelBase;
    process.env.LLM_API_KEY = "test-key";
    const { body } = await ask("what does it cost?", {}, { lang: "en" });
    assert.equal(body.source, "rule");
    assert.equal(lastModelBody, null, "the model must not be consulted for a known fact");
  });
});

describe("grounding stays honest as the site changes", () => {
  test("every figure Ask Duta can quote also appears on the site it advertises", async () => {
    const published = [
      "../web-new/src/pages/pricing.tsx",
      "../web-new/src/lib/dutaos.ts",
      "../web-new/src/i18n/translations.ts",
    ];
    const text = (await Promise.all(published.map((p) => readFile(new URL(p, import.meta.url), "utf8")))).join("\n");
    // Compare digits, since the site writes "RM 1,490", "RM1,500" and "1,299".
    const publishedNumbers = new Set(
      [...text.matchAll(/RM\s?([\d][\d,]*)/g), ...text.matchAll(/"([\d]{1,2},[\d]{3})"/g)].map((m) => m[1].replace(/,/g, "")),
    );
    const quotable = [
      ...DI_FACTS.managedTiers.map((t) => t.priceMYR),
      DI_FACTS.dutaConnect.pilotMYR,
      DI_FACTS.dutaConnect.ongoingMYR,
      ...DI_FACTS.dutaosModules.map((m) => m.fromMYR),
      DI_FACTS.extraChangesPerHourMYR,
      1500,
      3500,
    ];
    for (const figure of quotable) {
      assert.ok(publishedNumbers.has(String(figure)), `Ask Duta quotes RM${figure}, which the site does not publish`);
    }
  });

  test("ask-duta is a recognised lead funnel, or attribution silently becomes contact-form", () => {
    assert.ok(WEBSITE_LEAD_SOURCES.includes("ask-duta"));
    // Production runs the fork. A source the Node module knows and the fork does
    // not is coerced to "contact-form" on every Pages write, so the lead lands but
    // its funnel — and the admin chip that reads it — disappear without an error.
    assert.deepEqual(
      WEBSITE_LEAD_SOURCES_CF,
      WEBSITE_LEAD_SOURCES,
      "server/enquiries-cloudflare.mjs drifted from server/enquiries.mjs",
    );
  });

  test("the sitemap advertises URLs that exist, and now carries /ask", async () => {
    // Ask Duta adds a public route a crawler should find, so this file became part
    // of what the feature has to keep true. It was already wrong when /ask landed:
    // five retired .html twins were still advertised, telling a crawler to fetch
    // paths that no longer have an object behind them at origin.
    const [sitemap, app] = await Promise.all([
      readFile(new URL("../public/sitemap.xml", import.meta.url), "utf8"),
      readFile(new URL("../web-new/src/App.tsx", import.meta.url), "utf8"),
    ]);
    const files = new Set(readdirSync(new URL("../public/", import.meta.url), { recursive: true, encoding: "utf8" }));
    const reactRoutes = new Set([...app.matchAll(/path:\s*"([^"]+)"/g)].map((m) => m[1]));
    const paths = [...sitemap.matchAll(/<loc>([^<]*)<\/loc>/g)]
      .map((m) => m[1].replace(/^https?:\/\/dutaintegra\.my/, ""));

    const dead = paths.filter((p) => !files.has(p.replace(/^\//, "") || "index.html") && !reactRoutes.has(p));
    assert.deepEqual(dead, [], `sitemap advertises URLs that resolve nowhere: ${dead.join(", ")}`);
    assert.ok(paths.includes("/ask"), "Ask Duta has to be discoverable without a navbar click");
  });

  test("intent routing: specific questions beat the broad price intent", () => {
    const routes = [
      ["can I get a refund?", "refund"],
      ["is there a contract?", "contract"],
      ["what is the setup fee", "setup-fee"],
      ["how much per hour", "hourly"],
      ["what does DutaOS cost", "dutaos"],
      ["can we trial it", "pilot"],
      ["what time are you open", "contact"],
      ["tell me about Duta Integra", "about"],
      ["hello", "greeting"],
      ["what does it cost", "pricing"],
      ["do you do web design", "services"],
      ["what is your SSM number", "compliance"],
    ];
    for (const [question, topic] of routes) {
      assert.equal(answerLocally(question, "en")?.topic, topic, question);
    }
    // "rm" must not let a price intent swallow unrelated words.
    assert.notEqual(answerLocally("tell me about your platform", "en")?.topic, "pricing");
    assert.equal(answerLocally("write me a poem about cats", "en"), null);
    assert.equal(answerLocally("", "en"), null);
    assert.equal(answerLocally(undefined, "en"), null);
  });

  test("BM needles route too — they are a different word-boundary problem, not the same one", () => {
    // Every needle matches from a word start and runs to the end of that word, so
    // an English table cannot prove the Malay table. Two bugs lived here exactly
    // because of that: "siap" (ready) is a prefix of "siapa" (who), so
    // "siapa anda" answered a who-are-you with a delivery timeline; and bare
    // "berapa" is the first half of both "berapa harga" (a price) and
    // "berapa lama" (a duration), and pricing runs before timeline.
    const bmRoutes = [
      ["siapa anda", "about"],
      ["apa yang kamu buat", "services"],
      ["berapa lama proposal", "timeline"],
      ["harga pakej", "pricing"],
      ["berapa kos DutaOS", "dutaos"],
      ["macam mana nak hubungi", "contact"],
      ["boleh ke cuba dulu", "pilot"],
      ["adakah kontrak", "contract"],
      ["yuran setup", "setup-fee"],
      ["pulangan wang", "refund"],
      ["hai", "greeting"],
      ["nombor SSM kami", "compliance"],
      ["berapa sejam", "hourly"],
      ["saya nak audit percuma", "audit"],
      ["apa yang anda tak buat", "limits"],
    ];
    for (const [question, topic] of bmRoutes) {
      assert.equal(answerLocally(question, "bm")?.topic, topic, question);
    }
  });

  test("a BM answer is Malay prose, not an English string wearing a Malay prefix", () => {
    // An answer assembled from one `{ en, bm }` field and the rest English is the
    // failure this file cannot see from the EN table alone.
    // `limits` is the one accepted exception: the five commitments are
    // English-only on the site, so BM readers get them verbatim rather than a
    // paraphrase of a promise we would have authored ourselves.
    const ENGLISH_PROSE = /\b(the|and|with|you|are|our|for|will not|best value|save|telephone|called|cheap)\b/i;
    const probes = [
      "siapa anda", "apa yang kamu buat", "berapa lama proposal", "harga pakej",
      "berapa kos DutaOS", "macam mana nak hubungi", "adakah kontrak", "yuran setup",
      "pulangan wang", "hai", "nombor SSM kami", "berapa sejam", "saya nak audit percuma",
    ];
    for (const question of probes) {
      const hit = answerLocally(question, "bm");
      assert.ok(hit, `${question} matched no intent`);
      for (const line of hit.answer.split("\n")) {
        assert.doesNotMatch(line, ENGLISH_PROSE, `${hit.topic}: English prose in the BM answer — ${line.slice(0, 80)}`);
      }
    }
  });

  test("every intent ships both languages, because the site defaults to BM", () => {
    const probes = [
      "what does it cost", "can I get a refund", "is there a contract", "what is the setup fee",
      "how much per hour", "what does DutaOS cost", "can we trial it", "what time are you open",
      "tell me about Duta Integra", "hello", "do you do web design", "what is your SSM number",
      "how long for a proposal", "what you won't do", "book a free audit",
    ];
    for (const question of probes) {
      const en = answerLocally(question, "en");
      assert.ok(en, `${question} matched no intent, so the probe cannot check its BM copy`);
      const bm = answerLocally(question, "bm");
      assert.notEqual(bm.answer, en.answer, `${question} answers the same in both languages`);
      assert.ok(bm.answer.trim().length > 20, `${question} BM answer is a stub`);
    }
  });
});
