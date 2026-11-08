import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { ArrowRight, ChevronDown, Moon, Sun, Menu, X, Sparkles } from "lucide-react"
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
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 dark:bg-[#0a0f1d]/85 backdrop-blur-xl transition-colors duration-200">
      <nav className="landing-container h-16 sm:h-[72px] flex items-center justify-between gap-4" aria-label="Main Navigation">
        {/* Brand Logo */}
        <Link
          to="/"
          className="flex items-center shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-xl"
          aria-label="Duta Integra — home"
        >
          <Logo variant={isDark ? "dark" : "light"} />
        </Link>

        {/* Desktop Navigation Links — Inspired by Untitled UI & Hero UI */}
        <ul className="hidden lg:flex items-center gap-1.5 bg-muted/40 dark:bg-slate-900/40 p-1.5 rounded-2xl border border-border/40">
          {links.map((link) => {
            const isActive = location.pathname === link.to
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  aria-current={isActive ? "page" : undefined}
                  className={`px-3 py-1.5 text-[13px] font-semibold rounded-xl transition-all duration-150 inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                    isActive
                      ? "bg-background dark:bg-slate-800 text-primary dark:text-[#00d4ff] shadow-xs"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/60 dark:hover:bg-slate-800/60"
                  }`}
                >
                  {t(link.key)}
                  {link.menu && <ChevronDown className="h-3.5 w-3.5 opacity-60" />}
                </Link>
              </li>
            )
          })}
          {/* PKS / SME Pill Badge */}
          <li>
            <a
              href="/pks.html"
              className="ml-1 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-2xs"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>🇲🇾 PKS / SME</span>
            </a>
          </li>
        </ul>

        {/* Right Side Action Controls — Base UI / Untitled UI Micro-interactions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Theme Switcher Toggle Button (Visible & Interactive) */}
          <button
            type="button"
            onClick={toggleDark}
            className="p-2 sm:px-2.5 sm:py-2 rounded-xl border border-border/60 bg-card hover:bg-muted/70 text-foreground/80 hover:text-foreground transition-all duration-150 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 inline-flex items-center gap-1.5 text-xs font-semibold"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            title={isDark ? "Tukar ke Mod Cerah (Light Mode)" : "Tukar ke Mod Gelap (Dark Mode)"}
          >
            {isDark ? (
              <>
                <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-90 duration-200" />
                <span className="hidden xl:inline text-[11px] text-muted-foreground">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-4 w-4 text-slate-700 animate-in spin-in-90 duration-200" />
                <span className="hidden xl:inline text-[11px] text-muted-foreground">Dark</span>
              </>
            )}
          </button>

          {/* Bilingual Language Switcher (BM / EN) */}
          <button
            type="button"
            onClick={toggleLang}
            className="px-2.5 py-2 rounded-xl border border-border/60 bg-card hover:bg-muted/70 text-foreground/80 hover:text-foreground transition-all duration-150 shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 inline-flex items-center gap-1.5 text-xs font-bold"
            aria-label="Toggle language"
            title="Tukar Bahasa / Switch Language"
          >
            <span className="text-[11px] tracking-wide font-mono uppercase text-primary dark:text-[#00d4ff]">
              {lang === "en" ? "BM 🇲🇾" : "EN 🇬🇧"}
            </span>
          </button>

          {/* Primary Assessment CTA Button */}
          <Link
            to="/digital-assessment"
            className="hidden sm:inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#0a2540] to-[#1565C0] dark:from-[#00d4ff] dark:to-[#0099cc] text-white dark:text-[#0a0f1d] px-4 py-2 text-xs sm:text-sm font-bold shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <span>{t("navAssessmentCta")}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {/* Mobile Menu Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-xl border border-border/60"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle mobile navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {/* Mobile Drawer Navigation */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-border/60 bg-background/95 dark:bg-[#0a0f1d]/95 backdrop-blur-xl px-5 py-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
          <a
            href="/pks.html"
            className="flex items-center justify-between py-2.5 px-3.5 rounded-xl text-sm font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 border border-emerald-500/20"
            onClick={() => setMobileOpen(false)}
          >
            <span className="inline-flex items-center gap-2">
              <span>🇲🇾</span>
              <span>Hab PKS & SME (Bermula RM199)</span>
            </span>
            <ArrowRight className="h-4 w-4" />
          </a>

          <div className="space-y-1">
            {links.map((link) => {
              const isActive = location.pathname === link.to
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary dark:text-[#00d4ff]"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {t(link.key)}
                </Link>
              )
            })}
          </div>

          <div className="pt-3 border-t border-border/60 flex items-center justify-between">
            <Link
              to="/digital-assessment"
              onClick={() => setMobileOpen(false)}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary dark:text-[#00d4ff]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t("navAssessmentCta")}</span>
            </Link>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleDark}
                className="p-2 rounded-lg border border-border/60 text-xs font-semibold"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-slate-700" />}
              </button>
              <button
                type="button"
                onClick={toggleLang}
                className="px-2.5 py-1.5 rounded-lg border border-border/60 text-xs font-bold text-primary dark:text-[#00d4ff]"
                aria-label="Toggle language"
              >
                {lang === "en" ? "BM 🇲🇾" : "EN 🇬🇧"}
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
