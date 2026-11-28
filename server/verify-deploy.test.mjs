import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import test from "node:test";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const INDEX_HTML = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const SECURITY_HEADERS = {
  "content-security-policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://va.vercel-scripts.com https://www.googletagmanager.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com; connect-src 'self' https://va.vercel-scripts.com https://www.google-analytics.com https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "x-permitted-cross-domain-policies": "none",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
};

function sendIndex(res, html = INDEX_HTML, headers = SECURITY_HEADERS) {
  res.writeHead(200, { "content-type": "text/html", ...headers });
  res.end(html);
}

async function runVerify(handler, attempts = 1) {
  const server = createServer(handler);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const child = spawn(process.execPath, ["scripts/verify-deploy.mjs"], {
    cwd: ROOT,
    env: {
      ...process.env,
      SITE_URL: `http://127.0.0.1:${server.address().port}`,
      VERIFY_ATTEMPTS: String(attempts),
      VERIFY_DELAY_MS: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk) => { output += chunk; });
  child.stderr.on("data", (chunk) => { output += chunk; });
  const [code] = await once(child, "close");

  await new Promise((resolve) => server.close(resolve));
  server.closeAllConnections?.();
  return { code, output };
}

test("accepts the built bundle when every required security header is present", async () => {
  const { code, output } = await runVerify((_req, res) => sendIndex(res));
  assert.equal(code, 0, output);
  assert.match(output, /\[verify-deploy\] OK:/);
});

test("rejects the built bundle when a required security header is missing", async () => {
  const headers = { ...SECURITY_HEADERS };
  delete headers["content-security-policy"];
  const { code, output } = await runVerify((_req, res) => sendIndex(res, INDEX_HTML, headers));
  assert.equal(code, 1, output);
  assert.match(output, /missing or invalid security headers: Content-Security-Policy/);
});

test("rejects the built bundle when Content-Security-Policy allows an unapproved script host", async () => {
  const headers = {
    ...SECURITY_HEADERS,
    "content-security-policy": SECURITY_HEADERS["content-security-policy"].replace(
      "https://static.cloudflareinsights.com;",
      "https://static.cloudflareinsights.com https://unapproved.example;",
    ),
  };
  const { code, output } = await runVerify((_req, res) => sendIndex(res, INDEX_HTML, headers));
  assert.equal(code, 1, output);
  assert.match(output, /missing or invalid security headers: Content-Security-Policy/);
});

test("retries a stale bundle before accepting the deployment", async () => {
  let requests = 0;
  const { code, output } = await runVerify((_req, res) => {
    requests += 1;
    if (requests === 1) sendIndex(res, '<script src="/assets/index-stale.js"></script>');
    else sendIndex(res);
  }, 2);
  assert.equal(code, 0, output);
  assert.equal(requests, 2);
  assert.match(output, /attempt 1\/2: production still serves/);
  assert.match(output, /\[verify-deploy\] OK:/);
});

test("retries missing security headers before accepting a healthy response", async () => {
  let requests = 0;
  const headers = { ...SECURITY_HEADERS };
  delete headers["content-security-policy"];
  const { code, output } = await runVerify((_req, res) => {
    requests += 1;
    if (requests === 1) sendIndex(res, INDEX_HTML, headers);
    else sendIndex(res);
  }, 2);
  assert.equal(code, 0, output);
  assert.equal(requests, 2);
  assert.match(output, /attempt 1\/2: .*missing or invalid security headers: Content-Security-Policy/);
  assert.match(output, /\[verify-deploy\] OK:/);
});

test("permanent header failure consumes every attempt and reports the matching bundle", async () => {
  let requests = 0;
  const headers = { ...SECURITY_HEADERS };
  delete headers["content-security-policy"];
  const { code, output } = await runVerify((_req, res) => {
    requests += 1;
    sendIndex(res, INDEX_HTML, headers);
  }, 3);
  assert.equal(code, 1, output);
  assert.equal(requests, 3);
  assert.match(output, /attempt 3\/3: .*missing or invalid security headers: Content-Security-Policy/);
  assert.match(output, /served:\s+assets\/index-[A-Za-z0-9_-]+\.(?:js|css)/);
  assert.match(output, /last error: .*Content-Security-Policy/);
});

test("a later bundle mismatch does not retain an earlier header error", async () => {
  let requests = 0;
  const headers = { ...SECURITY_HEADERS };
  delete headers["content-security-policy"];
  const { code, output } = await runVerify((_req, res) => {
    requests += 1;
    if (requests === 1) sendIndex(res, INDEX_HTML, headers);
    else sendIndex(res, '<script src="/assets/index-other.js"></script>');
  }, 2);
  assert.equal(code, 1, output);
  assert.equal(requests, 2);
  assert.match(output, /served:\s+assets\/index-other\.js/);
  assert.match(output, /last error: production still served a different bundle/);
  assert.doesNotMatch(output, /last error: .*Content-Security-Policy/);
});
