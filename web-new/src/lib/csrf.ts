// Ported from the legacy contact.html double-submit CSRF pattern. The deployed
// handler (`server/handler-cloudflare.mjs:validateCsrf`) requires a matching
// `csrf_token` cookie and `x-csrf-token` header on any POST that carries an
// `Origin` — and browsers send `Origin` on every same-origin `fetch` POST. Without
// it, every React lead submission (`/api/send-email`) is rejected with 403.
function currentToken(): string {
  const match = document.cookie.match(/csrf_token=([^;]+)/)
  if (match) return match[1]
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  document.cookie = `csrf_token=${token}; Path=/; SameSite=Strict; Max-Age=3600`
  return token
}

export function postWithCsrf(body: unknown): RequestInit {
  return {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": currentToken() },
    body: JSON.stringify(body),
  }
}
