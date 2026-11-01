import { ClipboardList, Settings2, LineChart, Check, MessageCircle, ArrowRight } from "lucide-react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { waLink } from "@/lib/dutaos"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import type { TranslationKey } from "@/i18n/translations"

/**
 * WorkflowPilot — the low-risk starting point for DutaOS.
 *
 * "Start with one module, month-to-month, no lock-in" is already how the
 * product is sold; this frames it as a concrete first step so a cost-conscious
 * SME buyer sees what to fix first, what they commit to, and how they'll judge
 * whether it worked — without promising results we haven't measured for them.
 */

const STEPS: { icon: typeof ClipboardList; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: ClipboardList, titleKey: "pilotStep1Title", descKey: "pilotStep1Desc" },
  { icon: Settings2, titleKey: "pilotStep2Title", descKey: "pilotStep2Desc" },
  { icon: LineChart, titleKey: "pilotStep3Title", descKey: "pilotStep3Desc" },
]

const WE_HANDLE: TranslationKey[] = ["pilotWeHandle1", "pilotWeHandle2", "pilotWeHandle3", "pilotWeHandle4"]
const YOU_PROVIDE: TranslationKey[] = ["pilotYouProvide1", "pilotYouProvide2", "pilotYouProvide3"]
const MEASURES: TranslationKey[] = ["pilotMeasure1", "pilotMeasure2", "pilotMeasure3", "pilotMeasure4"]

export function WorkflowPilot() {
  const { t } = useLanguage()
  const headRef = useScrollReveal()
  const gridRef = useScrollReveal()
  const detailRef = useScrollReveal()

  return (
    <section className="py-20 px-6">
      <div className="max-w-5xl mx-auto">
        <div ref={headRef} className="text-center mb-14">
          <Badge variant="electric" className="mb-4 reveal">{t("pilotBadge")}</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 reveal reveal-delay-1">
            {t("pilotTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto reveal reveal-delay-2">
            {t("pilotSub")}
          </p>
        </div>

        {/* Three steps */}
        <div ref={gridRef} className="grid md:grid-cols-3 gap-6 mb-14">
          {STEPS.map((step, i) => (
            <Card key={step.titleKey} className={`p-6 reveal reveal-delay-${i + 1}`}>
              <div className="w-11 h-11 rounded-lg bg-electric/10 flex items-center justify-center mb-4">
                <step.icon className="w-5 h-5 text-electric" />
              </div>
              <div className="text-xs font-semibold text-electric uppercase tracking-wide mb-1">
                {i + 1}
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">{t(step.titleKey)}</h3>
              <p className="text-muted-foreground text-sm">{t(step.descKey)}</p>
            </Card>
          ))}
        </div>

        {/* What we handle / what you provide + measures */}
        <div ref={detailRef} className="grid md:grid-cols-2 gap-6 mb-12">
          <Card className="p-6 reveal">
            <h3 className="text-base font-heading font-semibold mb-4">{t("pilotWeHandle")}</h3>
            <ul className="space-y-3">
              {WE_HANDLE.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-6 reveal reveal-delay-1">
            <h3 className="text-base font-heading font-semibold mb-4">{t("pilotYouProvide")}</h3>
            <ul className="space-y-3">
              {YOU_PROVIDE.map((key) => (
                <li key={key} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                  <span>{t(key)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* How you'll judge it */}
        <div className="text-center mb-10">
          <h3 className="text-base font-heading font-semibold mb-4">{t("pilotJudgeTitle")}</h3>
          <div className="flex flex-wrap justify-center gap-3">
            {MEASURES.map((key) => (
              <span
                key={key}
                className="inline-flex items-center rounded-full border border-electric/30 bg-electric/5 px-4 py-1.5 text-sm text-foreground"
              >
                {t(key)}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 max-w-xl mx-auto">{t("pilotHonesty")}</p>
        </div>

        {/* Specific, low-commitment CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild variant="electric" size="lg">
            <a href={waLink(t("pilotCtaWaMsg"))} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="w-4 h-4 mr-2" />
              {t("pilotCta")}
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/contact">
              {t("pilotCta2")}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
