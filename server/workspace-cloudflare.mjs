// Phase 4 workspace API was reverted. Keep a minimal assessment scorer so the
// public Digital Assessment tool keeps working; all other workspace endpoints
// return 404.
const levels = [
  { below: 40, en: "Digital Foundations", bm: "Asas Digital" },
  { below: 65, en: "Digital Growth", bm: "Pertumbuhan Digital" },
  { below: 82, en: "Digital Ready", bm: "Bersedia Secara Digital" },
  { below: 101, en: "Advanced Digital", bm: "Digital Lanjutan" },
];

const advice = {
  foundations: {
    en: "Stabilise core systems, access control, backups and data ownership.",
    bm: "Kukuhkan sistem utama, kawalan akses, sandaran dan pemilikan data.",
  },
  sales: {
    en: "Improve lead capture, CRM follow-up and sales reporting.",
    bm: "Perbaik cara merekod prospek, membuat susulan dalam CRM dan melaporkan jualan.",
  },
  automation: {
    en: "Map repetitive workflows before selecting automation tools.",
    bm: "Petakan aliran kerja berulang sebelum memilih alat automasi.",
  },
  security: {
    en: "Review identity, MFA, backups, PDPA handling and incident response.",
    bm: "Semak pengurusan identiti, pengesahan berbilang faktor, sandaran, pematuhan PDPA dan tindak balas insiden.",
  },
  ai: {
    en: "Choose one measurable AI pilot with human review and clear success metrics.",
    bm: "Pilih satu projek rintis AI dengan semakan manusia dan ukuran kejayaan yang jelas.",
  },
  operations: {
    en: "Standardise workflows and establish operational dashboards.",
    bm: "Seragamkan aliran kerja dan sediakan papan pemuka operasi.",
  },
  roadmap: {
    en: "Start with a short discovery session and prioritised digital roadmap.",
    bm: "Mulakan dengan sesi ringkas untuk mengenal pasti keperluan dan menyusun pelan digital mengikut keutamaan.",
  },
};

function scoreAssessment(maturity, priorities) {
  const maturityScore = Math.max(0, Math.min(5, Number(maturity) || 1)) * 16;
  const breadthBonus = Math.min(20, (Array.isArray(priorities) ? priorities.length : 0) * 4);
  const score = Math.max(0, Math.min(100, Math.round(maturityScore + breadthBonus)));
  const level = levels.find(({ below }) => score < below);
  const recs = [];
  if (maturity <= 2) recs.push(advice.foundations);
  for (const priority of ["sales", "automation", "security", "ai", "operations"]) {
    if (priorities.includes(priority)) recs.push(advice[priority]);
  }
  if (!recs.length) recs.push(advice.roadmap);
  const recommendations = recs.slice(0, 5);
  return {
    score,
    en: { maturityLabel: level.en, recommendations: recommendations.map((rec) => rec.en) },
    bm: { maturityLabel: level.bm, recommendations: recommendations.map((rec) => rec.bm) },
  };
}

function text(value, max = 500, required = false) {
  if (typeof value !== "string") return required ? null : "";
  const s = value.trim();
  return s.length <= max && (!required || s.length > 0) ? s : null;
}

export async function handleWorkspaceApi(req) {
  const { pathname } = new URL(req.url);
  const isPreview = pathname === "/api/workspace/assessments/preview";
  if ((isPreview || pathname === "/api/workspace/assessments") && req.method === "POST") {
    let body;
    try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: "Invalid JSON body" }), { status: 400, headers: { "content-type": "application/json" } }); }
    const maturity = Number(body?.digitalMaturity);
    if (!Number.isInteger(maturity) || maturity < 1 || maturity > 5) {
      return new Response(JSON.stringify({ error: "Digital maturity must be between 1 and 5." }), { status: 400, headers: { "content-type": "application/json" } });
    }
    const allowed = new Set(["sales", "automation", "security", "ai", "operations", "customer-experience", "data"]);
    const priorities = Array.isArray(body?.priorities) ? [...new Set(body.priorities.filter(x => typeof x === "string" && allowed.has(x)))] : [];
    if (!priorities.length) {
      return new Response(JSON.stringify({ error: "Select at least one business priority." }), { status: 400, headers: { "content-type": "application/json" } });
    }
    const assessment = scoreAssessment(maturity, priorities);
    if (isPreview) {
      return Response.json(assessment, { headers: { "cache-control": "no-store" } });
    }

    // Persist as a lead when Supabase is configured (best-effort; never block the score).
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (supabaseUrl && supabaseKey) {
      try {
        const persistRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/leads`, {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            authorization: `Bearer ${supabaseKey}`,
            "content-type": "application/json",
            prefer: "return=minimal",
          },
          body: JSON.stringify({
            name: text(body.name, 120, true) || "Assessment lead",
            email: text(body.email, 200, true)?.toLowerCase() || "unknown@example.com",
            company: text(body.company, 160, true) || null,
            service: "Digital Assessment",
            status: "new",
            source: "digital-assessment",
            lead_score: assessment.score,
            industry: text(body.industry, 100, true) || null,
            message: `Maturity: ${maturity}/5; priorities: ${priorities.join(", ")}`,
          }),
        });
        if (!persistRes.ok) {
          console.error("[workspace] assessment lead persist failed:", persistRes.status, await persistRes.text());
        }
      } catch (err) {
        console.error("[workspace] assessment lead persist failed:", err?.message || err);
      }
    }
    return new Response(JSON.stringify({
      score: assessment.score,
      ...assessment.en,
      message: "Assessment submitted. Duta Integra can now follow up on your digital roadmap.",
    }), { status: 201, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
  }
  return null;
}
