import { randomUUID } from "node:crypto";
import { createHmac, timingSafeEqual } from "node:crypto";
import { appendFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { dataFile } from "./paths.mjs";
import { usingSupabase, supabaseFetch } from "./store.mjs";
import { getCompanyIdFromReq } from "./auth.mjs";
import { rateLimit } from "./auth.mjs";
import { updateCompanySubscription } from "./companies.mjs";

/**
 * DutaOS payments — HitPay and Billplz checkout sessions + webhook handling.
 *
 * Every checkout attempt creates a payment record (status: pending), then
 * returns the provider's checkout URL so the frontend can redirect the
 * customer. Provider webhooks verify the signature and flip the payment to
 * paid/failed; a confirmed payment upgrades the company's subscription.
 *
 * Storage follows store.mjs: Supabase when configured, JSONL otherwise.
 */

const PAYMENT_TABLE = "payments";
const PAYMENT_STORE = "dutaos-payments";
const CURRENCY = "MYR";
const PROVIDERS = new Set(["hitpay", "billplz", "herepay"]);

const PLANS = {
  starter: { amount: 79900 },
  growth: { amount: 189900 },
};

function planAmount(plan) {
  const p = PLANS[plan];
  return p ? p.amount : null;
}

// ── JSONL backend ──────────────────────────────────────────────────────

function storePath(name) {
  return dataFile(`${name}.jsonl`);
}

async function ensureDir(path) {
  await mkdir(dirname(path), { recursive: true });
}

async function jsonlReadAll(path) {
  try {
    const raw = await readFile(path, "utf8");
    return raw
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => {
        try { return JSON.parse(l); } catch { return null; }
      })
      .filter(Boolean);
  } catch { return []; }
}

async function jsonlWriteAll(path, rows) {
  await ensureDir(path);
  await writeFile(path, rows.map((r) => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""), "utf8");
}

// ── Supabase backend ───────────────────────────────────────────────────

function sbFetch(table, path, init = {}) {
  return supabaseFetch(`${table}${path}`, init);
}

// ── normalization ──────────────────────────────────────────────────────

function normalizePayment(p) {
  return {
    id: p.id,
    companyId: p.company_id,
    provider: p.provider,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    providerPaymentId: p.provider_payment_id ?? null,
    checkoutUrl: p.checkout_url ?? null,
    plan: p.plan ?? null,
    metadata: typeof p.metadata === "string" ? JSON.parse(p.metadata ?? "{}") : (p.metadata ?? {}),
    createdAt: p.created_at,
    updatedAt: p.updated_at,
  };
}

// ── payment record CRUD ────────────────────────────────────────────────

async function createPaymentRecord(payment) {
  const now = new Date().toISOString();
  const row = {
    id: payment.id,
    company_id: payment.companyId,
    provider: payment.provider,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    provider_payment_id: payment.providerPaymentId ?? null,
    checkout_url: payment.checkoutUrl ?? null,
    plan: payment.plan ?? null,
    metadata: JSON.stringify(payment.metadata ?? {}),
    created_at: now,
    updated_at: now,
  };

  if (usingSupabase()) {
    const res = await sbFetch(PAYMENT_TABLE, "", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(row),
    });
    if (!res.ok) throw new Error(`Supabase payment create failed: ${res.status}`);
    const rows = await res.json();
    return normalizePayment(rows[0]);
  }
  const path = storePath(PAYMENT_STORE);
  const rows = await jsonlReadAll(path);
  rows.push(row);
  await jsonlWriteAll(path, rows);
  return normalizePayment(row);
}

async function getPayment(paymentId) {
  if (usingSupabase()) {
    const res = await sbFetch(PAYMENT_TABLE, `?id=eq.${encodeURIComponent(paymentId)}&select=*`);
    if (!res.ok) throw new Error(`Supabase payment get failed: ${res.status}`);
    const rows = await res.json();
    return rows[0] ? normalizePayment(rows[0]) : null;
  }
  const rows = await jsonlReadAll(storePath(PAYMENT_STORE));
  const row = rows.find((r) => r.id === paymentId);
  return row ? normalizePayment(row) : null;
}

async function listPayments(companyId) {
  if (usingSupabase()) {
    const res = await sbFetch(PAYMENT_TABLE, `?company_id=eq.${encodeURIComponent(companyId)}&order=created_at.desc&select=*`);
    if (!res.ok) throw new Error(`Supabase payment list failed: ${res.status}`);
    const rows = await res.json();
    return rows.map(normalizePayment);
  }
  const rows = await jsonlReadAll(storePath(PAYMENT_STORE));
  return rows
    .filter((r) => r.company_id === companyId)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
    .map(normalizePayment);
}

async function updatePaymentStatus(paymentId, status, providerPaymentId = null) {
  const now = new Date().toISOString();
  const fields = { status, updated_at: now };
  if (providerPaymentId) fields.provider_payment_id = providerPaymentId;

  if (usingSupabase()) {
    const res = await sbFetch(PAYMENT_TABLE, `?id=eq.${encodeURIComponent(paymentId)}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error(`Supabase payment update failed: ${res.status}`);
    const rows = await res.json();
    return rows.length ? normalizePayment(rows[0]) : null;
  }
  const path = storePath(PAYMENT_STORE);
  const rows = await jsonlReadAll(path);
  const idx = rows.findIndex((r) => r.id === paymentId);
  if (idx < 0) return null;
  Object.assign(rows[idx], fields);
  await jsonlWriteAll(path, rows);
  return normalizePayment(rows[idx]);
}

// ── provider config ────────────────────────────────────────────────────

function hitpayConfig() {
  return {
    apiKey: process.env.HITPAY_API_KEY,
    secretKey: process.env.HITPAY_SECRET_KEY,
    baseUrl: process.env.HITPAY_BASE_URL ?? "https://api.hitpay.io",
  };
}

function billplzConfig() {
  return {
    apiKey: process.env.BILLPLZ_API_KEY,
    collectionId: process.env.BILLPLZ_COLLECTION_ID,
    baseUrl: process.env.BILLPLZ_BASE_URL ?? "https://www.billplz.com",
  };
}

function herepayConfig() {
  return {
    secretKey: process.env.HEREPAY_SECRET_KEY,
    apiKey: process.env.HEREPAY_API_KEY,
    privateKey: process.env.HEREPAY_PRIVATE_KEY,
    baseUrl: process.env.HEREPAY_BASE_URL ?? "https://uat.herepay.org",
  };
}

// ── provider: HitPay ───────────────────────────────────────────────────

async function hitpayCreatePayment({ amount, orderId, description, returnUrl, callbackUrl, metadata }) {
  const cfg = hitpayConfig();
  if (!cfg.apiKey) throw new Error("HitPay not configured");
  const body = JSON.stringify({
    amount,
    currency: CURRENCY,
    order_id: orderId,
    description,
    return_url: returnUrl,
    callback_url: callbackUrl,
    metadata,
  });
  const res = await fetch(`${cfg.baseUrl}/v1/payments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": cfg.apiKey,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HitPay payment creation failed: ${res.status} ${text}`);
  }
  return await res.json();
}

function hitpayVerifySignature(rawBody, signature, secretKey) {
  if (!signature || !secretKey) return false;
  const expected = createHmac("sha256", secretKey).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ── provider: Billplz ──────────────────────────────────────────────────

async function billplzCreatePayment({ amount, description, callbackUrl, redirectUrl, metadata }) {
  const cfg = billplzConfig();
  if (!cfg.apiKey || !cfg.collectionId) throw new Error("Billplz not configured");
  const body = JSON.stringify({
    collection_id: cfg.collectionId,
    description,
    amount,
    callback_url: callbackUrl,
    redirect_url: redirectUrl,
    metadata,
  });
  const auth = Buffer.from(`${cfg.apiKey}:`).toString("base64");
  const res = await fetch(`${cfg.baseUrl}/api/v3/payments`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Basic ${auth}`,
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Billplz payment creation failed: ${res.status} ${text}`);
  }
  return await res.json();
}

function billplzVerifySignature(rawBody, signature, secretKey) {
  if (!signature || !secretKey) return false;
  const expected = createHmac("sha256", secretKey).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// ── provider: Herepay ────────────────────────────────────────────────────

function herepayChecksum(fields, privateKey) {
  const copy = { ...fields };
  delete copy.checksum;
  const sorted = Object.keys(copy).sort().reduce((obj, key) => {
    obj[key] = copy[key];
    return obj;
  }, {});
  const payload = Object.values(sorted).join(",");
  return createHmac("sha256", privateKey).update(payload).digest("hex");
}

async function herepayCreatePayment({ amount, orderId, description, returnUrl, callbackUrl, name, email, phone, bankPrefix, metadata }) {
  const cfg = herepayConfig();
  if (!cfg.secretKey || !cfg.apiKey || !cfg.privateKey) throw new Error("Herepay not configured");
  if (!bankPrefix) throw new Error("Herepay requires bank_prefix (customer's selected bank)");

  const fields = {
    name,
    email,
    phone: String(phone),
    amount: String(amount),
    description,
    payment_code: orderId,
    payment_method: "Online Banking",
    bank_prefix: bankPrefix,
    callback_url: callbackUrl,
    redirect_url: returnUrl,
  };
  fields.checksum = herepayChecksum(fields, cfg.privateKey);

  const formBody = new URLSearchParams(fields).toString();
  const res = await fetch(`${cfg.baseUrl}/api/v1/herepay/initiate`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      "SecretKey": cfg.secretKey,
      "XApiKey": cfg.apiKey,
    },
    body: formBody,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Herepay payment creation failed: ${res.status} ${text}`);
  }
  // Herepay returns an HTML page that auto-redirects to the bank.
  // We extract the form action URL (the bank's FPX page) from the HTML.
  const html = await res.text();
  const match = html.match(/<form[^>]*action=["']([^"']+)["']/i);
  const checkoutUrl = match ? match[1] : null;
  if (!checkoutUrl) throw new Error("Herepay did not return a redirect URL");
  return { id: orderId, url: checkoutUrl };
}

function herepayVerifyChecksum(fields, privateKey) {
  const expected = herepayChecksum(fields, privateKey);
  const received = fields.checksum;
  if (!received || expected.length !== received.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

// ── checkout creation ──────────────────────────────────────────────────

function siteBaseUrl(req) {
  const proto = req.headers["x-forwarded-proto"] ?? (req.socket?.encrypted ? "https" : "http");
  const host = req.headers.host;
  return host ? `${proto}://${host}` : process.env.WEBHOOK_BASE_URL ?? "";
}

async function createCheckout(companyId, { provider, plan, baseUrl }) {
  if (!PROVIDERS.has(provider)) throw new Error("Unknown payment provider");
  const amount = planAmount(plan);
  if (amount === null) throw new Error("Unknown plan");
  const orderId = `dutaos-${plan}-${randomUUID().slice(0, 8)}`;
  const description = `DutaOS ${plan} subscription`;
  const webhookBase = process.env.WEBHOOK_BASE_URL ?? baseUrl;
  const callbackUrl = `${webhookBase}/api/payments/webhook/${provider}`;
  const returnUrl = `${webhookBase}/billing?payment=success&order_id=${orderId}`;
  const cancelUrl = `${webhookBase}/billing?payment=cancelled&order_id=${orderId}`;

  const metadata = { companyId, plan, orderId };

  let providerResult;
  if (provider === "hitpay") {
    providerResult = await hitpayCreatePayment({
      amount,
      orderId,
      description,
      returnUrl: returnUrl,
      callbackUrl,
      metadata,
    });
  } else if (provider === "billplz") {
    providerResult = await billplzCreatePayment({
      amount,
      description,
      callbackUrl,
      redirectUrl: returnUrl,
      metadata,
    });
  } else if (provider === "herepay") {
    // Herepay requires customer details and bank selection
    const customerName = metadata.customerName ?? "Customer";
    const customerEmail = metadata.customerEmail ?? "";
    const customerPhone = metadata.customerPhone ?? "0123456789";
    const bankPrefix = metadata.bankPrefix;
    providerResult = await herepayCreatePayment({
      amount,
      orderId,
      description,
      returnUrl,
      callbackUrl,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      bankPrefix,
      metadata,
    });
  }

  const checkoutUrl = providerResult.url ?? providerResult.checkout_url ?? providerResult.payment_url;
  if (!checkoutUrl) throw new Error(`Provider did not return a checkout URL`);

  const payment = await createPaymentRecord({
    id: randomUUID(),
    companyId,
    provider,
    amount,
    currency: CURRENCY,
    status: "pending",
    providerPaymentId: providerResult.id ?? null,
    checkoutUrl,
    plan,
    metadata,
  });

  return { payment, checkoutUrl };
}

// ── webhook handling ───────────────────────────────────────────────────

async function processHitpayWebhook(rawBody, headers) {
  const cfg = hitpayConfig();
  const signature = headers["x-signature"] ?? headers["x-hitpay-signature"];
  if (!hitpayVerifySignature(rawBody, signature, cfg.secretKey)) {
    return { status: 401, body: { error: "Invalid signature" } };
  }
  const payload = JSON.parse(rawBody.toString("utf8"));
  const orderId = payload.order_id ?? payload.metadata?.orderId;
  const status = payload.paid === true ? "paid" : "failed";
  const payment = await updatePaymentStatusByOrderId(orderId, status, payload.id ?? null);
  if (payment && status === "paid") {
    await upgradeCompany(payment.companyId, payment.plan);
  }
  return { status: 200, body: { received: true } };
}

async function processBillplzWebhook(rawBody, headers) {
  const cfg = billplzConfig();
  const signature = headers["x-signature"];
  if (!billplzVerifySignature(rawBody, signature, cfg.secretKey ?? cfg.apiKey)) {
    return { status: 401, body: { error: "Invalid signature" } };
  }
  const payload = JSON.parse(rawBody.toString("utf8"));
  const orderId = payload.metadata?.orderId;
  const status = payload.paid === true ? "paid" : "failed";
  const payment = await updatePaymentStatusByOrderId(orderId, status, payload.id ?? null);
  if (payment && status === "paid") {
    await upgradeCompany(payment.companyId, payment.plan);
  }
  return { status: 200, body: { received: true } };
}

async function processHerepayWebhook(rawBody, headers) {
  const cfg = herepayConfig();
  const contentType = headers["content-type"] ?? "";
  let fields;
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const params = new URLSearchParams(rawBody.toString("utf8"));
    fields = Object.fromEntries(params.entries());
  } else {
    try { fields = JSON.parse(rawBody.toString("utf8")); } catch { return { status: 400, body: { error: "Invalid payload" } }; }
  }
  if (!herepayVerifyChecksum(fields, cfg.privateKey)) {
    return { status: 401, body: { error: "Invalid checksum" } };
  }
  const orderId = fields.payment_code;
  const statusCode = fields.status_code;
  const status = statusCode === "00" ? "paid" : statusCode === "29" ? "pending" : "failed";
  const payment = await updatePaymentStatusByOrderId(orderId, status, fields.reference_code ?? null);
  if (payment && status === "paid") {
    await upgradeCompany(payment.companyId, payment.plan);
  }
  return { status: 200, body: "OK" };
}

async function updatePaymentStatusByOrderId(orderId, status, providerPaymentId) {
  if (usingSupabase()) {
    const res = await sbFetch(PAYMENT_TABLE, `?metadata=ilike.%${orderId}%&select=*`);
    if (!res.ok) throw new Error(`Supabase payment lookup failed: ${res.status}`);
    const rows = await res.json();
    if (rows.length === 0) return null;
    const payment = normalizePayment(rows[0]);
    return updatePaymentStatus(payment.id, status, providerPaymentId);
  }
  const rows = await jsonlReadAll(storePath(PAYMENT_STORE));
  const row = rows.find((r) => {
    try { return JSON.parse(r.metadata ?? "{}").orderId === orderId; } catch { return false; }
  });
  if (!row) return null;
  return updatePaymentStatus(row.id, status, providerPaymentId);
}

async function upgradeCompany(companyId, plan) {
  const tier = plan === "growth" ? "growth" : "starter";
  await updateCompanySubscription(companyId, { subscriptionTier: tier, subscriptionStatus: "active" });
}

// ── raw body reader ────────────────────────────────────────────────────

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

// ── local JSON sender ──────────────────────────────────────────────────

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "cache-control": "no-store",
  });
  res.end(payload);
}

// ── route handlers ─────────────────────────────────────────────────────

async function handleBillingCheckout(req, res) {
  const companyId = await getCompanyIdFromReq(req);
  if (!companyId) return sendJson(res, 401, { error: "Not authenticated" });
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });

  const parsed = await readJsonBodyLocal(req);
  if (parsed.error) return sendJson(res, parsed.error.status, parsed.error.body);
  const { provider, plan } = parsed.data ?? {};
  if (!provider || !plan) return sendJson(res, 400, { error: "provider and plan are required" });

  const baseUrl = siteBaseUrl(req);
  try {
    const { payment, checkoutUrl } = await createCheckout(companyId, { provider, plan, baseUrl });
    return sendJson(res, 200, { payment, checkoutUrl });
  } catch (err) {
    return sendJson(res, 400, { error: err.message });
  }
}

async function handlePaymentsList(req, res) {
  const companyId = await getCompanyIdFromReq(req);
  if (!companyId) return sendJson(res, 401, { error: "Not authenticated" });
  if (req.method !== "GET") return sendJson(res, 405, { error: "Method not allowed" });
  const payments = await listPayments(companyId);
  return sendJson(res, 200, { payments });
}

async function handleHitpayWebhook(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  const rl = webhookRateLimit(req);
  if (!rl.allowed) return sendJson(res, 429, { error: "Too many requests" });
  const rawBody = await readRawBody(req);
  const result = await processHitpayWebhook(rawBody, req.headers);
  return sendJson(res, result.status, result.body);
}

async function handleBillplzWebhook(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  const rl = webhookRateLimit(req);
  if (!rl.allowed) return sendJson(res, 429, { error: "Too many requests" });
  const rawBody = await readRawBody(req);
  const result = await processBillplzWebhook(rawBody, req.headers);
  return sendJson(res, result.status, result.body);
}

async function handleHerepayWebhook(req, res) {
  if (req.method !== "POST") return sendJson(res, 405, { error: "Method not allowed" });
  const rl = webhookRateLimit(req);
  if (!rl.allowed) return sendJson(res, 429, { error: "Too many requests" });
  const rawBody = await readRawBody(req);
  const result = await processHerepayWebhook(rawBody, req.headers);
  // Herepay expects plain text "OK" response
  if (result.status === 200) {
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    res.end("OK");
  } else {
    return sendJson(res, result.status, result.body);
  }
}

function webhookRateLimit(req) {
  const ip = String(req.headers["x-forwarded-for"] ?? "").split(",")[0]?.trim() || "unknown";
  return rateLimit(`payments-webhook:${ip}`, Date.now(), 60, 60_000);
}

async function readJsonBodyLocal(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 32 * 1024) return { error: { status: 413, body: { error: "Payload too large" } } };
    chunks.push(chunk);
  }
  try { return { data: JSON.parse(Buffer.concat(chunks).toString("utf8")) }; }
  catch { return { error: { status: 400, body: { error: "Invalid JSON body" } } }; }
}

export {
  createCheckout,
  getPayment,
  listPayments,
  updatePaymentStatus,
  handleBillingCheckout,
  handlePaymentsList,
  handleHitpayWebhook,
  handleBillplzWebhook,
  handleHerepayWebhook,
};
