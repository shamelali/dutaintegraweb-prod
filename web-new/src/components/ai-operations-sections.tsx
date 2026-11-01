import {
  MessagesSquare, ListChecks, ShieldCheck, Plug, BarChart3, Wallet,
  ClipboardCheck, MousePointerClick, Wrench, TrendingUp, ArrowRight, ArrowDown,
  Check, Quote,
} from "lucide-react"
import { Link } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import type { TranslationKey } from "@/i18n/translations"

/**
 * Conversion-landing sections for the AI-Operations offer on /pricing.
 * Copy stays benefit-led and outcome-framed. The workflow diagrams are labelled
 * as examples, and the proof bar reuses the site's existing anonymised quotes —
 * no fabricated named testimonials or unmeasured result numbers.
 */

type TK = TranslationKey

// ── Proof bar (below hero) ────────────────────────────────────────────
export function OpsProofBar() {
  const { t } = useLanguage()
  const ref = useScrollReveal()
  return (
    <section ref={ref} className="py-12 px-6 border-b border-border/50">
      <div className="max-w-5xl mx-auto text-center reveal">
        <p className="text-sm md:text-base font-medium mb-2">{t("opsProofLead")}</p>
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-8">{t("opsProofMeta")}</p>
        <div className="grid md:grid-cols-2 gap-4">
          {([
            { q: "dutaosProofQuote1", a: "dutaosProofQuote1Attr" },
            { q: "dutaosProofQuote2", a: "dutaosProofQuote2Attr" },
          ] as { q: TK; a: TK }[]).map((item) => (
            <Card key={item.q} className="p-5 text-left">
              <Quote className="w-5 h-5 text-electric mb-2" />
              <p className="text-sm text-foreground/90 mb-2">“{t(item.q)}”</p>
              <p className="text-xs text-muted-foreground">— {t(item.a)}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Problem ("Is this you?") ──────────────────────────────────────────
const PROBLEM_POINTS: TK[] = ["opsProblemP1", "opsProblemP2", "opsProblemP3", "opsProblemP4", "opsProblemP5"]

export function OpsProblem() {
  const { t } = useLanguage()
  const ref = useScrollReveal()
  return (
    <section ref={ref} className="py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Badge variant="outline" className="mb-4 reveal">{t("idxWhyEyebrow")}</Badge>
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-3 reveal reveal-delay-1">
            {t("opsProblemTitle")}
          </h2>
          <p className="text-muted-foreground reveal reveal-delay-2">{t("opsProblemSub")}</p>
        </div>
        <ul className="space-y-3 mb-8 reveal reveal-delay-2">
          {PROBLEM_POINTS.map((key) => (
            <li key={key} className="flex items-start gap-3 text-sm">
              <span className="mt-1.5 h-2 w-2 rounded-full bg-electric shrink-0" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm font-medium text-electric reveal reveal-delay-3">{t("opsProblemClose")}</p>
      </div>
    </section>
  )
}

// ── Benefits (outcome cards) ──────────────────────────────────────────
const BENEFITS: { icon: typeof MessagesSquare; t: TK; s: TK; d: TK; r: TK; f: TK[] }[] = [
  {
    icon: MessagesSquare, t: "opsF1Title", s: "opsF1Tag", d: "opsF1Desc", r: "opsF1Result",
    f: ["opsF1B1", "opsF1B2", "opsF1B3", "opsF1B4", "opsF1B5"],
  },
  {
    icon: ListChecks, t: "opsF2Title", s: "opsF2Tag", d: "opsF2Desc", r: "opsF2Result",
    f: ["opsF2B1", "opsF2B2", "opsF2B3", "opsF2B4", "opsF2B5"],
  },
  {
    icon: ShieldCheck, t: "opsF3Title", s: "opsF3Tag", d: "opsF3Desc", r: "opsF3Result",
    f: ["opsF3B1", "opsF3B2", "opsF3B3", "opsF3B4", "opsF3B5"],
  },
  {
    icon: Plug, t: "opsF4Title", s: "opsF4Tag", d: "opsF4Desc", r: "opsF4Result",
    f: ["opsF4B1", "opsF4B2", "opsF4B3", "opsF4B4", "opsF4B5"],
  },
  {
    icon: BarChart3, t: "opsF5Title", s: "opsF5Tag", d: "opsF5Desc", r: "opsF5Result",
    f: ["opsF5B1", "opsF5B2", "opsF5B3", "opsF5B4", "opsF5B5"],
  },
  {
    icon: Wallet, t: "opsF6Title", s: "opsF6Tag", d: "opsF6Desc", r: "opsF6Result",
    f: ["opsF6B1", "opsF6B2", "opsF6B3", "opsF6B4", "opsF6B5"],
  },
]

export function OpsBenefits() {
  const { t } = useLanguage()
  const ref = useScrollReveal()
  return (
    <section ref={ref} className="py-20 px-6 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <Badge variant="electric" className="mb-4 reveal">{t("opsBenefitsEyebrow")}</Badge>
          <p className="text-lg font-medium max-w-2xl mx-auto reveal reveal-delay-1">
            {t("opsBenefitsLead")}
          </p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {BENEFITS.map((b, i) => (
            <Card key={b.t} className={`p-6 reveal reveal-delay-${(i % 2) + 1}`}>
              <div className="flex items-start gap-4 mb-3">
                <div className="w-10 h-10 rounded-lg bg-electric/10 flex items-center justify-center shrink-0">
                  <b.icon className="w-5 h-5 text-electric" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-semibold">{t(b.t)}</h3>
                  <p className="text-sm text-electric">{t(b.s)}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">{t(b.d)}</p>
              <ul className="space-y-2 mb-4">
                {b.f.map((key) => (
                  <li key={key} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                    <span>{t(key)}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{t("opsResultLabel")}</span> {t(b.r)}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Workflow visual + step table + examples ───────────────────────────
function FlowChain({ nodes }: { nodes: TK[] }) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col items-stretch gap-1">
      {nodes.map((key, i) => (
        <div key={key} className="flex flex-col items-center">
          <div className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm text-white/85">
            {t(key)}
          </div>
          {i < nodes.length - 1 && <ArrowDown className="w-4 h-4 text-electric my-0.5" />}
        </div>
      ))}
    </div>
  )
}

const MAIN_FLOW: TK[] = [
  "opsFlowN1", "opsFlowN2", "opsFlowN3", "opsFlowN4", "opsFlowN5", "opsFlowN6", "opsFlowN7",
]

const FLOW_STEPS: { n: string; t: TK; what: TK; who: TK }[] = [
  { n: "1", t: "opsStep1T", what: "opsStep1What", who: "opsStep1Who" },
  { n: "2", t: "opsStep2T", what: "opsStep2What", who: "opsStep2Who" },
  { n: "3", t: "opsStep3T", what: "opsStep3What", who: "opsStep3Who" },
  { n: "4", t: "opsStep4T", what: "opsStep4What", who: "opsStep4Who" },
  { n: "5", t: "opsStep5T", what: "opsStep5What", who: "opsStep5Who" },
  { n: "6", t: "opsStep6T", what: "opsStep6What", who: "opsStep6Who" },
]

const EXAMPLES: { title: TK; for: TK; out: TK; nodes: TK[] }[] = [
  {
    title: "opsEx1Title", for: "opsEx1For", out: "opsEx1Out",
    nodes: ["opsEx1N1", "opsEx1N2", "opsEx1N3", "opsEx1N4", "opsEx1N5"],
  },
  {
    title: "opsEx2Title", for: "opsEx2For", out: "opsEx2Out",
    nodes: ["opsEx2N1", "opsEx2N2", "opsEx2N3", "opsEx2N4", "opsEx2N5", "opsEx2N6"],
  },
  {
    title: "opsEx3Title", for: "opsEx3For", out: "opsEx3Out",
    nodes: ["opsEx3N1", "opsEx3N2", "opsEx3N3", "opsEx3N4", "opsEx3N5", "opsEx3N6"],
  },
]

const APPROVAL_FLOW: TK[] = ["opsAppN1", "opsAppN2", "opsAppN3", "opsAppN4"]

export function OpsWorkflow() {
  const { t } = useLanguage()
  const ref = useScrollReveal()
  return (
    <section ref={ref} className="relative overflow-hidden py-20 px-6 bg-gradient-to-br from-navy via-slate-deep to-navy text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(0,212,255,0.10),transparent_55%)]" />
      <div className="relative max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="electric" className="mb-4 reveal">{t("opsFlowEyebrow")}</Badge>
          <h2 className="text-2xl md:text-3xl font-heading font-bold mb-3 reveal reveal-delay-1">
            {t("opsFlowTitle")}
          </h2>
          <p className="text-sm text-white/50 max-w-2xl mx-auto reveal reveal-delay-2">{t("opsFlowNote")}</p>
        </div>

        {/* Main journey */}
        <div className="mb-12 reveal reveal-delay-2">
          <FlowChain nodes={MAIN_FLOW} />
        </div>

        {/* Step table */}
        <div className="mb-14 reveal reveal-delay-2">
          <h3 className="text-lg font-heading font-semibold mb-4">{t("opsFlowWhatHappensTitle")}</h3>
          <div className="grid md:grid-cols-3 gap-px rounded-xl border border-white/10 bg-white/10 overflow-hidden">
            <div className="bg-navy px-4 py-2 text-xs uppercase tracking-wide text-white/50">{t("opsFlowColStep")}</div>
            <div className="bg-navy px-4 py-2 text-xs uppercase tracking-wide text-white/50">{t("opsFlowColWhat")}</div>
            <div className="bg-navy px-4 py-2 text-xs uppercase tracking-wide text-white/50">{t("opsFlowColWho")}</div>
            {FLOW_STEPS.map((s) => (
              <div key={s.n} className="contents">
                <div className="bg-navy px-4 py-3 text-sm font-medium"><span className="text-electric">{s.n}.</span> {t(s.t)}</div>
                <div className="bg-navy px-4 py-3 text-sm text-white/70">{t(s.what)}</div>
                <div className="bg-navy px-4 py-3 text-sm text-white/70">{t(s.who)}</div>
              </div>
            ))}
          </div>
          <p className="text-sm text-white/60 mt-4">
            <span className="font-semibold text-electric">{t("opsResultLabel")}</span> {t("opsFlowResult")}
          </p>
        </div>

        {/* Three example workflows */}
        <h3 className="text-lg font-heading font-semibold mb-6 reveal">{t("opsExamplesTitle")}</h3>
        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {EXAMPLES.map((ex, i) => (
            <div key={ex.title} className={`rounded-xl border border-white/10 bg-white/5 p-5 reveal reveal-delay-${i + 1}`}>
              <h4 className="font-heading font-semibold mb-1">{t(ex.title)}</h4>
              <p className="text-xs text-white/50 mb-4">{t(ex.for)}</p>
              <FlowChain nodes={ex.nodes} />
              <p className="text-xs text-white/60 mt-4">
                <span className="font-semibold text-electric">{t("opsOutcomeLabel")}</span> {t(ex.out)}
              </p>
            </div>
          ))}
        </div>

        {/* Human approval */}
        <div className="rounded-2xl border border-electric/30 bg-electric/5 p-6 md:p-8 reveal">
          <div className="grid md:grid-cols-2 gap-6 items-center">
            <div>
              <h3 className="text-lg font-heading font-semibold mb-2">{t("opsAppTitle")}</h3>
              <p className="text-sm text-white/70 mb-2">{t("opsAppLead")}</p>
              <p className="text-sm text-white/60">{t("opsAppDesc")}</p>
            </div>
            <FlowChain nodes={APPROVAL_FLOW} />
          </div>
        </div>
      </div>
    </section>
  )
}

// ── How it works ──────────────────────────────────────────────────────
const HOW: { icon: typeof ClipboardCheck; t: TK; d: TK; time: TK }[] = [
  { icon: ClipboardCheck, t: "opsHow1Title", d: "opsHow1Desc", time: "opsHow1Time" },
  { icon: MousePointerClick, t: "opsHow2Title", d: "opsHow2Desc", time: "opsHow2Time" },
  { icon: Wrench, t: "opsHow3Title", d: "opsHow3Desc", time: "opsHow3Time" },
  { icon: TrendingUp, t: "opsHow4Title", d: "opsHow4Desc", time: "opsHow4Time" },
]

export function OpsHowItWorks() {
  const { t } = useLanguage()
  const ref = useScrollReveal()
  return (
    <section ref={ref} className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-12 reveal">
          {t("opsHowTitle")}
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          {HOW.map((step, i) => (
            <div key={step.t} className={`reveal reveal-delay-${i + 1}`}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl font-bold text-electric/40 font-heading">{i + 1}</span>
                <div className="w-9 h-9 rounded-lg bg-electric/10 flex items-center justify-center">
                  <step.icon className="w-4 h-4 text-electric" />
                </div>
              </div>
              <h3 className="font-heading font-semibold mb-1">{t(step.t)}</h3>
              <p className="text-sm text-muted-foreground mb-2">{t(step.d)}</p>
              <p className="text-xs text-electric">{t(step.time)}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-10">
          <Button asChild variant="electric" size="lg" className="reveal">
            <Link to="/quiz">{t("opsHowCta")}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}

// ── Risk reversal (free audit explainer) ──────────────────────────────
const RISK_POINTS: TK[] = ["opsRisk1", "opsRisk2", "opsRisk3", "opsRisk4", "opsRisk5"]

export function OpsRiskReversal() {
  const { t } = useLanguage()
  const ref = useScrollReveal()
  return (
    <section ref={ref} className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <Card className="p-8 reveal">
          <h2 className="text-2xl font-heading font-bold mb-2">{t("opsRiskTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-5">{t("opsRiskLead")}</p>
          <ol className="space-y-3 mb-6">
            {RISK_POINTS.map((key, i) => (
              <li key={key} className="flex items-start gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-electric/10 text-electric text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span>{t(key)}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm font-medium mb-6">{t("opsRiskClose")}</p>
          <Button asChild variant="electric" className="w-full">
            <Link to="/quiz">{t("opsRiskCta")}</Link>
          </Button>
        </Card>
      </div>
    </section>
  )
}

// ── Comparison ────────────────────────────────────────────────────────
const COMPARE: { o: TK; b: TK; l: TK }[] = [
  { o: "opsCmp1Opt", b: "opsCmp1Best", l: "opsCmp1Limit" },
  { o: "opsCmp2Opt", b: "opsCmp2Best", l: "opsCmp2Limit" },
  { o: "opsCmp3Opt", b: "opsCmp3Best", l: "opsCmp3Limit" },
  { o: "opsCmp4Opt", b: "opsCmp4Best", l: "opsCmp4Limit" },
]

export function OpsCompare() {
  const { t } = useLanguage()
  const ref = useScrollReveal()
  return (
    <section ref={ref} className="py-16 px-6 bg-muted/30">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-3 reveal">
          {t("opsCompareTitle")}
        </h2>
        <p className="text-sm text-muted-foreground text-center mb-10 reveal reveal-delay-1">{t("opsCompareLead")}</p>
        <div className="grid gap-3">
          {COMPARE.map((row, i) => (
            <Card
              key={row.o}
              className={`p-5 reveal reveal-delay-${(i % 2) + 1} ${i === COMPARE.length - 1 ? "border-electric shadow-sm shadow-electric/10" : ""}`}
            >
              <div className="grid sm:grid-cols-3 gap-3 text-sm">
                <div className="font-heading font-semibold">{t(row.o)}</div>
                <div className="text-muted-foreground">
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground/70">{t("opsCompareBestFor")}</span>
                  {t(row.b)}
                </div>
                <div className="text-muted-foreground">
                  <span className="block text-xs uppercase tracking-wide text-muted-foreground/70">{t("opsCompareLimitation")}</span>
                  {t(row.l)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── What we don't do ──────────────────────────────────────────────────
const DO_NOT: TK[] = ["opsDont1", "opsDont2", "opsDont3", "opsDont4", "opsDont5"]

export function OpsDoNot() {
  const { t } = useLanguage()
  const ref = useScrollReveal()
  return (
    <section ref={ref} className="py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-xl md:text-2xl font-heading font-bold mb-6 reveal">{t("opsDontTitle")}</h2>
        <ul className="space-y-3 reveal reveal-delay-1">
          {DO_NOT.map((key) => (
            <li key={key} className="flex items-start gap-3 text-sm">
              <ArrowRight className="w-4 h-4 text-electric mt-0.5 shrink-0 rotate-45" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted-foreground mt-6 reveal reveal-delay-2">{t("opsDontNote")}</p>
      </div>
    </section>
  )
}
