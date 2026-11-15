import { useEffect, useState, type ReactNode } from "react"
import { Navigate, useLocation } from "react-router-dom"

/**
 * Which identity a guarded route needs. The two are independent systems:
 *
 * - `dutaos` — company session cookie (`dutaos_session`), verified by
 *   `GET /api/auth/me`. Guards `/dashboard`, `/compliance`, `/billing`,
 *   `/catalog-enrichment`, and `/portal/compliance`.
 * - `portal` — Supabase client session (`di_session`), verified by
 *   `GET /api/portal/me`. Guards `/portal/proposals`, `/portal/proposals/:id`,
 *   `/portal/digests`.
 *
 * The `/portal/*` group is deliberately not homogeneous: `/portal/compliance`
 * reads `/api/compliance-items`, which is DutaOS-scoped, so it must use the
 * `dutaos` identity like its top-level twin.
 */
export type AuthIdentity = "dutaos" | "portal"

type Status = "checking" | "authenticated" | "unauthenticated"

const ENDPOINT: Record<AuthIdentity, string> = {
  dutaos: "/api/auth/me",
  portal: "/api/portal/me",
}

/**
 * Where to send a signed-out visitor. `next` round-trips through the login page
 * so they land on the route they asked for. Portal routes use the portal login;
 * everything else uses the DutaOS auth page.
 */
function signInPath(identity: AuthIdentity, from: string): string {
  const base = identity === "portal" ? "/login" : "/signin"
  return `${base}?next=${encodeURIComponent(from)}`
}

/**
 * Client-side auth gate for the portal and dashboard routes.
 *
 * This is a UX layer, not the security boundary: every guarded page's data
 * endpoint enforces the same identity server-side and answers 401 on its own.
 * The gate exists so a signed-out visitor is redirected to a login form instead
 * of rendering a page that would immediately fail every request.
 */
export function ProtectedRoute({
  identity,
  children,
}: {
  identity: AuthIdentity
  children: ReactNode
}) {
  const location = useLocation()
  const [status, setStatus] = useState<Status>("checking")

  useEffect(() => {
    let active = true
    fetch(ENDPOINT[identity], { credentials: "same-origin" })
      .then((res) => {
        if (active) setStatus(res.ok ? "authenticated" : "unauthenticated")
      })
      .catch(() => {
        if (active) setStatus("unauthenticated")
      })
    return () => {
      active = false
    }
  }, [identity])

  if (status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    )
  }

  if (status === "unauthenticated") {
    const from = `${location.pathname}${location.search}`
    return <Navigate to={signInPath(identity, from)} replace />
  }

  return <>{children}</>
}
