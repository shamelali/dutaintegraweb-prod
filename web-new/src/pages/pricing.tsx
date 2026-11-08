import { useState } from "react"
import { Link } from "react-router-dom"
import { Check, MessageCircle } from "lucide-react"
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

// SME & Startup 3-Tier Plans (PKS Track)
const smeTiers = [
  {
    id: "core",
    name: "CORE",
    price: "RM 199",
    period: "/ bulan",
    badge: null,
    target: "Kedai runcit, bengkel, klinik & peniaga mikro",
    desc: "Kehadiran digital asas, laman web profil kemas dan komputer kedai yang sentiasa stabil.",
    features: [
      "Binaan Laman Web 1-Halaman atau Baik Pulih Laman Web Lama",
      "Bantuan Komputer, Pencetak & Sambungan WiFi Kedai",
      "Sandaran Data Awan (Cloud Backup) Automatik",
      "Sokongan Bantuan Harian via WhatsApp",
      "SEO Asas Google Maps & Carian Tempatan",
      "Sijil Keselamatan SSL Percuma",
    ],
    cta: "Pilih Pakej Core",
    whatsappMsg: "Salam Duta Integra, saya berminat nak langgan Pakej CORE (RM199/bln) untuk bisnes saya.",
    highlight: false,
  },
  {
    id: "advance",
    name: "ADVANCE",
    price: "RM 699",
    period: "/ bulan",
    pilotNote: "Pilihan Pilot 30-Hari: RM 999",
    badge: "Paling Disyorkan",
    target: "Perniagaan berkembang yang nak gandakan jualan",
    desc: "Laman web jualan interaktif penuh berserta automasi WhatsApp jualan 24 jam dan e-Invois LHDN.",
    features: [
      "Laman Web Jualan Multi-Halaman Interaktif Penuh",
      "DutaConnect: Bot WhatsApp AI Jualan & Tempahan 24/7",
      "Automasi Pesanan & Penyelarasan MyInvois LHDN",
      "DutaFlow: Automasi E-mel Pintar",
      "Masa Tindak Balas Pantas WhatsApp (< 1 Jam)",
      "Penyelenggaraan & Kemas Kini Kandungan Bulanan",
      "Sandaran Awan 100GB & Pemulihan Pantas",
    ],
    cta: "Pilih Pakej Advance",
    whatsappMsg: "Salam Duta Integra, saya berminat dengan Pakej ADVANCE (RM699/bln / Pilot RM999) untuk bisnes saya.",
    highlight: true,
  },
  {
    id: "pro",
    name: "PRO",
    price: "Dari RM 1,499",
    period: "/ bulan",
    badge: "Skala Penuh",
    target: "Syarikat multi-cawangan, pembekal & startup",
    desc: "Operasi bersepadu menyeluruh dengan papan pemuka untung rugi tersuai dan sokongan akaun VIP.",
    features: [
      "Papan Pemuka Analitik & Untung Rugi DutaSight",
      "DutaOps & DutaTrack: Penjejakan Aliran Stor/Kilang",
      "Latihan Staf Sistem & Pengetahuan DutaSense",
      "Pengurus Akaun Dedicated & Hotline VIP 24/7",
      "Integrasi API Sistem POS/Perakaunan Sedia Ada",
      "Perjanjian Tahap Perkhidmatan (SLA) 99.9%",
    ],
    cta: "Bincang Pakej Pro",
    whatsappMsg: "Salam Duta Integra, saya ingin perbincangan khas bagi Pakej PRO untuk syarikat kami.",
    highlight: false,
  },
]

// Comparison matrix rows
const comparisonFeatures = [
  { name: "Binaan Laman Web Baharu", core: "1-Halaman Profil", advance: "Multi-Halaman Jualan", pro: "Portal Web Tersuai" },
  { name: "Baik Pulih Laman Web Usang", core: "Kemas kini reka bentuk", advance: "Reka bentuk semula penuh", pro: "Penyusunan semula platform" },
  { name: "Automasi WhatsApp Jualan", core: "Pautan butang WhatsApp", advance: "DutaConnect AI 24/7", pro: "Multi-ejen AI tersuai" },
  { name: "Penyelarasan e-Invois LHDN", core: "Panduan format invois", advance: "Automatik MyInvois LHDN", pro: "Integrasi ERP / Perakaunan" },
  { name: "Sokongan Komputer & WiFi", core: "Sokongan harian biasa", advance: "Keutamaan pantas (< 1 jam)", pro: "VIP 24/7 Dedicated" },
  { name: "Sandaran Awan (Cloud Backup)", core: "10 GB Automatik", advance: "100 GB Automatik", pro: "Kapasiti Tanpa Had" },
  { name: "Kontrak Mengikat", core: "Tiada (Bulanan)", advance: "Tiada (Bulanan)", pro: "Fleksibel" },
]

// Managed AI-service tiers for Enterprise / Advanced workflows
const enterpriseTiers = [
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

const dutaConnectFeatures = [
  "priceConnectF1", "priceConnectF2", "priceConnectF3",
  "priceConnectF4", "priceConnectF5",
] as TranslationKey[]

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

export function PricingPage() {
  const { lang, t } = useLanguage()
  const heroRef = useScrollReveal()
  const tiersRef = useScrollReveal()
  const includedRef = useScrollReveal()
  const connectRef = useScrollReveal()
  const faqRef = useScrollReveal()
  const ctaRef = useScrollReveal()

  const [activeCategory, setActiveCategory] = useState<"sme" | "enterprise">("sme")

  return (
    <div className="bg-background text-foreground transition-colors duration-200">
      {/* Hero Section */}
      <section ref={heroRef} className="py-20 md:py-28 bg-gradient-to-br from-[#0a2540] via-[#0d3b66] to-[#0a2540] text-center text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <Badge variant="electric" className="mb-6 uppercase tracking-wider font-semibold">
            {lang === "bm" ? "Harga Telus & Berpatutan" : "Transparent & Honest Pricing"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-white mb-6 leading-tight">
            {lang === "bm"
              ? "Penyelesaian Digital Lengkap Tanpa Kos Tersembunyi."
              : "Complete Digital Solutions With Zero Hidden Costs."}
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto mb-8 leading-relaxed">
            {lang === "bm"
              ? "Pilih pakej bulanan yang sesuai dengan saiz perniagaan anda — daripada kedai runcit dan bengkel hingga ke perusahaan berkembang."
              : "Choose an affordable monthly plan matching your stage — from local workshops and retail shops to growing enterprise operations."}
          </p>

          {/* Interactive Category Switcher (Untitled UI style) */}
          <div className="inline-flex p-1.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
            <button
              type="button"
              onClick={() => setActiveCategory("sme")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeCategory === "sme"
                  ? "bg-white text-[#0a2540] shadow-md scale-[1.02]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              🇲🇾 PKS & Startup (Bermula RM199)
            </button>
            <button
              type="button"
              onClick={() => setActiveCategory("enterprise")}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                activeCategory === "enterprise"
                  ? "bg-white text-[#0a2540] shadow-md scale-[1.02]"
                  : "text-white/80 hover:text-white"
              }`}
            >
              🏢 Enterprise & Cloud Ops
            </button>
          </div>
        </div>
      </section>

      {/* Proof Bar */}
      <OpsProofBar />

      {/* MAIN PLANS SECTION */}
      <section id="plans" ref={tiersRef} className="py-20 px-6 max-w-7xl mx-auto">
        {activeCategory === "sme" ? (
          <div>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1565C0] dark:text-[#00d4ff] block mb-2">
                Pakej Rasmi PKS Malaysia
              </span>
              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-navy dark:text-white tracking-tight mb-3">
                3 Pilihan Pakej Ringkas (Core · Advance · Pro)
              </h2>
              <p className="text-sm text-muted-foreground dark:text-slate-300">
                Lengkap dengan binaan laman web, automasi WhatsApp, MyInvois LHDN, dan bantuan teknikal harian.
              </p>
            </div>

            {/* SME 3-Tier Grid with Visual Mockups */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-16">
              {smeTiers.map((tier) => (
                <div
                  key={tier.id}
                  className={`rounded-2xl flex flex-col justify-between transition-all overflow-hidden ${
                    tier.highlight
                      ? "bg-card dark:bg-[#152238] border-2 border-[#1565C0] dark:border-[#00d4ff] shadow-xl relative scale-100 md:scale-105 z-10"
                      : "bg-card dark:bg-[#111927] border border-border dark:border-slate-800 shadow-xs hover:shadow-md"
                  }`}
                >
                  {tier.badge && (
                    <div className="absolute top-3 right-4 bg-[#F04E00] text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm z-20">
                      {tier.badge}
                    </div>
                  )}

                  {/* Visual Mockup Header for Each Tier */}
                  <div className="p-4 sm:p-5 bg-muted/40 dark:bg-slate-900/60 border-b border-border/60 dark:border-slate-800/80">
                    {tier.id === "core" && (
                      <div className="rounded-xl bg-background dark:bg-[#0a0f1d] border border-border/80 dark:border-slate-800 p-3 shadow-xs">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-400" />
                            <span className="w-2 h-2 rounded-full bg-amber-400" />
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            <span className="text-[10px] font-mono text-muted-foreground ml-1">web-profil.my</span>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                            🔒 SSL Aktif
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="h-3 w-3/4 rounded-sm bg-primary/10 dark:bg-[#00d4ff]/10" />
                          <div className="h-2 w-full rounded-sm bg-muted" />
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[9px] font-semibold text-[#1565C0] dark:text-[#00d4ff]">📍 Google Maps Kedai</span>
                            <span className="text-[9px] font-semibold text-slate-500">☁️ Backup 10GB</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {tier.id === "advance" && (
                      <div className="rounded-xl bg-emerald-950/20 border border-emerald-500/30 p-3 shadow-xs">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/20">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">DutaConnect WhatsApp 24/7</span>
                          </div>
                          <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400">⚡ Auto-Reply</span>
                        </div>
                        <div className="space-y-2 text-[10px]">
                          <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg rounded-tl-none border border-border/50 text-slate-700 dark:text-slate-200">
                            💬 Pelanggan: <em>"Nak tempah slot servis esok?"</em>
                          </div>
                          <div className="bg-emerald-600 text-white p-1.5 rounded-lg rounded-tr-none ml-2 font-medium">
                            🤖 Bot: <em>"Slot 10:30 Pagi disahkan! Invois LHDN dijana."</em>
                          </div>
                        </div>
                      </div>
                    )}

                    {tier.id === "pro" && (
                      <div className="rounded-xl bg-background dark:bg-[#0a0f1d] border border-border/80 dark:border-slate-800 p-3 shadow-xs">
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/40">
                          <span className="text-[10px] font-bold text-navy dark:text-white">Papan Pemuka DutaSight</span>
                          <span className="text-[9px] font-bold text-blue-600 dark:text-[#00d4ff]">Cawangan 1-3</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-center">
                          <div className="p-1.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40">
                            <span className="text-[11px] font-extrabold text-navy dark:text-white block">+34%</span>
                            <span className="text-[8px] text-muted-foreground">Untung Bersih</span>
                          </div>
                          <div className="p-1.5 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40">
                            <span className="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-400 block">100%</span>
                            <span className="text-[8px] text-muted-foreground">MyInvois LHDN</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-6 sm:p-8 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xl font-extrabold text-navy dark:text-white mb-1">{tier.name}</h3>
                      <p className="text-xs font-semibold text-[#1565C0] dark:text-[#00d4ff] mb-2">{tier.target}</p>
                      <p className="text-xs text-muted-foreground dark:text-slate-400 mb-5 min-h-[36px]">
                        {tier.desc}
                      </p>

                      <div className="mb-6 pb-6 border-b border-border/60 dark:border-slate-800">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white">
                            {tier.price}
                          </span>
                          <span className="text-xs text-muted-foreground dark:text-slate-400 font-medium">
                            {tier.period}
                          </span>
                        </div>
                        {tier.pilotNote && (
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1">
                            ⚡ {tier.pilotNote}
                          </p>
                        )}
                      </div>

                      <ul className="space-y-3 mb-8">
                        {tier.features.map((feat) => (
                          <li key={feat} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90 dark:text-slate-200">
                            <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                            <span>{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-2">
                      <Button
                        asChild
                        size="lg"
                        className={`w-full font-bold ${
                          tier.highlight
                            ? "bg-[#1565C0] hover:bg-[#0a2540] dark:bg-[#00d4ff] dark:hover:bg-[#00b8e6] text-white dark:text-[#0a0f1d] shadow-sm"
                            : "bg-secondary dark:bg-slate-800 hover:bg-secondary/80 dark:hover:bg-slate-700 text-foreground dark:text-white"
                        }`}
                      >
                        <a
                          href={`https://wa.me/601154034051?text=${encodeURIComponent(tier.whatsappMsg)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          <span>{tier.cta}</span>
                        </a>
                      </Button>
                      <a
                        href="/pks.html"
                        className="block text-center text-[11px] text-muted-foreground hover:text-foreground hover:underline pt-1"
                      >
                        Ketahui lebih lanjut di Hab PKS ➔
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Full Feature Comparison Matrix */}
            <div className="mt-16 rounded-2xl bg-card dark:bg-[#111927] border border-border dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <h3 className="text-xl font-bold text-navy dark:text-white mb-2 text-center">
                Jadual Perbandingan Ciri Mengikut Pakej
              </h3>
              <p className="text-xs text-muted-foreground dark:text-slate-400 mb-8 text-center">
                Semua yang anda perlukan untuk membuat keputusan terbaik bagi perniagaan anda.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-border/70 dark:border-slate-800 text-navy dark:text-white font-bold">
                      <th className="py-3 px-4">Ciri-Ciri Utama</th>
                      <th className="py-3 px-4 text-center">CORE (RM199)</th>
                      <th className="py-3 px-4 text-center text-[#1565C0] dark:text-[#00d4ff]">ADVANCE (RM699)</th>
                      <th className="py-3 px-4 text-center">PRO (RM1,499+)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50 dark:divide-slate-800/60">
                    {comparisonFeatures.map((row) => (
                      <tr key={row.name} className="hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-foreground dark:text-slate-200">{row.name}</td>
                        <td className="py-3.5 px-4 text-center text-muted-foreground dark:text-slate-400">{row.core}</td>
                        <td className="py-3.5 px-4 text-center font-bold text-[#1565C0] dark:text-[#00d4ff] bg-blue-50/40 dark:bg-blue-950/20">{row.advance}</td>
                        <td className="py-3.5 px-4 text-center text-muted-foreground dark:text-slate-400">{row.pro}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-wider text-[#1565C0] dark:text-[#00d4ff] block mb-2">
                Enterprise & Dedicated AI
              </span>
              <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-navy dark:text-white tracking-tight mb-3">
                {t("priceManagedTitle")}
              </h2>
              <p className="text-sm text-muted-foreground dark:text-slate-300">
                {t("priceManagedSub")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 items-stretch mb-16">
              {enterpriseTiers.map((tier) => (
                <Card
                  key={tier.nameKey}
                  className={`p-8 flex flex-col justify-between transition-all border dark:border-slate-800 ${
                    tier.featured
                      ? "border-2 border-primary dark:border-[#00d4ff] shadow-xl relative scale-100 md:scale-105"
                      : "shadow-xs hover:shadow-md"
                  }`}
                >
                  {tier.badgeKey && (
                    <Badge variant="electric" className="absolute -top-3 left-1/2 -translate-x-1/2 uppercase tracking-wider text-xs">
                      {t(tier.badgeKey)}
                    </Badge>
                  )}
                  <div>
                    <h3 className="font-heading font-bold text-xl mb-1">{t(tier.nameKey)}</h3>
                    <p className="text-muted-foreground text-xs mb-4">{t(tier.tagKey)}</p>
                    <div className="mb-6 pb-6 border-b border-border">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white">{tier.price}</span>
                        <span className="text-muted-foreground text-sm font-medium">{tier.period}</span>
                      </div>
                      <p className="text-muted-foreground text-xs mt-1">{t(tier.setupKey)}</p>
                    </div>
                    <ul className="space-y-3 mb-8">
                      {tier.features.map((featKey) => (
                        <li key={featKey} className="flex items-start gap-2.5 text-xs sm:text-sm">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{t(featKey)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button asChild variant={tier.featured ? "electric" : "outline"} size="lg" className="w-full">
                    <Link to={tier.href}>{t(tier.ctaKey)}</Link>
                  </Button>
                </Card>
              ))}
            </div>

            {/* DutaConnect Dedicated Pilot Box */}
            <div ref={connectRef} className="rounded-2xl border border-border dark:border-slate-800 p-8 bg-card dark:bg-[#111927] mb-16">
              <div className="grid lg:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge variant="electric" className="mb-4">{t("priceConnectEyebrow")}</Badge>
                  <h3 className="text-2xl font-heading font-bold mb-3">{t("priceConnectTitle")}</h3>
                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">{t("priceConnectSub")}</p>
                  <ul className="space-y-2 mb-6">
                    {dutaConnectFeatures.map((fKey) => (
                      <li key={fKey} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>{t(fKey)}</span>
                      </li>
                    ))}
                  </ul>
                  <Button asChild variant="electric" size="lg">
                    <a href="/#pilot">{t("priceConnectCta")}</a>
                  </Button>
                </div>
                <div className="bg-muted/40 dark:bg-slate-900/40 p-6 rounded-xl border border-border dark:border-slate-800">
                  <p className="text-xs uppercase font-bold text-muted-foreground mb-2">Pilot Investment</p>
                  <div className="text-3xl font-extrabold text-navy dark:text-white mb-2">RM 999 <span className="text-sm font-normal text-muted-foreground">one-off 30-day pilot</span></div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Zero lock-in. Full WhatsApp lead capture and qualification workflow deployed on your number with complete analytics report.
                  </p>
                </div>
              </div>
            </div>

            {/* DutaOS Modules Section */}
            <DutaosModulesSection />
          </div>
        )}
      </section>

      {/* Included in Every Plan */}
      <section ref={includedRef} className="py-16 px-6 bg-muted/30 dark:bg-slate-950/40 border-y border-border/40 dark:border-slate-800">
        <div className="max-w-5xl mx-auto text-center">
          <h3 className="text-2xl font-heading font-bold text-navy dark:text-white mb-8">
            {t("priceIncludedTitle")}
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 text-left">
            {includedEveryPlan.map((incKey) => (
              <div key={incKey} className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-xs sm:text-sm text-foreground/90 dark:text-slate-300 font-medium">{t(incKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Operations Sections (Workflows, Proof, etc.) */}
      <OpsProblem />
      <OpsBenefits />
      <OpsWorkflow />
      <OpsHowItWorks />
      <OpsCompare />
      <OpsRiskReversal />
      <OpsDoNot />

      {/* FAQs */}
      <section ref={faqRef} className="py-20 px-6 max-w-4xl mx-auto">
        <h3 className="text-2xl sm:text-3xl font-heading font-bold text-center text-navy dark:text-white mb-10">
          {t("priceFaqTitle")}
        </h3>
        <div className="space-y-4">
          {faqs.map((faq) => (
            <details
              key={faq.qKey}
              className="group rounded-xl border border-border/70 dark:border-slate-800 bg-card dark:bg-[#111927] px-6 py-4 transition-all"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm sm:text-base font-semibold text-navy dark:text-white">
                <span>{t(faq.qKey)}</span>
                <span className="text-[#1565C0] dark:text-[#00d4ff] ml-4 shrink-0 transition-transform group-open:rotate-45 font-bold">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">
                {t(faq.aKey)}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section ref={ctaRef} className="py-20 px-6 bg-navy text-white text-center">
        <div className="max-w-2xl mx-auto">
          <Badge variant="electric" className="mb-4">{t("priceBadge")}</Badge>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">{t("priceCtaTitle")}</h2>
          <p className="text-slate-300 text-sm sm:text-base mb-8">{t("priceCtaDesc")}</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="electric" size="xl">
              <Link to="/digital-assessment">{t("priceCtaBtn1")}</Link>
            </Button>
            <Button asChild variant="outline" size="xl" className="border-white/30 text-white hover:bg-white/10">
              <Link to="/contact">{t("priceCtaBtn2")}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
