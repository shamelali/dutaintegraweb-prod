import { useEffect, useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { useLanguage } from "@/hooks/use-language"

/**
 * RoiCalculator — the "IT & Automation Leakage Calculator" from the V2
 * Engineering Handoff Spec (§4). Real-time useMemo-based projection of the
 * yearly cost of manual work + downtime for a Malaysian SME.
 *
 * Model (per spec): RM 25/hour fully-loaded average staff cost.
 *   - Manual data entry: staff × hours/week × 52 weeks × rate
 *   - IT downtime:       staff × hours/month × 12 months × rate
 */

const HOURLY_RATE = 25 // RM/hour, fully loaded (spec assumption)

interface SliderInputProps {
  label: string
  value: number
  setValue: (n: number) => void
  min: number
  max: number
  suffix?: string
}

function SliderInput({ label, value, setValue, min, max, suffix }: SliderInputProps) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <label className="text-slate-300 text-sm">{label}</label>
        <span className="text-white font-bold tabular-nums">
          {value}
          {suffix ? ` ${suffix}` : ""}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#00d4ff]"
        aria-label={label}
      />
    </div>
  )
}

export function RoiCalculator() {
  const { t } = useLanguage()
  const navigate = useNavigate()
  const location = useLocation()

  // When arriving from another page via the CTA, scroll to the proposal form
  // once /contact has mounted.
  useEffect(() => {
    if (location.hash === "#proposal-form") {
      document.getElementById("proposal-form")?.scrollIntoView({ behavior: "smooth" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname])
  const [staff, setStaff] = useState(5)
  const [manualHours, setManualHours] = useState(10)
  const [downtimeHours, setDowntimeHours] = useState(2)

  const annualLoss = useMemo(() => {
    const manualLoss = staff * manualHours * 52 * HOURLY_RATE
    const downtimeLoss = staff * downtimeHours * 12 * HOURLY_RATE
    return manualLoss + downtimeLoss
  }, [staff, manualHours, downtimeHours])

  return (
    <div
      id="roi-calculator"
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-navy via-slate-deep to-navy p-6 md:p-8 lg:p-12 text-white shadow-2xl shadow-electric/5"
    >
      {/* Ambient spatial glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(0,212,255,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_100%,rgba(0,212,255,0.08),transparent_50%)]" />

      <div className="relative">
        <h3 className="text-2xl font-heading font-bold mb-2">{t("roiTitle")}</h3>
        <p className="text-slate-400 mb-8 text-sm">{t("roiSubtitle")}</p>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Inputs */}
          <div className="space-y-8">
            <SliderInput label={t("roiStaffLabel")} value={staff} setValue={setStaff} min={1} max={100} />
            <SliderInput label={t("roiManualLabel")} value={manualHours} setValue={setManualHours} min={0} max={40} suffix={t("roiHoursWeek")} />
            <SliderInput label={t("roiDowntimeLabel")} value={downtimeHours} setValue={setDowntimeHours} min={0} max={20} suffix={t("roiHoursMonth")} />
          </div>

          {/* Output — counter readout */}
          <div className="relative flex flex-col justify-center items-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,212,255,0.14),transparent_60%)]" />
            <p className="relative text-slate-400 mb-2 text-sm">{t("roiLeaking")}</p>
            <p className="relative text-4xl md:text-5xl font-heading font-bold text-electric tabular-nums drop-shadow-[0_0_18px_rgba(0,212,255,0.35)]">
              RM {annualLoss.toLocaleString()}
            </p>
            <div className="relative mt-4 h-px w-28 bg-gradient-to-r from-transparent via-electric to-transparent" />
            <p className="relative text-slate-400 text-sm text-center mt-4 mb-6">{t("roiEveryYear")}</p>
            <a
              href="#proposal-form"
              onClick={(e) => {
                // The form lives on /contact; a plain hash anchor only resolves
                // when we're already on that page. Otherwise route there first,
                // then scroll to the form once it has mounted.
                const el = document.getElementById("proposal-form")
                if (el) return // same page — let the browser/hash scroll handle it
                e.preventDefault()
                navigate("/contact")
              }}
              className="relative w-full min-h-[44px] inline-flex items-center justify-center gap-2 text-center py-3 bg-electric text-navy font-bold rounded-lg hover:bg-[#00b8e6] transition-colors"
            >
              {t("roiCta")} <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>

        <p className="relative text-slate-500 text-xs mt-8">{t("roiDisclaimer")}</p>
      </div>
    </div>
  )
}
