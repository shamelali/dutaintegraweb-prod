import { useState } from "react"
import {
  ArrowRight,
  CheckCircle2,
  MessageCircle,
  Sparkles,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useLanguage } from "@/hooks/use-language"

type CaseItem = {
  id: string
  clientName: string
  sector: string
  location: string
  teamSize: string
  planUsed: "CORE" | "ADVANCE" | "PRO"
  category: "all" | "pks" | "automation" | "cloud"
  headline: string
  challenge: string
  solution: string[]
  metrics: { value: string; label: string }[]
  outcomes: string[]
  tags: string[]
  accentColor: string
}

const CASE_STUDIES: CaseItem[] = [
  {
    id: "agmx",
    clientName: "AGMX Precision Engineering",
    sector: "Pembuatan & Automotif",
    location: "Bayan Lepas, Pulau Pinang",
    teamSize: "45 Staf",
    planUsed: "PRO",
    category: "cloud",
    headline: "Pengurangan 92% Downtime Mesin & Penjimatan Kos Operasi RM320,000 Setahun",
    challenge: "Pelayan operasi dan sistem inventori sering tergendala tanpa amaran semasa pesanan puncak kilang. Kos downtime mencecah RM15,000 setiap jam dan pasukan IT terpaksa membaiki masalah secara reaktif.",
    solution: [
      "Memindahkan pangkalan data ke persekitaran hibrid awan dengan pemantauan automatik 24/7.",
      "Memasang pemantauan prediktif DutaOps bagi mengesan kegagalan sebelum pelayan terhenti.",
      "Menyediakan sistem sandaran automatik luar premis dengan masa pemulihan (RTO) bawah 15 minit.",
      "Menugaskan pengurus akaun dedikasi untuk sokongan teknikal berterusan.",
    ],
    metrics: [
      { value: "99.97%", label: "Uptime Sistem Operasi" },
      { value: "-92%", label: "Pengurangan Insiden Tergendala" },
      { value: "RM 320k", label: "Penjimatan Kos Tahunan" },
      { value: "< 15 Min", label: "Masa Pemulihan Sandaran" },
    ],
    outcomes: [
      "Tiada lagi gangguan operasi kilang semasa shif malam.",
      "Laporan kesihatan pelayan mingguan dihantar automatik kepada pihak pengurusan.",
      "Penjimatan masa staf teknikal sebanyak 4 jam seminggu daripada kerja pembaikan manual.",
    ],
    tags: ["Infrastruktur Awan", "DutaOps", "Backup Automatik", "Pakej PRO"],
    accentColor: "from-blue-600 to-indigo-700",
  },
  {
    id: "eastelpro",
    clientName: "Eastelpro Retail & Telecom",
    sector: "Runcit & Pemasaran WiFi",
    location: "Cyberjaya, Selangor",
    teamSize: "28 Staf",
    planUsed: "ADVANCE",
    category: "automation",
    headline: "Kutipan 65% Prospek Baharu Melalui Portal WiFi & Pengurusan WhatsApp Automatik",
    challenge: "Pelanggan yang berkunjung ke cawangan kedai tidak direkodkan data mereka. Pertanyaan produk di WhatsApp sering lambat dibalas kerana staf sibuk melayan pelanggan di kaunter.",
    solution: [
      "Membina portal log masuk WiFi kedai berjenama yang merekodkan nombor telefon pelawat secara patuh PDPA.",
      "Memasang DutaConnect bot WhatsApp jualan 24/7 untuk menjawab soalan katalog & promosi serta-merta.",
      "Menghubungkan petunjuk jualan terus ke sistem pesanan dan invois digital.",
    ],
    metrics: [
      { value: "65%", label: "Kadar Pelawat Sertai Pangkalan Data" },
      { value: "5 Saat", label: "Masa Balas WhatsApp Pelanggan" },
      { value: "+38%", label: "Peningkatan Jualan Berulang" },
      { value: "100%", label: "Pematuhan Garis Panduan PDPA" },
    ],
    outcomes: [
      "Lebih 1,200 nombor pelanggan baharu dikumpul setiap bulan secara automatik.",
      "Pelanggan menerima mesej tawaran istimewa WhatsApp secara berjadual.",
      "Masa staf dijimatkan kerana soalan berulang (waktu operasi, stok) dijawab bot.",
    ],
    tags: ["WhatsApp Jualan", "Portal WiFi", "DutaConnect", "Pakej ADVANCE"],
    accentColor: "from-emerald-600 to-teal-700",
  },
  {
    id: "lapango",
    clientName: "Lapango Auto & Tyre Centre",
    sector: "Pusat Servis & Bengkel Kenderaan",
    location: "Shah Alam, Selangor",
    teamSize: "14 Mekanik & Staf",
    planUsed: "CORE",
    category: "pks",
    headline: "Laman Web Profil Baharu Jana 45+ Tempahan Servis Setiap Bulan Tanpa Staf IT",
    challenge: "Perniagaan bergantung 100% kepada pelanggan walk-in. Laman web lama tidak boleh dibuka di telefon bimbit dan maklumat Google Maps tidak dikemaskini, menyebabkan ramai pelanggan memilih bengkel pesaing.",
    solution: [
      "Membina laman web profil 1-halaman responsif telefon pintar dengan butang terus tempah slot WhatsApp.",
      "Mengoptimumkan profil perniagaan tempatan Google Maps & carian SEO tempatan.",
      "Menyediakan bantuan sokongan komputer kedai dan sambungan WiFi mekanik yang stabil.",
      "Memasang sandaran data awan automatik untuk rekod invois pelanggan.",
    ],
    metrics: [
      { value: "45+", label: "Tempahan Servis Bulanan Baharu" },
      { value: "#1", label: "Kedudukan Carian Servis Kereta Tempatan" },
      { value: "100%", label: "Data Invois Selamat Disandarkan" },
      { value: "RM 199", label: "Kos Bulanan Tetap Tanpa Caj Tambahan" },
    ],
    outcomes: [
      "Pelanggan sekitar Shah Alam mudah mencari bengkel di Google Maps dan terus WhatsApp.",
      "Komputer kaunter bayaran tidak lagi 'hang' atau terputus sambungan internet.",
      "Pemilik bengkel tenang kerana ada bantuan teknikal harian sedia dihubungi.",
    ],
    tags: ["Laman Web Profil", "Bantuan Komputer", "Google SEO", "Pakej CORE"],
    accentColor: "from-amber-600 to-orange-700",
  },
  {
    id: "leish",
    clientName: "Leish Wellness & Beauty Lounge",
    sector: "Kecantikan & Hospitaliti",
    location: "Bangsar, Kuala Lumpur",
    teamSize: "18 Ahli Terapi",
    planUsed: "ADVANCE",
    category: "automation",
    headline: "Tempahan Slot Janji Temu Selesai Dalam 90 Saat & Jimat 3 Jam Kerja Staf Setiap Hari",
    challenge: "Pengurusan janji temu pelanggan dibuat secara manual menggunakan buku log. Pelanggan kerap menukar waktu pada saat akhir dan staf terlepas pandang mesej tempahan di WhatsApp.",
    solution: [
      "Membina laman web jualan multi-halaman dengan sistem kalendar tempahan interaktif.",
      "Menghubungkan bot WhatsApp DutaConnect untuk pengesahan slot automatik dan peringatan temu janji.",
      "Menyelaraskan resit pembayaran dengan format sedia MyInvois LHDN.",
    ],
    metrics: [
      { value: "< 90 Saat", label: "Masa Pelanggan Kunci Tempahan" },
      { value: "3 Jam", label: "Jimat Masa Staf Setiap Hari" },
      { value: "-80%", label: "Pengurangan Pelanggan Tidak Hadir (No-show)" },
      { value: "24/7", label: "Sistem Terima Tempahan Malam Hari" },
    ],
    outcomes: [
      "Pelanggan boleh menempah slot rawatan pada bila-bila masa walaupun kedai telah tutup.",
      "Peringatan automatik WhatsApp mengurangkan pembaziran masa bilik rawatan.",
      "Invois dijana kemas dan siap untuk rekod percukaian syarikat.",
    ],
    tags: ["Web Jualan Interaktif", "DutaConnect", "MyInvois LHDN", "Pakej ADVANCE"],
    accentColor: "from-purple-600 to-pink-700",
  },
  {
    id: "mediklinik",
    clientName: "Rangkaian Poliklinik & Farmasi Harmoni",
    sector: "Klinik & Penjagaan Kesihatan",
    location: "Kajang & Bangi, Selangor",
    teamSize: "32 Doktor & Pembantu",
    planUsed: "PRO",
    category: "cloud",
    headline: "Integrasi Rekod Pesakit Bersepadu & e-Invois LHDN Tanpa Kehilangan Data",
    challenge: "Data pesakit disimpan pada komputer berasingan di 3 cawangan klinik. Risiko kehilangan rekod akibat kerosakan cakera keras serta keperluan mematuhi syarat e-Invois LHDN yang mendesak.",
    solution: [
      "Menghubungkan ketiga-tiga cawangan melalui rangkaian awan selamat dengan sandaran data berganda.",
      "Menyelaraskan sistem Point-of-Sale (POS) dan pendispensan ubat dengan API MyInvois LHDN.",
      "Menyediakan bantuan sokongan komputer klinikal dengan masa respons keutamaan VIP.",
    ],
    metrics: [
      { value: "3 Cawangan", label: "Rangkaian Klinik Bersambung" },
      { value: "100%", label: "Sedia MyInvois LHDN" },
      { value: "0", label: "Insiden Kehilangan Rekod Pesakit" },
      { value: "24/7", label: "Pemantauan Sandaran Awan" },
    ],
    outcomes: [
      "Doktor boleh merujuk sejarah rawatan pesakit merentas semua cawangan klinik.",
      "Resit perubatan terus dijana mengikut format cukai rasmi tanpa ralat manual.",
      "Pihak pengurusan mempunyai papan pemuka kewangan masa nyata.",
    ],
    tags: ["Rangkaian Multi-Cawangan", "MyInvois LHDN", "Sokongan VIP", "Pakej PRO"],
    accentColor: "from-cyan-600 to-blue-800",
  },
]

export function CaseStudiesPage() {
  const { lang } = useLanguage()
  const [filter, setFilter] = useState<"all" | "pks" | "automation" | "cloud">("all")
  const [activeModal, setActiveModal] = useState<CaseItem | null>(null)

  const filtered = filter === "all" ? CASE_STUDIES : CASE_STUDIES.filter((c) => c.category === filter)

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      {/* Hero Section */}
      <section className="py-20 md:py-28 bg-gradient-to-br from-[#0a2540] via-[#0d3b66] to-[#0a2540] text-center text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <Badge variant="electric" className="mb-6 uppercase tracking-wider font-semibold">
            {lang === "bm" ? "Kisah Kejayaan Sebenar" : "Proven Client Results"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-white mb-6 leading-tight">
            {lang === "bm"
              ? "Lihat Bagaimana Bisnes Tempatan Berkembang Bersama Kami."
              : "See How Malaysian Businesses Scale With Duta Integra."}
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            {lang === "bm"
              ? "Daripada bengkel automotif dan klinik hingga ke kilang pembuatan — kami membantu perniagaan menyelesaikan masalah IT, mengautomasikan jualan WhatsApp, dan membina laman web yang menghasilkan jualan sebenar."
              : "From auto workshops and clinics to manufacturing plants — we help businesses eliminate IT headaches, automate WhatsApp sales, and deploy high-converting websites."}
          </p>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {[
              { id: "all", label: lang === "bm" ? "Semua Kisah" : "All Stories" },
              { id: "pks", label: "🇲🇾 PKS & Bengkel (Core)" },
              { id: "automation", label: "💬 WhatsApp & e-Invois (Advance)" },
              { id: "cloud", label: "🏢 Cloud & Multi-Cawangan (Pro)" },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id as typeof filter)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  filter === f.id
                    ? "bg-white text-[#0a2540] shadow-md scale-[1.02]"
                    : "bg-white/10 text-white/80 hover:bg-white/20 hover:text-white"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies Grid */}
      <section className="py-16 sm:py-24 px-6 max-w-7xl mx-auto">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <Card
              key={item.id}
              className="overflow-hidden h-full flex flex-col justify-between border border-border dark:border-slate-800 bg-card dark:bg-[#111927] hover:shadow-xl transition-all hover:-translate-y-1 rounded-2xl group"
            >
              {/* Visual Card Banner (High-Craft Graphic with Gradient) */}
              <div className={`p-6 bg-gradient-to-r ${item.accentColor} text-white relative overflow-hidden`}>
                <div className="relative z-10 flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white/20 backdrop-blur-md uppercase tracking-wider">
                    {item.sector}
                  </span>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white text-[#0a2540] shadow-sm">
                    Pakej {item.planUsed}
                  </span>
                </div>
                <h3 className="relative z-10 text-lg font-extrabold text-white leading-snug">
                  {item.clientName}
                </h3>
                <p className="relative z-10 text-xs text-white/80 mt-1">
                  📍 {item.location} · {item.teamSize}
                </p>

                {/* Subtle decorative circles */}
                <div className="absolute -right-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
              </div>

              {/* Body Content */}
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm sm:text-base font-bold text-navy dark:text-white mb-3 group-hover:text-[#1565C0] dark:group-hover:text-[#00d4ff] transition-colors leading-snug">
                    "{item.headline}"
                  </h4>
                  <p className="text-xs text-muted-foreground dark:text-slate-400 mb-6 leading-relaxed line-clamp-3">
                    {item.challenge}
                  </p>

                  {/* Primary Key Metric Badge */}
                  <div className="p-3.5 rounded-xl bg-muted/40 dark:bg-slate-900/60 border border-border/60 dark:border-slate-800 mb-6 flex items-center justify-between">
                    <div>
                      <span className="text-xl sm:text-2xl font-extrabold text-navy dark:text-white block">
                        {item.metrics[0].value}
                      </span>
                      <span className="text-[11px] text-muted-foreground dark:text-slate-400">
                        {item.metrics[0].label}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                      ⚡ Hasil Terbukti
                    </span>
                  </div>
                </div>

                <div>
                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-6">
                    {item.tags.map((t) => (
                      <span key={t} className="px-2 py-0.5 text-[10px] font-semibold bg-muted dark:bg-slate-800 text-muted-foreground dark:text-slate-300 rounded-md">
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* Modal Trigger Button */}
                  <Button
                    onClick={() => setActiveModal(item)}
                    className="w-full bg-[#1565C0] hover:bg-[#0a2540] dark:bg-[#00d4ff] dark:hover:bg-[#00b8e6] text-white dark:text-[#0a0f1d] font-bold text-xs sm:text-sm shadow-sm"
                  >
                    <span>{lang === "bm" ? "Baca Kisah Penuh & Solusi" : "Read Full Story & Solution"}</span>
                    <ArrowRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* DETAIL MODAL / DRAWER */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card dark:bg-[#111927] border border-border dark:border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative animate-in zoom-in-95 duration-200">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-5 right-5 p-2 rounded-full bg-muted dark:bg-slate-800 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Tutup modal"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div className="pr-8 mb-6">
              <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-[#1565C0]/10 text-[#1565C0] dark:text-[#00d4ff] uppercase tracking-wider mb-2">
                Pakej {activeModal.planUsed} · {activeModal.sector}
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-navy dark:text-white">
                {activeModal.clientName}
              </h2>
              <p className="text-xs text-muted-foreground dark:text-slate-400 mt-1">
                📍 {activeModal.location} · {activeModal.teamSize}
              </p>
            </div>

            {/* Metrics 4-Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-muted/40 dark:bg-slate-900/60 border border-border/60 dark:border-slate-800 mb-6 text-center">
              {activeModal.metrics.map((m, i) => (
                <div key={i} className="p-2">
                  <span className="text-lg sm:text-xl font-extrabold text-navy dark:text-white block">
                    {m.value}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight block mt-0.5">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Challenge & Solution */}
            <div className="space-y-5 mb-8">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#F04E00] mb-2 flex items-center gap-1.5">
                  <span>Cabaran Asal Sebelum Kerjasama</span>
                </h4>
                <p className="text-xs sm:text-sm text-foreground/90 dark:text-slate-300 leading-relaxed bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-xl border border-amber-200/50 dark:border-amber-900/30">
                  {activeModal.challenge}
                </p>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#1565C0] dark:text-[#00d4ff] mb-2">
                  Penyelesaian Yang Dipasang Oleh Duta Integra:
                </h4>
                <ul className="space-y-2">
                  {activeModal.solution.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90 dark:text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-2">
                  Hasil Sebenar Yang Dicapai:
                </h4>
                <ul className="space-y-2">
                  {activeModal.outcomes.map((o, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-foreground/90 dark:text-slate-200">
                      <Sparkles className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <span>{o}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Direct Conversion Action */}
            <div className="pt-5 border-t border-border/60 flex flex-col sm:flex-row gap-3 items-center">
              <a
                href={`https://wa.me/601154034051?text=${encodeURIComponent(`Salam Duta Integra, saya tertarik dengan kajian kes ${activeModal.clientName} (${activeModal.sector}). Saya ingin tahu bagaimana solusi Pakej ${activeModal.planUsed} boleh diaplikasikan untuk bisnes saya.`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-bold bg-[#25D366] hover:bg-[#20ba59] text-white shadow-md text-xs sm:text-sm transition-all"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Bincang Solusi Serupa di WhatsApp ➔</span>
              </a>
              <Button
                variant="outline"
                onClick={() => setActiveModal(null)}
                className="w-full sm:w-auto text-xs"
              >
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom CTA */}
      <section className="py-20 px-6 bg-navy text-white text-center">
        <div className="max-w-2xl mx-auto">
          <Badge variant="electric" className="mb-4">
            Masa Untuk Mengubah Bisnes Anda
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-heading font-bold mb-4">
            Ingin Hasil Seperti Mereka Untuk Perniagaan Anda?
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mb-8">
            Dapatkan nasihat percuma selama 15 minit bersama jurutera teknikal Cyberjaya kami untuk mengenal pasti pembaziran masa dan peluang jualan anda.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button asChild variant="electric" size="xl">
              <a href="/pricing">Lihat Pakej Harga PKS</a>
            </Button>
            <Button asChild variant="outline" size="xl" className="border-white/30 text-white hover:bg-white/10">
              <a href="/contact">Hubungi Kami</a>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
