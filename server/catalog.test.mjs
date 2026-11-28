import test, { after, afterEach, before, beforeEach, describe } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handle } from "./handler.mjs";
import { createSession, resetAuthRateLimit } from "./auth.mjs";
import { dataFile } from "./paths.mjs";

/**
 * End-to-end tests for /api/catalog/* against the real handler and the JSONL
 * store. The catalog is staff-internal, so every route must reject anonymous
 * callers before touching the VLM or the database.
 */

const VALID = {
  email: "catalog@example.my",
  password: "securePass1",
  companyName: "Catalog Test Sdn Bhd",
};

let server;
let base;
let ipCounter = 0;

function nextIp() {
  ipCounter += 1;
  return `198.51.100.${ipCounter}`;
}

async function request(path, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      "x-forwarded-for": nextIp(),
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: await res.json().catch(() => null), headers: res.headers };
}

function sessionToken(headers) {
  const setCookie = headers.getSetCookie?.() ?? [];
  const cookie = setCookie.find((c) => c.startsWith("dutaos_session="));
  return cookie?.split(";")[0]?.split("=")?.[1] ?? null;
}

async function authenticatedCompany({ isStaff = false } = {}) {
  const res = await request("/api/auth/signup", { method: "POST", body: VALID });
  const token = sessionToken(res.headers);
  assert.ok(token, "signup should set a dutaos_session cookie");
  const companyId = res.body.company.id;
  assert.ok(companyId, "signup should return the company id");

  if (isStaff) {
    const path = dataFile("dutaos-companies.jsonl");
    const rows = (await readFile(path, "utf8"))
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line));
    const company = rows.find((row) => row.id === companyId);
    assert.ok(company, "signed-up company should be in the JSONL store");
    company.is_staff = true;
    await writeFile(path, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
  }

  return { cookie: `dutaos_session=${token}`, companyId };
}

before(async () => {
  server = createServer(handle);
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((done) => server.close(done));
  server.closeAllConnections?.();
});

beforeEach(async () => {
  const dir = await mkdtemp(join(tmpdir(), "dutaos-catalog-"));
  process.env.DATA_DIR = dir;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  resetAuthRateLimit();
});

afterEach(async () => {
  if (process.env.DATA_DIR) await rm(process.env.DATA_DIR, { recursive: true, force: true });
});

describe("catalog auth gate", () => {
  test("anonymous reads are rejected", async () => {
    const res = await request("/api/catalog/items");
    assert.equal(res.status, 401);
  });

  test("anonymous writes are rejected", async () => {
    const res = await request("/api/catalog/items", {
      method: "POST",
      body: { title: "Anonymous product" },
    });
    assert.equal(res.status, 401);
  });

  test("anonymous enrichment is rejected before Ollama is called", async () => {
    const res = await request("/api/catalog/enrich", {
      method: "POST",
      body: { imageBase64: "aGVsbG8=" },
    });
    assert.equal(res.status, 401);
  });

  test("anonymous deletes are rejected", async () => {
    const id = "11111111-1111-4111-8111-111111111111";
    const res = await request(`/api/catalog/items/${id}`, { method: "DELETE" });
    assert.equal(res.status, 401);
  });

  test("ordinary companies cannot list catalog items", async () => {
    const { cookie } = await authenticatedCompany();
    const res = await request("/api/catalog/items", { headers: { cookie } });
    assert.equal(res.status, 403);
  });

  test("ordinary companies cannot create catalog items", async () => {
    const { cookie } = await authenticatedCompany();
    const res = await request("/api/catalog/items", {
      method: "POST",
      headers: { cookie },
      body: { title: "Not allowed" },
    });
    assert.equal(res.status, 403);
  });

  test("ordinary companies cannot enrich catalog images", async () => {
    const { cookie } = await authenticatedCompany();
    const savedHost = process.env.OLLAMA_HOST;
    process.env.OLLAMA_HOST = "http://127.0.0.1:1";
    try {
      const res = await request("/api/catalog/enrich", {
        method: "POST",
        headers: { cookie },
        body: { imageBase64: "aGVsbG8=" },
      });
      assert.equal(res.status, 403);
    } finally {
      if (savedHost === undefined) delete process.env.OLLAMA_HOST;
      else process.env.OLLAMA_HOST = savedHost;
    }
  });

  test("ordinary companies cannot delete catalog items", async () => {
    const { cookie } = await authenticatedCompany();
    const id = "11111111-1111-4111-8111-111111111111";
    const res = await request(`/api/catalog/items/${id}`, {
      method: "DELETE",
      headers: { cookie },
    });
    assert.equal(res.status, 403);
  });

  test("sessions for missing companies cannot access the catalog", async () => {
    const { token } = await createSession("33333333-3333-4333-8333-333333333333");
    const res = await request("/api/catalog/items", {
      headers: { cookie: `dutaos_session=${token}` },
    });
    assert.equal(res.status, 403);
  });
});

describe("catalog CRUD", () => {
  test("creates, lists, updates and deletes an item", async () => {
    const { cookie } = await authenticatedCompany({ isStaff: true });

    const created = await request("/api/catalog/items", {
      method: "POST",
      headers: { cookie },
      body: {
        title: "Rattan lounge chair",
        description: "Hand-woven lounge chair",
        category: "furniture",
        specs: { material: "rattan", colour: "natural" },
        tags: ["chair", "handmade"],
      },
    });
    assert.equal(created.status, 201);
    const item = created.body.item;
    assert.ok(item.id);
    assert.equal(item.title, "Rattan lounge chair");
    assert.equal(item.status, "draft");
    assert.deepEqual(item.specs, { material: "rattan", colour: "natural" });
    assert.deepEqual(item.tags, ["chair", "handmade"]);

    const list = await request("/api/catalog/items", { headers: { cookie } });
    assert.equal(list.status, 200);
    assert.equal(list.body.items.length, 1);
    assert.equal(list.body.items[0].id, item.id);

    const patched = await request(`/api/catalog/items/${item.id}`, {
      method: "PATCH",
      headers: { cookie },
      body: { title: "Rattan lounge chair (large)" },
    });
    assert.equal(patched.status, 200);
    assert.equal(patched.body.item.title, "Rattan lounge chair (large)");

    const deleted = await request(`/api/catalog/items/${item.id}`, {
      method: "DELETE",
      headers: { cookie },
    });
    assert.equal(deleted.status, 200);

    const afterDelete = await request("/api/catalog/items", { headers: { cookie } });
    assert.equal(afterDelete.body.items.length, 0);
  });

  test("title is required", async () => {
    const { cookie } = await authenticatedCompany({ isStaff: true });
    const res = await request("/api/catalog/items", {
      method: "POST",
      headers: { cookie },
      body: { description: "no title" },
    });
    assert.equal(res.status, 400);
  });

  test("unknown ids are 404 on patch and delete", async () => {
    const { cookie } = await authenticatedCompany({ isStaff: true });
    const id = "22222222-2222-4222-8222-222222222222";

    const patched = await request(`/api/catalog/items/${id}`, {
      method: "PATCH",
      headers: { cookie },
      body: { title: "ghost" },
    });
    assert.equal(patched.status, 404);

    const deleted = await request(`/api/catalog/items/${id}`, {
      method: "DELETE",
      headers: { cookie },
    });
    assert.equal(deleted.status, 404);
  });
});
