/**
 * The single grounding source for Ask Duta, the public assistant on
 * dutaintegra.my. It answers anonymous visitors about Duta Integra itself — not
 * a client's own data, which is what `prompts/duta-ceo.mjs` grounds on.
 *
 * Every figure here is copied from the site, and `ask-duta.test.mjs` re-reads
 * `web-new/src/pages/pricing.tsx` to fail if a number in this file drifts away
 * from a number on the pricing page. Facts we do not actually have are recorded
 * as `null` with a comment, so "I don't have that" is a first-class answer
 * rather than something the model has to be talked into.
 *
 * Display strings carry both `en` and `bm`: the site defaults to BM
 * (`use-language.ts`), so an answer built from English-only prose would answer a
 * Malay question in English.
 */

export const DI_FACTS = {
  legalName: "Duta Integra Solutions Sdn Bhd",
  // privacy.html:118 still carries the unfilled "(Company No. [INSERT])"
  // placeholder, so there is no registration number to state.
  ssmNumber: null,
  taxNumber: null,
  location: "Tamarind Suites, Persiaran Bestari, 63000 Cyberjaya, Selangor, Malaysia",
  phone: "+60 11-5403 4051",
  email: "info@dutaintegra.my",
  whatsapp: "https://wa.me/601154034051",
  hours: { en: "Monday – Friday, 9am – 6pm MYT", bm: "Isnin – Jumaat, 9 pagi – 6 petang MYT" },

  // The names the site itself shows in each language (`translations.ts`
  // svc1Title…svc5Title, svcStep1Title…svcStep4Title), so a BM visitor is
  // reading the same service names on /ask as on /services.
  services: {
    en: [
      "AI Software Development",
      "Managed IT Services",
      "Cloud Migration & Management",
      "IT Security & PDPA Compliance",
      "Business Intelligence",
    ],
    bm: [
      "Pembangunan Perisian AI",
      "Perkhidmatan IT Diurus",
      "Pemindahan & Pengurusan Awan",
      "Keselamatan IT & Pematuhan PDPA",
      "Kecerdasan Perniagaan",
    ],
  },
  process: {
    en: ["Free Audit", "Proposal", "Delivery", "Support"],
    bm: ["Audit Percuma", "Cadangan", "Penghantaran", "Sokongan"],
  },
  proposalTurnaroundDays: 3,

  managedTiers: [
    {
      name: "AI Starter",
      priceMYR: 690,
      setup: { en: "No setup fee — template-based setup included.", bm: "Tiada yuran setup — setup berasaskan templat sudah termasuk." },
    },
    {
      name: "AI Growth",
      priceMYR: 1490,
      setup: { en: "One-time setup: RM1,500", bm: "Setup sekali bayar: RM1,500" },
    },
    {
      name: "AI Operations",
      priceMYR: 2990,
      setup: { en: "One-time setup: RM3,500", bm: "Setup sekali bayar: RM3,500" },
    },
  ],
  dutaConnect: {
    pilotMYR: 999,
    pilotDays: 30,
    ongoingMYR: 1199,
    note: {
      en: "One-off. Credited to your first ongoing month if you continue. Nothing renews by itself.",
      bm: "Sekali bayar. Dikreditkan ke bulan berterusan pertama anda jika anda teruskan. Tiada apa yang diperbaharui sendiri.",
    },
  },
  dutaosModules: [
    {
      name: "DutaOS Connect",
      fromMYR: 1199,
      blurb: { en: "Sales automation — capture, score, and follow up every lead automatically.", bm: "Automasi jualan — rekod, skor, dan susuli setiap lead secara automatik." },
    },
    {
      name: "DutaOS Ops",
      fromMYR: 1299,
      blurb: { en: "Workflow tracking — every job, resource, and bottleneck in real time.", bm: "Susulan workflow — setiap kerja, sumber, dan lembangan secara masa nyata." },
    },
    {
      name: "DutaOS Govern",
      fromMYR: 2999,
      blurb: { en: "AI governance — run AI agents under PDPA-safe, human-approved control.", bm: "Tadbir urus AI — jalankan ejen AI di bawah kawalan selamat PDPA dan kelulusan manusia." },
    },
    {
      name: "DutaOS Bundle",
      fromMYR: 3999,
      // Same wording the pricing page uses (translations.ts `dutaosSaveBadge`),
      // so the answer and the page cannot disagree after a copy change.
      badge: { en: "Best Value · Save 27%", bm: "Nilai Terbaik · Jimat 27%" },
      blurb: { en: "The complete AI operating system for your business.", bm: "Sistem operasi AI lengkap untuk perniagaan anda." },
    },
  ],
  extraChangesPerHourMYR: 250,
  contract: {
    en: "Plans are month-to-month with 30 days' notice to cancel. No lock-in.",
    bm: "Pelan adalah bulanan dengan notis 30 hari untuk tamat. Tiada ikatan.",
  },
  excludedFromPlan: {
    en: "Third-party tools, WhatsApp Business API, cloud hosting, and AI usage above your allowance are billed separately.",
    bm: "Alatan pihak ketiga, WhatsApp Business API, hosting awan, dan penggunaan AI melebihi elaun anda dicaj berasingan.",
  },
  // The same sentence without its verb, for answers that have to name the
  // exclusions mid-clause. Spelling and the WhatsApp API / AI capitals stay put.
  excludedList: {
    en: "third-party tools, WhatsApp Business API, cloud hosting, and AI usage above your allowance",
    bm: "alatan pihak ketiga, WhatsApp Business API, hosting awan, dan penggunaan AI melebihi elaun anda",
  },
  sla: {
    uptimePct: 99.9,
    criticalResponseHours: 4,
    creditNote: {
      en: "if we miss those, service credits are applied to your future invoices rather than paid back as cash",
      bm: "jika kami terlepas, kredit servis akan ditolak daripada invois anda akan datang, bukan dipulangkan sebagai tunai",
    },
  },
  // There is no cash refund policy; only SLA service credits against future
  // invoices (Web/tos.html:149). Answering "yes, refundable" would be invented.
  refundPolicy: null,

  willNotDo: [
    "We will not automate a process with no measurable benefit.",
    "We will not send customer messages without an approved workflow.",
    "We will not bundle hidden AI or software costs into your subscription.",
    "We will not recommend a complex custom build when a simple workflow will solve the problem.",
    "We will not provide legal advice; we provide PDPA-aware operational support.",
  ],
};

const PERIOD = { en: "month", bm: "bulan" };
const FROM = { en: "from", bm: "dari" };

const money = (n) => `RM ${n.toLocaleString("en-MY")}`;

const tierLines = (lang) =>
  DI_FACTS.managedTiers
    .map((t) => `  - ${t.name}: ${money(t.priceMYR)} / ${PERIOD[lang]}. ${t.setup[lang]}`)
    .join("\n");

const moduleLines = (lang) =>
  DI_FACTS.dutaosModules
    .map((m) => `  - ${m.name}: ${FROM[lang]} ${money(m.fromMYR)} / ${PERIOD[lang]} — ${m.blurb[lang]}`)
    .join("\n");

const serviceNames = (lang) => DI_FACTS.services[lang];
const processNames = (lang) => DI_FACTS.process[lang];

/**
 * A local answer, not a model call. Ordered, not scored — see INTENTS.
 */
const INTENTS = [
  {
    id: "contact",
    // First: a visitor asking how to reach us should never get a price list.
    // No bare "hour" here — this intent is evaluated before `hourly`, so it would
    // answer "how much per hour" with a phone number.
    match: ["contact", "kontak", "whatsapp", "wa.me", "phone", "call us", "email", "e-mel", "emel", "hotline", "hubungi", "telefon", "whatapp", "no telefon", "macam mana nak hubungi", "address", "alamat", "locate", "lokasi", "cyberjaya", "office", "pejabat", "what time", "time are you open", "business hour", "opening hour", "waktu"],
    answer: {
      en: `You can reach us on WhatsApp at ${DI_FACTS.whatsapp}, call ${DI_FACTS.phone}, or email ${DI_FACTS.email}. We are at ${DI_FACTS.location}, and we answer ${DI_FACTS.hours.en}.`,
      bm: `Anda boleh hubungi kami di WhatsApp ${DI_FACTS.whatsapp}, talian ${DI_FACTS.phone}, atau e-mel ${DI_FACTS.email}. Pejabat kami di ${DI_FACTS.location}, dan kami beroperasi ${DI_FACTS.hours.bm}.`,
    },
  },
  {
    id: "audit",
    match: ["free audit", "audit", "assessment", "lead leakage", "30 minutes", "percuma", "pemeriksaan", "nilai", "tengok dulu", "free check"],
    answer: {
      en: `Start with a free AI workflow audit. In 30 minutes we review one repetitive process, identify whether AI or simple automation suits it, estimate what manual handling costs you, and recommend a fixed-scope starting point — and we will tell you honestly if automation is not worth it yet. No obligation, no lock-in.`,
      bm: `Mulakan dengan audit AI workflow percuma. Dalam 30 minit, kami telaah satu proses berulang, kenal pasti sama ada AI atau automasi ringkas sesuai, angkakan kos kerja manual anda, dan cadangkan titik mula dengan skop tetap — kami akan beritahu terus jika automasi belum berbaloi. Tiada ikatan, tiada komitmen.`,
    },
  },
  {
    // Deliberately before "pricing": "can I get a refund" mentions no price.
    id: "refund",
    match: ["refund", "money back", "guarantee", "wang dikembalikan", "pulangan wang", "duit balik"],
    answer: {
      en: `There is no cash refund policy on record. What we do commit to is the ${DI_FACTS.sla.uptimePct}% uptime guarantee on managed infrastructure and a ${DI_FACTS.sla.criticalResponseHours}-hour response on critical issues; ${DI_FACTS.sla.creditNote.en}. ${DI_FACTS.contract.en} If you want the exact wording, ask us on ${DI_FACTS.phone} before you sign.`,
      bm: `Tiada dasar pulang wang tunai dalam rekod kami. Apa yang kami komited ialah jaminan uptime ${DI_FACTS.sla.uptimePct}% untuk infrastruktur diurus dan respons ${DI_FACTS.sla.criticalResponseHours} jam untuk isu kritikal; ${DI_FACTS.sla.creditNote.bm}. ${DI_FACTS.contract.bm} Jika anda mahu ayat yang tepat, tanya kami di ${DI_FACTS.phone} sebelum tandatangan.`,
    },
  },
  {
    id: "setup-fee",
    match: ["setup fee", "set up fee", "installation", "onboarding", "yuran setup", "caj setup", "bayaran awal", "hidden cost", "kos tersembunyi"],
    answer: {
      en: `Setup fees are up front and stated per tier: AI Starter has no setup fee (template-based setup is included), AI Growth is a one-time ${money(1500)}, and AI Operations is a one-time ${money(3500)}. Note that ${DI_FACTS.excludedList.en} are billed separately.`,
      bm: `Yuran setup dinyatakan di hadapan untuk setiap pelan: AI Starter tiada yuran setup (setup berasaskan templat sudah termasuk), AI Growth sekali bayar ${money(1500)}, dan AI Operations sekali bayar ${money(3500)}. Ambil tahu bahawa ${DI_FACTS.excludedList.bm} dicaj berasingan.`,
    },
  },
  {
    id: "contract",
    match: ["contract", "lock in", "lock-in", "cancel", "terminate", "commitment", "tahun", "kontrak", "batalkan", "melepaskan"],
    answer: {
      // The pilot note is one fact per sentence, so it is restated here as a
      // clause rather than spliced in lower-cased — "and one-off. credited to…"
      // is what string-mashing a sentence into the middle of another produces.
      en: `${DI_FACTS.contract.en} The DutaConnect pilot (${money(DI_FACTS.dutaConnect.pilotMYR)} for ${DI_FACTS.dutaConnect.pilotDays} days) is a one-time payment that is credited to your first ongoing month if you continue — nothing renews by itself.`,
      bm: `${DI_FACTS.contract.bm} Pilot DutaConnect (${money(DI_FACTS.dutaConnect.pilotMYR)} untuk ${DI_FACTS.dutaConnect.pilotDays} hari) ialah bayaran sekali sahaja yang dikreditkan ke bulan berterusan pertama anda jika anda teruskan — tiada apa yang diperbaharui automatik.`,
    },
  },
  {
    id: "dutaos",
    match: ["dutaos", "duta os", "module", "modul", "platform", "connect", "govern", "bundle", "sistem"],
    answer: {
      en: `DutaOS is modular, priced per module:\n${moduleLines("en")}\nThe Bundle is the cheapest way to take all four (${DI_FACTS.dutaosModules[3].badge.en}). Modules are sold as a managed service, so our setup, management, and support are in the price.`,
      bm: `DutaOS bersifat modular, dihargai setiap modul:\n${moduleLines("bm")}\nPakej "Bundle" ialah cara paling murah untuk ambil keempat-empatnya (${DI_FACTS.dutaosModules[3].badge.bm}). Modul dijual sebagai servis urus, jadi setup, pengurusan, dan sokongan kami sudah termasuk dalam harga.`,
    },
  },
  {
    id: "pilot",
    match: ["pilot", "dutaconnect", "duta connect", "trial", "test first", "cuba", "percubaan", "mula kecil", "proof of concept", "prove"],
    answer: {
      en: `Yes — start with the DutaConnect pilot: ${money(DI_FACTS.dutaConnect.pilotMYR)} for ${DI_FACTS.dutaConnect.pilotDays} days. ${DI_FACTS.dutaConnect.note.en} The ongoing plan after that is ${money(DI_FACTS.dutaConnect.ongoingMYR)} / ${PERIOD.en}, month to month, pause or stop anytime.`,
      bm: `Boleh — mulakan dengan pilot DutaConnect: ${money(DI_FACTS.dutaConnect.pilotMYR)} untuk ${DI_FACTS.dutaConnect.pilotDays} hari. ${DI_FACTS.dutaConnect.note.bm} Pelan selepasnya ialah ${money(DI_FACTS.dutaConnect.ongoingMYR)} setiap ${PERIOD.bm} — bulanan, jeda atau berhenti bila-bila masa.`,
    },
  },
  {
    id: "hourly",
    match: ["hourly", "per hour", "rate card", "extra change", "additional change", "luar skop", "berapa sejam", "freelance"],
    answer: {
      en: `Additional changes outside your plan are ${money(DI_FACTS.extraChangesPerHourMYR)} per hour. If the change is minor we can usually roll it into next month's allowance instead — just ask.`,
      bm: `Perubahan tambahan di luar skop pelan anda ialah ${money(DI_FACTS.extraChangesPerHourMYR)} sejam. Jika perubahan itu kecil, kami biasanya boleh masukkan dalam elaun bulan depan — tanya sahaja.`,
    },
  },
  {
    id: "pricing",
    // No bare "berapa": it is the first half of both "berapa harga" (a price) and
    // "berapa lama" (a duration), and this intent runs before `timeline`, so it
    // answered "how long does it take" with the price list.
    match: ["price", "pricing", "cost", "how much", "package", "plan", "tier", "rm", "ringgit", "harga", "kos", "pakej", "bayar", "yuran", "duit", "monthly"],
    answer: {
      en: `Our managed AI plans are:\n${tierLines("en")}\nStart smaller with the DutaConnect pilot at ${money(DI_FACTS.dutaConnect.pilotMYR)} for ${DI_FACTS.dutaConnect.pilotDays} days if you want to prove one workflow first. Prices exclude ${DI_FACTS.excludedList.en}.`,
      bm: `Pelan AI diurus kami ialah:\n${tierLines("bm")}\nJika anda mahu buktikan satu workflow dahulu, mulakan dengan pilot DutaConnect pada ${money(DI_FACTS.dutaConnect.pilotMYR)} untuk ${DI_FACTS.dutaConnect.pilotDays} hari. Harga ini tidak termasuk ${DI_FACTS.excludedList.bm}.`,
    },
  },
  {
    id: "services",
    // Includes things people ask for that we do not sell, so the answer is the
    // real catalogue rather than a hand-off.
    match: ["service", "what do you do", "offer", "do you provide", "perkhidmatan", "apa yang kamu buat", "bidang", "kepakaran", "it support", "cloud", "security", "pdpa", "intelligence", "development", "web design", "website", "app development", "seo", "rekaan web"],
    answer: {
      en: `We are a technology partner for Malaysian SMEs — IT, security, cloud and AI working together. The five things we do are: ${serviceNames("en").join(", ")}. Every engagement runs the same way: ${processNames("en").join(" → ")}.`,
      bm: `Kami rakan teknologi untuk PKS Malaysia — IT, keselamatan, awan dan AI bekerja bersama. Lima perkara yang kami buat: ${serviceNames("bm").join(", ")}. Setiap kerjasama berjalan dengan cara yang sama: ${processNames("bm").join(" → ")}.`,
    },
  },
  {
    id: "timeline",
    // No bare "siap": it is a prefix of "siapa" (who), so "siapa anda" routed here
    // and answered a who-are-you with a delivery timeline.
    match: ["how long", "when", "timeline", "fast", "deadline", "turnaround", "proposal", "berapa lama", "berapa hari", "bila", "tempoh", "bila siap", "sudah siap"],
    answer: {
      en: `After the free audit you get a real written proposal within ${DI_FACTS.proposalTurnaroundDays} working days — not a template. Delivery length depends on the workflow; the pilot runs in ${DI_FACTS.dutaConnect.pilotDays} days so you can see a working automation before committing to a plan.`,
      bm: `Selepas audit percuma, anda dapat proposal bertulis yang sebenar dalam ${DI_FACTS.proposalTurnaroundDays} hari bekerja — bukan templat. Tempoh penghantaran bergantung pada workflow; pilot berjalan ${DI_FACTS.dutaConnect.pilotDays} hari supaya anda nampak automasi yang berfungsi sebelum komit pada mana-mana pelan.`,
    },
  },
  {
    id: "limits",
    match: ["what you don't", "won't", "not do", "tak buat", "refuse", "reject", "apa yang tak", "tidak buat", "larangan"],
    answer: {
      // The list is English-only on the site (translations.ts:1239-1243), so BM
      // readers get the same commitments rather than a paraphrase we invented.
      en: `Five things we commit to not doing:\n${DI_FACTS.willNotDo.map((w) => `  - ${w}`).join("\n")}`,
      bm: `Lima perkara yang kami berjanji tidak akan lakukan:\n${DI_FACTS.willNotDo.map((w) => `  - ${w}`).join("\n")}`,
    },
  },
  {
    id: "compliance",
    match: ["ssm", "lhdn", "tax", "cukai", "registration", "company no", "no daftar", "syarikat berhad", "legal", "nasihat undang-undang", "sst", "e-invoice", "peka"],
    answer: {
      en: `We are ${DI_FACTS.legalName}, based in Cyberjaya, Selangor, Malaysia. ${DI_FACTS.ssmNumber ? `Our SSM registration number is ${DI_FACTS.ssmNumber}.` : `I do not have our SSM registration number or tax reference to quote — I will not guess at one; ask us on ${DI_FACTS.phone} and we will send the particulars.`} On compliance: we provide PDPA-aware operational support. We do not give legal, tax, or financial advice — for a filing position you need SSM, LHDN, or a licensed professional, and we will happily work alongside them.`,
      bm: `Kami ${DI_FACTS.legalName}, beroperasi dari Cyberjaya, Selangor, Malaysia. ${DI_FACTS.ssmNumber ? `Nombor pendaftaran SSM kami ialah ${DI_FACTS.ssmNumber}.` : `Saya tidak mempunyai nombor pendaftaran SSM atau rujukan cukai untuk dipetik — saya tidak akan teka; tanya kami di ${DI_FACTS.phone} dan kami akan berikan butiran itu.`} Mengenai pematuhan: kami beri sokongan operasi yang peka PDPA. Kami tidak memberi nasihat undang-undang, cukai, atau kewangan — untuk kedudukan pemfailan anda perlukan SSM, LHDN, atau profesional berlesen, dan kami boleh bekerjasama dengan mereka.`,
    },
  },
  {
    // Last but two, so a question that merely contains "about" is still answered
    // by a specific intent above it.
    id: "about",
    match: ["who are you", "about you", "about us", "about duta", "duta integra", "founder", "siapa anda", "tentang anda", "tentang kami", "cerita"],
    answer: {
      en: `We are ${DI_FACTS.legalName} — founder-led, AI-first, based in Cyberjaya. We work with Malaysian SMEs on ${serviceNames("en").join(", ").replace(/, ([^,]*)$/, ", and $1")}. In practice that means a real proposal within ${DI_FACTS.proposalTurnaroundDays} working days. ${DI_FACTS.contract.en} And unlike an agency that hands you to an account manager, our founder is still on every account.`,
      bm: `Kami ${DI_FACTS.legalName} — dipimpin pengasas, AI-first, berpangkalan di Cyberjaya. Kami bekerja dengan PKS Malaysia dalam ${serviceNames("bm").join(", ")}. Dalam praktik: proposal sebenar dalam ${DI_FACTS.proposalTurnaroundDays} hari bekerja. ${DI_FACTS.contract.bm} Berbeza dengan agensi yang menyerahkan anda kepada pengurus akaun, pengasas kami masih ada dalam setiap akaun.`,
    },
  },
  {
    id: "greeting",
    match: ["hi", "hello", "hey", "salam", "hai", "apa khabar", "good morning", "good afternoon"],
    answer: {
      en: `Hi — I'm Ask Duta, and I can answer questions about Duta Integra: our services, what things cost, the free AI workflow audit, DutaOS, contracts, and how to reach us. What would you like to know?`,
      bm: `Hai — saya Ask Duta, dan saya boleh jawab soalan tentang Duta Integra: perkhidmatan kami, harga, audit AI workflow percuma, DutaOS, perjanjian, dan cara menghubungi kami. Apa yang anda ingin tahu?`,
    },
  },
];

function normalise(text) {
  return text.toLowerCase().replace(/[.,!?;:"']/g, " ").replace(/\s+/g, " ").trim();
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Anchored at a word start and allowed to run to the end of that word: "plan" has
// to match "plans" and "pricing" has to match "prices", but a bare "rm" must not
// match "platform" or "confirm".
const COMPILED = INTENTS.map((intent) => ({
  id: intent.id,
  answer: intent.answer,
  rx: new RegExp(`\\b(?:${intent.match.map((m) => escapeRe(normalise(m)).replace(/ /g, "\\s+")).join("|")})`, "i"),
}));

/**
 * Deterministic intent match against the curated facts. Returns
 * `{ topic, answer }`, or null when nothing in DATA covers the question — which
 * the caller must treat as "ask a human", never as licence to improvise.
 */
export function answerLocally(question, lang = "bm") {
  if (typeof question !== "string" || !question.trim()) return null;
  const haystack = normalise(question);
  for (const intent of COMPILED) {
    if (intent.rx.test(haystack)) {
      return { topic: intent.id, answer: intent.answer[lang] ?? intent.answer.en };
    }
  }
  return null;
}

/** The DATA block for the model path, mirroring the duta-ceo contract. */
export function knowledgeBrief() {
  return {
    company: DI_FACTS,
    managedPlans: tierLines("en"),
    dutaosModules: moduleLines("en"),
    stated: "These facts are the only company data you may use.",
  };
}
