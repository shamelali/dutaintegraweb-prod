import { LayoutDashboard, ShieldCheck, FileText, Mail, Bot, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"

/**
 * DutaosPreview — a static, clearly-labelled mock of the DutaOS workspace for
 * the marketing site. It shows the *shape* of the product (the real modules and
 * the compliance areas DutaOS covers) so a visitor can picture the tool.
 *
 * It deliberately carries no operational numbers: no uptime, latency, request
 * rates or client counts. Those would be fabricated claims on a public page.
 * The one live-looking element (the activity sparkline) is decorative and the
 * panel is captioned as a preview, not real data.
 */

const MODULES = [
  { icon: LayoutDashboard, key: "dutaosPreviewModDashboard" },
  { icon: ShieldCheck, key: "dutaosPreviewModCompliance" },
  { icon: FileText, key: "dutaosPreviewModProposals" },
  { icon: Mail, key: "dutaosPreviewModDigests" },
  { icon: Bot, key: "dutaosPreviewModAssistant" },
] as const

// Compliance areas DutaOS actually tracks (see server/compliance.mjs + dashboard
// TYPE_LABELS). Listed as coverage, not as a per-client status.
const COMPLIANCE_AREAS = ["SSM Registration", "PDPA", "MyInvois (E-Invoice)", "Tax Compliance"]

export function DutaosPreview() {
  const { t } = useLanguage()

  return (
    <div className="relative mx-auto w-full max-w-4xl reveal reveal-delay-2">
      {/* glow pools behind the glass, echoing the mockups */}
      <div className="glass-orb -top-10 -left-10 h-56 w-56 bg-electric/25" />
      <div className="glass-orb -bottom-12 right-0 h-64 w-64 bg-emerald-400/20" />

      <div className="glass glass-rim backdrop-blur-xl backdrop-saturate-150 relative overflow-hidden rounded-3xl">
        {/* top accent rail: teal → emerald */}
        <div className="h-1 w-full bg-gradient-to-r from-electric via-emerald-400 to-electric" />

        {/* Window chrome */}
        <div className="relative flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-electric/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/50" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
            </div>
            <span className="bg-gradient-to-r from-electric to-emerald-300 bg-clip-text text-sm font-semibold text-transparent">
              DutaOS
            </span>
          </div>
          <Badge variant="outline" className="border-white/15 bg-white/5 text-white/50 text-[10px]">
            {t("dutaosPreviewBadge")}
          </Badge>
        </div>

        <div className="relative grid md:grid-cols-[180px_1fr]">
          {/* Module rail */}
          <nav className="hidden space-y-1 border-r border-white/10 p-4 md:block">
            {MODULES.map((m, i) => (
              <div
                key={m.key}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${
                  i === 0
                    ? "glass-inset text-electric shadow-[0_0_18px_-6px_rgba(0,212,255,0.6)]"
                    : "text-white/50"
                }`}
              >
                <m.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{t(m.key)}</span>
              </div>
            ))}
          </nav>

          {/* Main panel */}
          <div className="space-y-5 p-5">
            <div>
              <p className="text-sm font-medium text-white/80">{t("dutaosPreviewCompliance")}</p>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {COMPLIANCE_AREAS.map((area) => (
                  <li
                    key={area}
                    className="glass-inset flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/70"
                  >
                    <Check className="h-4 w-4 shrink-0 text-emerald-300" />
                    <span className="truncate">{area}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Decorative activity sparkline — no axis, no values */}
            <div className="glass-inset rounded-2xl p-4">
              <p className="text-xs uppercase tracking-wide text-white/40">{t("dutaosPreviewActivity")}</p>
              <svg
                viewBox="0 0 300 80"
                className="mt-3 h-20 w-full"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="dutaosPreviewFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.35" />
                    <stop offset="55%" stopColor="#34d399" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="dutaosPreviewStroke" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#00d4ff" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,60 C20,55 30,40 45,45 C60,50 70,20 90,28 C110,36 120,55 140,48 C160,41 170,15 195,24 C220,33 230,52 255,44 C275,38 285,50 300,46 L300,80 L0,80 Z"
                  fill="url(#dutaosPreviewFill)"
                />
                <path
                  d="M0,60 C20,55 30,40 45,45 C60,50 70,20 90,28 C110,36 120,55 140,48 C160,41 170,15 195,24 C220,33 230,52 255,44 C275,38 285,50 300,46"
                  stroke="url(#dutaosPreviewStroke)"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-white/40">{t("dutaosPreviewCaption")}</p>
    </div>
  )
}
