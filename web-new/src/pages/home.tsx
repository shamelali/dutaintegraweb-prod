import { useState } from "react"
import { Link } from "react-router-dom"
import {
  ArrowRight,
  Bot,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  Cloud,
  Cog,
  Headphones,
  Laptop2,
  MessageCircle,
  Network,
  ShieldCheck,
  UsersRound,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DataFabricBackdrop } from "@/components/data-fabric-backdrop"
import { DutaosPreview } from "@/components/dutaos-preview"
import { LeadLeakageCheck } from "@/components/lead-leakage-check"
import { LiveFeed } from "@/components/live-feed"
import { WorkflowPilot } from "@/components/workflow-pilot"
import { postWithCsrf } from "@/lib/csrf"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import type { TranslationKey } from "@/i18n/translations"

const FIT_KEYS: TranslationKey[] = ["rightForYouFit1", "rightForYouFit2", "rightForYouFit3"]
const NEEDS_KEYS: TranslationKey[] = ["rightForYouRequires1", "rightForYouRequires2", "rightForYouRequires3"]

// Written, translated, and shipped in the bundle for months without any
// component reading them — see `home-pilot.test.tsx`, which now fails if one of
// these five stops rendering.
const pilotFaqs = [
  { qKey: "pilotFaq1Question" as TranslationKey, aKey: "pilotFaq1Answer" as TranslationKey },
  { qKey: "pilotFaq2Question" as TranslationKey, aKey: "pilotFaq2Answer" as TranslationKey },
  { qKey: "pilotFaq3Question" as TranslationKey, aKey: "pilotFaq3Answer" as TranslationKey },
  { qKey: "pilotFaq4Question" as TranslationKey, aKey: "pilotFaq4Answer" as TranslationKey },
  { qKey: "pilotFaq5Question" as TranslationKey, aKey: "pilotFaq5Answer" as TranslationKey },
]

const LANDING_COPY = {
  en: {
    heroEyebrow: "Technology for a stronger Malaysian SME sector",
    heroTitle: ["IT, security, cloud and AI—", "working together", "for your business."],
    heroDescription: "Practical technology services for Malaysian SMEs, from day-to-day IT support to cloud projects and custom AI.",
    heroSecondary: "Explore services",
    trust: ["Built for Malaysian SMEs", "Practical, people-first approach", "Secure, reliable and future-ready"],
    servicesEyebrow: "Our services",
    servicesTitle: "One partner. Four ways to move forward.",
    servicesDescription: "End-to-end IT and AI services, tailored for Malaysian SMEs. Practical, secure and designed to help your business grow.",
    services: [
      ["Managed IT", "Reliable day-to-day IT support so your team can focus on what matters."],
      ["IT Security", "Protect your systems, data and people, and reduce risk."],
      ["Cloud Migration", "Move and modernize your workloads with minimal disruption."],
      ["AI Development", "Automate practical business workflows with custom AI solutions."],
    ],
    serviceLink: "Explore service",
    productsEyebrow: "Products & platforms",
    productsTitle: "Tools that make your business stronger.",
    productsDescription: "Our products are built for Malaysian businesses and work seamlessly with our services, or on their own.",
    products: [
      ["Autonomous Ops", "AI-assisted infrastructure monitoring with human approval for critical actions."],
      ["DutaConnect", "Capture, prioritize and follow up WhatsApp enquiries."],
    ],
    howEyebrow: "How we work",
    howTitle: "A simple path from today to tomorrow.",
    howDescription: "A proven approach to deliver real results for your business, with clear communication at every step.",
    steps: [
      ["Assess", "Understand your needs, evaluate your current setup, and define the right solution."],
      ["Implement", "Roll out the solution with minimal disruption and proper training."],
      ["Support", "We stay with you, providing ongoing support, optimization and guidance."],
    ],
    casesEyebrow: "Case studies",
    casesTitle: "Real businesses. Real progress.",
    casesDescription: "We work with Malaysian SMEs across different industries. Here are some of their stories.",
    casesLink: "View all case studies",
    caseLabels: ["Technology", "Professional services", "Retail & hospitality"],
    ctaEyebrow: "Let’s build a stronger tomorrow",
    ctaTitle: "Ready to explore what’s possible?",
    ctaDescription: "Book a free 30-minute consultation and let’s discuss how we can help your business grow with the right technology.",
    ctaButton: "Book a free assessment",
    ctaNote: "No obligation. Just a conversation.",
    pilotSummary: "Prefer to send your pilot details directly?",
    dashboard: {
      brand: "Duta Integra",
      brandSub: "Solutions",
      nav: ["Overview", "IT Support", "Security", "Cloud", "AI & Automation", "Reports"],
      title: "Your Business at a Glance",
      subtitle: "Secure · Productive · Ready for What’s Next",
      status: "All systems operational",
      cards: [
        ["Cloud Infrastructure", "Healthy", "Servers, backups and cloud services running smoothly."],
        ["Support Queue", "2 open", "IT tickets and requests from your team."],
        ["Automation & AI", "Active", "Automations running across your business."],
        ["Security", "Protected", "Threat monitoring and endpoint protection active."],
      ],
      view: "View",
      people: ["People", "Technology", "Progress", "Together"],
    },
  },
  bm: {
    heroEyebrow: "Teknologi untuk sektor PKS Malaysia yang lebih kukuh",
    heroTitle: ["IT, keselamatan, awan dan AI—", "bekerjasama", "untuk perniagaan anda."],
    heroDescription: "Perkhidmatan teknologi praktikal untuk PKS Malaysia, daripada sokongan IT harian hingga projek awan dan AI tersuai.",
    heroSecondary: "Terokai perkhidmatan",
    trust: ["Dibina untuk PKS Malaysia", "Pendekatan praktikal, mengutamakan manusia", "Selamat, boleh dipercayai dan bersedia untuk masa depan"],
    servicesEyebrow: "Perkhidmatan kami",
    servicesTitle: "Satu rakan kongsi. Empat cara untuk bergerak ke hadapan.",
    servicesDescription: "Perkhidmatan IT dan AI menyeluruh untuk PKS Malaysia. Praktikal, selamat dan direka untuk membantu perniagaan anda berkembang.",
    services: [
      ["IT Terurus", "Sokongan IT harian yang boleh dipercayai supaya pasukan anda boleh fokus pada perkara penting."],
      ["Keselamatan IT", "Lindungi sistem, data dan orang anda, serta kurangkan risiko."],
      ["Migrasi Awan", "Pindahkan dan modenkan beban kerja anda dengan gangguan minimum."],
      ["Pembangunan AI", "Automasi aliran kerja perniagaan praktikal dengan penyelesaian AI tersuai."],
    ],
    serviceLink: "Terokai perkhidmatan",
    productsEyebrow: "Produk dan platform",
    productsTitle: "Alat yang menjadikan perniagaan anda lebih kukuh.",
    productsDescription: "Produk kami dibina untuk perniagaan Malaysia dan berfungsi lancar dengan perkhidmatan kami, atau secara tersendiri.",
    products: [
      ["Autonomous Ops", "Pemantauan infrastruktur dibantu AI dengan kelulusan manusia untuk tindakan kritikal."],
      ["DutaConnect", "Tangkap, utamakan dan susuli pertanyaan WhatsApp."],
    ],
    howEyebrow: "Cara kami bekerja",
    howTitle: "Laluan mudah dari hari ini ke hari esok.",
    howDescription: "Pendekatan terbukti untuk memberikan hasil sebenar, dengan komunikasi jelas pada setiap langkah.",
    steps: [
      ["Nilai", "Fahami keperluan anda, nilai persediaan semasa dan tentukan penyelesaian yang tepat."],
      ["Laksana", "Laksanakan penyelesaian dengan gangguan minimum dan latihan yang sewajarnya."],
      ["Sokong", "Kami kekal bersama anda dengan sokongan, pengoptimuman dan panduan berterusan."],
    ],
    casesEyebrow: "Kajian kes",
    casesTitle: "Perniagaan sebenar. Kemajuan sebenar.",
    casesDescription: "Kami bekerja dengan PKS Malaysia daripada pelbagai industri. Ini beberapa kisah mereka.",
    casesLink: "Lihat semua kajian kes",
    caseLabels: ["Teknologi", "Perkhidmatan profesional", "Runcit dan hospitaliti"],
    ctaEyebrow: "Mari bina masa depan yang lebih kukuh",
    ctaTitle: "Sedia meneroka kemungkinan?",
    ctaDescription: "Tempah konsultasi percuma 30 minit dan bincangkan bagaimana teknologi yang tepat boleh membantu perniagaan anda berkembang.",
    ctaButton: "Tempah penilaian percuma",
    ctaNote: "Tiada obligasi. Hanya perbualan.",
    pilotSummary: "Lebih suka menghantar butiran pilot secara terus?",
    dashboard: {
      brand: "Duta Integra",
      brandSub: "Solutions",
      nav: ["Gambaran keseluruhan", "Sokongan IT", "Keselamatan", "Awan", "AI dan Automasi", "Laporan"],
      title: "Perniagaan Anda Sepintas Lalu",
      subtitle: "Selamat · Produktif · Bersedia untuk Seterusnya",
      status: "Semua sistem beroperasi",
      cards: [
        ["Infrastruktur Awan", "Sihat", "Pelayan, sandaran dan perkhidmatan awan berjalan lancar."],
        ["Barisan Sokongan", "2 terbuka", "Tiket IT dan permintaan daripada pasukan anda."],
        ["Automasi dan AI", "Aktif", "Automasi berjalan di seluruh perniagaan anda."],
        ["Keselamatan", "Dilindungi", "Pemantauan ancaman dan perlindungan titik akhir aktif."],
      ],
      view: "Lihat",
      people: ["Manusia", "Teknologi", "Kemajuan", "Bersama"],
    },
  },
} as const

const SERVICE_ICONS = [Laptop2, ShieldCheck, Cloud, Network]
const PRODUCT_ICONS = [Bot, MessageCircle]
const STEP_ICONS = [ClipboardCheck, Cog, UsersRound]
const DASHBOARD_ICONS = [Cloud, Headphones, Network, ShieldCheck]
const DASHBOARD_NAV_ICONS = [Building2, Headphones, ShieldCheck, Cloud, Bot, ClipboardCheck]

function DashboardPreview() {
  const { lang } = useLanguage()
  const copy = LANDING_COPY[lang].dashboard

  return (
    <div className="landing-visual" aria-label="Illustration of a business technology dashboard">
      <div className="landing-skyline" aria-hidden="true">
        <span className="skyline-building skyline-building-one" />
        <span className="skyline-building skyline-building-two" />
        <span className="skyline-building skyline-building-three" />
        <span className="skyline-building skyline-building-four" />
        <span className="skyline-building skyline-building-five" />
        <span className="skyline-spire skyline-spire-one" />
        <span className="skyline-spire skyline-spire-two" />
      </div>
      <div className="dashboard-window">
        <aside className="dashboard-sidebar">
          <div className="dashboard-brand"><span className="dashboard-mark">D</span><span>{copy.brand}<small>{copy.brandSub}</small></span></div>
          <nav aria-label="Dashboard preview navigation">
            {copy.nav.map((label, index) => {
              const Icon = DASHBOARD_NAV_ICONS[index]
              return <span key={label} className={`dashboard-link ${index === 0 ? "is-active" : ""}`}><Icon />{label}</span>
            })}
          </nav>
        </aside>
        <div className="dashboard-content">
          <div className="dashboard-heading"><div><p className="dashboard-kicker">{copy.title}</p><p className="dashboard-caption">{copy.subtitle}</p></div><span className="dashboard-status"><i />{copy.status}</span></div>
          <div className="dashboard-grid">
            {copy.cards.map((card, index) => {
              const Icon = DASHBOARD_ICONS[index]
              return <div key={card[0]} className="dashboard-card"><div className="dashboard-card-title"><Icon /><strong>{card[0]}</strong><span>{card[1]}</span></div><p>{card[2]}</p><a href="#services">{copy.view} {card[0].toLowerCase()} <ArrowRight /></a></div>
            })}
          </div>
        </div>
      </div>
      <div className="landing-visual-copy">{copy.people.map((line, index) => index === copy.people.length - 1 ? <strong key={line}>{line}</strong> : <span key={line}>{line}</span>)}</div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description?: string }) {
  return <div className="landing-section-heading"><div><p className="landing-eyebrow">{eyebrow}</p><h2>{title}</h2></div>{description && <p className="landing-section-description">{description}</p>}</div>
}

function CaseStudyPlaceholders({ labels }: { labels: readonly string[] }) {
  return <div className="case-study-grid" aria-label="Case studies"><div className="case-study-placeholder"><div className="case-study-image"><Building2 /></div><div className="case-study-lines"><span /><span /><span /></div><p>{labels[0]}</p></div><div className="case-study-placeholder"><div className="case-study-image"><Building2 /></div><div className="case-study-lines"><span /><span /><span /></div><p>{labels[1]}</p></div><div className="case-study-placeholder"><div className="case-study-image"><Building2 /></div><div className="case-study-lines"><span /><span /><span /></div><p>{labels[2]}</p></div></div>
}

export function HomePage() {
  const { lang, t } = useLanguage()
  const copy = LANDING_COPY[lang]
  const servicesRef = useScrollReveal()
  const productsRef = useScrollReveal()
  const stepsRef = useScrollReveal()
  const casesRef = useScrollReveal()
  const [pilotName, setPilotName] = useState("")
  const [pilotEmail, setPilotEmail] = useState("")
  const [pilotCompany, setPilotCompany] = useState("")
  const [pilotVolume, setPilotVolume] = useState("")
  const [pilotTime, setPilotTime] = useState("")
  const [pilotSubmitted, setPilotSubmitted] = useState(false)
  const [pilotSubmitting, setPilotSubmitting] = useState(false)
  const [pilotError, setPilotError] = useState("")

  const handlePilotSignup = async () => {
    if (!pilotEmail || !pilotVolume) return
    setPilotSubmitting(true)
    setPilotError("")
    try {
      const res = await fetch("/api/send-email", postWithCsrf({
        name: pilotName || "Pilot Lead",
        email: pilotEmail,
        company: pilotCompany || "",
        service: "WhatsApp lead follow-up pilot",
        message: `Pilot booking — ${pilotVolume} enquiries/month; preferred slot: ${pilotTime || "any"}; company: ${pilotCompany || "—"}`,
        source: "pilot-booking",
      }))
      if (!res.ok) {
        const body = await res.json().catch(() => null)
        setPilotError(body?.error || t("pilotFormError"))
        return
      }
      setPilotSubmitted(true)
    } catch {
      setPilotError(t("pilotFormNetworkError"))
    } finally {
      setPilotSubmitting(false)
    }
  }

  return <>
    <section className="landing-hero"><DataFabricBackdrop /><div className="landing-container landing-hero-grid"><div className="landing-hero-copy">
      <p className="landing-eyebrow">{copy.heroEyebrow}</p>
      <h1>{copy.heroTitle[0]}<br /><em>{copy.heroTitle[1]}</em><br />{copy.heroTitle[2]}</h1>
      <p className="landing-hero-description">{copy.heroDescription}</p>
      <div className="landing-hero-actions"><Button asChild size="xl" className="landing-primary-button"><a href="#pilot">{t("pilotHeroCta")} <ArrowRight /></a></Button><Button asChild variant="outline" size="xl" className="landing-secondary-button"><a href="#lead-leakage-check">{t("llcTitle")}</a></Button></div>
      <p className="landing-hero-note"><a href="#services">{copy.heroSecondary}</a></p>
      <div className="landing-trust-points"><span><Building2 />{copy.trust[0]}</span><span><UsersRound />{copy.trust[1]}</span><span><ShieldCheck />{copy.trust[2]}</span></div>
    </div><DashboardPreview /></div></section>

    <LeadLeakageCheck />

    <section id="services" ref={servicesRef} className="landing-section landing-services"><div className="landing-container"><SectionHeading eyebrow={copy.servicesEyebrow} title={copy.servicesTitle} description={copy.servicesDescription} /><div className="landing-service-grid">{copy.services.map((service, index) => { const Icon = SERVICE_ICONS[index]; return <Link to="/services" key={service[0]} className="landing-service-card reveal"><Icon /><h3>{service[0]}</h3><p>{service[1]}</p><span>{copy.serviceLink} <ArrowRight /></span></Link> })}</div></div></section>

    <section ref={productsRef} className="landing-products"><div className="landing-container"><SectionHeading eyebrow={copy.productsEyebrow} title={copy.productsTitle} description={copy.productsDescription} /><div className="landing-product-grid">{copy.products.map((product, index) => { const Icon = PRODUCT_ICONS[index]; return <Link to="/products" key={product[0]} className="landing-product-card reveal"><Icon /><div><h3>{product[0]}</h3><p>{product[1]}</p></div><ArrowRight className="landing-product-arrow" /></Link> })}</div><div className="mt-14"><DutaosPreview /></div><div className="mt-12"><LiveFeed /></div></div></section>

    <section ref={stepsRef} className="landing-section landing-how"><div className="landing-container"><SectionHeading eyebrow={copy.howEyebrow} title={copy.howTitle} description={copy.howDescription} /><div className="landing-steps">{copy.steps.map((step, index) => { const Icon = STEP_ICONS[index]; return <div key={step[0]} className="landing-step reveal"><Icon /><div><h3>{step[0]}</h3><p>{step[1]}</p></div>{index < copy.steps.length - 1 && <ChevronRight className="landing-step-arrow" />}</div> })}</div></div></section>

    <WorkflowPilot />

    <section id="pilot" className="landing-section"><div className="landing-container">
      <SectionHeading eyebrow={t("pilotHeroBadge")} title={t("pilotHeroTitle")} description={t("pilotHeroDesc")} />
      <div className="grid md:grid-cols-2 gap-6 mt-10">
        <Card className="p-6">
          <h3 className="text-lg font-heading font-semibold mb-3">{t("pilotPriceTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("pilotPricePilot")}</p>
          <p className="text-sm text-muted-foreground mt-2">{t("pilotPriceOngoing")}</p>
          <p className="text-sm font-medium mt-3">{t("pilotPriceCondition")}</p>
        </Card>
        <Card className="p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-electric mb-2">{t("rightForYouBadge")}</p>
          <h3 className="text-lg font-heading font-semibold mb-2">{t("rightForYouTitle")}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t("rightForYouDesc")}</p>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2">{t("rightForYouFitHeading")}</p>
          <ul className="space-y-2 mb-4">{FIT_KEYS.map((key) => <li key={key} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-electric mt-0.5 shrink-0" /><span>{t(key)}</span></li>)}</ul>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2">{t("rightForYouNeedsHeading")}</p>
          <ul className="space-y-2">{NEEDS_KEYS.map((key) => <li key={key} className="flex items-start gap-2 text-sm"><Check className="w-4 h-4 text-electric mt-0.5 shrink-0" /><span>{t(key)}</span></li>)}</ul>
        </Card>
      </div>
      <div className="mt-10">
        <h3 className="text-lg font-heading font-semibold mb-4">{copy.pilotSummary}</h3>
        {!pilotSubmitted ? <form onSubmit={(event) => { event.preventDefault(); void handlePilotSignup() }} className="landing-pilot-form">
          <div><Label htmlFor="pilot-name">{t("pilotFormName")}</Label><Input id="pilot-name" value={pilotName} onChange={(event) => setPilotName(event.target.value)} /></div>
          <div><Label htmlFor="pilot-email">{t("pilotFormEmail")}</Label><Input id="pilot-email" type="email" required value={pilotEmail} onChange={(event) => setPilotEmail(event.target.value)} /></div>
          <div><Label htmlFor="pilot-company">{t("pilotFormCompany")}</Label><Input id="pilot-company" value={pilotCompany} onChange={(event) => setPilotCompany(event.target.value)} /></div>
          <div><Label htmlFor="pilot-volume">{t("pilotFormVolume")}</Label><Input id="pilot-volume" type="number" required value={pilotVolume} onChange={(event) => setPilotVolume(event.target.value)} /></div>
          <div><Label htmlFor="pilot-time">{t("pilotFormTime")}</Label><Input id="pilot-time" value={pilotTime} onChange={(event) => setPilotTime(event.target.value)} /></div>
          {pilotError && <p role="alert">{pilotError}</p>}
          <Button type="submit" disabled={!pilotEmail || !pilotVolume || pilotSubmitting}>{pilotSubmitting ? t("pilotFormSubmitting") : t("pilotFormCta")}</Button>
        </form> : <p className="landing-pilot-success"><Check />{t("pilotFormSuccess")}</p>}
      </div>
      <div className="mt-10">
        <h3 className="text-lg font-heading font-semibold mb-4">{t("pilotFaqTitle")}</h3>
        <div className="space-y-3">
          {pilotFaqs.map((faq) => (
            <details key={faq.qKey} className="group rounded-lg border border-border/60 bg-card px-5 py-4 open:shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
                <span>{t(faq.qKey)}</span>
                <span className="text-electric ml-4 shrink-0 transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">{t(faq.aKey)}</p>
            </details>
          ))}
        </div>
      </div>
    </div></section>

    <section ref={casesRef} className="landing-section landing-cases"><div className="landing-container"><SectionHeading eyebrow={copy.casesEyebrow} title={copy.casesTitle} description={copy.casesDescription} /><div className="landing-case-link"><Link to="/case-studies">{copy.casesLink} <ArrowRight /></Link></div><CaseStudyPlaceholders labels={copy.caseLabels} /></div></section>

    <section className="landing-cta"><div className="landing-container landing-cta-inner"><div><p className="landing-eyebrow">{copy.ctaEyebrow}</p><h2>{copy.ctaTitle}</h2><p>{copy.ctaDescription}</p></div><div className="landing-cta-action"><Button asChild size="xl" className="landing-primary-button"><Link to="/digital-assessment">{copy.ctaButton} <ArrowRight /></Link></Button><small>{copy.ctaNote}</small></div></div></section>

  </>
}
