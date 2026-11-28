/**
 * Return the required response headers that are absent or do not carry the
 * minimum security value deployment verification expects.
 */
const EXPECTED_CSP_DIRECTIVES = new Map([
  ["default-src", new Set(["'self'"])],
  [
    "script-src",
    new Set([
      "'self'",
      "'unsafe-inline'",
      "https://cdn.tailwindcss.com",
      "https://va.vercel-scripts.com",
      "https://www.googletagmanager.com",
      "https://static.cloudflareinsights.com",
    ]),
  ],
  [
    "style-src",
    new Set([
      "'self'",
      "'unsafe-inline'",
      "https://cdn.jsdelivr.net",
      "https://fonts.googleapis.com",
    ]),
  ],
  ["img-src", new Set(["'self'", "data:", "https:"])],
  [
    "font-src",
    new Set([
      "'self'",
      "https://cdn.jsdelivr.net",
      "https://fonts.gstatic.com",
    ]),
  ],
  [
    "connect-src",
    new Set([
      "'self'",
      "https://va.vercel-scripts.com",
      "https://www.google-analytics.com",
      "https://cloudflareinsights.com",
    ]),
  ],
  ["object-src", new Set(["'none'"])],
  ["base-uri", new Set(["'self'"])],
  ["frame-ancestors", new Set(["'none'"])],
]);

function parseCspDirectives(value) {
  const directives = new Map();
  for (const part of value.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...sources] = trimmed.split(/\s+/);
    const key = name.toLowerCase();
    if (directives.has(key)) return null;

    const normalizedSources = sources.map((source) => source.toLowerCase());
    const sourceSet = new Set(normalizedSources);
    if (sourceSet.size !== normalizedSources.length) return null;
    directives.set(key, sourceSet);
  }
  return directives;
}

function sameSources(actual, expected) {
  return actual.size === expected.size && [...expected].every((source) => actual.has(source));
}

function validCsp(value) {
  const directives = parseCspDirectives(value);
  if (!directives || directives.size !== EXPECTED_CSP_DIRECTIVES.size) return false;

  for (const [name, expected] of EXPECTED_CSP_DIRECTIVES) {
    const actual = directives.get(name);
    if (!actual || !sameSources(actual, expected)) return false;
  }
  return true;
}

function validHsts(value) {
  const directives = value
    .split(";")
    .map((directive) => directive.trim().toLowerCase())
    .filter(Boolean);
  const maxAges = directives.flatMap((directive) => {
    const match = directive.match(/^max-age\s*=\s*(.*)$/);
    return match ? [match[1].trim()] : [];
  });
  return maxAges.length === 1
    && maxAges[0] === "31536000"
    && directives.includes("includesubdomains")
    && directives.includes("preload");
}

const REQUIRED = [
  {
    name: "Content-Security-Policy",
    key: "content-security-policy",
    valid: validCsp,
  },
  {
    name: "X-Frame-Options",
    key: "x-frame-options",
    valid: (value) => value.toUpperCase() === "DENY",
  },
  {
    name: "X-Content-Type-Options",
    key: "x-content-type-options",
    valid: (value) => value.toLowerCase() === "nosniff",
  },
  {
    name: "X-Permitted-Cross-Domain-Policies",
    key: "x-permitted-cross-domain-policies",
    valid: (value) => value.toLowerCase() === "none",
  },
  {
    name: "Referrer-Policy",
    key: "referrer-policy",
    valid: (value) => value.toLowerCase() === "strict-origin-when-cross-origin",
  },
  {
    name: "Permissions-Policy",
    key: "permissions-policy",
    valid: (value) => {
      const directives = value
        .toLowerCase()
        .split(",")
        .map((directive) => directive.trim().replace(/\s+/g, ""));
      return ["camera=()", "microphone=()", "geolocation=()"].every((directive) =>
        directives.includes(directive),
      );
    },
  },
  {
    name: "Strict-Transport-Security",
    key: "strict-transport-security",
    valid: validHsts,
  },
];

export function missingSecurityHeaders(headers) {
  return REQUIRED.filter(({ key, valid }) => !valid(headers.get(key) ?? "")).map(
    ({ name }) => name,
  );
}
