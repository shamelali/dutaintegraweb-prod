import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ArrowRight, ChevronDown, Moon, Sun, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/logo"
import { useDarkMode } from "@/hooks/use-dark-mode"
import { useLanguage } from "@/hooks/use-language"
import type { TranslationKey } from "@/i18n/translations"

const navLinks = [
  { key: "navServices" as TranslationKey, to: "/services", menu: true },
  { key: "navProducts" as TranslationKey, to: "/products" },
  { key: "navPricing" as TranslationKey, to: "/pricing" },
  { key: "navCaseStudies" as TranslationKey, to: "/case-studies" },
  { key: "navAbout" as TranslationKey, to: "/about" },
]

const askLink = { key: "navAsk" as TranslationKey, to: "/ask", menu: false }

// Ask Duta is a marketing-site affordance. The authenticated screens already have
// their own assistant — /api/ai/chat, grounded on the signed-in company's data —
// so showing a second, differently-grounded chat in the same chrome would invite
// visitors to ask about their own account where this one cannot see it.
const APP_PATHS = [
  "/dashboard", "/compliance", "/billing", "/catalog-enrichment",
  "/portal", "/login", "/signin", "/signup", "/ask",
]

/** True on the public pages, for both the English and `/ms` route trees. */
function isMarketingPath(pathname: string) {
  const base = pathname.startsWith("/ms") ? pathname.slice(3) || "/" : pathname
  return !APP_PATHS.some((p) => base === p || base.startsWith(`${p}/`))
}

export function Navbar() {
  const { isDark, toggle: toggleDark } = useDarkMode()
  const { lang, toggle: toggleLang, t } = useLanguage()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const links = isMarketingPath(location.pathname) ? [...navLinks, askLink] : navLinks

  return (
    <nav className="landing-nav sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="landing-container h-[72px] flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center" aria-label="Duta Integra — home">
          <Logo variant={isDark ? "dark" : "light"} />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-7">
          {links.map((link) => (
            <li key={link.to}>
              <Link
                to={link.to}
                className={`py-2 text-[13px] font-medium transition-colors inline-flex items-center gap-1 ${
                  location.pathname === link.to
                    ? "text-teal-700"
                    : "text-slate-700 hover:text-teal-700"
                }`}
              >
                {t(link.key)}
                {link.menu && <ChevronDown className="h-3.5 w-3.5" />}
              </Link>
            </li>
          ))}
          <li>
            <a
              href="/pks.html"
              className="py-1 px-3 rounded-full text-[12px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors inline-flex items-center gap-1 shadow-xs"
            >
              🇲🇾 PKS / SME
            </a>
          </li>
        </ul>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <Link to="/digital-assessment" className="hidden md:inline-flex items-center gap-2 rounded-md bg-[#128f83] px-5 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#0c786e]">
            {t("navAssessmentCta")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDark}
            className="hidden"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLang}
            className="hidden md:flex text-xs font-semibold text-slate-600 hover:text-teal-700"
          >
            {lang === "en" ? "BM" : "EN"}
          </Button>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-6 py-4 space-y-2">
          <a
            href="/pks.html"
            className="block py-2 text-sm font-bold text-emerald-700 bg-emerald-50 px-3 rounded-md"
            onClick={() => setMobileOpen(false)}
          >
            🇲🇾 Hab PKS & Startup (Bermula RM199)
          </a>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-md text-sm font-medium ${
                location.pathname === link.to
                  ? "bg-accent/10 text-electric"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(link.key)}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <Button variant="ghost" size="icon" onClick={toggleDark}>
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={toggleLang} className="font-semibold">
              {lang === "en" ? "BM" : "EN"}
            </Button>
          </div>
        </div>
      )}
    </nav>
  )
}
