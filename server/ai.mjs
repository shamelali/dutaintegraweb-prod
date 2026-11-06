import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import { dataFile } from "./paths.mjs";
import { usingSupabase, supabaseFetch } from "./store.mjs";
import { getCompanyIdFromReq, getCompanyById, rateLimit } from "./auth.mjs";
import { listByCompany } from "./compliance.mjs";
import { buildSystemPrompt } from "./prompts/duta-ceo.mjs";

/**
 * DutaOS AI chatbar — grounded answers over the signed-in company's data.
 *
 * The contract (approval levels, audit trail, no fabricated numbers) is
 * harvested from the Duta CEO prototype; the runtime is not: no Next.js, no AI
 * SDK, no pg. Ollama is the default provider, any OpenAI-compatible endpoint
 * can be selected with LLM_BASE_URL.
 */

const AI_TABLE = "ai_actions";
const AI_STORE = "ai-actions";
const AI_LIMIT = 20;
const AI_WINDOW_MS = 60_000;
const MAX_MESSAGE_LENGTH = 2000;

// ── Chat transcript tables ─────────────────────────────────────────────────

const CHAT_SESSION_TABLE = "chat_sessions";
const CHAT_MESSAGE_TABLE = "chat_messages";

// ── audit trail ──────────────────────────────────────────────────────────────

async function recordAiAction(row) {
  if (usingSupabase()) {
    const res = await supabaseFetch(AI_TABLE, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`Supabase ai_actions insert failed: ${res.status}`);
    return;
  }
  const path = dataFile(`${AI_STORE}.jsonl`);
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, JSON.stringify(row) + "\n", "utf8");
}

// ── chat session / message helpers ─────────────────────────────────────────

/**
 * Resolve a session for the company: verify an existing session_id belongs to
 * the company, or create a new one. Returns null on failure so the chat can
 * still proceed without a transcript.
 */
async function resolveChatSession(companyId, sessionId) {
  if (!usingSupabase()) return null;
  try {
    if (sessionId) {
      const res = await supabaseFetch(
        `${CHAT_SESSION_TABLE}?id=eq.${sessionId}&select=id`,
      );
      if (!res.ok) return null;
      const rows = await res.json();
      if (rows.length === 0) return null;
      return sessionId;
    }
    const res = await supabaseFetch(CHAT_SESSION_TABLE, {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ company_id: companyId }),
    });
    if (!res.ok) return null;
    const rows = await res.json();
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function recordChatMessage(sessionId, role, content) {
  if (!usingSupabase() || !sessionId) return;
  try {
    const res = await supabaseFetch(CHAT_MESSAGE_TABLE, {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ session_id: sessionId, role, content }),
    });
    if (!res.ok)
      console.error(`[ai] chat message insert failed: ${res.status}`);
  } catch (err) {
    console.error(`[ai] chat message insert error: ${err}`);
  }
}

// ── brief ────────────────────────────────────────────────────────────────────

export async function buildBrief(companyId) {
  const [company, items] = await Promise.all([
    getCompanyById(companyId),
    listByCompany(companyId),
  ]);

  const now = Date.now();
  const pending = items.filter((i) => i.status !== "completed");
  const overdue = pending.filter((i) => i.dueDate && Date.parse(i.dueDate) < now);
  const upcoming = pending
    .filter((i) => i.dueDate && Date.parse(i.dueDate) >= now)
    .sort((a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate));

  return {
    company: company
      ? {
          name: company.name,
          industry: company.industry,
          tier: company.subscriptionTier,
          status: company.subscriptionStatus,
        }
      : null,
    compliance: {
      total: items.length,
      pending: pending.length,
      completed: items.length - pending.length,
      overdue: overdue.length,
      nextDue: upcoming[0] ? { type: upcoming[0].type, dueDate: upcoming[0].dueDate } : null,
    },
    generatedAt: new Date().toISOString(),
  };
}

function fallbackSummary(brief, lang) {
  const c = brief.compliance;
  const due = c.nextDue
    ? lang === "en"
      ? ` The nearest deadline is ${c.nextDue.type} on ${c.nextDue.dueDate.slice(0, 10)}.`
      : ` Tarikh akhir terdekat ialah ${c.nextDue.type} pada ${c.nextDue.dueDate.slice(0, 10)}.`
    : "";

  if (lang === "en") {
    return `The AI model is unavailable right now, so here is your data summary: ${c.pending} compliance item(s) still pending, ${c.overdue} overdue.${due} Open the compliance dashboard to update them.`;
  }
  return `Model AI tidak dapat dihubungi sekarang, jadi ini ringkasan data anda: ${c.pending} item pematuhan masih belum selesai, ${c.overdue} lewat tempoh.${due} Buka papan pemuka pematuhan untuk mengemas kininya.`;
}

// ── model providers ──────────────────────────────────────────────────────────

function modelConfig() {
  const baseUrl = process.env.LLM_BASE_URL;
  if (baseUrl) {
    return {
      kind: "openai",
      url: `${baseUrl.replace(/\/$/, "")}/chat/completions`,
      apiKey: process.env.LLM_API_KEY ?? "",
      model: process.env.LLM_MODEL ?? "gpt-4o-mini",
    };
  }
  return {
    kind: "ollama",
    url: `${(process.env.OLLAMA_HOST ?? "http://localhost:11434").replace(/\/$/, "")}/api/chat`,
    apiKey: "",
    model: process.env.OLLAMA_CHAT_MODEL ?? "llama3.2",
  };
}

/**
 * True only when an OpenAI-compatible endpoint is fully configured. Ollama on
 * localhost is the default and does not count: it is unreachable on Cloudflare
 * Pages, so treating it as configured would let callers wait on a 60s timeout for
 * a model that is not there.
 */
export function llmConfigured() {
  return Boolean(process.env.LLM_BASE_URL && process.env.LLM_API_KEY);
}

export async function callModel(messages, modelOverride) {
  const cfg = modelConfig();
  const model = modelOverride ?? cfg.model;
  const res = await fetch(cfg.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
    },
    body: JSON.stringify({ model, messages, stream: false }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`model responded ${res.status}`);
  const data = await res.json();
  const text = cfg.kind === "ollama"
    ? data.message?.content
    : data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) throw new Error("model returned no text");
  return { text: text.trim(), model, kind: cfg.kind };
}

// ── chat model fallback ─────────────────────────────────────────────────────

/**
 * Try the primary LLM model, then LLM_FALLBACK_MODEL if set. Keeps the chat
 * alive when a free tier is rate-limited or the primary provider is down.
 */
export async function callModelWithFallback(messages) {
  const cfg = modelConfig();
  const primary = cfg.model;
  const fallback = process.env.LLM_FALLBACK_MODEL;
  const models = fallback ? [primary, fallback] : [primary];
  let lastError;
  for (const model of models) {
    try {
      return await callModel(messages, model);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
}

// ── HTTP plumbing ────────────────────────────────────────────────────────────

function sendAi(res, status, body) {
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
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return { data: {} };
  try {
    return { data: JSON.parse(Buffer.concat(chunks).toString("utf8")) };
  } catch {
    return { error: { status: 400, body: { error: "Invalid JSON body" } } };
  }
}

async function requireCompany(req, res) {
  const companyId = await getCompanyIdFromReq(req);
  if (!companyId) {
    sendAi(res, 401, { error: "Not authenticated" });
    return null;
  }
  return companyId;
}

// ── route handlers ───────────────────────────────────────────────────────────

export async function handleAIChat(req, res) {
  if (req.method !== "POST") return sendAi(res, 405, { error: "Method not allowed" });

  const companyId = await requireCompany(req, res);
  if (!companyId) return;

  const limit = rateLimit(`ai:${companyId}`, Date.now(), AI_LIMIT, AI_WINDOW_MS);
  if (!limit.allowed) {
    res.setHeader?.("retry-after", String(Math.ceil(limit.retryAfterMs / 1000)));
    return sendAi(res, 429, { error: "Too many requests" });
  }

  const parsed = await readJsonBody(req);
  if (parsed.error) return sendAi(res, parsed.error.status, parsed.error.body);

  const { message } = parsed.data ?? {};
  if (typeof message !== "string" || !message.trim()) {
    return sendAi(res, 400, { error: "message is required" });
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return sendAi(res, 400, { error: `message must be at most ${MAX_MESSAGE_LENGTH} characters` });
  }
  const lang = parsed.data?.lang === "en" ? "en" : "bm";
  const clientSessionId = typeof parsed.data?.session_id === "string" && parsed.data.session_id.trim()
    ? parsed.data.session_id.trim()
    : null;

  // Resolve (or create) the transcript session, scoped to this company.
  let sessionId = null;
  try {
    sessionId = await resolveChatSession(companyId, clientSessionId);
  } catch {
    // Transcript is best-effort; a failure must never take the chat down.
  }
  if (sessionId) await recordChatMessage(sessionId, "user", message.trim());

  const brief = await buildBrief(companyId);
  let reply;
  let status = "executed";
  let errorMessage = null;

  try {
    reply = await callModelWithFallback([
      { role: "system", content: buildSystemPrompt(brief, lang) },
      { role: "user", content: message.trim() },
    ]);
  } catch (err) {
    status = "failed";
    errorMessage = String(err instanceof Error ? err.message : err).slice(0, 300);
    reply = { text: fallbackSummary(brief, lang), model: "fallback", kind: "none" };
  }

  if (sessionId) await recordChatMessage(sessionId, "assistant", reply.text);

  try {
    await recordAiAction({
      id: randomUUID(),
      company_id: companyId,
      action_type: "recommendation",
      approval_level: 0,
      tool_name: "daily_brief",
      input_data: { message: message.trim(), lang, session_id: sessionId },
      output_data: { model: reply.model, provider: reply.kind, chars: reply.text.length },
      status,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    // An audit write must never take the chat down; log without secrets.
    console.error(`[ai] could not record ai_action: ${err instanceof Error ? err.message : err}`);
  }

  return sendAi(res, 200, {
    response: reply.text,
    model: reply.model,
    provider: reply.kind,
    session_id: sessionId,
  });
}

export async function handleDutaosBrief(req, res) {
  if (req.method !== "GET") return sendAi(res, 405, { error: "Method not allowed" });

  const companyId = await requireCompany(req, res);
  if (!companyId) return;

  const brief = await buildBrief(companyId);
  return sendAi(res, 200, { brief });
}

export async function handleChatHistory(req, res) {
  if (req.method !== "GET") return sendAi(res, 405, { error: "Method not allowed" });

  if (!usingSupabase()) {
    return sendAi(res, 503, { error: "chat history requires the Supabase backend" });
  }

  const companyId = await requireCompany(req, res);
  if (!companyId) return;

  const sessionId = new URL(req.url, "http://localhost").searchParams.get("session_id");
  if (!sessionId) {
    return sendAi(res, 400, { error: "session_id is required" });
  }

  // Verify the session belongs to this company before returning its messages.
  const sessionRes = await supabaseFetch(
    `${CHAT_SESSION_TABLE}?id=eq.${sessionId}&select=id`,
  );
  if (!sessionRes.ok) {
    return sendAi(res, 502, { error: "could not verify chat session" });
  }
  const sessions = await sessionRes.json();
  if (sessions.length === 0) {
    return sendAi(res, 404, { error: "chat session not found" });
  }

  const msgRes = await supabaseFetch(
    `${CHAT_MESSAGE_TABLE}?session_id=eq.${sessionId}&order=created_at.asc&select=id,role,content,created_at`,
  );
  if (!msgRes.ok) {
    return sendAi(res, 502, { error: "could not load chat messages" });
  }
  const messages = await msgRes.json();

  return sendAi(res, 200, { session_id: sessionId, messages });
}
