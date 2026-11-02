import { describe, it, expect, beforeEach } from "vitest"
import { postWithCsrf } from "./csrf"

const cookieValue = (name: string) =>
  document.cookie.match(new RegExp(`${name}=([^;]+)`))?.[1]

describe("postWithCsrf", () => {
  beforeEach(() => {
    document.cookie = "csrf_token=; Path=/; Max-Age=0"
  })

  it("mirrors one token into both the cookie and the header (double-submit)", () => {
    const init = postWithCsrf({ name: "A" })
    const headers = new Headers(init.headers as HeadersInit)
    const token = headers.get("X-CSRF-Token")
    expect(token).toBeTruthy()
    expect(token).toBe(cookieValue("csrf_token"))
    expect(headers.get("Content-Type")).toBe("application/json")
    expect(init.method).toBe("POST")
    expect(init.credentials).toBe("same-origin")
    expect(init.body).toBe(JSON.stringify({ name: "A" }))
  })

  it("reuses an existing token instead of minting a new one", () => {
    document.cookie = "csrf_token=existing-token; Path=/"
    const headers = new Headers(postWithCsrf({}).headers as HeadersInit)
    expect(headers.get("X-CSRF-Token")).toBe("existing-token")
  })
})
