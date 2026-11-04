import { rateLimit } from "./auth.mjs";
import { callModel, llmConfigured } from "./ai.mjs";
import { answerLocally, DI_FACTS } from "./knowledge/duta-integra.mjs";
import { buildAskDutaPrompt } from "./prompts/ask-duta.mjs";

/**
 * Ask Duta — the public assistant on the marketing site (`/ask`).
 *
 * Deliberately not a variant of `/api/ai/chat`: that one authenticates a company
 * (`ai.mjs:requireCompany`) and grounds on its compliance rows, so it 401s for the
 * anonymous visitor this endpoint exists for. Nothing here is written to the
 * datastore — `ai_actions.company_id` is `not null`, and v1 ships no migration.
 *
 * Answers in order: curated facts, then the model if one is configured, then an
 * honest hand-off. A miss is returned as a miss; it is never padded with an
 * invented answer.
 */

const ASK_LIMIT = 10;
const ASK_WINDOW_MS = 60_000;
const MAX_QUESTION_LENGTH = 2000;
const MAX_BODY_BYTES = 32 * 1024;

const HANDOFF = {
  en: `I do not have that in what I was given, and I will not guess at it. A person can answer that properly — WhatsApp us on ${DI_FACTS.whatsapp}, call ${DI_FACTS.phone}, or email ${DI_FACTS.email} (${DI_FACTS.hours.en}). If it helps, the fastest route is the free AI workflow audit: you get a real proposal within ${DI_FACTS.proposalTurnaroundDays} working days.`,
  bm: `Itu tiada dalam maklumat yang saya ada, dan saya tidak akan teka. Kami boleh sahkan jawapannya untuk anda — WhatsApp ${DI_FACTS.whatsapp}, talian ${DI_FACTS.phone}, atau e-mel ${DI_FACTS.email} (${DI_FACTS.hours.bm}). Cara paling laju ialah audit AI workflow percuma: anda dapat proposal sebenar dalam ${DI_FACTS.proposalTurnaroundDays} hari bekerja.`,
};

function sendAsk(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    // Bound before buffering, the same rule readJsonBodyLocal applies. This is the
    // one endpoint with no session in front of it, and MAX_QUESTION_LENGTH is
    // checked after parsing — an uncapped body is therefore an unbounded allocation
    // per anonymous request, inside a workerd isolate shared with every other
    // in-flight /api call.
    size += chunk.length;
    if (size > MAX_BODY_BYTES) return { error: { status: 413, body: { error: "Payload too large" } } };
    chunks.push(chunk);
  }
  if (chunks.length === 0) return { data: {} };
  try {
    return { data: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { error: { status: 400, body: { error: "Invalid JSON body" } } };
  }
}

export async function handleAskDuta(req, res, clientIp) {
  if (req.method !== "POST") return sendAsk(res, 405, { error: "Method not allowed" });

  // Keyed by source IP because there is no session to key on. The counter lives in
  // a process-global Map (auth.mjs:61), so on a serverless platform this blunts a
  // browser-driven flood rather than metering a determined script.
  const limited = rateLimit(`ask-duta:${String(clientIp ?? "unknown")}`, Date.now(), ASK_LIMIT, ASK_WINDOW_MS);
  if (!limited.allowed) {
    res.setHeader?.("retry-after", String(Math.ceil(limited.retryAfterMs / 1000)));
    return sendAsk(res, 429, { error: "Too many requests" });
  }

  const parsed = await readJsonBody(req);
  if (parsed.error) return sendAsk(res, parsed.error.status, parsed.error.body);

  const question = String(parsed.data?.message ?? "").trim();
  if (!question) return sendAsk(res, 400, { error: "message is required" });
  if (question.length > MAX_QUESTION_LENGTH) {
    return sendAsk(res, 400, { error: `message must be at most ${MAX_QUESTION_LENGTH} characters` });
  }
  const lang = parsed.data?.lang === "en" ? "en" : "bm";

  const local = answerLocally(question, lang);
  if (local) {
    return sendAsk(res, 200, { answer: local.answer, answered: true, topic: local.topic, source: "rule", lang });
  }

  if (llmConfigured()) {
    try {
      const reply = await callModel([
        { role: "system", content: buildAskDutaPrompt(lang) },
        { role: "user", content: question },
      ]);
      return sendAsk(res, 200, { answer: reply.text, answered: true, topic: null, source: "model", lang });
    } catch (err) {
      // Never forward the provider's message: it names hosts and endpoints.
      console.error(`[ask-duta] model failed: ${String(err instanceof Error ? err.message : err).slice(0, 200)}`);
    }
  }

  return sendAsk(res, 200, {
    answer: HANDOFF[lang],
    answered: false,
    topic: "handoff",
    source: "handoff",
    lang,
  });
}
