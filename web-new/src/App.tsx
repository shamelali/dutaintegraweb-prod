import { lazy, Suspense, useEffect, type ReactNode } from "react"
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom"
import { ProtectedRoute, type AuthIdentity } from "@/components/protected-route"
import { Navbar } from "@/components/layout/navbar"
import { Footer } from "@/components/layout/footer"
import { PortalLayout } from "@/components/layout/portal-layout"
import { HomePage } from "@/pages/home"
import { ServicesPage } from "@/pages/services"
import { AboutPage } from "@/pages/about"
import { PricingPage } from "@/pages/pricing"
import { ContactPage } from "@/pages/contact"
import { ProposalPage } from "@/pages/proposal"
import { QuizPage } from "@/pages/quiz"
import { DigitalAssessmentPage } from "@/pages/digital-assessment"
import { CaseStudiesPage } from "@/pages/case-studies"
import { ProductsPage } from "@/pages/products"
import { AskPage } from "@/pages/ask"
import { ErrorBoundary } from "@/components/ErrorBoundary"
import { NotFoundPage } from "@/pages/not-found"
import { WebVitals } from "@/components/WebVitals"

// Portal / dashboard — lazy-loaded so a first-time marketing visitor doesn't
// download the portal bundle. Auth pages are also lazy (low traffic).
// All page modules use named exports, so unwrap `.default` for lazy().
const PortalLoginPage = lazy(() => import("@/pages/portal-login").then((m) => ({ default: m.PortalLoginPage })))
const AuthPage = lazy(() => import("@/pages/auth-page").then((m) => ({ default: m.AuthPage })))
const DutaosDashboardPage = lazy(() => import("@/pages/dutaos-dashboard").then((m) => ({ default: m.DutaosDashboardPage })))
const CompliancePage = lazy(() => import("@/pages/compliance").then((m) => ({ default: m.CompliancePage })))
const BillingPage = lazy(() => import("@/pages/billing").then((m) => ({ default: m.BillingPage })))
const CatalogEnrichmentPage = lazy(() => import("@/pages/catalog-enrichment").then((m) => ({ default: m.CatalogEnrichmentPage })))
const PortalProposalsPage = lazy(() => import("@/pages/portal-proposals").then((m) => ({ default: m.PortalProposalsPage })))
const PortalProposalDetailPage = lazy(() => import("@/pages/portal-proposal-detail").then((m) => ({ default: m.PortalProposalDetailPage })))
const PortalDigestsPage = lazy(() => import("@/pages/portal-digests").then((m) => ({ default: m.PortalDigestsPage })))
const PortalCompliancePage = lazy(() => import("@/pages/portal-compliance").then((m) => ({ default: m.PortalCompliancePage })))

// Marketing routes — eager (small, high-traffic).
const marketingRoutes = [
  { path: "/", element: <HomePage /> },
  { path: "/services", element: <ServicesPage /> },
  { path: "/about", element: <AboutPage /> },
  { path: "/pricing", element: <PricingPage /> },
  { path: "/contact", element: <ContactPage /> },
  { path: "/quiz", element: <QuizPage /> },
  { path: "/digital-assessment", element: <DigitalAssessmentPage /> },
  { path: "/proposal/:id", element: <ProposalPage /> },
  { path: "/case-studies", element: <CaseStudiesPage /> },
  { path: "/products", element: <ProductsPage /> },
  { path: "/ask", element: <AskPage /> },
]

// Auth pages — lazy.
const authRoutes = [
  { path: "/login", element: <PortalLoginPage /> },
  { path: "/signin", element: <AuthPage mode="login" /> },
  { path: "/signup", element: <AuthPage mode="signup" /> },
]

// Portal / dashboard routes — lazy + auth-guarded (low traffic for visitors).
// `/dashboard`, `/compliance`, `/billing`, `/catalog-enrichment` are top-level.
// The four `/portal/*` routes nest under `PortalLayout` via relative paths.
//
// `identity` names the session each page's data endpoints require, and is not
// implied by the path: `/portal/compliance` reads `/api/compliance-items`, which
// is DutaOS-scoped, so it takes `dutaos` like its top-level twin even though it
// lives under `/portal/*`.
export const portalLayoutRoutes: { path: string; element: ReactNode; identity: AuthIdentity }[] = [
  { path: "proposals", element: <PortalProposalsPage />, identity: "portal" },
  { path: "proposals/:id", element: <PortalProposalDetailPage />, identity: "portal" },
  { path: "digests", element: <PortalDigestsPage />, identity: "portal" },
  { path: "compliance", element: <PortalCompliancePage />, identity: "dutaos" },
]

export const topLevelPortalRoutes: { path: string; element: ReactNode; identity: AuthIdentity }[] = [
  { path: "/dashboard", element: <DutaosDashboardPage />, identity: "dutaos" },
  { path: "/compliance", element: <CompliancePage />, identity: "dutaos" },
  { path: "/billing", element: <BillingPage />, identity: "dutaos" },
  { path: "/catalog-enrichment", element: <CatalogEnrichmentPage />, identity: "dutaos" },
]

function ScrollToTop() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
    document.documentElement.lang = location.pathname.startsWith("/ms") ? "ms" : "en"
  }, [location.pathname, location.search])
  return null
}

function RouteLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Loading…</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <div className="min-h-screen bg-background text-foreground font-sans">
          <Navbar />
          <main>
            <Routes>
              {/* Marketing — eager, both language trees */}
              {marketingRoutes.map((r) => (
                <Route
                  key={r.path}
                  path={r.path}
                  element={r.element}
                />
              ))}
              {marketingRoutes.map((r) => (
                <Route
                  key={`ms-${r.path}`}
                  path={`/ms${r.path === "/" ? "" : r.path}`}
                  element={r.element}
                />
              ))}
              <Route path="/ms" element={<Navigate to="/ms/" replace />} />

              {/* Auth — lazy */}
              {authRoutes.map((r) => (
                <Route
                  key={r.path}
                  path={r.path}
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      {r.element}
                    </Suspense>
                  }
                />
              ))}

              {/* Portal / dashboard — lazy + auth-guarded */}
              <Route
                path="/portal/*"
                element={
                  <Suspense fallback={<RouteLoader />}>
                    <PortalLayout />
                  </Suspense>
                }
              >
                {portalLayoutRoutes.map((r) => (
                  <Route
                    key={r.path}
                    path={r.path}
                    element={
                      <Suspense fallback={<RouteLoader />}>
                        <ProtectedRoute identity={r.identity}>{r.element}</ProtectedRoute>
                      </Suspense>
                    }
                  />
                ))}
              </Route>
              {topLevelPortalRoutes.map((r) => (
                <Route
                  key={r.path}
                  path={r.path}
                  element={
                    <Suspense fallback={<RouteLoader />}>
                      <ProtectedRoute identity={r.identity}>{r.element}</ProtectedRoute>
                    </Suspense>
                  }
                />
              ))}

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
          <WebVitals />
        </div>
      </ErrorBoundary>
    </BrowserRouter>
  )
}