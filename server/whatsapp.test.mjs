import test, { after, before, describe } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHmac } from "node:crypto";

import { handle } from "./handler.mjs";
import {
  generateBotReply,
  sendWhatsAppTemplate,
  sendWhatsAppMessage,
  verifyMetaSignature,
  recordWhatsAppOptOut,
  removeWhatsAppOptOut,
  isExactStopCommand,
} from "./whatsapp.mjs";
import { listEnquiries } from "./enquiries.mjs";

let server;
let base;
let testDataDir;

before(async () => {
  testDataDir = await mkdtemp(join(tmpdir(), "duta-wa-test-"));
  process.env.DATA_DIR = testDataDir;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;

  process.env.WHATSAPP_VERIFY_TOKEN = "test_wa_verify_token_123";
  process.env.WHATSAPP_APP_SECRET = "test_wa_secret_456";

  server = createServer(handle);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  base = `http://127.0.0.1:${port}`;
});

after(async () => {
  delete process.env.WHATSAPP_VERIFY_TOKEN;
  delete process.env.WHATSAPP_APP_SECRET;
  delete process.env.DATA_DIR;
  if (server) await new Promise((resolve) => server.close(resolve));
  if (testDataDir) await rm(testDataDir, { recursive: true, force: true });
});

function signPayload(body, secret) {
  const hmac = createHmac("sha256", secret);
  hmac.update(body);
  return `sha256=${hmac.digest("hex")}`;
}

describe("GET /api/whatsapp/webhook (Meta Challenge Verification)", () => {
  test("answers challenge with 200 when token and mode match", async () => {
    const challenge = "test_challenge_abc_12345";
    const res = await fetch(
      `${base}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=test_wa_verify_token_123&hub.challenge=${challenge}`
    );
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.equal(text, challenge);
  });

  test("rejects verification with 403 when token is incorrect", async () => {
    const res = await fetch(
      `${base}/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=abc`
    );
    assert.equal(res.status, 403);
    const text = await res.text();
    assert.match(text, /mismatch/i);
  });

  test("rejects verification with 403 when mode is not subscribe", async () => {
    const res = await fetch(
      `${base}/api/whatsapp/webhook?hub.mode=publish&hub.verify_token=test_wa_verify_token_123&hub.challenge=abc`
    );
    assert.equal(res.status, 403);
  });
});

describe("POST /api/whatsapp/webhook (Meta Webhook Signature)", () => {
  test("rejects unsigned requests when app secret is configured", async () => {
    const res = await fetch(`${base}/api/whatsapp/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ object: "whatsapp_business_account" }),
    });
    assert.equal(res.status, 401);
  });

  test("rejects forged signature with 401", async () => {
    const body = JSON.stringify({ object: "whatsapp_business_account" });
    const res = await fetch(`${base}/api/whatsapp/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": "sha256=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef",
      },
      body,
    });
    assert.equal(res.status, 401);
  });

  test("verifyMetaSignature helper validates HMAC correctly and fails closed without secret", () => {
    const raw = Buffer.from('{"hello":"world"}');
    const secret = "my_secret_key";
    const validSig = signPayload(raw, secret);
    assert.equal(verifyMetaSignature(raw, validSig, secret), true);
    assert.equal(verifyMetaSignature(raw, "sha256=deadbeef", secret), false);
    assert.equal(verifyMetaSignature(raw, null, secret), false);
    assert.equal(verifyMetaSignature(raw, null, ""), false); // fails closed
  });
});

describe("POST /api/whatsapp/webhook (Inbound Message Ingestion & Auto-Reply)", () => {
  test("ingests customer message, logs enquiry lead, and answers with 200", async () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              field: "messages",
              value: {
                messaging_product: "whatsapp",
                contacts: [
                  {
                    profile: { name: "Encik Razak" },
                    wa_id: "60123456789",
                  },
                ],
                messages: [
                  {
                    from: "60123456789",
                    id: "wamid.test_unique_001",
                    timestamp: "1794120000",
                    type: "text",
                    text: { body: "Salam, nak tanya pakej laman web untuk kedai" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const raw = JSON.stringify(payload);
    const signature = signPayload(raw, process.env.WHATSAPP_APP_SECRET);

    const res = await fetch(`${base}/api/whatsapp/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: raw,
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.received, true);

    // Yield for fast-ACK background processing to complete persistence
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Verify lead was stored
    const enquiries = await listEnquiries(10);
    const stored = enquiries.find((e) => e.phone === "60123456789");
    assert.ok(stored, "Enquiry must be recorded from WhatsApp message");
    assert.equal(stored.name, "Encik Razak");
    assert.equal(stored.source, "whatsapp");
    assert.match(stored.message, /nak tanya pakej laman web/);
  });

  test("ignores delivery retries with duplicate message ID", async () => {
    const payload = {
      object: "whatsapp_business_account",
      entry: [
        {
          id: "WABA_123",
          changes: [
            {
              field: "messages",
              value: {
                messages: [
                  {
                    from: "60123456789",
                    id: "wamid.test_unique_001", // Duplicate ID
                    type: "text",
                    text: { body: "Duplicate message" },
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const raw = JSON.stringify(payload);
    const signature = signPayload(raw, process.env.WHATSAPP_APP_SECRET);

    const res = await fetch(`${base}/api/whatsapp/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: raw,
    });

    assert.equal(res.status, 200);
  });

  test("gracefully accepts delivery status updates without throwing", async () => {
    const statusPayload = {
      object: "whatsapp_business_account",
      entry: [
        {
          changes: [
            {
              field: "messages",
              value: {
                statuses: [
                  {
                    id: "wamid.xyz",
                    status: "delivered",
                    timestamp: "1794120100",
                    recipient_id: "60123456789",
                  },
                ],
              },
            },
          ],
        },
      ],
    };

    const raw = JSON.stringify(statusPayload);
    const signature = signPayload(raw, process.env.WHATSAPP_APP_SECRET);

    const res = await fetch(`${base}/api/whatsapp/webhook`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hub-signature-256": signature,
      },
      body: raw,
    });

    assert.equal(res.status, 200);
  });
});

describe("generateBotReply unit tests", () => {
  test("generates welcome menu for greeting", () => {
    const reply = generateBotReply("hi", "Ahmad");
    assert.match(reply, /Ahmad/);
    assert.match(reply, /Pakej Laman Web PKS/);
    assert.match(reply, /DutaConnect WhatsApp Bot/);
  });

  test("generates package details for option 1", () => {
    const reply = generateBotReply("1");
    assert.match(reply, /CORE/);
    assert.match(reply, /ADVANCE/);
    assert.match(reply, /PRO/);
  });

  test("generates pilot details for option 2", () => {
    const reply = generateBotReply("2");
    assert.match(reply, /DutaConnect WhatsApp Pilot/);
    assert.match(reply, /RM999/);
  });

  test("generates IT support details for option 3", () => {
    const reply = generateBotReply("komputer rosak");
    assert.match(reply, /Bantuan IT & Komputer Cyberjaya/);
  });

  test("generates human handoff confirmation for option 4", () => {
    const reply = generateBotReply("nak cakap dengan pegawai");
    assert.match(reply, /Sesi Perundingan Pegawai Teknikal/);
  });

  test("generates unsubscribe confirmation for STOP command", () => {
    const reply = generateBotReply("STOP");
    assert.match(reply, /Pengesahan Nyahlanggan/);
    assert.match(reply, /START/);
  });

  test("sendWhatsAppTemplate safely handles mock mode when credentials unset", async () => {
    const result = await sendWhatsAppTemplate({
      to: "601154034051",
      templateName: "monthly_it_digest",
      languageCode: "ms",
      bodyParams: ["Encik Razak", "Mokhtar Trading", "November 2026", "Semua Lancar", "https://dutaintegra.my/portal"],
    });
    assert.equal(result.mock, true);
    assert.equal(result.success, true);
    assert.equal(result.templateName, "monthly_it_digest");
    assert.equal(result.bodyParams.length, 5);
  });

  test("isExactStopCommand handles case, whitespace, and trailing punctuation", () => {
    assert.equal(isExactStopCommand("stop"), true);
    assert.equal(isExactStopCommand("Stop "), true);
    assert.equal(isExactStopCommand("  STOP!  "), true);
    assert.equal(isExactStopCommand("berhenti."), true);
    assert.equal(isExactStopCommand("batal tempahan"), false);
    assert.equal(isExactStopCommand("keluar kedai"), false);
  });

  test("sendWhatsAppMessage and sendWhatsAppTemplate block sends to opted-out numbers", async () => {
    const testPhone = "60199998888";
    await recordWhatsAppOptOut(testPhone);

    const msgResult = await sendWhatsAppMessage({
      to: testPhone,
      text: "Hello customer",
    });
    assert.equal(msgResult.success, false);
    assert.equal(msgResult.blocked, true);

    const templateResult = await sendWhatsAppTemplate({
      to: testPhone,
      templateName: "monthly_it_digest",
      bodyParams: ["Test"],
    });
    assert.equal(templateResult.success, false);
    assert.equal(templateResult.blocked, true);

    // Clean up
    await removeWhatsAppOptOut(testPhone);
  });
});
