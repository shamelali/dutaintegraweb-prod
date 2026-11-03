import { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { Bot, Monitor, Cloud, Shield, Lock, Target, Zap, Timer, Flag, ArrowRight, MessageCircle, Quote, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DutaosModulesSection } from "@/components/dutaos-modules"
import { DutaosPreview } from "@/components/dutaos-preview"
import { WorkflowPilot } from "@/components/workflow-pilot"
import { waLink } from "@/lib/dutaos"
import { postWithCsrf } from "@/lib/csrf"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { LiveFeed } from "@/components/live-feed"
import { DataFabricBackdrop } from "@/components/data-fabric-backdrop"
import type { TranslationKey } from "@/i18n/translations"

const services = [
  { icon: Bot, titleKey: "idxSvc1Title" as TranslationKey, descKey: "idxSvc1Desc" as TranslationKey, to: "/services" },
  { icon: Monitor, titleKey: "idxSvc2Title" as TranslationKey, descKey: "idxSvc2Desc" as TranslationKey, to: "/services" },
  { icon: Cloud, titleKey: "idxSvc3Title" as TranslationKey, descKey: "idxSvc3Desc" as TranslationKey, to: "/services" },
  { icon: Shield, titleKey: "idxSvc4Title" as TranslationKey, descKey: "idxSvc4Desc" as TranslationKey, to: "/services" },
]

const whyItems = [
  { num: "01", icon: Target, titleKey: "idxWhy1Title" as TranslationKey, descKey: "idxWhy1Desc" as TranslationKey },
  { num: "02", icon: Zap, titleKey: "idxWhy2Title" as TranslationKey, descKey: "idxWhy2Desc" as TranslationKey },
  { num: "03", icon: Timer, titleKey: "idxWhy3Title" as TranslationKey, descKey: "idxWhy3Desc" as TranslationKey },
  { num: "04", icon: Flag, titleKey: "idxWhy4Title" as TranslationKey, descKey: "idxWhy4Desc" as TranslationKey },
]

// Hero variants: product-led DutaOS hero (50%) vs the two pain-led variants (25% each).
const heroVariants = [
  {
    badgeKey: "dutaosHeroBadge" as TranslationKey,
    titleKey: "dutaosHeroTitle" as TranslationKey,
    highlightKey: "dutaosHeroHighlight" as TranslationKey,
    descKey: "dutaosHeroDesc" as TranslationKey,
    ctaKey: "dutaosHeroCta1" as TranslationKey,
    ctaKind: "whatsapp" as const,
    cta2Key: "dutaosHeroCta2" as TranslationKey,
    cta2Kind: "anchor" as const,
    cta2Href: "#modules",
    weight: 2,
  },
  {
    badgeKey: "convBadgeA" as TranslationKey,
    titleKey: "convHeroATitle" as TranslationKey,
    highlightKey: "convHeroAHighlight" as TranslationKey,
    descKey: "convHeroADesc" as TranslationKey,
    ctaKey: "convHeroACta" as TranslationKey,
    ctaKind: "quiz" as const,
    cta2Key: "idxHeroBtn2" as TranslationKey,
    cta2Kind: "link" as const,
    cta2Href: "/services",
    weight: 1,
  },
  {
    badgeKey: "convBadgeB" as TranslationKey,
    titleKey: "convHeroBTitle" as TranslationKey,
    highlightKey: "convHeroBHighlight" as TranslationKey,
    descKey: "convHeroBDesc" as TranslationKey,
    ctaKey: "convHeroBCta" as TranslationKey,
    ctaKind: "quiz" as const,
    cta2Key: "idxHeroBtn2" as TranslationKey,
    cta2Kind: "link" as const,
    cta2Href: "/services",
    weight: 1,
  },
]

// Trust badges row — 3 lightweight pills under the hero CTA.
const TRUST_BADGES: TranslationKey[] = ["idxTrustBadge1", "idxTrustBadge2", "idxTrustBadge3"]

// Problem navigator — problem-first topic cards above the fold.
const NAVIGATOR_ITEMS: { icon: typeof Shield; titleKey: TranslationKey; descKey: TranslationKey }[] = [
  { icon: Shield, titleKey: "idxNavigator1Title", descKey: "idxNavigator1Desc" },
  { icon: Lock, titleKey: "idxNavigator2Title", descKey: "idxNavigator2Desc" },
  { icon: Cloud, titleKey: "idxNavigator3Title", descKey: "idxNavigator3Desc" },
  { icon: Zap, titleKey: "idxNavigator4Title", descKey: "idxNavigator4Desc" },
]

// Case studies — cards with category chip + verified result.
const CASE_STUDIES: {
  titleKey: TranslationKey
  clientKey: TranslationKey
  resultKey: TranslationKey
  image: string
}[] = [
  {
    titleKey: "caseStudy1",
    clientKey: "caseStudy1Client",
    resultKey: "caseStudy1Result",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=600&q=80",
  },
  {
    titleKey: "caseStudy2",
    clientKey: "caseStudy2Client",
    resultKey: "caseStudy2Result",
    image: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=80",
  },
  {
    titleKey: "caseStudy3",
    clientKey: "caseStudy3Client",
    resultKey: "caseStudy3Result",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80",
  },
]

// FAQ accordion items.
const FAQ_ITEMS: { questionKey: TranslationKey; answerKey: TranslationKey }[] = [
  { questionKey: "faq1Question", answerKey: "faq1Answer" },
  { questionKey: "faq2Question", answerKey: "faq2Answer" },
  { questionKey: "faq3Question", answerKey: "faq3Answer" },
  { questionKey: "faq4Question", answerKey: "faq4Answer" },
  { questionKey: "faq5Question", answerKey: "faq5Answer" },
  { questionKey: "faq6Question", answerKey: "faq6Answer" },
]

// "What you'll get" checklist items under the assessment CTA.
const ASSESSMENT_GET: TranslationKey[] = [
  "idxAssessmentGet1",
  "idxAssessmentGet2",
  "idxAssessmentGet3",
  "idxAssessmentGet4",
]

export function TrustBadges() {
  const { t } = useLanguage()

  return (
    <div className="flex flex-wrap justify-center gap-3 mb-8 reveal">
      {TRUST_BADGES.map((key) => (
        <span
          key={key}
          className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/70"
        >
          {t(key)}
        </span>
      ))}
    </div>
  )
}

export function ProblemNavigator() {
  const { t } = useLanguage()
  const ref = useScrollReveal()

  return (
    <section ref={ref} className="py-20 px-6 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 reveal">
            {t("idxNavigatorTitle")}
          </Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground reveal reveal-delay-1">
            {t("idxNavigatorTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto reveal reveal-delay-2">
            {t("idxNavigatorSub")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {NAVIGATOR_ITEMS.map((item, i) => (
            <Card key={item.titleKey} className={`p-8 reveal reveal-delay-${i + 1}`}>
              <div className="w-12 h-12 rounded-lg bg-electric/10 flex items-center justify-center mb-4">
                <item.icon className="w-6 h-6 text-electric" />
              </div>
              <h3 className="text-lg font-heading font-semibold mb-2">{t(item.titleKey)}</h3>
              <p className="text-muted-foreground text-sm mb-4">{t(item.descKey)}</p>
              <Link to="/quiz" className="text-electric text-sm font-medium hover:underline">
                Learn more <ArrowRight className="w-3 h-3 inline ml-1" />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export function CaseStudies() {
  const { t } = useLanguage()
  const ref = useScrollReveal()

  return (
    <section ref={ref} className="py-20 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4 reveal">{t("dutaosProofEyebrow")}</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground reveal reveal-delay-1">
            {t("dutaosProofTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto reveal reveal-delay-2">
            See how we've helped Malaysian SMEs solve real IT challenges.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {CASE_STUDIES.map((study, i) => (
            <Card key={study.titleKey} className={`p-6 reveal reveal-delay-${i + 1}`}>
              <div className="relative h-32 overflow-hidden rounded-lg mb-4">
                <img
                  src={study.image}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <span className="absolute left-3 top-3 inline-flex items-center rounded-md bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-foreground">
                  {t(study.resultKey)}
                </span>
              </div>
              <h3 className="text-lg font-heading font-semibold mb-1">{t(study.titleKey)}</h3>
              <p className="text-xs text-muted-foreground mb-3">{t(study.clientKey)}</p>
              <Link to="/case-studies" className="text-electric text-sm font-medium hover:underline">
                Read case study <ArrowRight className="w-3 h-3 inline ml-1" />
              </Link>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}

export function FaqSection() {
  const { t } = useLanguage()
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const ref = useScrollReveal()

  const toggle = (index: number) => {
    setOpenIndex((prev) => (prev === index ? null : index))
  }

  return (
    <section ref={ref} className="py-20 px-6 bg-muted/30">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <Badge variant="outline" className="mb-4 reveal">{t("faqHeroLabel")}</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground reveal reveal-delay-1">
            {t("faqHeroTitle")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto reveal reveal-delay-2">
            {t("faqHeroDesc")}
          </p>
        </div>

        <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i
            return (
              <Card key={item.questionKey} className={`p-4 reveal reveal-delay-${i + 1}`}>
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between text-left"
                >
                  <span className="font-medium text-foreground">
                    {t(item.questionKey)}
                  </span>
                  <ArrowRight className={`w-4 h-4 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`} />
                </button>
                {isOpen && (
                  <div className="mt-3 pt-3 border-t border-muted/50 text-sm text-muted-foreground">
                    {t(item.answerKey)}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function WhatYoullGet() {
  const { t } = useLanguage()
  const ref = useScrollReveal()

  return (
    <div ref={ref} className="max-w-md mx-auto reveal reveal-delay-2">
      <Card className="p-8 bg-white/5 border-white/10">
        <h3 className="text-lg font-heading font-semibold text-white mb-6">
          {t("idxAssessmentGetTitle")}
        </h3>
        <ul className="space-y-3">
          {ASSESSMENT_GET.map((key) => (
            <li key={key} className="flex items-start gap-3 text-sm text-white/90">
              <Check className="w-4 h-4 text-electric shrink-0 mt-0.5" />
              <span>{t(key)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

export function HomePage() {
  const { t } = useLanguage()
  const heroRef = useScrollReveal()
  const servicesRef = useScrollReveal()
  const whyRef = useScrollReveal()
  const trustRef = useScrollReveal()

  // Weighted split: DutaOS product-led 50%, pain-led variants 25% each
  const [variant] = useState(() => {
    const total = heroVariants.reduce((sum, v) => sum + v.weight, 0)
    let roll = Math.random() * total
    for (let i = 0; i < heroVariants.length; i++) {
      roll -= heroVariants[i].weight
      if (roll < 0) return i
    }
    return 0
  })
  const hero = heroVariants[variant]
  const heroCtaHref = hero.ctaKind === "whatsapp" ? waLink(t("dutaosHeroWaMsg")) : "/quiz"

  // WhatsApp signup
  const [waName, setWaName] = useState("")
  const [waPhone, setWaPhone] = useState("")
  const [waSubmitted, setWaSubmitted] = useState(false)

  // Sticky CTA visibility
  const [showSticky, setShowSticky] = useState(false)
  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 600)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const handleWaSignup = async () => {
    if (!waPhone) return
    try {
      await fetch("/api/send-email", postWithCsrf({
          name: waName || "WhatsApp Lead",
          phone: waPhone,
          source: "hero-whatsapp-signup",
        }))
    } catch {}
    setWaSubmitted(true)
  }

  return (
    <>
      {/* Hero — Pain-led A/B test */}
      <section ref={heroRef} className="relative overflow-hidden bg-gradient-to-br from-navy via-slate-deep to-navy py-20 md:py-28">
        <DataFabricBackdrop />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(0,212,255,0.08),transparent_50%)]" />
        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <Badge variant="electric" className="mb-6 reveal">
            {t(hero.badgeKey)}
          </Badge>

          <h1 className="text-4xl md:text-6xl font-heading font-bold text-white mb-6 reveal reveal-delay-1">
            {t(hero.titleKey)}
            <br />
            <span className="text-electric">{t(hero.highlightKey)}</span>
          </h1>

          <p className="text-lg text-white/60 max-w-2xl mx-auto mb-8 reveal reveal-delay-2">
            {t(hero.descKey)}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 reveal reveal-delay-3">
            <Button asChild variant="electric" size="xl">
              {hero.ctaKind === "whatsapp" ? (
                <a href={heroCtaHref} target="_blank" rel="noopener noreferrer">
                  <span className="flex items-center gap-2">
                    <MessageCircle className="w-5 h-5" />
                    {t(hero.ctaKey)}
                  </span>
                </a>
              ) : (
                <Link to="/quiz">
                  <span className="flex items-center gap-2">
                    {t(hero.ctaKey)}
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </Link>
              )}
            </Button>
            {hero.cta2Kind === "anchor" ? (
              <Button asChild variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
                <a href={hero.cta2Href}>{t(hero.cta2Key)}</a>
              </Button>
            ) : (
              <Button asChild variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
                <Link to={hero.cta2Href}>{t(hero.cta2Key)}</Link>
              </Button>
            )}
          </div>

          {/* Live AI Activity Feed */}
          <LiveFeed />

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto reveal reveal-delay-4">
            {[
              { val: "3", labelKey: "convStat1" as TranslationKey },
              { val: "RM 240K+", labelKey: "convStat2" as TranslationKey },
              { val: "24/7", labelKey: "convStat3" as TranslationKey },
              { val: "100%", labelKey: "idxStat4Label" as TranslationKey },
            ].map((stat) => (
              <div key={stat.labelKey} className="text-center">
                <div className="text-3xl font-bold text-electric">{stat.val}</div>
                <div className="text-xs text-white/40 mt-1">{t(stat.labelKey)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust badges — positioned directly under the hero CTA */}
      <TrustBadges />

      {/* Problem navigator — problem-first topic cards above the fold */}
      <ProblemNavigator />

      {/* How we work — low-risk pilot entry point */}
      <WorkflowPilot />

      {/* Services Grid */}
      <section ref={servicesRef} className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("idxSvcEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4 reveal reveal-delay-1">
              {t("idxSvcTitle")}
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto reveal reveal-delay-2">
              {t("idxSvcSub")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {services.map((svc, i) => (
              <Card key={svc.titleKey} className={`group p-8 hover:shadow-lg hover:border-electric/30 transition-all reveal reveal-delay-${i + 1}`}>
                <Link to={svc.to} className="block">
                  <div className="w-12 h-12 rounded-lg bg-electric/10 flex items-center justify-center mb-4 group-hover:bg-electric/20 transition-colors">
                    <svc.icon className="w-6 h-6 text-electric" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold mb-2">{t(svc.titleKey)}</h3>
                  <p className="text-muted-foreground text-sm mb-4">{t(svc.descKey)}</p>
                  <span className="text-electric text-sm font-medium">{t("idxLearnMore")}</span>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section ref={whyRef} className="py-20 px-6 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4 reveal">{t("idxWhyEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground reveal reveal-delay-1">
              {t("idxWhyTitle")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {whyItems.map((item, i) => (
              <Card key={item.titleKey} className={`p-8 reveal reveal-delay-${i + 1}`}>
                <div className="flex items-start gap-4">
                  <span className="text-3xl font-bold text-electric/20 font-heading">{item.num}</span>
                  <div>
                    <h3 className="text-lg font-heading font-semibold mb-2">{t(item.titleKey)}</h3>
                    <p className="text-muted-foreground text-sm">{t(item.descKey)}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Case studies — real businesses, real results */}
      <CaseStudies />

      {/* DutaOS workspace preview — labelled illustrative mock */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy via-slate-deep to-navy py-20 px-6">
        <DataFabricBackdrop />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(0,212,255,0.10),transparent_55%)]" />
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="electric" className="mb-4 reveal">{t("dutaosModulesEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-white reveal reveal-delay-1">
              {t("dutaosModulesTitle")}
            </h2>
          </div>
          <DutaosPreview />
        </div>
      </section>

      {/* DutaOS Modules — modular pricing (anchor target: #modules) */}
      <DutaosModulesSection id="modules" />

      {/* Social Proof — anonymised early results */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4 reveal">{t("dutaosProofEyebrow")}</Badge>
            <h2 className="text-3xl md:text-4xl font-heading font-bold reveal reveal-delay-1">
              {t("dutaosProofTitle")}
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { quoteKey: "dutaosProofQuote1" as TranslationKey, attrKey: "dutaosProofQuote1Attr" as TranslationKey },
              { quoteKey: "dutaosProofQuote2" as TranslationKey, attrKey: "dutaosProofQuote2Attr" as TranslationKey },
            ].map((item, i) => (
              <Card key={item.quoteKey} className={`p-8 reveal reveal-delay-${i + 1}`}>
                <Quote className="w-6 h-6 text-electric mb-4" />
                <p className="text-foreground/90 mb-4">“{t(item.quoteKey)}”</p>
                <p className="text-sm text-muted-foreground">— {t(item.attrKey)}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Band */}
      <section ref={trustRef} className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-center reveal">
          <div>
            <div className="text-4xl font-bold text-electric mb-1">RM 240K+</div>
            <div className="text-sm text-muted-foreground">{t("convTrust1")}</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-electric mb-1">3 days</div>
            <div className="text-sm text-muted-foreground">{t("convTrust2")}</div>
          </div>
          <div>
            <div className="text-4xl font-bold text-electric mb-1">0</div>
            <div className="text-sm text-muted-foreground">{t("convTrust3")}</div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FaqSection />

      {/* What you'll get — checklist under the assessment CTA */}
      <WhatYoullGet />

      {/* WhatsApp One-Field Signup */}
      <section className="py-20 px-6 bg-gradient-to-br from-navy to-slate-deep">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4 reveal">
            {t("convWaTitle")}
          </h2>
          <p className="text-white/60 mb-8 reveal reveal-delay-1">{t("convWaDesc")}</p>

          {!waSubmitted ? (
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 max-w-md mx-auto reveal reveal-delay-2">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="space-y-1">
                  <Label htmlFor="wa-name" className="text-white/60 text-xs">{t("convWaName")}</Label>
                  <Input
                    id="wa-name"
                    value={waName}
                    onChange={(e) => setWaName(e.target.value)}
                    placeholder="Ahmad"
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="wa-phone" className="text-white/60 text-xs">{t("convWaPhone")} *</Label>
                  <Input
                    id="wa-phone"
                    type="tel"
                    value={waPhone}
                    onChange={(e) => setWaPhone(e.target.value)}
                    placeholder="012 345 6789"
                    required
                    className="bg-white/10 border-white/20 text-white placeholder:text-white/30"
                  />
                </div>
              </div>
              <Button
                variant="electric"
                className="w-full"
                onClick={handleWaSignup}
                disabled={!waPhone}
              >
                {t("convWaCta")}
              </Button>
            </div>
          ) : (
            <div className="bg-electric/10 rounded-2xl p-6 max-w-md mx-auto reveal">
              <p className="font-medium text-white mb-2">{t("convWaThanks")}</p>
              <a
                href="https://wa.me/601154034051?text=Hi%20Duta%20Integra!%20I%27m%20interested%20in%20your%20services."
                target="_blank"
                rel="noopener noreferrer"
                className="text-electric font-semibold text-sm hover:underline"
              >
                {t("convWaLink")}
              </a>
            </div>
          )}
        </div>
      </section>

      {/* CTA Band */}
      <section className="py-20 px-6 bg-gradient-to-br from-navy to-slate-deep text-center border-t border-white/5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-white mb-4">
            {t("idxCtaTitle")}
          </h2>
          <p className="text-white/60 mb-8">
            {t("idxCtaDesc")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="electric" size="xl">
              <Link to="/contact">{t("idxCtaBtn1")}</Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="border-white/20 text-white hover:bg-white/10">
              <Link to="/pricing">{t("idxCtaBtn2")}</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Sticky CTA Bar */}
      {showSticky && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-navy/95 backdrop-blur-md border-t border-white/10 py-3 px-6">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="hidden sm:block">
              <p className="text-sm text-white font-medium">{t("convStickyTitle")}</p>
              <p className="text-xs text-white/40">{t("convStickySub")}</p>
            </div>
            <div className="flex items-center gap-3">
              <Button asChild variant="outline" size="sm" className="border-white/20 text-white hover:bg-white/10">
                <a href="https://wa.me/601154034051" target="_blank" rel="noopener noreferrer">
                  {t("convStickyWa")}
                </a>
              </Button>
              <Button asChild variant="electric" size="sm">
                <Link to="/quiz">{t("convStickyCta")}</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
