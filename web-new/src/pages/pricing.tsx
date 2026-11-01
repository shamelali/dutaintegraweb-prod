import { Link } from "react-router-dom"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DutaosModulesSection } from "@/components/dutaos-modules"
import {
  OpsProofBar, OpsProblem, OpsBenefits, OpsWorkflow, OpsHowItWorks,
  OpsRiskReversal, OpsCompare, OpsDoNot,
} from "@/components/ai-operations-sections"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import type { TranslationKey } from "@/i18n/translations"

// Managed AI-service tiers. Setup fees and usage limits are shown up front so
// the buyer is not surprised later — the whole point of this section.
const tiers = [
  {
    nameKey: "priceAiStarterName" as TranslationKey,
    tagKey: "priceAiStarterTag" as TranslationKey,
    price: "RM 690",
    period: "/ month",
    setupKey: "priceAiStarterSetup" as TranslationKey,
    features: [
      "priceAiStarterF1", "priceAiStarterF2", "priceAiStarterF3", "priceAiStarterF4",
      "priceAiStarterF5", "priceAiStarterF6", "priceAiStarterF7",
    ] as TranslationKey[],
    bestKey: "priceAiStarterBest" as TranslationKey,
    ctaKey: "priceAiStarterCta" as TranslationKey,
    href: "/contact",
    featured: false,
  },
  {
    nameKey: "priceAiGrowthName" as TranslationKey,
    tagKey: "priceAiGrowthTag" as TranslationKey,
    price: "RM 1,490",
    period: "/ month",
    setupKey: "priceAiGrowthSetup" as TranslationKey,
    badgeKey: "priceBadge" as TranslationKey,
    features: [
      "priceAiGrowthF1", "priceAiGrowthF2", "priceAiGrowthF3", "priceAiGrowthF4",
      "priceAiGrowthF5", "priceAiGrowthF6", "priceAiGrowthF7", "priceAiGrowthF8",
    ] as TranslationKey[],
    bestKey: "priceAiGrowthBest" as TranslationKey,
    ctaKey: "priceAiGrowthCta" as TranslationKey,
    href: "/contact",
    featured: true,
  },
  {
    nameKey: "priceAiOpsName" as TranslationKey,
    tagKey: "priceAiOpsTag" as TranslationKey,
    price: "RM 2,990",
    period: "/ month",
    setupKey: "priceAiOpsSetup" as TranslationKey,
    features: [
      "priceAiOpsF1", "priceAiOpsF2", "priceAiOpsF3", "priceAiOpsF4",
      "priceAiOpsF5", "priceAiOpsF6", "priceAiOpsF7", "priceAiOpsF8",
    ] as TranslationKey[],
    bestKey: "priceAiOpsBest" as TranslationKey,
    ctaKey: "priceAiOpsCta" as TranslationKey,
    href: "/contact",
    featured: false,
  },
]

const includedEveryPlan = [
  "priceIncluded1", "priceIncluded2", "priceIncluded3",
  "priceIncluded4", "priceIncluded5", "priceIncluded6",
] as TranslationKey[]

const faqs = [
  { qKey: "priceFaq1Q" as TranslationKey, aKey: "priceFaq1A" as TranslationKey },
  { qKey: "priceFaq2Q" as TranslationKey, aKey: "priceFaq2A" as TranslationKey },
  { qKey: "priceFaq3Q" as TranslationKey, aKey: "priceFaq3A" as TranslationKey },
  { qKey: "priceFaq4Q" as TranslationKey, aKey: "priceFaq4A" as TranslationKey },
  { qKey: "priceFaq5Q" as TranslationKey, aKey: "priceFaq5A" as TranslationKey },
]

const addons = [
  { titleKey: "priceAddon1Title" as TranslationKey, descKey: "priceAddon1Desc" as TranslationKey, price: "From RM 3,500" },
  { titleKey: "priceAddon2Title" as TranslationKey, descKey: "priceAddon2Desc" as TranslationKey, price: "From RM 5,000" },
  { titleKey: "priceAddon3Title" as TranslationKey, descKey: "priceAddon3Desc" as TranslationKey, price: "From RM 8,000" },
  { titleKey: "priceAddon4Title" as TranslationKey, descKey: "priceAddon4Desc" as TranslationKey, price: "From RM 2,500" },
  { titleKey: "priceAddon5Title" as TranslationKey, descKey: "priceAddon5Desc" as TranslationKey, price: "From RM 4,000" },
  { titleKey: "priceAddon6Title" as TranslationKey, descKey: "priceAddon6Desc" as TranslationKey, price: "From RM 1,800" },
]

export function PricingPage() {
  const { t } = useLanguage()
  const heroRef = useScrollReveal()
  const tiersRef = useScrollReveal()
  const includedRef = useScrollReveal()
  const addonsRef = useScrollReveal()
  const faqRef = useScrollReveal()
  const ctaRef = useScrollReveal()

  return (
    <>
      {/* Hero */}
      <section ref={heroRef} className="py-20 md:py-28 bg-gradient-to-br from-navy via-slate-deep to-navy text-center">
        <div className="max-w-4xl mx-auto px-6">
          <Badge variant="electric" className="mb-6 reveal">{t("priceHeroLabel")}</Badge>
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-white mb-6 reveal reveal-delay-1">
            {t("priceHeroTitle")}
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8 reveal reveal-delay-2">
            {t("priceHeroDesc")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 reveal reveal-delay-3">
            <Button asChild variant="electric" size="xl">
              <Link to="/quiz">{t("opsHeroBtn1")}</Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
              <a href="#plans">{t("opsHeroBtn2")}</a>
            </Button>
          </div>
          <p className="text-xs text-white/40 reveal reveal-delay-3">{t("opsHeroTrust")}</p>
        </div>
      </section>

      {/* Proof bar — real anonymised quotes, clearly labelled */}
      <OpsProofBar />

      {/* DutaOS Modules — flagship product pricing (anchor target: #modules) */}
      <DutaosModulesSection id="modules" />

      {/* Problem → benefits → workflow → how → risk reversal */}
      <OpsProblem />
      <OpsBenefits />
      <OpsWorkflow />
      <OpsHowItWorks />
      <OpsRiskReversal />

      {/* Managed AI tiers */}
      <section id="plans" ref={tiersRef} className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("priceManagedEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-3 reveal reveal-delay-1">
              {t("priceManagedTitle")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto reveal reveal-delay-2">
              {t("priceManagedSub")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier, i) => (
              <Card
                key={tier.nameKey}
                className={`relative flex flex-col p-8 ${
                  tier.featured
                    ? "border-electric shadow-lg shadow-electric/10"
                    : ""
                } reveal reveal-delay-${i + 1}`}
              >
                {tier.badgeKey && (
                  <Badge variant="electric" className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
                    {t(tier.badgeKey)}
                  </Badge>
                )}
                <h3 className="text-xl font-heading font-bold mb-1">{t(tier.nameKey)}</h3>
                <p className="text-sm text-muted-foreground mb-4">{t(tier.tagKey)}</p>
                <div className="mb-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className="text-muted-foreground text-sm">{tier.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-6">{t(tier.setupKey)}</p>
                <ul className="space-y-3 mb-6 flex-1">
                  {tier.features.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-muted-foreground mb-6">
                  <span className="font-medium text-foreground">{t("priceBestForLabel")}</span> {t(tier.bestKey)}
                </p>
                <Button
                  asChild
                  variant={tier.featured ? "electric" : "outline"}
                  className="w-full"
                >
                  <Link to={tier.href}>{t(tier.ctaKey)}</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* What's included in every plan */}
      <section ref={includedRef} className="py-16 px-6 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-10 reveal">
            {t("priceIncludedTitle")}
          </h2>
          <ul className="grid md:grid-cols-2 gap-x-8 gap-y-4 reveal reveal-delay-1">
            {includedEveryPlan.map((key) => (
              <li key={key} className="flex items-start gap-2 text-sm">
                <Check className="w-4 h-4 text-electric mt-0.5 shrink-0" />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* AI Addons */}
      <section ref={addonsRef} className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("priceAddonEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4 reveal reveal-delay-1">
              {t("priceAddonTitle")}
            </h2>
            <p className="text-muted-foreground reveal reveal-delay-2">{t("priceAddonSub")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {addons.map((addon, i) => (
              <Card key={addon.titleKey} className={`p-6 reveal reveal-delay-${Math.min(i + 1, 4)}`}>
                <h4 className="font-heading font-semibold mb-1">{t(addon.titleKey)}</h4>
                <p className="text-electric text-sm font-medium mb-2">{addon.price}</p>
                <p className="text-sm text-muted-foreground">{t(addon.descKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <OpsCompare />

      {/* What we don't do */}
      <OpsDoNot />

      {/* FAQ */}
      <section ref={faqRef} className="py-20 px-6 bg-muted/30">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-heading font-bold text-center mb-10 reveal">
            {t("priceFaqTitle")}
          </h2>
          <div className="space-y-3 reveal reveal-delay-1">
            {faqs.map((faq) => (
              <details
                key={faq.qKey}
                className="group rounded-lg border border-border/60 bg-card px-5 py-4 open:shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                  <span>{t(faq.qKey)}</span>
                  <span className="text-electric ml-4 shrink-0 transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{t(faq.aKey)}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section ref={ctaRef} className="py-20 px-6 bg-gradient-to-br from-navy to-slate-deep text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4 reveal">
            {t("priceCtaTitle")}
          </h2>
          <p className="text-white/60 mb-8 reveal reveal-delay-1">{t("priceCtaDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 reveal reveal-delay-2">
            <Button asChild variant="electric" size="xl">
              <Link to="/quiz">{t("priceCtaBtn1")}</Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/contact">{t("priceCtaBtn2")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  )
}
