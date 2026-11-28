import assert from "node:assert/strict";
import test from "node:test";

import { missingSecurityHeaders } from "../scripts/deploy-security-headers.mjs";

const VALID_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://va.vercel-scripts.com https://www.googletagmanager.com https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "img-src 'self' data: https:",
  "font-src 'self' https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "connect-src 'self' https://va.vercel-scripts.com https://www.google-analytics.com https://cloudflareinsights.com",
  "object-src 'none'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
].join("; ");

const COMPLETE = {
  "content-security-policy": VALID_CSP,
  "x-frame-options": "DENY",
  "x-content-type-options": "nosniff",
  "x-permitted-cross-domain-policies": "none",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "strict-transport-security": "max-age=31536000; includeSubDomains; preload",
};

function completeHeaders() {
  return new Headers(COMPLETE);
}

function replaceCspDirective(name, sources) {
  return VALID_CSP.split("; ")
    .map((directive) => directive.startsWith(`${name} `) ? `${name} ${sources}` : directive)
    .join("; ");
}

function removeCspDirective(name) {
  return VALID_CSP.split("; ")
    .filter((directive) => !directive.startsWith(`${name} `))
    .join("; ");
}

const REQUIRED = [
  ["Content-Security-Policy", "content-security-policy", "default-src 'none'"],
  ["X-Frame-Options", "x-frame-options", "SAMEORIGIN"],
  ["X-Content-Type-Options", "x-content-type-options", "text/plain"],
  ["X-Permitted-Cross-Domain-Policies", "x-permitted-cross-domain-policies", "all"],
  ["Referrer-Policy", "referrer-policy", "no-referrer"],
  ["Permissions-Policy", "permissions-policy", "camera=(self), microphone=(), geolocation=()"],
  ["Strict-Transport-Security", "strict-transport-security", "max-age=0"],
];

test("a complete security header set has no missing or invalid headers", () => {
  assert.deepEqual(missingSecurityHeaders(completeHeaders()), []);
});

test("an empty response reports every required security header", () => {
  assert.deepEqual(
    missingSecurityHeaders(new Headers()),
    [
      "Content-Security-Policy",
      "X-Frame-Options",
      "X-Content-Type-Options",
      "X-Permitted-Cross-Domain-Policies",
      "Referrer-Policy",
      "Permissions-Policy",
      "Strict-Transport-Security",
    ],
  );
});

for (const [name, key, incorrect] of REQUIRED) {
  test(`reports ${name} when it is missing`, () => {
    const headers = completeHeaders();
    headers.delete(key);
    assert.deepEqual(missingSecurityHeaders(headers), [name]);
  });

  test(`reports ${name} when its value is incorrect`, () => {
    const headers = completeHeaders();
    headers.set(key, incorrect);
    assert.deepEqual(missingSecurityHeaders(headers), [name]);
  });
}

for (const feature of ["camera", "microphone", "geolocation"]) {
  test(`reports Permissions-Policy when ${feature}=() is missing`, () => {
    const headers = completeHeaders();
    const value = ["camera", "microphone", "geolocation"]
      .filter((candidate) => candidate !== feature)
      .map((candidate) => `${candidate}=()`)
      .join(", ");
    headers.set("permissions-policy", value);
    assert.deepEqual(missingSecurityHeaders(headers), ["Permissions-Policy"]);
  });
}

function cspSources(name) {
  return VALID_CSP.split("; ")
    .find((directive) => directive.startsWith(`${name} `))
    .slice(name.length + 1)
    .split(/\s+/);
}

function removeCspSource(name, source) {
  return VALID_CSP.split("; ")
    .map((directive) => {
      if (!directive.startsWith(`${name} `)) return directive;
      return [name, ...cspSources(name).filter((candidate) => candidate !== source)].join(" ");
    })
    .join("; ");
}

const CSP_DIRECTIVES = [
  "default-src",
  "script-src",
  "style-src",
  "img-src",
  "font-src",
  "connect-src",
  "object-src",
  "base-uri",
  "frame-ancestors",
];

for (const name of CSP_DIRECTIVES) {
  test(`reports Content-Security-Policy when ${name} is missing`, () => {
    const headers = completeHeaders();
    headers.set("content-security-policy", removeCspDirective(name));
    assert.deepEqual(missingSecurityHeaders(headers), ["Content-Security-Policy"]);
  });

  test(`reports Content-Security-Policy when ${name} allows an additional source`, () => {
    const headers = completeHeaders();
    headers.set(
      "content-security-policy",
      replaceCspDirective(name, `${cspSources(name).join(" ")} https://unapproved.example`),
    );
    assert.deepEqual(missingSecurityHeaders(headers), ["Content-Security-Policy"]);
  });
}

for (const [name, source] of [
  ["script-src", "https://cdn.tailwindcss.com"],
  ["style-src", "https://fonts.googleapis.com"],
  ["img-src", "https:"],
  ["font-src", "https://fonts.gstatic.com"],
  ["connect-src", "https://www.google-analytics.com"],
]) {
  test(`reports Content-Security-Policy when ${name} omits approved source ${source}`, () => {
    const headers = completeHeaders();
    headers.set("content-security-policy", removeCspSource(name, source));
    assert.deepEqual(missingSecurityHeaders(headers), ["Content-Security-Policy"]);
  });
}

for (const [name, value] of [
  ["a scheme-wide script source", replaceCspDirective("script-src", `${cspSources("script-src").join(" ")} https:`)],
  ["an unapproved script host", replaceCspDirective("script-src", `${cspSources("script-src").join(" ")} https://unapproved.example`)],
  ["an extra style source", replaceCspDirective("style-src", `${cspSources("style-src").join(" ")} https://unapproved.example`)],
  ["an extra font source", replaceCspDirective("font-src", `${cspSources("font-src").join(" ")} https://unapproved.example`)],
  ["an extra connect source", replaceCspDirective("connect-src", `${cspSources("connect-src").join(" ")} https://unapproved.example`)],
  ["a wildcard script source", replaceCspDirective("script-src", `${cspSources("script-src").join(" ")} *`)],
  ["an unsafe-eval script source", replaceCspDirective("script-src", `${cspSources("script-src").join(" ")} 'unsafe-eval'`)],
]) {
  test(`reports Content-Security-Policy with ${name}`, () => {
    const headers = completeHeaders();
    headers.set("content-security-policy", value);
    assert.deepEqual(missingSecurityHeaders(headers), ["Content-Security-Policy"]);
  });
}

test("reports Content-Security-Policy when it contains an extra directive", () => {
  const headers = completeHeaders();
  headers.set("content-security-policy", `${VALID_CSP}; upgrade-insecure-requests`);
  assert.deepEqual(missingSecurityHeaders(headers), ["Content-Security-Policy"]);
});

test("reports Content-Security-Policy when a source is duplicated", () => {
  const headers = completeHeaders();
  headers.set(
    "content-security-policy",
    replaceCspDirective("script-src", `${cspSources("script-src").join(" ")} 'self'`),
  );
  assert.deepEqual(missingSecurityHeaders(headers), ["Content-Security-Policy"]);
});

test("reports Content-Security-Policy when a directive is duplicated", () => {
  const headers = completeHeaders();
  headers.set("content-security-policy", `${VALID_CSP}; script-src 'self'`);
  assert.deepEqual(missingSecurityHeaders(headers), ["Content-Security-Policy"]);
});

test("reports a duplicated directive even when its sources are reordered", () => {
  const headers = completeHeaders();
  const reordered = cspSources("script-src").reverse().join(" ");
  headers.set("content-security-policy", `${VALID_CSP}; script-src ${reordered}`);
  assert.deepEqual(missingSecurityHeaders(headers), ["Content-Security-Policy"]);
});

test("accepts Content-Security-Policy with reordered directives and sources", () => {
  const headers = completeHeaders();
  const reordered = VALID_CSP.split("; ")
    .reverse()
    .map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, ...sources.reverse()].join(" ");
    })
    .join("; ");
  headers.set("content-security-policy", reordered);
  assert.deepEqual(missingSecurityHeaders(headers), []);
});

test("normalizes Content-Security-Policy case and whitespace", () => {
  const headers = completeHeaders();
  headers.set("content-security-policy", `${VALID_CSP.toUpperCase().replaceAll("; ", " \t;  ")};`);
  assert.deepEqual(missingSecurityHeaders(headers), []);
});

const INCOMPLETE_HSTS = [
  ["max-age=31536000; preload", "includeSubDomains"],
  ["max-age=31536000; includeSubDomains", "preload"],
  ["max-age=31535999; includeSubDomains; preload", "max-age=31536000"],
  ["max-age=0; max-age=31536000; includeSubDomains; preload", "one unambiguous max-age"],
];

for (const [value, requirement] of INCOMPLETE_HSTS) {
  test(`reports Strict-Transport-Security without ${requirement}`, () => {
    const headers = completeHeaders();
    headers.set("strict-transport-security", value);
    assert.deepEqual(missingSecurityHeaders(headers), ["Strict-Transport-Security"]);
  });
}
