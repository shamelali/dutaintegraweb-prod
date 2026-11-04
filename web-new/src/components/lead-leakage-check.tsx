import { useMemo, useState } from "react"
import { ArrowRight, Calculator } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"

const COLD_AT_HOURS = 24
const ATTENTION_AT_HOURS = 1

function NumberField({ id, label, value, setValue, min, max, step = 1 }: { id: string; label: string; value: number; setValue: (n: number) => void; min: number; max: number; step?: number }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => {
          const parsed = Number(event.target.value)
          setValue(Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : min)
        }}
      />
    </div>
  )
}

export function LeadLeakageCheck() {
  const { lang, t } = useLanguage()
  const headRef = useScrollReveal()
  const bodyRef = useScrollReveal()

  const [enquiries, setEnquiries] = useState(60)
  const [hours, setHours] = useState(6)
  const [dealValue, setDealValue] = useState(3000)
  const [winRate, setWinRate] = useState(20)

  const myr = useMemo(
    () => new Intl.NumberFormat(lang === "bm" ? "ms-MY" : "en-MY", { style: "currency", currency: "MYR", maximumFractionDigits: 0 }),
    [lang],
  )

  const { coldLeads, atRisk, perYear } = useMemo(() => {
    const span = COLD_AT_HOURS - ATTENTION_AT_HOURS
    const coldShare = Math.min(1, Math.max(0, (hours - ATTENTION_AT_HOURS) / span))
    const leads = enquiries * coldShare
    const risk = leads * dealValue * (winRate / 100)
    return { coldLeads: Math.round(leads), atRisk: Math.round(risk), perYear: Math.round(risk * 12) }
  }, [enquiries, hours, dealValue, winRate])

  return (
    <section id="lead-leakage-check" className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div ref={headRef} className="text-center mb-10">
          <Badge variant="electric" className="mb-4 reveal">{t("llcBadge")}</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3 reveal reveal-delay-1">
            <Calculator className="inline w-7 h-7 mr-2 text-electric align-[-2px]" aria-hidden="true" />
            {t("llcTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto reveal reveal-delay-2">{t("llcDesc")}</p>
        </div>

        <Card ref={bodyRef} className="p-6 md:p-8 reveal">
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <NumberField id="llc-enquiries" label={t("llcEnquiries")} value={enquiries} setValue={setEnquiries} min={0} max={5000} />
            <NumberField id="llc-hours" label={t("llcResponseHours")} value={hours} setValue={setHours} min={0} max={168} />
            <NumberField id="llc-deal" label={t("llcDealValue")} value={dealValue} setValue={setDealValue} min={0} max={1000000} step={100} />
          </div>

          <div
            aria-live="polite"
            className="rounded-xl border border-electric/25 bg-electric/5 p-6 mb-5"
          >
            <p className="text-sm text-muted-foreground mb-1">{myr.format(atRisk)}</p>
            <p className="text-2xl md:text-3xl font-heading font-bold">{t("llcRevenueAtRisk")}</p>
            <p className="text-sm text-muted-foreground mt-3">
              {coldLeads} {t("llcColdLeads")} · {myr.format(perYear)} {t("llcPerYear")}
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 mb-5">
            <Label htmlFor="llc-winrate" className="text-sm">{t("llcWinRate")}</Label>
            <Input
              id="llc-winrate"
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={winRate}
              onChange={(event) => {
                const parsed = Number(event.target.value)
                setWinRate(Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : 0)
              }}
              className="max-w-24"
            />
          </div>

          <p className="text-xs text-muted-foreground mb-4">{t("llcModelNote")}</p>
          <p className="text-xs text-muted-foreground mb-6 italic">{t("llcDisclaimer")}</p>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button asChild variant="electric">
              <a href="#pilot">{t("llcCta")} <ArrowRight className="w-4 h-4 ml-2" /></a>
            </Button>
            <span className="text-xs text-muted-foreground">{t("llcCtaNote")}</span>
          </div>
        </Card>
      </div>
    </section>
  )
}
