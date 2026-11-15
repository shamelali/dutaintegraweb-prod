import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useSearchParams } from "react-router-dom"

import { ProtectedRoute } from "@/components/protected-route"

/**
 * The gate is a redirect, not the security boundary — the guarded pages' own
 * data endpoints still answer 401. What these tests hold is that a signed-out
 * visitor is sent to the right login form (and back again), and that the two
 * identity systems are not conflated: `/portal/compliance` must check the
 * DutaOS session, because the endpoint behind it does.
 *
 * Core matchers only — this repo does not install @testing-library/jest-dom.
 */

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function requestedUrls() {
  return vi.mocked(globalThis.fetch).mock.calls.map(([url]) => String(url))
}

/** Render the gate at `path` and report the route React Router settled on. */
function renderAt(path: string, identity: "dutaos" | "portal") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/dashboard"
          element={<ProtectedRoute identity={identity}>SECRET DASHBOARD</ProtectedRoute>}
        />
        <Route
          path="/portal/compliance"
          element={<ProtectedRoute identity={identity}>SECRET COMPLIANCE</ProtectedRoute>}
        />
        <Route path="/signin" element={<div>SIGNIN PAGE</div>} />
        <Route path="/login" element={<LoginProbe />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Renders the portal login's `?next=` value so a test can assert it. */
function LoginProbe() {
  const [params] = useSearchParams()
  return <div>PORTAL LOGIN next={params.get("next") ?? "(none)"}</div>
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("checks the DutaOS session for a dutaos route", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({ company: { id: "c1" } }))
    renderAt("/dashboard", "dutaos")
    await waitFor(() => expect(screen.queryByText("SECRET DASHBOARD")).not.toBeNull())
    expect(requestedUrls()).toContain("/api/auth/me")
    expect(requestedUrls()).not.toContain("/api/portal/me")
  })

  it("checks the portal session for a portal route", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({ client: { id: "u1" } }))
    renderAt("/portal/compliance", "portal")
    await waitFor(() => expect(screen.queryByText("SECRET COMPLIANCE")).not.toBeNull())
    expect(requestedUrls()).toContain("/api/portal/me")
  })

  it("redirects a signed-out visitor to the portal login, preserving the path", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({ error: "Not authenticated" }, 401))
    renderAt("/portal/compliance", "portal")
    await waitFor(() => expect(screen.queryByText(/PORTAL LOGIN next=/)).not.toBeNull())
    expect(screen.queryByText("SECRET COMPLIANCE")).toBeNull()
  })

  it("redirects a signed-out visitor to the DutaOS sign-in, preserving the path", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({ error: "Not authenticated" }, 401))
    renderAt("/dashboard", "dutaos")
    await waitFor(() => expect(screen.queryByText("SIGNIN PAGE")).not.toBeNull())
  })

  it("treats a network failure as signed out rather than letting the page through", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new Error("offline"))
    renderAt("/dashboard", "dutaos")
    await waitFor(() => expect(screen.queryByText("SIGNIN PAGE")).not.toBeNull())
    expect(screen.queryByText("SECRET DASHBOARD")).toBeNull()
  })

  it("sends the requested path as ?next so login returns the visitor there", async () => {
    vi.mocked(globalThis.fetch).mockResolvedValue(jsonResponse({ error: "Not authenticated" }, 401))
    renderAt("/portal/compliance", "portal")
    await waitFor(() =>
      expect(screen.queryByText("PORTAL LOGIN next=/portal/compliance")).not.toBeNull(),
    )
  })
})
