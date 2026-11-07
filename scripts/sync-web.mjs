#!/usr/bin/env node
// Copy the built React SPA into both deployment outputs. Vercel serves Web/;
// Cloudflare Pages serves public/ according to wrangler.toml. Keep their entry
// HTML and hashed bundles aligned while preserving legacy standalone pages.
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "web-new", "dist");
const targets = [join(root, "Web"), join(root, "public")];

if (!existsSync(dist)) {
  console.error("web-new/dist not found — run the web-new build first");
  process.exit(1);
}

for (const target of targets) {
  const assets = join(target, "assets");
  // Remove every previously built bundle, not just index-*. Vite emits a
  // hashed chunk per route, so a route dropped or renamed leaves an orphan
  // here that no longer matches web-new/ — which is exactly what the
  // artifact-drift gate flags as an uncommitted change. Images in assets/ are
  // hand-maintained and have no hash suffix, so only .js/.css are pruned.
  if (existsSync(assets)) {
    for (const file of readdirSync(assets)) {
      if (/\.(js|css)$/.test(file)) rmSync(join(assets, file));
    }
  }
  mkdirSync(assets, { recursive: true });
  cpSync(join(dist, "index.html"), join(target, "index.html"));
  for (const file of readdirSync(join(dist, "assets"))) cpSync(join(dist, "assets", file), join(assets, file));
  for (const file of readdirSync(dist)) {
    if (file === "assets" || file === "index.html") continue;
    cpSync(join(dist, file), join(target, file), { recursive: true });
  }
  console.log(`Synced web-new/dist -> ${target.replace(root + "/", "")}/`);
}
