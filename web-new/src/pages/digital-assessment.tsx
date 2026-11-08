import { useState } from "react"
import type { FormEvent } from "react"
import { ArrowRight, CheckCircle2, ClipboardCheck, LoaderCircle, ShieldCheck, Sparkles, TrendingUp, Workflow, MessageCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

type Result = { score: number; maturityLabel: string; recommendations: string[]; message: string }

const priorityOptions = [
  ["sales", "Jualan & Penjanaan Prospek (WhatsApp / Web)"],
  ["automation", "Automasi Operasi & Invois (MyInvois LHDN)"],
  ["security", "Keselamatan Data & Sandaran Awan (Backup)"],
  ["ai", "Penggunaan AI & Bot Chat Pelanggan"],
  ["operations", "Kawalan Aliran Kerja & Pelaporan Untung Rugi"],
  ["customer-experience", "Pengalaman & Kepantasan Layan Pelanggan"],
  ["data", "Analitik Prestasi & Pengurusan Stok"],
]

export function DigitalAssessmentPage() {
  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    industry: "",
    teamSize: "1–10",
    digitalMaturity: "2",
    budgetRange: "RM1,000–RM5,000",
    timeline: "Within 1 month",
    notes: "",
  })
  const [priorities, setPriorities] = useState<string[]>(["sales", "automation"])
  const [result, setResult] = useState<Result | null>(null)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  const update = (key: keyof typeof form, value: string) => setForm(old => ({ ...old, [key]: value }))

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError("")
    setResult(null)

    try {
      const response = await fetch("/api/workspace/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          digitalMaturity: Number(form.digitalMaturity),
          priorities,
        }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Gagal menghantar penilaian")
      setResult({
        score: data.score ?? 55,
        maturityLabel: data.label || data.maturityLabel || "Digital Growth",
        recommendations: data.recommendations || [
          "Pasang automasi jualan WhatsApp untuk mengelakkan prospek tercicir.",
          "Kemaskini laman web dengan reka bentuk mesra telefon pintar.",
          "Sediakan integrasi MyInvois LHDN untuk pematuhan automatik.",
        ],
        message: data.message || "Berdasarkan maklumat anda, perniagaan anda mempunyai potensi pertumbuhan yang ketara melalui automasi rutin asas.",
      })
    } catch {
      // Offline fallback: Calculate smart score locally if server is not reachable
      const maturityScore = Math.max(1, Number(form.digitalMaturity) || 2) * 16
      const breadth = priorities.length * 4
      const calculatedScore = Math.min(100, maturityScore + breadth)
      const label = calculatedScore < 45 ? "Digital Foundations" : calculatedScore < 75 ? "Digital Growth" : "Digital Ready"
      
      setResult({
        score: calculatedScore,
        maturityLabel: label,
        recommendations: [
          "Pasang automasi jualan WhatsApp untuk mengelakkan prospek tercicir semasa sibuk.",
          "Bina atau pulihkan laman web jualan yang laju di telefon bimbit.",
          "Sediakan sandaran awan dan integrasi MyInvois LHDN bagi rekod perniagaan yang selamat.",
        ],
        message: "Penilaian anda telah diproses secara tempatan. Sistem kami mengesyorkan penambahbaikan pada corong jualan dan keselamatan rekod.",
      })
    } finally {
      setBusy(false)
    }
  }

  // Determine recommended tier based on score & maturity
  const getRecommendation = (score: number) => {
    if (score < 45) {
      return {
        tier: "CORE",
        price: "RM 199 / bulan",
        title: "Pakej Disyorkan: CORE (Asas Digital & Komputer)",
        desc: "Sesuai untuk memantapkan kehadiran laman web asas 1-halaman, memastikan komputer kedai stabil dan data selamat di awan.",
        highlight: "Binaan Web + Bantuan Komputer & WiFi + Cloud Backup",
      }
    }
    if (score < 78) {
      return {
        tier: "ADVANCE",
        price: "RM 699 / bulan (atau Pilot RM 999)",
        title: "Pakej Disyorkan: ADVANCE (Jualan WhatsApp & e-Invois)",
        desc: "Pilihan terbaik untuk melipatgandakan jualan dengan laman web jualan interaktif, DutaConnect WhatsApp Bot 24/7, dan persediaan e-Invois LHDN.",
        highlight: "Web Jualan Lengkap + Bot WhatsApp 24/7 + MyInvois LHDN",
      }
    }
    return {
      tier: "PRO",
      price: "Bermula RM 1,499 / bulan",
      title: "Pakej Disyorkan: PRO (Operasi Bersepadu & Aliran Kerja)",
      desc: "Untuk operasi syarikat berbilang cawangan, stor, dan pasukan yang memerlukan papan pemuka analitik DutaSight serta pengurus akaun dedikasi.",
      highlight: "Papan Pemuka DutaSight + DutaOps Stor + Hotline VIP 24/7",
    }
  }

  const rec = result ? getRecommendation(result.score) : null
  const whatsappPreFilled = result && rec
    ? `Salam Duta Integra, saya baru selesai Ujian Digital Assessment di laman web anda.%0A%0A*Nama:* ${encodeURIComponent(form.name)}%0A*Syarikat:* ${encodeURIComponent(form.company)}%0A*Skor Kematangan:* ${result.score}/100 (${result.maturityLabel})%0A*Pakej Disyorkan:* ${rec.tier} (${rec.price})%0A%0ASaya ingin berbincang lebih lanjut untuk laksanakan penyelesaian ini.`
    : ""

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a2540] via-[#0d2238] to-background text-foreground transition-colors duration-200">
      <section className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          {/* Left Column: Context & Trust */}
          <div className="pt-3 text-white">
            <span className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-electric">
              <Sparkles size={14} /> Diagnostik Digital 60-Saat
            </span>
            <h1 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading leading-tight text-white">
              Ketahui Peluang Pertumbuhan & Automasi Bisnes Anda.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
              Jawab beberapa soalan ringkas mengenai operasi harian perniagaan anda. Dapatkan skor kesediaan digital, cadangan tier yang tepat, dan anggaran kos segera tanpa sebarang obligasi.
            </p>

            <div className="mt-8 space-y-4">
              {[
                [ClipboardCheck, "Penilaian Pantas & Berstruktur", "Fahami jurang terbesar antara laman web, WhatsApp, dan sistem operasi semasa anda."],
                [TrendingUp, "Pengesyoran Pakej Tepat (Core / Advance / Pro)", "Ketahui pakej yang paling menjimatkan kos mengikut bajet sebenar anda."],
                [ShieldCheck, "Sedia e-Invois LHDN & Keselamatan Data", "Pastikan bisnes anda mematuhi piawaian MyInvois dan rekod kewangan dilindungi awan."],
                [Workflow, "Penjana WhatsApp Sebut Harga 1-Klik", "Terus berhubung dengan pegawai teknikal Cyberjaya bersama laporan hasil anda."],
              ].map(([Icon, title, desc], i) => {
                const I = Icon as typeof ClipboardCheck
                return (
                  <div key={i} className="flex gap-3">
                    <span className="mt-0.5 rounded-xl bg-white/10 p-2 text-electric shrink-0">
                      <I size={18} />
                    </span>
                    <div>
                      <p className="font-bold text-white text-sm">{String(title)}</p>
                      <p className="mt-0.5 text-xs text-slate-300 leading-relaxed">{String(desc)}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="mt-8 text-xs text-slate-400">
              * Penilaian ini adalah analisis kendiri percuma daripada Duta Integra Solutions Sdn Bhd untuk membantu usahawan PKS tempatan membuat keputusan teknologi yang tepat.
            </p>
          </div>

          {/* Right Column: Assessment Form or Result Card */}
          <Card className="border border-border/70 dark:border-slate-800 p-6 sm:p-8 shadow-2xl bg-card dark:bg-[#111927]">
            {result && rec ? (
              <div className="py-2 space-y-6 animate-in fade-in-50 duration-300">
                <div className="flex items-center justify-between pb-4 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 size={24} />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Laporan Penilaian Selesai</p>
                      <h2 className="text-xl font-extrabold text-navy dark:text-white">{result.maturityLabel}</h2>
                    </div>
                  </div>
                  <span className="text-3xl font-extrabold text-[#1565C0] dark:text-[#00d4ff]">
                    {result.score}<span className="text-sm font-normal text-muted-foreground">/100</span>
                  </span>
                </div>

                {/* Score Progress Bar */}
                <div>
                  <div className="flex justify-between text-xs font-medium text-muted-foreground mb-1.5">
                    <span>Indikator Kesediaan Digital</span>
                    <span>{result.score}% Sedia</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted dark:bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#1565C0] to-emerald-500 transition-all duration-500"
                      style={{ width: `${result.score}%` }}
                    />
                  </div>
                </div>

                {/* Smart Recommended Tier Card */}
                <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border-2 border-[#1565C0] dark:border-[#00d4ff] shadow-sm">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F04E00] text-white uppercase tracking-wider mb-2">
                    Cadangan Sistem Paling Sesuai
                  </span>
                  <div className="flex items-baseline justify-between gap-2 mb-1">
                    <h3 className="text-lg font-extrabold text-navy dark:text-white">{rec.title}</h3>
                    <span className="text-sm font-bold text-[#1565C0] dark:text-[#00d4ff] shrink-0">{rec.price}</span>
                  </div>
                  <p className="text-xs text-muted-foreground dark:text-slate-300 mb-3">{rec.desc}</p>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 size={14} className="shrink-0" />
                    <span>{rec.highlight}</span>
                  </div>
                </div>

                {/* Action Recommendations */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Langkah Keutamaan Seterusnya</h4>
                  <ul className="space-y-2.5">
                    {result.recommendations.map((r, i) => (
                      <li key={i} className="flex gap-2 text-xs sm:text-sm leading-relaxed text-foreground/90 dark:text-slate-200">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Direct Conversion Buttons */}
                <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row gap-3">
                  <a
                    href={`https://wa.me/601154034051?text=${whatsappPreFilled}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-[#25D366] hover:bg-[#20ba59] text-white shadow-md transition-all hover:scale-[1.02]"
                  >
                    <MessageCircle size={18} />
                    <span>Terus WhatsApp Skor Ini ➔</span>
                  </a>
                  <Button
                    variant="outline"
                    onClick={() => setResult(null)}
                    className="w-full sm:w-auto text-xs font-semibold"
                  >
                    <RefreshCw size={14} className="mr-1.5" />
                    Ulang Penilaian
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#1565C0] dark:text-[#00d4ff]">
                    Borang Penilaian Percuma
                  </p>
                  <h2 className="mt-1 text-2xl font-heading font-extrabold text-navy dark:text-white">
                    Maklumat Asas Bisnes Anda
                  </h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Ruangan bertanda bintang (*) adalah wajib diisi.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nama Penuh *">
                    <Input
                      required
                      maxLength={120}
                      value={form.name}
                      onChange={e => update("name", e.target.value)}
                      placeholder="cth: Razali Ismail"
                      className="bg-background dark:bg-[#0a0f1d]"
                    />
                  </Field>
                  <Field label="Nama Syarikat / Kedai *">
                    <Input
                      required
                      maxLength={160}
                      value={form.company}
                      onChange={e => update("company", e.target.value)}
                      placeholder="cth: Razali Motor Sdn Bhd"
                      className="bg-background dark:bg-[#0a0f1d]"
                    />
                  </Field>
                  <Field label="E-mel Rasmi *">
                    <Input
                      required
                      type="email"
                      maxLength={200}
                      value={form.email}
                      onChange={e => update("email", e.target.value)}
                      placeholder="razali@syarikat.com"
                      className="bg-background dark:bg-[#0a0f1d]"
                    />
                  </Field>
                  <Field label="Nombor WhatsApp *">
                    <Input
                      required
                      maxLength={40}
                      value={form.phone}
                      onChange={e => update("phone", e.target.value)}
                      placeholder="012 345 6789"
                      className="bg-background dark:bg-[#0a0f1d]"
                    />
                  </Field>
                  <Field label="Sektor / Industri *">
                    <Input
                      required
                      maxLength={100}
                      value={form.industry}
                      onChange={e => update("industry", e.target.value)}
                      placeholder="cth: Bengkel, Klinik, Runcit, F&B"
                      className="bg-background dark:bg-[#0a0f1d]"
                    />
                  </Field>
                  <Field label="Saiz Pasukan *">
                    <Select value={form.teamSize} onChange={e => update("teamSize", e.target.value)} className="bg-background dark:bg-[#0a0f1d]">
                      <option>1–10 Pekerja</option>
                      <option>11–30 Pekerja</option>
                      <option>31–100 Pekerja</option>
                      <option>100+ Pekerja</option>
                    </Select>
                  </Field>
                  <Field label="Tahap Sistem Semasa *">
                    <Select value={form.digitalMaturity} onChange={e => update("digitalMaturity", e.target.value)} className="bg-background dark:bg-[#0a0f1d]">
                      <option value="1">1 — Kebanyakan manual / kertas</option>
                      <option value="2">2 — Ada WhatsApp & PC asas, tapi tidak bersambung</option>
                      <option value="3">3 — Ada laman web asas / sistem POS sedia ada</option>
                      <option value="4">4 — Sebahagian aliran kerja berautomasi</option>
                      <option value="5">5 — Sistem menyeluruh & perlukan analitik maju</option>
                    </Select>
                  </Field>
                  <Field label="Anggaran Bajet Bulanan *">
                    <Select value={form.budgetRange} onChange={e => update("budgetRange", e.target.value)} className="bg-background dark:bg-[#0a0f1d]">
                      <option>Bawah RM500 / bln (Pakej Core)</option>
                      <option>RM500 – RM1,000 / bln (Pakej Advance)</option>
                      <option>RM1,000 – RM3,000 / bln (Pakej Pro)</option>
                      <option>Perlukan nasihat teknikal dahulu</option>
                    </Select>
                  </Field>
                </div>

                <fieldset>
                  <legend className="mb-2 text-xs font-bold uppercase tracking-wider text-foreground">
                    Keutamaan Utama Bisnes Anda * (Pilih yang berkaitan)
                  </legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {priorityOptions.map(([value, label]) => (
                      <label
                        key={value}
                        className="flex cursor-pointer items-center gap-2 rounded-xl border border-border dark:border-slate-800 p-2.5 text-xs hover:bg-muted/60 transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={priorities.includes(value)}
                          onChange={e => setPriorities(old => e.target.checked ? [...old, value] : old.filter(x => x !== value))}
                          className="accent-[#1565C0] h-4 w-4 rounded"
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                <Field label="Cabaran Tambahan (Pilihan)">
                  <Textarea
                    maxLength={3000}
                    rows={2}
                    value={form.notes}
                    onChange={e => update("notes", e.target.value)}
                    placeholder="cth: WhatsApp lambat dibalas bila ramai orang, nak bina laman web jualan baharu..."
                    className="bg-background dark:bg-[#0a0f1d] text-xs"
                  />
                </Field>

                {error && (
                  <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-xs font-semibold text-destructive">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  disabled={busy || priorities.length === 0}
                  className="w-full bg-[#1565C0] hover:bg-[#0a2540] dark:bg-[#00d4ff] dark:hover:bg-[#00b8e6] text-white dark:text-[#0a0f1d] font-bold shadow-md"
                >
                  {busy ? (
                    <>
                      <LoaderCircle size={16} className="mr-2 animate-spin" />
                      Memproses Penilaian...
                    </>
                  ) : (
                    <>
                      Jana Skor & Cadangan Pakej Segera
                      <ArrowRight size={16} className="ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-[11px] leading-relaxed text-muted-foreground text-center">
                  Butiran anda selamat dan dilindungi mengikut Akta Perlindungan Data Peribadi (PDPA).
                </p>
              </form>
            )}
          </Card>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold text-foreground">{label}</span>
      {children}
    </label>
  )
}
