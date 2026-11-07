// Fails the pipeline when production is not serving the bundle this pipeline built.
//
// The deploy job reporting success is not proof the site changed: wrangler uploads
// to a preview alias unless it is told `--branch main`, and a deploy that lands on a
// preview leaves the custom domain on the previous bundle. That happened here and
// was invisible — the job was green and the site was stale. This compares the asset
// the artifact's index.html references with the asset production actually serves, so
// the difference is a red pipeline instead of a silent no-op.

import { readFile } from "node:fs/promises";

const SITE_URL = process.env.SITE_URL ?? "https://dutaintegra.my";
const ATTEMPTS = Number(process.env.VERIFY_ATTEMPTS ?? 12);
const DELAY_MS = Number(process.env.VERIFY_DELAY_MS ?? 10_000);
const ASSET_RE = /assets\/index-[A-Za-z0-9_-]+\.(?:js|css)/g;

function assetsIn(html) {
  return [...new Set(html.match(ASSET_RE) ?? [])].sort();
}

async function fetchIndex(url) {
  const res = await fetch(url, {
    headers: { "cache-control": "no-cache" },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`GET ${url} -> HTTP ${res.status}`);
  return res.text();
}

const local = assetsIn(await readFile("public/index.html", "utf8"));
if (local.length === 0) {
  console.error("[verify-deploy] public/index.html references no assets/index-* bundle");
  process.exit(1);
}
console.log(`[verify-deploy] artifact expects: ${local.join(", ")}`);

let lastSeen = [];
for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  try {
    const remote = assetsIn(await fetchIndex(SITE_URL));
    lastSeen = remote;
    const missing = local.filter((a) => !remote.includes(a));
    if (missing.length === 0) {
      console.log(`[verify-deploy] OK: ${SITE_URL} serves ${local.join(", ")}`);
      process.exit(0);
    }
    console.log(
      `[verify-deploy] attempt ${attempt}/${ATTEMPTS}: production still serves ` +
        `${remote.join(", ") || "(nothing)"} — waiting for ${missing.join(", ")}`,
    );
  } catch (err) {
    console.log(`[verify-deploy] attempt ${attempt}/${ATTEMPTS}: ${err.message}`);
  }
  if (attempt < ATTEMPTS) await new Promise((r) => setTimeout(r, DELAY_MS));
}

console.error(
  `[verify-deploy] FAIL: ${SITE_URL} never served the built bundle.\n` +
    `  expected: ${local.join(", ")}\n` +
    `  served:   ${lastSeen.join(", ") || "(nothing)"}\n` +
    `The deploy job succeeded but production did not change — check that wrangler ` +
    `passed --branch main and did not upload to a preview alias.`,
);
process.exit(1);
