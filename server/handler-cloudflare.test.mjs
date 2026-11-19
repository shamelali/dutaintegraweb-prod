import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { handleApi } from "./handler-cloudflare.mjs";

/**
 * The first tests over the entrypoint production actually runs.
 *
 * server/handler-cloudflare.mjs is what functions/api/[[path]].js imports on
 * Cloudflare Pages; handler.test.mjs covers the Vercel/Node entrypoint, which
 * shares no route table with it. Everything here was red before the fixes it
 * now pins: the ops family answering 500 to unauthenticated callers, and the
 * portal family never resolving a token — createSupabaseClient nested auth
 * under from(), so verifyUser returned null for every user.
 */

const ORIGIN = "https://www.dutaintegra.my";
let ipSeq = 0;
function nextIp() {
  return `203.0.113.${++ipSeq % 250}`;
}

function call(pathname, init = {}) {
  const req = new Request(`${ORIGIN}${pathname}`, {
    ...init,
    headers: { "x-forwarded-for": nextIp(), ...(init.headers ?? {}) },
  });
  return handleApi(req);
}

test("an assessment follow-up stores the lead and sends both notifications", async (context) => {
  const settings = {
    ALLOWED_ORIGINS: ORIGIN,
    SUPABASE_URL: "https://assessment-storage.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "fixture-storage-key",
    CONTACT_INBOX_EMAIL: "team@example.test",
    EMAIL_FROM: "Duta Integra QA <sender@example.test>",
    RESEND_API_KEY: "fixture-resend-key",
    BREVO_API_KEY: "fixture-mail-key",
  };
  const previous = Object.fromEntries(
    Object.keys(settings).map((key) => [key, process.env[key]]),
  );
  Object.assign(process.env, settings);
  context.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  const requests = [];
  const log = context.mock.method(console, "log", () => {});
  const leadsUrl = settings.SUPABASE_URL + "/rest/v1/leads";
  const mailUrl = "https://api.brevo.com/v3/smtp/email";
  context.mock.method(globalThis, "fetch", async (url, init) => {
    requests.push({ url, method: init.method, body: JSON.parse(init.body) });
    if (url === leadsUrl && init.method === "POST") return Response.json([], { status: 201 });
    if (url === mailUrl && init.method === "POST") return Response.json({}, { status: 201 });
    if (url.startsWith(leadsUrl + "?id=eq.") && init.method === "PATCH") return new Response(null, { status: 204 });
    throw new Error("Unexpected follow-up request");
  });

  const service = "Digital assessment follow-up";
  const csrf = "assessment-test-token";
  const response = await call("/api/send-email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: ORIGIN,
      "x-csrf-token": csrf,
      cookie: `csrf_token=${csrf}`,
    },
    body: JSON.stringify({
      name: "Assessment Visitor",
      email: "visitor@example.test",
      company: "Example Workshop",
      service,
      source: "contact-form",
      message: "Digital readiness score: 40/100",
    }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { success: true, delivered: true });
  assert.equal(requests.length, 4);
  const [lead, notification, emailed, receipt] = requests;
  assert.equal(lead.url, leadsUrl);
  assert.equal(lead.body.service, service);
  assert.equal(lead.body.message, "Digital readiness score: 40/100");
  assert.equal(notification.url, mailUrl);
  assert.deepEqual(notification.body.sender, { name: "Duta Integra QA", email: "sender@example.test" });
  assert.deepEqual(notification.body.to, [{ email: settings.CONTACT_INBOX_EMAIL }]);
  assert.match(notification.body.textContent, /Digital readiness score: 40\/100/);
  assert.equal(emailed.url, leadsUrl + "?id=eq." + lead.body.id);
  assert.ok(emailed.body.emailed_at);
  assert.equal(receipt.url, mailUrl);
  assert.deepEqual(receipt.body.to, [{ email: "visitor@example.test" }]);
  assert.match(receipt.body.textContent, /^Hi Assessment Visitor,\n\nThanks for reaching out/);
  assert.ok(log.mock.calls.some(({ arguments: [message] }) =>
    typeof message === "string" && message.endsWith("delivered=true autoReplyAccepted=true")));
});

describe("ops task surface removed; admin token still gated", () => {
  let originalFetch;

  before(() => {
    delete process.env.ADMIN_TOKEN;
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
    originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  test("the /api/ops task routes are gone", async () => {
    const id = "0f1e2d3c-4b5a-4678-9abc-def012345678";
    const paths = [
      "/api/ops/tasks",
      "/api/ops/task-stats",
      "/api/ops/audit-log",
      `/api/ops/tasks/${id}`,
      `/api/ops/tasks/${id}/approve`,
      `/api/ops/tasks/${id}/request-approval`,
    ];
    for (const pathname of paths) {
      const res = await call(pathname);
      assert.equal(res.status, 404, `${pathname} still answers ${res.status}`);
    }
  });

  test("the public ops routes still answer", async () => {
    // /api/ops/feed, /consent and /events are the autonomous-ops endpoints and
    // gate themselves; removing the task family must not take them down.
    for (const pathname of ["/api/ops/feed", "/api/ops/consent"]) {
      const res = await call(pathname);
      assert.notEqual(res.status, 404, `${pathname} disappeared with the task routes`);
      assert.notEqual(res.status, 500, `${pathname} crashed`);
    }
  });

  test("ADMIN_TOKEN is read per call, so a valid token authenticates", async () => {
    // functions/api/[[path]].js copies the Pages bindings into process.env
    // inside the request. A module-scope capture meant this path could never
    // authenticate, whatever the deployment configured.
    process.env.ADMIN_TOKEN = "cf-ops-test-token";
    try {
      const good = await call("/admin/clients", { headers: { "x-admin-token": "cf-ops-test-token" } });
      assert.equal(good.status, 200, `expected 200, got ${good.status}`);
      const bad = await call("/admin/clients", { headers: { "x-admin-token": "not-it" } });
      assert.equal(bad.status, 401);
    } finally {
      delete process.env.ADMIN_TOKEN;
    }
  });

  test("the admin routes fail closed with no ADMIN_TOKEN configured", async () => {
    const res = await call("/admin/clients");
    assert.equal(res.status, 401);
  });
});

// ── the authenticated portal path ─────────────────────────────────────────────

const UID = "11111111-2222-3333-4444-555555555555";

const PROPOSAL_ROW = {
  id: "aaaa0000-0000-0000-0000-000000000001",
  client_id: UID,
  title: "Automation, phase one",
  summary: "Ticket triage and an intake bot.",
  scope: ["triage"],
  amount_myr: 12000,
  status: "draft",
  created_at: "2026-10-29T00:00:00Z",
};

/**
 * Stubs the two Supabase surfaces the portal handlers touch: the auth
 * userinfo endpoint that verifyUser calls, and the REST rows.
 */
function stubSupabase({ validToken = true } = {}) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    const json = (body, status) =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (url.includes("/auth/v1/")) {
      return validToken
        ? json({ id: UID, aud: "authenticated", role: "authenticated" }, 200)
        : json({ error: "invalid token" }, 401);
    }
    return json([PROPOSAL_ROW], 200);
  };
  return {
    calls,
    restore: () => { globalThis.fetch = original; },
    rest: () => calls.filter((c) => c.url.includes("/rest/v1/")),
  };
}

async function asClient(pathname, init = {}) {
  const req = new Request(`${ORIGIN}${pathname}`, {
    ...init,
    headers: {
      "x-forwarded-for": nextIp(),
      authorization: `Bearer jwt-for-${UID}`,
      ...(init.headers ?? {}),
    },
  });
  return handleApi(req);
}

describe("portal proposals + projects — workspace_* tables, working auth", () => {
  let env;
  before(() => {
    env = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      ADMIN_TOKEN: process.env.ADMIN_TOKEN,
    };
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
    delete process.env.ADMIN_TOKEN;
  });
  after(() => { Object.assign(process.env, env); });

  test("a bearer token authenticates, and the read is scoped to that client", async () => {
    const stub = stubSupabase();
    try {
      const res = await asClient("/api/portal/proposals");
      const text = await res.text();
      assert.equal(res.status, 200, `expected 200, got ${text.slice(0, 160)}`);
      const body = JSON.parse(text);
      assert.equal(body.proposals.length, 1);
      const [get] = stub.rest();
      assert.match(get.url, /\/rest\/v1\/workspace_proposals\?/);
      assert.match(get.url, new RegExp(`client_id=eq\\.${UID}`));
      assert.match(get.url, /order=created_at\.desc/);
    } finally {
      stub.restore();
    }
  });

  test("an unverifiable token is a 401, not a crash", async () => {
    const stub = stubSupabase({ validToken: false });
    try {
      const res = await asClient("/api/portal/proposals");
      assert.equal(res.status, 401);
      assert.equal(stub.rest().length, 0, "must not reach the datastore");
    } finally {
      stub.restore();
    }
  });

  test("POST writes the columns the portal UI reads", async () => {
    const stub = stubSupabase();
    try {
      const res = await asClient("/api/portal/proposals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: "Phase two", description: "Reporting", totalAmount: 8000, tier: "growth" }),
      });
      assert.equal(res.status, 201, `expected 201, got ${res.status}`);
      const post = stub.rest().find((c) => c.init.method === "POST");
      const row = JSON.parse(post.init.body);
      assert.equal(row.summary, "Reporting");
      assert.equal(row.amount_myr, 8000);
      assert.deepEqual(row.scope, []);
      assert.equal(row.client_id, UID);
      assert.ok(!("tier" in row), "workspace_proposals has no tier column");
      assert.ok(!("total_amount" in row), "the Phase 3 column name must not survive");
    } finally {
      stub.restore();
    }
  });

  test("PATCH accepts a status the check constraint allows and refuses one it does not", async () => {
    const stub = stubSupabase();
    try {
      const bad = await asClient(`/api/portal/proposals/${PROPOSAL_ROW.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });
      assert.equal(bad.status, 400, "rejected is not in the workspace_proposals status check");

      const good = await asClient(`/api/portal/proposals/${PROPOSAL_ROW.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "declined" }),
      });
      assert.equal(good.status, 200);
      const patch = stub.rest().find((c) => c.init.method === "PATCH");
      assert.match(patch.url, /workspace_proposals\?/);
      assert.match(patch.url, new RegExp(`client_id=eq\\.${UID}`), "the write must stay ownership-scoped");
    } finally {
      stub.restore();
    }
  });

  test("projects reads workspace_projects", async () => {
    const stub = stubSupabase();
    try {
      const res = await asClient("/api/portal/projects");
      assert.equal(res.status, 200);
      const [get] = stub.rest();
      assert.match(get.url, /\/rest\/v1\/workspace_projects\?/);
      assert.match(get.url, new RegExp(`client_id=eq\\.${UID}`));
    } finally {
      stub.restore();
    }
  });
});

describe("portal auth — the route names the React portal actually calls", () => {
  let env;
  before(() => {
    env = {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
  });
  after(() => { Object.assign(process.env, env); });

  test("POST /api/portal/login validates the body instead of answering 404", async () => {
    const res = await call("/api/portal/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    assert.equal(res.status, 400, "a missing body must be a validation error, not an unrouted 404");
    assert.match((await res.json()).error, /Email and password/);
  });

  test("GET /api/portal/me without a token is 401, not 404", async () => {
    const res = await call("/api/portal/me");
    assert.equal(res.status, 401);
  });

  test("POST /api/portal/logout clears di_session", async () => {
    const res = await call("/api/portal/logout", { method: "POST" });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("set-cookie") ?? "", /di_session=.*Max-Age=0/);
  });
});

describe("DutaOS auth, compliance and catalog on the Pages entrypoint", () => {
  let originalFetch;
  let sessions;

  before(() => {
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
    sessions = [];
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (input, init = {}) => {
      const url = new URL(String(input));
      const method = (init.method ?? "GET").toUpperCase();
      const body = init.body ? JSON.parse(init.body) : null;
      if (url.pathname.endsWith("/dutaos_sessions")) {
        if (method === "POST") {
          const row = Array.isArray(body) ? body[0] : body;
          sessions.push(row);
          return Response.json([row], { status: 201 });
        }
        if (method === "GET") {
          const tokenHash = (url.searchParams.get("token_hash") ?? "").replace(/^eq\./, "");
          return Response.json(sessions.filter((s) => s.token_hash === tokenHash));
        }
        return Response.json([]);
      }
      if (method === "POST") return Response.json([body], { status: 201 });
      return Response.json([]);
    };
  });

  after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  async function signup() {
    const res = await call("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: `cf-${nextIp()}@example.my`,
        password: "securePass1",
        companyName: "CF Test Sdn Bhd",
      }),
    });
    assert.equal(res.status, 201);
    const setCookie = res.headers.get("set-cookie") ?? "";
    assert.match(setCookie, /dutaos_session=/, "signup must mint a DutaOS session");
    assert.doesNotMatch(setCookie, /(^|,\s*)di_session=/, "must not clobber the portal cookie");
    return { cookie: setCookie.split(";")[0] };
  }

  test("signup authenticates, and compliance answers with that session", async () => {
    const { cookie } = await signup();
    const res = await call("/api/compliance-items", { headers: { cookie } });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.deepEqual(body.items, []);
  });

  test("compliance without a session is 401, not a crash", async () => {
    const res = await call("/api/compliance-items");
    assert.equal(res.status, 401);
  });

  test("catalog is closed to anonymous callers and open to a DutaOS session", async () => {
    const anonymous = await call("/api/catalog/items");
    assert.equal(anonymous.status, 401);

    const { cookie } = await signup();
    const list = await call("/api/catalog/items", { headers: { cookie } });
    assert.equal(list.status, 200);

    const created = await call("/api/catalog/items", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ title: "CF chair" }),
    });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).item.title, "CF chair");
  });

  test("the DutaOS brief is session-gated and zeroed for a fresh company", async () => {
    const anonymous = await call("/api/dutaos/brief");
    assert.equal(anonymous.status, 401);

    const { cookie } = await signup();
    const res = await call("/api/dutaos/brief", { headers: { cookie } });
    assert.equal(res.status, 200);
    const { brief } = await res.json();
    assert.equal(brief.compliance.pending, 0);
    assert.equal(brief.compliance.overdue, 0);
    assert.equal(brief.compliance.nextDue, null);
  });

  test("chat on Pages is session-gated and falls back when the model call fails", async () => {
    const anonymous = await call("/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi" }),
    });
    assert.equal(anonymous.status, 401);

    const { cookie } = await signup();
    const res = await call("/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json", cookie },
      body: JSON.stringify({ message: "What should I do this month?", lang: "en" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.model, "fallback");
    assert.match(body.response, /0 compliance item\(s\) still pending, 0 overdue/);
  });
});

describe("DutaOS billing and company profile are routed in the deployed fork", () => {
  // Until 2026-11-01 the fork had no payments or companies routes at all, so
  // /billing loaded the React page and then 404'd its own data. Live probe:
  // /api/companies and /api/billing/payments both answered 404 on
  // https://dutaintegra.my while /api/health answered 200.
  let originalFetch;

  before(() => {
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
    delete process.env.HITPAY_API_KEY;
    delete process.env.HITPAY_SECRET_KEY;
    delete process.env.BILLPLZ_API_KEY;
    delete process.env.BILLPLZ_COLLECTION_ID;
    originalFetch = globalThis.fetch;
    globalThis.fetch = async () => new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  after(() => {
    globalThis.fetch = originalFetch;
  });

  test("/api/companies refuses an anonymous caller instead of 404", async () => {
    const res = await call("/api/companies");
    assert.equal(res.status, 401);
  });

  test("/api/companies/:id PATCH is routed", async () => {
    const res = await call(`/api/companies/${"00000000-0000-4000-8000-000000000000"}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Nope" }),
    });
    assert.equal(res.status, 401);
  });

  test("/api/billing/checkout and /api/billing/payments are routed", async () => {
    const checkout = await call("/api/billing/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: "hitpay", plan: "starter" }),
    });
    assert.equal(checkout.status, 401);

    const list = await call("/api/billing/payments");
    assert.equal(list.status, 401);
  });

  test("provider webhooks fail closed without a signature", async () => {
    for (const provider of ["hitpay", "billplz"]) {
      const res = await call(`/api/payments/webhook/${provider}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ order_id: "dutaos-starter-abc12345", paid: true }),
      });
      assert.equal(res.status, 401, `${provider} must reject an unsigned webhook`);
      const body = await res.json();
      assert.equal(body.error, "Invalid signature");
    }
  });
});

describe("deployed health proves the datastore and names the payment providers", () => {
  // The fork used to hand-roll its own /api/health: it probed
  // `leads?limit=0` (reachable, not durable), always answered 200, and omitted
  // both `datastore.probe` and `payments.providersConfigured` — the two fields
  // automations/uptime-watch reads to tell an outage from a lost credential.
  let originalFetch;

  before(() => {
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
    delete process.env.HITPAY_API_KEY;
    delete process.env.HITPAY_SECRET_KEY;
    process.env.BILLPLZ_API_KEY = "stub-billplz-key";
    process.env.BILLPLZ_COLLECTION_ID = "stub-collection";
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (_url, init = {}) => {
      const method = String(init.method ?? "GET").toUpperCase();
      if (method === "POST") return new Response("[]", { status: 201 });
      if (method === "DELETE") return new Response("", { status: 204 });
      return new Response(JSON.stringify([{ id: "probe" }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };
  });

  after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.BILLPLZ_API_KEY;
    delete process.env.BILLPLZ_COLLECTION_ID;
  });

  test("the sentinel row round-trips and the provider flags are honest", async () => {
    const res = await call("/api/health?fresh=1");
    assert.equal(res.status, 200);
    const body = await res.json();

    assert.equal(body.ok, true);
    assert.equal(body.datastore.backend, "supabase");
    assert.equal(body.datastore.probe, "roundtrip", "health must prove a write/read/delete, not a reachable host");
    assert.equal(body.payments.providersConfigured.hitpay, false);
    assert.equal(body.payments.providersConfigured.billplz, true);

    // The keys the automation still parses.
    assert.equal(body.storageBackend, "supabase");
    assert.equal(body.storageDurable, true);
  });
});

describe("deployed pipeline board is countable by funnel", () => {
  // The one-week conversion test needs to answer "how many pilot bookings came
  // in?" from the stored rows alone. That only works if the board shows the
  // source, the CSV carries it, and the read filter keeps every website funnel.
  let originalFetch;
  const seenUrls = [];
  const seenRequests = [];
  const ADMIN = "pipeline-funnel-token";

  const today = new Date().toISOString();
  const LEAD_ROWS = [
    { id: "11111111-1111-4111-8111-111111111111", name: "Ahmad", company: "Syarikat Sdn Bhd", email: "ahmad@syarikat.my", phone: "60123456789", service: "WhatsApp lead follow-up pilot", message: "Pilot booking — 50 enquiries/month", status: "new", source: "pilot-booking", created_at: today },
    { id: "22222222-2222-4222-8222-222222222222", name: "Siti", company: "Warung Siti", email: "siti@warung.my", phone: "", service: "Free IT Audit", status: "new", source: "quiz-results", created_at: today },
    // A row written before the funnel was recorded: still has to show up.
    { id: "33333333-3333-4333-8333-333333333333", name: "Lim", company: "Lim Trading", email: "lim@lim.my", phone: "", service: "Managed IT Services", status: "contacted", created_at: today },
    // Not a website funnel — the pipeline must not list it.
    { id: "44444444-4444-4444-8444-444444444444", name: "Outbound", company: "", email: "out@corp.my", phone: "", service: "Explee pilot", status: "new", source: "explee-outbound", created_at: today },
  ];

  before(() => {
    process.env.ADMIN_TOKEN = ADMIN;
    // Browsers send Origin on every same-origin POST, and the fork only accepts
    // origins named in ALLOWED_ORIGINS — the Pages environment sets this.
    process.env.ALLOWED_ORIGINS = ORIGIN;
    process.env.SUPABASE_URL = "https://stub.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "stub-service-role";
    originalFetch = globalThis.fetch;
    globalThis.fetch = async (url, init = {}) => {
      const href = String(url);
      seenUrls.push(href);
      seenRequests.push({
        href,
        method: String(init.method ?? "GET"),
        body: init.body ? JSON.parse(String(init.body)) : null,
      });
      // Only the leads read returns rows; auth stays a hard miss so the token
      // branch is what authorises the request.
      if (href.includes("/rest/v1/leads")) {
        const wanted = new URL(href).searchParams.get("source");
        const names = wanted ? wanted.replace(/^in\.\(/, "").replace(/\)$/, "").split(",") : null;
        const rows = names ? LEAD_ROWS.filter((r) => names.includes(r.source || "contact-form")) : LEAD_ROWS;
        return new Response(JSON.stringify(rows), { status: 200, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "invalid_token" }), { status: 401, headers: { "content-type": "application/json" } });
    };
  });

  after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.ADMIN_TOKEN;
    delete process.env.ALLOWED_ORIGINS;
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    seenUrls.length = 0;
    seenRequests.length = 0;
  });

  test("the booking row written to Postgres carries the funnel, not a hardcoded one", async () => {
    seenRequests.length = 0;
    const csrf = "funnel-csrf-token-value";
    const res = await call("/api/send-email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        "x-csrf-token": csrf,
        cookie: `csrf_token=${csrf}`,
      },
      body: JSON.stringify({
        name: "Ahmad",
        email: "ahmad@syarikat.my",
        company: "Syarikat Sdn Bhd",
        service: "WhatsApp lead follow-up pilot",
        message: "Pilot booking — 50 enquiries/month; preferred slot: Isnin 10:00 pagi",
        source: "pilot-booking",
      }),
    });
    assert.equal(res.status, 200);

    const insert = seenRequests.find((r) => r.method === "POST" && r.href.includes("/rest/v1/leads"));
    assert.ok(insert, "the enquiry must be written to the leads table");
    // The write used to hardcode "contact-form", so every funnel looked alike.
    assert.equal(insert.body.source, "pilot-booking");
    assert.equal(insert.body.status, "new");
    assert.match(insert.body.message, /50 enquiries\/month/);
  });

  test("a client-invented funnel name never reaches the database", async () => {
    seenRequests.length = 0;
    const csrf = "funnel-csrf-token-value";
    const res = await call("/api/send-email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: ORIGIN,
        "x-csrf-token": csrf,
        cookie: `csrf_token=${csrf}`,
      },
      body: JSON.stringify({
        name: "Siti",
        email: "siti@warung.my",
        service: "Free check",
        message: "from the quiz",
        source: "pilot-booking)&delete=gt",
      }),
    });
    assert.equal(res.status, 200);
    const insert = seenRequests.find((r) => r.method === "POST" && r.href.includes("/rest/v1/leads"));
    assert.equal(insert.body.source, "contact-form");
  });

  test("the read asks for every website funnel, not just the contact form", async () => {
    seenUrls.length = 0;
    await call("/admin/pipeline", { headers: { "x-admin-token": ADMIN } });
    const leadsUrl = seenUrls.find((u) => u.includes("/rest/v1/leads"));
    assert.ok(leadsUrl, "the board must read the leads table");
    const filter = new URL(leadsUrl).searchParams.get("source");
    for (const name of ["contact-form", "quiz-results", "proposal-form", "pilot-booking"]) {
      assert.ok(filter.includes(name), `${name} must stay visible on the read path`);
    }
    assert.ok(!filter.includes("explee-outbound"), "non-website funnels stay out of the pipeline");
  });

  test("each card is labelled with the funnel that produced it", async () => {
    const res = await call("/admin/pipeline", { headers: { "x-admin-token": ADMIN, accept: "text/html" } });
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /data-source="pilot-booking"/);
    assert.match(html, /data-source="quiz-results"/);
    // A lead stored before the funnel existed is still shown, as the default.
    assert.match(html, /data-source="contact-form"/);
    assert.ok(!html.includes('data-source="explee-outbound"'));
    // A filter chip per funnel, so cohorts are readable without new UI.
    assert.match(html, /data-funnel="pilot-booking"/);
    assert.match(html, /data-funnel="all"/);
  });

  test("the CSV export carries the source column", async () => {
    const res = await call("/admin/pipeline?format=csv", { headers: { "x-admin-token": ADMIN } });
    assert.equal(res.status, 200);
    const [header, ...rows] = (await res.text()).split("\n");
    assert.ok(header.split(",").includes("source"), `CSV header must name the funnel column, got ${header}`);
    assert.ok(rows.some((r) => r.includes("pilot-booking")));
  });
});

describe("Ask Duta is routed on the entrypoint production runs", () => {
  // /api/ai/chat 401s for an anonymous visitor, so the marketing assistant cannot
  // share it. These assert the fork reaches the same Node handler the local fork
  // does — there is no ask-duta-cloudflare.mjs to drift.
  test("an anonymous POST gets a grounded answer with no session and no CSRF token", async () => {
    const res = await call("/api/ask-duta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "how much is the Growth plan", lang: "en" }),
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.answered, true);
    assert.equal(body.source, "rule");
    assert.match(body.answer, /RM 1,490/);
    assert.equal(res.headers.get("cache-control"), "no-store");
  });

  test("GET is 405 and an unknown question hands off instead of inventing", async () => {
    const wrong = await call("/api/ask-duta", { method: "GET" });
    assert.equal(wrong.status, 405);

    const res = await call("/api/ask-duta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "do you file my GST returns", lang: "en" }),
    });
    const body = await res.json();
    assert.equal(body.answered, false);
    assert.equal(body.source, "handoff");
  });
});
