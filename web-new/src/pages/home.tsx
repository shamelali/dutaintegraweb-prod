import { useState } from "react"
import {
  ArrowRight,
  Check,
  ChevronRight,
  Globe,
  MessageCircle,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { LeadLeakageCheck } from "@/components/lead-leakage-check"
import { postWithCsrf } from "@/lib/csrf"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import type { TranslationKey } from "@/i18n/translations"

const FIT_KEYS: TranslationKey[] = ["rightForYouFit1", "rightForYouFit2", "rightForYouFit3"]
const NEEDS_KEYS: TranslationKey[] = ["rightForYouRequires1", "rightForYouRequires2", "rightForYouRequires3"]

const pilotFaqs = [
  { qKey: "pilotFaq1Question" as TranslationKey, aKey: "pilotFaq1Answer" as TranslationKey },
  { qKey: "pilotFaq2Question" as TranslationKey, aKey: "pilotFaq2Answer" as TranslationKey },
  { qKey: "pilotFaq3Question" as TranslationKey, aKey: "pilotFaq3Answer" as TranslationKey },
  { qKey: "pilotFaq4Question" as TranslationKey, aKey: "pilotFaq4Answer" as TranslationKey },
  { qKey: "pilotFaq5Question" as TranslationKey, aKey: "pilotFaq5Answer" as TranslationKey },
]

const HOME_COPY = {
  bm: {
    pillText: "🇲🇾 Pemilik Bisnes, Bengkel & PKS? Lihat Pakej Ringkas Bermula RM199",
    heroEyebrow: "Penyelesaian Teknologi & Automasi Bisnes Malaysia",
    heroTitle: "Urusan Laman Web, WhatsApp & Sistem Bisnes Jadi Jauh Lebih Mudah.",
    heroSubtitle: "Satu rakan kongsi dipercayai untuk bantu perniagaan anda membina laman web pantas, membalas pelanggan 24 jam di WhatsApp, menyelaraskan e-Invois LHDN, dan menyelesaikan masalah komputer harian tanpa istilah teknikal yang mengelirukan.",
    primaryCta: "Lihat Pakej PKS (RM199 - RM699)",
    secondaryCta: "Tempah Penilaian Percuma",
    trust: [
      "Bebas Jargon & Mesra Pengguna",
      "Siap Pantas (3 - 7 Hari)",
      "Sokongan Tempatan Cyberjaya",
    ],
    solutionsEyebrow: "3 Bidang Utama",
    solutionsTitle: "Segala Yang Diperlukan Untuk Melancarkan Operasi Bisnes",
    solutionsDesc: "Kami selesaikan beban teknologi supaya anda boleh fokus melayan pelanggan dan menggandakan jualan.",
    solutions: [
      {
        icon: Globe,
        title: "Binaan & Baik Pulih Laman Web",
        desc: "Laman web jualan moden yang pantas di telefon pintar, siap dengan butang WhatsApp, borang tempahan dan pengoptimuman carian tempatan Google.",
        badge: "Teras Jualan",
      },
      {
        icon: MessageCircle,
        title: "Automasi WhatsApp & e-Invois LHDN",
        desc: "DutaConnect bantu tangkap pertanyaan pelanggan 24 jam secara automatik serta sambungan sistem pesanan dan invois sedia MyInvois LHDN.",
        badge: "Paling Popular",
      },
      {
        icon: ShieldCheck,
        title: "Sokongan IT Diurus & Sandaran Awan",
        desc: "Bantuan teknikal komputer kedai, sambungan WiFi stabil, dan sandaran data perniagaan automatik ke awan agar rekod anda tidak pernah hilang.",
        badge: "Ketenangan Minda",
      },
    ],
    tiersEyebrow: "Pilihan Pakej Telus",
    tiersTitle: "3 Peringkat Pakej Mengikut Keperluan & Bajet Anda",
    tiersDesc: "Pakej bulanan berpatutan, tiada caj tersembunyi, dan boleh dinaik taraf mengikut perkembangan syarikat.",
    tiers: [
      {
        id: "core",
        name: "CORE",
        price: "RM 199",
        period: "/bulan",
        desc: "Sesuai untuk kedai runcit, bengkel, klinik & peniaga mikro yang perlukan kehadiran digital asas dan komputer stabil.",
        features: [
          "Binaan Laman Web 1-Halaman atau Baik Pulih Web Usang",
          "Bantuan Komputer & Sambungan WiFi Kedai",
          "Sandaran Data Awan (Cloud Backup) Automatik",
          "Sokongan Bantuan Harian via WhatsApp",
        ],
        cta: "Pilih Pakej Core",
        highlight: false,
      },
      {
        id: "advance",
        name: "ADVANCE",
        price: "RM 699",
        period: "/bulan",
        badge: "Paling Disyorkan",
        desc: "Untuk bisnes berkembang yang mahu jualan WhatsApp berjalan automatik dan bersedia dengan e-Invois LHDN.",
        features: [
          "Laman Web Jualan Multi-Halaman Interaktif Penuh",
          "DutaConnect: Bot WhatsApp Jualan & Tempahan 24/7",
          "Automasi Pesanan & Penyelarasan MyInvois LHDN",
          "Automasi E-mel Pintar DutaFlow",
          "Masa Tindak Balas Pantas WhatsApp (< 1 Jam)",
        ],
        cta: "Pilih Pakej Advance",
        highlight: true,
      },
      {
        id: "pro",
        name: "PRO",
        price: "Dari RM 1,499",
        period: "/bulan",
        desc: "Untuk syarikat berbilang cawangan, pembekal & startup yang memerlukan integrasi menyeluruh dan pengurus akaun dedikasi.",
        features: [
          "Papan Pemuka Prestasi & Untung Rugi DutaSight",
          "Penjejakan Aliran Stor/Kilang DutaOps & DutaTrack",
          "Latihan Staf Sistem & Pengetahuan DutaSense",
          "Pengurus Akaun Dedicated & Sokongan VIP 24/7",
        ],
        cta: "Bincang Pakej Pro",
        highlight: false,
      },
    ],
    howEyebrow: "Proses Kerja",
    howTitle: "3 Langkah Mudah Untuk Bermula",
    howDesc: "Tiada proses berbelit-belit. Kami permudahkan semuanya dari hari pertama.",
    steps: [
      {
        number: "01",
        title: "Sembang Santai (15 Minit)",
        desc: "Ceritakan cabaran operasi atau laman web semasa anda. Kami nilai dan cadangkan solusi paling jimat.",
      },
      {
        number: "02",
        title: "Pemasangan Pantas (3 - 7 Hari)",
        desc: "Pasukan kami siapkan laman web, sistem WhatsApp atau komputer tanpa mengganggu operasi jualan anda.",
      },
      {
        number: "03",
        title: "Operasi Tenang & Sokongan Berterusan",
        desc: "Sistem anda berjalan lancar dengan pemantauan kami. Sebarang isu teknikal, hanya hantar WhatsApp.",
      },
    ],
    casesEyebrow: "Kisah Kejayaan",
    casesTitle: "Perniagaan Tempatan Yang Berkembang Bersama Kami",
    casesDesc: "Hasil sebenar untuk usahawan Malaysia daripada pelbagai sektor.",
    cases: [
      {
        sector: "Bengkel & Pusat Servis",
        highlight: "Peningkatan 40% Tempahan Bulanan",
        story: "Sebelum ini pelanggan WhatsApp lambat dibalas semasa mekanik sibuk membaiki kereta. Dengan DutaConnect, tempahan slot auto-dijawab dalam 5 saat.",
      },
      {
        sector: "Pembekal & Peruncitan",
        highlight: "Jimat 3 Jam Pengurusan Invois Setiap Hari",
        story: "Staf tidak lagi perlu menaip invois secara manual satu persatu. Sistem bersepadu kami menyelaraskan invois terus ke format e-Invois LHDN.",
      },
      {
        sector: "Startup & Firma Profesional",
        highlight: "Operasi IT Lengkap Tanpa Gaji Staf IT Penuh",
        story: "Mendapat sokongan teknikal komprehensif, keselamatan fail awan, dan laman web korporat pada sebahagian kecil kos pekerja biasa.",
      },
    ],
    finalCtaTitle: "Ada Masalah Yang Nak Diselesaikan Hari Ini?",
    finalCtaDesc: "Jangan biarkan masalah komputer, laman web usang, atau mesej WhatsApp yang terlepas merugikan jualan anda. Kami sedia membantu.",
    whatsappCta: "Terus WhatsApp Pegawai Kami",
    allPksDetails: "Lihat Halaman Khas PKS / SME ➔",
  },
  en: {
    pillText: "🇲🇾 Business Owners, Workshops & SMEs? View Simple Packages From RM199",
    heroEyebrow: "Malaysian Business Technology & Automation Solutions",
    heroTitle: "Websites, WhatsApp & Business Systems Made Genuinely Simple.",
    heroSubtitle: "One trusted partner helping Malaysian businesses launch fast websites, respond to customers 24/7 on WhatsApp, streamline LHDN e-Invoicing, and solve daily IT headaches without intimidating technical jargon.",
    primaryCta: "View SME Packages (RM199 - RM699)",
    secondaryCta: "Book a Free Assessment",
    trust: [
      "Jargon-Free & Practical",
      "Fast Turnaround (3 - 7 Days)",
      "Cyberjaya Local Support",
    ],
    solutionsEyebrow: "3 Core Focus Areas",
    solutionsTitle: "Everything You Need to Run a Smooth Modern Business",
    solutionsDesc: "We take care of the tech complexity so you can focus on serving customers and growing your revenue.",
    solutions: [
      {
        icon: Globe,
        title: "Website Creation & Revamp",
        desc: "Modern, high-converting sales websites built for mobile, with direct WhatsApp ordering, inquiry forms, and local Google SEO.",
        badge: "Sales Foundation",
      },
      {
        icon: MessageCircle,
        title: "WhatsApp & LHDN e-Invoicing Automation",
        desc: "DutaConnect captures inquiries around the clock automatically, paired with seamless order handling ready for MyInvois LHDN.",
        badge: "Most Popular",
      },
      {
        icon: ShieldCheck,
        title: "Managed IT Support & Cloud Backup",
        desc: "Reliable computer and WiFi assistance, POS stability, and automated cloud backups so your critical business records stay safe.",
        badge: "Peace of Mind",
      },
    ],
    tiersEyebrow: "Transparent Pricing",
    tiersTitle: "3 Clear Tiers Tailored to Your Business Growth",
    tiersDesc: "Affordable monthly plans with zero hidden fees and easy upgrades as your company expands.",
    tiers: [
      {
        id: "core",
        name: "CORE",
        price: "RM 199",
        period: "/month",
        desc: "Ideal for retail stores, workshops, clinics, and micro-businesses needing an online profile and stable IT.",
        features: [
          "1-Page Profile Website Creation or Revamp of Outdated Site",
          "Shop Computer & Office WiFi Assistance",
          "Automated Cloud Data Backup",
          "Daily WhatsApp Technical Helpdesk",
        ],
        cta: "Choose Core Plan",
        highlight: false,
      },
      {
        id: "advance",
        name: "ADVANCE",
        price: "RM 699",
        period: "/month",
        badge: "Most Recommended",
        desc: "For growing businesses wanting 24/7 WhatsApp customer handling and complete LHDN e-Invoicing compliance.",
        features: [
          "Full Interactive Multi-Page Sales Website",
          "DutaConnect: 24/7 WhatsApp Sales & Booking Assistant",
          "Order Automation & LHDN MyInvois Sync",
          "DutaFlow Smart Email Automation",
          "Priority WhatsApp Response (< 1 Hour)",
        ],
        cta: "Choose Advance Plan",
        highlight: true,
      },
      {
        id: "pro",
        name: "PRO",
        price: "From RM 1,499",
        period: "/month",
        desc: "For multi-branch operations, wholesalers, and startups requiring custom integrations and VIP support.",
        features: [
          "DutaSight AI Profit & Performance Dashboards",
          "DutaOps & DutaTrack Factory/Store Workflow Tracking",
          "DutaSense Staff Training & Knowledge Management",
          "Dedicated Account Manager & 24/7 VIP Support",
        ],
        cta: "Discuss Pro Plan",
        highlight: false,
      },
    ],
    howEyebrow: "Simple Workflow",
    howTitle: "3 Effortless Steps to Get Started",
    howDesc: "No complicated vendor hoops. We keep every step clear and straightforward.",
    steps: [
      {
        number: "01",
        title: "Casual Chat (15 Minutes)",
        desc: "Tell us your daily bottlenecks or current website issues. We evaluate and recommend the most cost-effective path.",
      },
      {
        number: "02",
        title: "Swift Setup (3 - 7 Days)",
        desc: "Our team configures your website, WhatsApp automation, or IT without disrupting your business operations.",
      },
      {
        number: "03",
        title: "Peace of Mind & Ongoing Support",
        desc: "Your setup runs smoothly with our proactive oversight. Any questions? Just reach us on WhatsApp.",
      },
    ],
    casesEyebrow: "Real Results",
    casesTitle: "Local Businesses Growing with Duta Integra",
    casesDesc: "Tangible business outcomes for Malaysian entrepreneurs across diverse industries.",
    cases: [
      {
        sector: "Auto Workshop & Service Center",
        highlight: "+40% Monthly Booking Inquiries",
        story: "Mechanics were busy fixing vehicles and missed customer messages. With DutaConnect, incoming inquiries receive instant booking options in 5 seconds.",
      },
      {
        sector: "Wholesale Supplier & Retail",
        highlight: "Saved 3 Hours on Daily Invoicing",
        story: "Staff no longer copy-paste invoices manually one by one. Our integrated workflow formats orders directly for LHDN e-Invoicing compliance.",
      },
      {
        sector: "Startup & Professional Services",
        highlight: "Full IT Department at a Fraction of the Cost",
        story: "Secured enterprise-grade cloud backups, high-speed corporate web presence, and round-the-clock helpdesk without hiring full-time IT staff.",
      },
    ],
    finalCtaTitle: "Have an Issue to Solve Today?",
    finalCtaDesc: "Do not let computer glitches, an outdated website, or missed WhatsApp leads drain your sales. We are here to help.",
    whatsappCta: "Chat Directly on WhatsApp",
    allPksDetails: "Visit Dedicated SME Page ➔",
  },
} as const

export function HomePage() {
  const { lang, t } = useLanguage()
  const copy = HOME_COPY[lang]
  const solutionsRef = useScrollReveal()
  const tiersRef = useScrollReveal()
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

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* 1. HERO SECTION: Clean, focused, high-converting */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-background to-background dark:from-slate-900/60 dark:via-background dark:to-background pt-12 pb-20 border-b border-border/40">
        <div className="landing-container relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            {/* SME / PKS Announcement Pill */}
            <div className="inline-block mb-6">
              <a
                href="/pks.html"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all shadow-2xs"
              >
                <span>{copy.pillText}</span>
                <ArrowRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </a>
            </div>

            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1565C0] dark:text-[#00d4ff] mb-3">
              {copy.heroEyebrow}
            </p>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-navy dark:text-white leading-tight mb-6">
              {copy.heroTitle}
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground dark:text-slate-300 leading-relaxed mb-8 max-w-2xl mx-auto">
              {copy.heroSubtitle}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-10">
              <Button asChild size="xl" className="w-full sm:w-auto bg-[#0a2540] hover:bg-[#1565C0] dark:bg-[#00d4ff] dark:hover:bg-[#00b8e6] text-white dark:text-[#0a0f1d] px-8 py-3.5 text-base font-bold shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all">
                <a href="/pks.html">
                  {copy.primaryCta}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </a>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto border-border/80 dark:border-slate-700 text-foreground hover:bg-muted/60 dark:hover:bg-slate-800/60 px-8 py-3.5 text-base font-semibold">
                <a href="#pilot">
                  {copy.secondaryCta}
                </a>
              </Button>
            </div>

            {/* Trust points */}
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 pt-4 border-t border-border/50 text-xs sm:text-sm font-medium text-muted-foreground dark:text-slate-400">
              {copy.trust.map((point) => (
                <div key={point} className="inline-flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#1565C0] dark:text-[#00d4ff]" />
                  <span>{point}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Interactive Visual Flow Mockup (Simple & Clean) */}
          <div className="mt-14 max-w-4xl mx-auto rounded-2xl bg-card dark:bg-[#111927] border border-border dark:border-slate-800 shadow-xl p-4 sm:p-6">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-border/60 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono text-muted-foreground ml-2">Aliran Automasi Bisnes Duta Integra</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sistem Aktif 24/7
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-center sm:text-left">
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center mb-2 mx-auto sm:mx-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-navy dark:text-white">1. Laman Web Jualan</h4>
                  <p className="text-[11px] text-muted-foreground dark:text-slate-400 mt-1">Pelanggan layari profil atau laman tempahan</p>
                </div>
                <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 mt-2 block">Trafik Tempatan ⚡</span>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center mb-2 mx-auto sm:mx-0">
                    <MessageCircle className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-emerald-950 dark:text-emerald-300">2. WhatsApp Auto-Reply</h4>
                  <p className="text-[11px] text-muted-foreground dark:text-slate-400 mt-1">DutaConnect jawab soalan & kunci tempahan serta-merta</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-400 mt-2 block">Balas Dalam 5 Saat 💬</span>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center mb-2 mx-auto sm:mx-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-amber-950 dark:text-amber-300">3. MyInvois LHDN</h4>
                  <p className="text-[11px] text-muted-foreground dark:text-slate-400 mt-1">Resit & e-Invois dijana automatik tanpa taip manual</p>
                </div>
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 mt-2 block">Patuh LHDN 2025/2026 📋</span>
              </div>

              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center mb-2 mx-auto sm:mx-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-300">4. Sandaran & Sokongan</h4>
                  <p className="text-[11px] text-muted-foreground dark:text-slate-400 mt-1">Data selamat di awan & bantuan IT jika ada masalah</p>
                </div>
                <span className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-400 mt-2 block">Sentiasa Selamat 🛡️</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 3 CORE SOLUTIONS: Structured & Plain Language */}
      <section ref={solutionsRef} className="py-16 sm:py-24 bg-card dark:bg-[#0a0f1d]">
        <div className="landing-container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1565C0] dark:text-[#00d4ff] block mb-2">
              {copy.solutionsEyebrow}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight mb-3">
              {copy.solutionsTitle}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-300">
              {copy.solutionsDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {copy.solutions.map((sol) => {
              const Icon = sol.icon
              return (
                <div
                  key={sol.title}
                  className="rounded-2xl border border-border dark:border-slate-800 p-6 bg-background dark:bg-[#111927] shadow-xs hover:shadow-lg transition-all hover:-translate-y-1 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-[#1565C0] dark:text-[#00d4ff] flex items-center justify-center">
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-muted dark:bg-slate-800 text-muted-foreground dark:text-slate-300">
                        {sol.badge}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-navy dark:text-white mb-2.5">
                      {sol.title}
                    </h3>
                    <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">
                      {sol.desc}
                    </p>
                  </div>
                  <div className="pt-6 mt-6 border-t border-border/50 dark:border-slate-800">
                    <a
                      href="/pks.html"
                      className="inline-flex items-center text-xs font-bold text-[#1565C0] dark:text-[#00d4ff] hover:underline transition-colors"
                    >
                      <span>Lihat Perincian Solusi</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* 3. THREE TIERS: Core, Advance, Pro */}
      <section ref={tiersRef} className="py-16 sm:py-24 bg-muted/30 dark:bg-slate-950/40 border-y border-border/40 dark:border-slate-800/80">
        <div className="landing-container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#F04E00] block mb-2">
              {copy.tiersEyebrow}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight mb-3">
              {copy.tiersTitle}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-300">
              {copy.tiersDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {copy.tiers.map((tier) => (
              <div
                key={tier.id}
                className={`rounded-2xl p-6 sm:p-8 flex flex-col justify-between transition-all ${
                  tier.highlight
                    ? "bg-card dark:bg-[#152238] border-2 border-[#1565C0] dark:border-[#00d4ff] shadow-xl relative scale-100 md:scale-105 z-10"
                    : "bg-card dark:bg-[#111927] border border-border dark:border-slate-800 shadow-xs hover:shadow-md"
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-[#F04E00] text-white text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
                    {tier.badge}
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-extrabold text-navy dark:text-white">{tier.name}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-slate-400 mb-4 min-h-[36px]">
                    {tier.desc}
                  </p>
                  <div className="flex items-baseline gap-1 mb-6 pb-6 border-b border-border/60 dark:border-slate-800">
                    <span className="text-3xl sm:text-4xl font-extrabold text-navy dark:text-white">
                      {tier.price}
                    </span>
                    <span className="text-xs text-muted-foreground dark:text-slate-400 font-medium">
                      {tier.period}
                    </span>
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

                <div>
                  <Button
                    asChild
                    size="lg"
                    className={`w-full font-bold ${
                      tier.highlight
                        ? "bg-[#1565C0] hover:bg-[#0a2540] dark:bg-[#00d4ff] dark:hover:bg-[#00b8e6] text-white dark:text-[#0a0f1d] shadow-sm"
                        : "bg-secondary dark:bg-slate-800 hover:bg-secondary/80 dark:hover:bg-slate-700 text-foreground dark:text-white"
                    }`}
                  >
                    <a href="/pks.html">
                      {tier.cta}
                      <ArrowRight className="w-4 h-4 ml-1.5" />
                    </a>
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <a
              href="/pks.html"
              className="text-xs sm:text-sm font-semibold text-[#1565C0] dark:text-[#00d4ff] hover:underline"
            >
              {copy.allPksDetails}
            </a>
          </div>
        </div>
      </section>

      {/* 4. LEAD LEAKAGE CALCULATOR: Embedded directly */}
      <LeadLeakageCheck />

      {/* 5. HOW WE WORK (3 Simple Steps) */}
      <section ref={stepsRef} className="py-16 sm:py-20 bg-card dark:bg-[#0a0f1d] border-t border-border/40 dark:border-slate-800">
        <div className="landing-container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1565C0] dark:text-[#00d4ff] block mb-2">
              {copy.howEyebrow}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight mb-3">
              {copy.howTitle}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-300">
              {copy.howDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {copy.steps.map((st) => (
              <div key={st.number} className="relative p-6 rounded-2xl bg-background dark:bg-[#111927] border border-border dark:border-slate-800">
                <span className="text-3xl font-extrabold text-[#1565C0]/25 dark:text-[#00d4ff]/30 block mb-2">
                  {st.number}
                </span>
                <h3 className="text-lg font-bold text-navy dark:text-white mb-2">
                  {st.title}
                </h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. REAL CLIENT STORIES */}
      <section ref={casesRef} className="py-16 sm:py-20 bg-muted/20 dark:bg-slate-950/30 border-t border-border/40 dark:border-slate-800">
        <div className="landing-container">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1565C0] dark:text-[#00d4ff] block mb-2">
              {copy.casesEyebrow}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight mb-3">
              {copy.casesTitle}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-300">
              {copy.casesDesc}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {copy.cases.map((c) => (
              <div key={c.sector} className="p-6 rounded-2xl bg-card dark:bg-[#111927] border border-border dark:border-slate-800 shadow-xs flex flex-col justify-between">
                <div>
                  <span className="text-[11px] font-bold text-[#1565C0] dark:text-[#00d4ff] uppercase tracking-wider block mb-2">
                    {c.sector}
                  </span>
                  <h4 className="text-base font-bold text-navy dark:text-white mb-3">
                    {c.highlight}
                  </h4>
                  <p className="text-xs sm:text-sm text-muted-foreground dark:text-slate-400 leading-relaxed">
                    "{c.story}"
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-border/50 dark:border-slate-800 flex items-center gap-2 text-xs text-muted-foreground dark:text-slate-400">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Kesan Terbukti di Malaysia</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. PILOT BOOKING & FAQS: Gated by automated tests */}
      <section id="pilot" className="py-16 sm:py-24 bg-card dark:bg-[#0a0f1d] border-t border-border/40 dark:border-slate-800">
        <div className="landing-container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-wider text-[#1565C0] dark:text-[#00d4ff] block mb-2">
              {t("pilotHeroBadge")}
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-navy dark:text-white tracking-tight mb-3">
              {t("pilotHeroTitle")}
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground dark:text-slate-300">
              {t("pilotHeroDesc")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-start mb-12">
            {/* Left: Pricing & Fit Cards */}
            <div className="space-y-6">
              <Card className="p-6 border border-border dark:border-slate-800 bg-background dark:bg-[#111927]">
                <h3 className="text-lg font-heading font-semibold mb-3 text-foreground dark:text-white">{t("pilotPriceTitle")}</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400">{t("pilotPricePilot")}</p>
                <p className="text-sm text-muted-foreground dark:text-slate-400 mt-2">{t("pilotPriceOngoing")}</p>
                <p className="text-sm font-medium mt-3 text-navy dark:text-white">{t("pilotPriceCondition")}</p>
              </Card>

              <Card className="p-6 border border-border dark:border-slate-800 bg-background dark:bg-[#111927]">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#1565C0] dark:text-[#00d4ff] mb-2">{t("rightForYouBadge")}</p>
                <h3 className="text-lg font-heading font-semibold mb-2 text-foreground dark:text-white">{t("rightForYouTitle")}</h3>
                <p className="text-sm text-muted-foreground dark:text-slate-400 mb-4">{t("rightForYouDesc")}</p>
                
                <p className="text-xs font-semibold uppercase tracking-wide mb-2">{t("rightForYouFitHeading")}</p>
                <ul className="space-y-2 mb-4">
                  {FIT_KEYS.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>

                <p className="text-xs font-semibold uppercase tracking-wide mb-2">{t("rightForYouNeedsHeading")}</p>
                <ul className="space-y-2">
                  {NEEDS_KEYS.map((key) => (
                    <li key={key} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{t(key)}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>

            {/* Right: Booking Form */}
            <div className="bg-background dark:bg-[#111927] rounded-2xl border border-border dark:border-slate-800 p-6 sm:p-8 shadow-sm">
              <h3 className="text-lg font-heading font-semibold mb-2 text-foreground dark:text-white">
                {lang === "bm" ? "Hantar Butiran Tempahan Pilot" : "Send Your Pilot Details Directly"}
              </h3>
              <p className="text-xs text-muted-foreground dark:text-slate-400 mb-6">
                {lang === "bm"
                  ? "Isi borang ringkas di bawah. Pegawai teknikal kami akan menghubungi anda dalam tempoh 24 jam."
                  : "Fill in the simple form below. Our technical specialist will reach out within 24 hours."}
              </p>

              {!pilotSubmitted ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    void handlePilotSignup()
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label htmlFor="pilot-name" className="text-xs font-semibold">{t("pilotFormName")}</Label>
                    <Input
                      id="pilot-name"
                      placeholder="cth: Ahmad Razali"
                      value={pilotName}
                      onChange={(event) => setPilotName(event.target.value)}
                      className="mt-1 text-sm bg-card dark:bg-[#0a0f1d] border-border dark:border-slate-800"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pilot-email" className="text-xs font-semibold">{t("pilotFormEmail")}</Label>
                    <Input
                      id="pilot-email"
                      type="email"
                      required
                      placeholder="ahmad@syarikat.com"
                      value={pilotEmail}
                      onChange={(event) => setPilotEmail(event.target.value)}
                      className="mt-1 text-sm bg-card dark:bg-[#0a0f1d] border-border dark:border-slate-800"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pilot-company" className="text-xs font-semibold">{t("pilotFormCompany")}</Label>
                    <Input
                      id="pilot-company"
                      placeholder="cth: Syarikat Maju Jaya Sdn Bhd"
                      value={pilotCompany}
                      onChange={(event) => setPilotCompany(event.target.value)}
                      className="mt-1 text-sm bg-card dark:bg-[#0a0f1d] border-border dark:border-slate-800"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pilot-volume" className="text-xs font-semibold">{t("pilotFormVolume")}</Label>
                    <Input
                      id="pilot-volume"
                      type="number"
                      required
                      placeholder="cth: 50"
                      value={pilotVolume}
                      onChange={(event) => setPilotVolume(event.target.value)}
                      className="mt-1 text-sm bg-card dark:bg-[#0a0f1d] border-border dark:border-slate-800"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pilot-time" className="text-xs font-semibold">{t("pilotFormTime")}</Label>
                    <Input
                      id="pilot-time"
                      placeholder="cth: Isnin 10:00 pagi"
                      value={pilotTime}
                      onChange={(event) => setPilotTime(event.target.value)}
                      className="mt-1 text-sm bg-card dark:bg-[#0a0f1d] border-border dark:border-slate-800"
                    />
                  </div>

                  {pilotError && (
                    <p role="alert" className="text-xs font-semibold text-destructive mt-2">
                      {pilotError}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={!pilotEmail || !pilotVolume || pilotSubmitting}
                    className="w-full bg-[#1565C0] hover:bg-[#0a2540] dark:bg-[#00d4ff] dark:hover:bg-[#00b8e6] text-white dark:text-[#0a0f1d] mt-4 font-bold"
                  >
                    {pilotSubmitting ? t("pilotFormSubmitting") : t("pilotFormCta")}
                  </Button>
                </form>
              ) : (
                <div className="p-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <Check className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{t("pilotFormSuccess")}</p>
                </div>
              )}
            </div>
          </div>

          {/* Pilot FAQs */}
          <div className="mt-14 max-w-3xl mx-auto">
            <h3 className="text-xl font-heading font-bold text-navy dark:text-white text-center mb-6">
              {t("pilotFaqTitle")}
            </h3>
            <div className="space-y-3">
              {pilotFaqs.map((faq) => (
                <details
                  key={faq.qKey}
                  className="group rounded-xl border border-border/70 dark:border-slate-800 bg-card dark:bg-[#111927] px-5 py-4 open:shadow-xs transition-all"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-navy dark:text-white">
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
          </div>
        </div>
      </section>

      {/* 8. FINAL CTA SECTION: Broad, reassuring, direct action */}
      <section className="py-16 sm:py-20 bg-navy dark:bg-[#070b14] text-white text-center relative overflow-hidden border-t border-border/40 dark:border-slate-800">
        <div className="landing-container relative z-10 max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-wider text-[#00d4ff] block mb-3">
            Satu Langkah Ke Hadapan
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-4">
            {copy.finalCtaTitle}
          </h2>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed mb-8">
            {copy.finalCtaDesc}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/601154034051?text=Salam%20Duta%20Integra,%20saya%20berminat%20nak%20tahu%20lebih%20lanjut%20tentang%20solusi%20bisnes%20anda."
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold bg-[#25D366] hover:bg-[#20ba59] text-white shadow-lg transition-transform hover:-translate-y-0.5"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{copy.whatsappCta}</span>
            </a>
            <Button
              asChild
              variant="outline"
              size="xl"
              className="w-full sm:w-auto border-white/30 text-white hover:bg-white/10 px-8 py-3.5 text-sm font-semibold"
            >
              <a href="/pks.html">
                {copy.primaryCta}
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
