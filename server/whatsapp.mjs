import { createHmac, timingSafeEqual } from "node:crypto";
import { answerLocally } from "./knowledge/duta-integra.mjs";
import { recordEnquiry } from "./enquiries.mjs";

/**
 * DutaConnect WhatsApp Bot & Meta Cloud API Webhook.
 *
 * Implements:
 *   - GET  /api/whatsapp/webhook: Meta Hub challenge verification handshake
 *   - POST /api/whatsapp/webhook: Ingests incoming WhatsApp messages, logs leads,
 *                                and auto-replies via Graph API.
 */

// In-memory LRU set to deduplicate Meta webhook delivery retries
const PROCESSED_MESSAGE_IDS = new Set();
const MAX_PROCESSED_IDS = 1000;

export function whatsappConfig() {
  return {
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN?.trim() || "dutaintegra_wa_verify_2026",
    appSecret: process.env.WHATSAPP_APP_SECRET?.trim() || "",
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN?.trim() || "",
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID?.trim() || "",
    graphVersion: process.env.WHATSAPP_GRAPH_VERSION?.trim() || "v21.0",
  };
}

/**
 * Constant-time string equality helper to protect verification tokens and secrets.
 */
function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Validate Meta's x-hub-signature-256 header when WHATSAPP_APP_SECRET is set.
 */
export function verifyMetaSignature(rawBody, signatureHeader, appSecret) {
  if (!appSecret) return true;
  if (!signatureHeader || typeof signatureHeader !== "string") return false;

  const [prefix, signature] = signatureHeader.split("=");
  if (prefix !== "sha256" || !signature) return false;

  const hmac = createHmac("sha256", appSecret);
  hmac.update(rawBody);
  const digest = hmac.digest("hex");

  return safeEqual(digest, signature);
}

/**
 * Send an outbound message back to customer via Meta Cloud API.
 */
export async function sendWhatsAppMessage({ to, text, replyToMessageId = null, phoneNumberId = null }) {
  const cfg = whatsappConfig();
  const activePhoneId = phoneNumberId || cfg.phoneNumberId;

  if (!cfg.accessToken || !activePhoneId) {
    // Development or unconfigured mode: record mock outbound
    return { mock: true, success: true, to, text, activePhoneId };
  }

  const endpoint = `https://graph.facebook.com/${cfg.graphVersion}/${activePhoneId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/[^0-9]/g, ""),
    type: "text",
    text: { preview_url: false, body: text },
  };

  if (replyToMessageId) {
    payload.context = { message_id: replyToMessageId };
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  return { success: res.ok, status: res.status, body };
}

/**
 * Send an outbound pre-approved Meta Message Template (for business-initiated messages outside 24h window).
 */
export async function sendWhatsAppTemplate({
  to,
  templateName,
  languageCode = "ms",
  bodyParams = [],
  phoneNumberId = null,
}) {
  const cfg = whatsappConfig();
  const activePhoneId = phoneNumberId || cfg.phoneNumberId;

  if (!cfg.accessToken || !activePhoneId) {
    return { mock: true, success: true, to, templateName, bodyParams, activePhoneId };
  }

  const endpoint = `https://graph.facebook.com/${cfg.graphVersion}/${activePhoneId}/messages`;
  const components = [];
  if (bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: bodyParams.map((p) => ({ type: "text", text: String(p) })),
    });
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/[^0-9]/g, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => ({}));
  return { success: res.ok, status: res.status, body };
}

/**
 * Intent analyzer and response generator for inbound customer WhatsApp messages.
 */
export function generateBotReply(rawText = "", senderName = "Tuan/Puan") {
  const text = String(rawText).trim().toLowerCase();

  // Greetings / Main Menu
  if (
    !text ||
    text === "hi" ||
    text === "hai" ||
    text === "hello" ||
    text === "salam" ||
    text === "assalamualaikum" ||
    text === "menu" ||
    text === "start" ||
    text === "bantuan" ||
    text === "info"
  ) {
    return (
      `Salam sejahtera ${senderName}! 👋\n` +
      `Terima kasih kerana menghubungi Duta Integra Solutions (Cyberjaya).\n\n` +
      `Bagaimana kami boleh bantu perniagaan anda hari ini?\n\n` +
      `1️⃣ *Pakej Laman Web PKS* (Core RM499 | Advance RM1,499 | Pro RM3,499)\n` +
      `2️⃣ *DutaConnect WhatsApp Bot & e-Invois LHDN* (Pilot RM999)\n` +
      `3️⃣ *Bantuan Komputer & IT Helpdesk Kedai*\n` +
      `4️⃣ *Sembang dengan Jurutera Teknikal*\n\n` +
      `Sila balas nombor (cth: *1* atau *2*), atau taip terus soalan anda.`
    );
  }

  // Option 1: PKS Website Packages
  if (
    text === "1" ||
    text.includes("pks") ||
    text.includes("pakej") ||
    text.includes("pricing") ||
    text.includes("harga") ||
    text.includes("web")
  ) {
    return (
      `📦 *Pakej Laman Web & Digital PKS Duta Integra:*\n\n` +
      `🔹 *CORE (RM499/bln)*: Laman web profil moden, integrasi Google Maps, e-mel rasmi syarikat & SSL aktif.\n` +
      `🔹 *ADVANCE (RM1,499/bln - Paling Popular)*: Laman web jualan interaktif, DutaConnect WhatsApp Bot 24/7 & integrasi penuh e-Invois LHDN.\n` +
      `🔹 *PRO (RM3,499/bln)*: Pengurusan multi-cawangan, papan pemuka DutaSight KPI & pengurus akaun khas.\n\n` +
      `Semak perbandingan penuh: https://dutaintegra.my/pricing\n` +
      `Balas *'pilot'* untuk cuba 30 hari tanpa kontrak, atau *'pegawai'* untuk sebut harga rasmi.`
    );
  }

  // Option 2: WhatsApp Automation / DutaConnect / Pilot
  if (
    text === "2" ||
    text.includes("pilot") ||
    text.includes("dutaconnect") ||
    text.includes("invois") ||
    text.includes("lhdn") ||
    text.includes("bot")
  ) {
    return (
      `⚡ *DutaConnect WhatsApp Pilot (RM999):*\n\n` +
      `Uji automasi jualan WhatsApp selama 30 hari di nombor WhatsApp bisnes anda sendiri:\n` +
      `✅ Bot balas pelanggan pantas 24/7 (tempahan & sebut harga)\n` +
      `✅ Elak prospek tercicir semasa sibuk\n` +
      `✅ Bersedia integrasi e-Invois LHDN MyInvois\n` +
      `✅ Tiada kontrak jangka panjang (zero lock-in)\n\n` +
      `Balas *'tempah'* bersama nama syarikat anda, atau layari: https://dutaintegra.my/pks.html`
    );
  }

  // Option 3: IT Helpdesk & Computer Support
  if (
    text === "3" ||
    text.includes("komputer") ||
    text.includes("it") ||
    text.includes("helpdesk") ||
    text.includes("rosak") ||
    text.includes("printer")
  ) {
    return (
      `🛠️ *Bantuan IT & Komputer Cyberjaya:*\n\n` +
      `Pasukan jurutera kami sedia menyelesaikan masalah teknikal harian kedai dan pejabat anda:\n` +
      `• Laptop / PC perlahan atau dijangkiti virus\n` +
      `• Rangkaian Wi-Fi, kabel & pencetak pejabat\n` +
      `• Sandaran data awan automatik (cloud backup)\n\n` +
      `Sila ceritakan ringkas masalah anda di sini, jurutera bertugas kami akan bantu secepat mungkin.`
    );
  }

  // Option 4: Human / Agent Request
  if (
    text === "4" ||
    text.includes("pegawai") ||
    text.includes("jurutera") ||
    text.includes("manusia") ||
    text.includes("human") ||
    text.includes("agent")
  ) {
    return (
      `👨‍💼 *Sesi Perundingan Pegawai Teknikal:*\n\n` +
      `Mesej anda telah dimajukan kepada jurutera bertugas Duta Integra di Cyberjaya.\n\n` +
      `Waktu Operasi: Isnin – Jumaat (9:00 Pagi – 6:00 Petang).\n` +
      `Kami akan membalas di ruangan sembang ini dalam masa kurang daripada 1 jam waktu bekerja.`
    );
  }

  // Fallback to Knowledge Base (Duta Facts)
  const knowledgeBm = answerLocally(rawText, "bm");
  if (knowledgeBm) {
    return `${knowledgeBm}\n\nKetahui lanjut di https://dutaintegra.my/pricing`;
  }
  const knowledgeEn = answerLocally(rawText, "en");
  if (knowledgeEn) {
    return `${knowledgeEn}\n\nLearn more at https://dutaintegra.my/pricing`;
  }

  // Default Concierge
  return (
    `Terima kasih atas mesej anda, ${senderName}! 🤝\n\n` +
    `Pertanyaan anda telah direkodkan. Pegawai kami akan meneliti keperluan bisnes anda sebentar lagi.\n\n` +
    `Sementara itu, anda boleh buat semakan tahap digital bisnes secara percuma di:\n` +
    `👉 https://dutaintegra.my/digital-assessment\n\n` +
    `Atau balas *'menu'* untuk melihat senarai perkhidmatan utama kami.`
  );
}

/**
 * Handle incoming Meta WhatsApp webhook events.
 */
export async function processWhatsAppWebhook(rawBody, headers = {}) {
  const cfg = whatsappConfig();
  const signature = headers["x-hub-signature-256"];

  if (cfg.appSecret && !verifyMetaSignature(rawBody, signature, cfg.appSecret)) {
    return { status: 401, body: { error: "Invalid signature" } };
  }

  let payload;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return { status: 400, body: { error: "Invalid JSON" } };
  }

  if (payload.object !== "whatsapp_business_account") {
    return { status: 200, body: { received: true } };
  }

  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  for (const entry of entries) {
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      if (change.field !== "messages") continue;
      const val = change.value ?? {};
      const incomingPhoneId = val.metadata?.phone_number_id || null;
      const contacts = Array.isArray(val.contacts) ? val.contacts : [];
      const messages = Array.isArray(val.messages) ? val.messages : [];

      for (const msg of messages) {
        const msgId = msg.id;
        if (msgId && PROCESSED_MESSAGE_IDS.has(msgId)) {
          continue; // Already processed
        }
        if (msgId) {
          PROCESSED_MESSAGE_IDS.add(msgId);
          if (PROCESSED_MESSAGE_IDS.size > MAX_PROCESSED_IDS) {
            const first = PROCESSED_MESSAGE_IDS.values().next().value;
            PROCESSED_MESSAGE_IDS.delete(first);
          }
        }

        const senderPhone = msg.from;
        const senderContact = contacts.find((c) => c.wa_id === senderPhone) || contacts[0];
        const senderName = senderContact?.profile?.name || "Pelanggan WhatsApp";

        let userText = "";
        if (msg.type === "text") {
          userText = msg.text?.body || "";
        } else if (msg.type === "interactive") {
          userText =
            msg.interactive?.button_reply?.title ||
            msg.interactive?.list_reply?.title ||
            msg.interactive?.button_reply?.id ||
            "";
        } else if (msg.type === "button") {
          userText = msg.button?.text || "";
        } else {
          userText = `[Media: ${msg.type}]`;
        }

        // Record incoming lead
        try {
          await recordEnquiry({
            name: senderName,
            company: null,
            email: `${senderPhone}@wa.dutaintegra.my`,
            phone: senderPhone,
            service: "WhatsApp Lead",
            message: userText,
            source: "whatsapp",
          });
        } catch (err) {
          console.error("[whatsapp] failed to record enquiry:", err);
        }

        // Generate intelligent automated response
        const replyText = generateBotReply(userText, senderName);

        // Send reply back to customer
        try {
          await sendWhatsAppMessage({
            to: senderPhone,
            text: replyText,
            replyToMessageId: msgId,
            phoneNumberId: incomingPhoneId,
          });
        } catch (err) {
          console.error("[whatsapp] failed to send auto-reply:", err);
        }
      }
    }
  }

  return { status: 200, body: { status: "ok", received: true } };
}

/**
 * Node HTTP request handler for both GET and POST /api/whatsapp/webhook.
 */
export async function handleWhatsAppWebhook(req, res) {
  const cfg = whatsappConfig();

  if (req.method === "GET") {
    const proto = req.headers["x-forwarded-proto"] ?? (req.socket?.encrypted ? "https" : "http");
    const host = req.headers.host || "localhost";
    const url = new URL(req.url || "/", `${proto}://${host}`);

    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (mode === "subscribe" && safeEqual(token ?? "", cfg.verifyToken)) {
      res.writeHead(200, {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(challenge || "");
      return;
    }

    res.writeHead(403, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end("Verification token mismatch");
    return;
  }

  if (req.method === "POST") {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks);

    const result = await processWhatsAppWebhook(rawBody, req.headers);
    const payload = JSON.stringify(result.body);

    res.writeHead(result.status, {
      "content-type": "application/json; charset=utf-8",
      "content-length": Buffer.byteLength(payload),
      "cache-control": "no-store",
    });
    res.end(payload);
    return;
  }

  res.writeHead(405, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify({ error: "Method not allowed" }));
}
