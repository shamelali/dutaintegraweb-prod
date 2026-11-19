import { useEffect, useRef, useState } from "react"
import type { FormEvent, ReactNode } from "react"
import { ArrowRight, CheckCircle2, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/hooks/use-language"
import { postWithCsrf } from "@/lib/csrf"

type Recommendations = { maturityLabel: string; recommendations: string[] }
type Result = { score: number; en: Recommendations; bm: Recommendations }

const priorities = [
  { value: "sales", en: "Sales and lead generation", bm: "Jualan dan penjanaan prospek" },
  { value: "automation", en: "Workflow automation", bm: "Automasi aliran kerja" },
  { value: "security", en: "Cybersecurity and PDPA", bm: "Keselamatan siber dan PDPA" },
  { value: "ai", en: "AI adoption", bm: "Penggunaan AI" },
  { value: "operations", en: "Business operations", bm: "Operasi perniagaan" },
  { value: "customer-experience", en: "Customer experience", bm: "Pengalaman pelanggan" },
  { value: "data", en: "Data and reporting", bm: "Data dan pelaporan" },
] as const

const copy = {
  en: {
    title: "Find your next digital growth opportunity",
    description: "Get a readiness score and practical next steps for your business. You can request a follow-up after seeing your results.",
    assessment: "Free digital assessment",
    maturity: "How does your business use digital tools today?",
    levels: ["Mostly manual", "Basic tools, disconnected", "Some integrated workflows", "Data-led and automated", "Advanced and continuously improved"],
    priorities: "What would you like to improve? Select at least one.",
    generate: "See my score",
    generating: "Calculating…",
    score: "Digital readiness score",
    recommendations: "Recommended starting points",
    edit: "Edit my answers",
    suggested: "Suggested package",
    plans: "Compare packages",
    whatsapp: "Discuss my score on WhatsApp",
    whatsappMessage: "Hi Duta Integra, I completed the digital assessment and would like to discuss my results.",
    packages: [
      { name: "Core", price: "RM199/month", scope: "One-page website, computer support and cloud backups." },
      { name: "Advance", price: "RM699/month", scope: "Multi-page website, WhatsApp automation and e-Invoicing support." },
      { name: "Pro", price: "From RM1,499/month", scope: "Reporting, integrated workflows and dedicated support." },
    ],
    followUp: "Request a follow-up",
    followUpDescription: "Share your contact details if you’d like us to discuss your results and recommend a next step.",
    send: "Send follow-up request",
    sending: "Sending…",
    name: "Full name",
    email: "Work email",
    company: "Business name",
    phone: "Phone or WhatsApp (optional)",
    notes: "What would you like to discuss? (optional)",
    previewError: "We couldn’t calculate your score. Please try again.",
    sendError: "We couldn’t send your request. Please try again.",
    sent: "Your follow-up request was sent.",
  },
  bm: {
    title: "Kenal pasti peluang digital untuk perniagaan anda",
    description: "Dapatkan skor kesiapsiagaan dan cadangan yang praktikal. Anda boleh meminta kami menghubungi anda selepas melihat keputusan.",
    assessment: "Penilaian digital percuma",
    maturity: "Bagaimanakah perniagaan anda menggunakan alat digital sekarang?",
    levels: ["Kebanyakannya manual", "Alat asas yang berasingan", "Beberapa aliran kerja bersepadu", "Berpandukan data dan diautomasikan", "Maju dan ditambah baik secara berterusan"],
    priorities: "Apakah yang ingin anda perbaiki? Pilih sekurang-kurangnya satu.",
    generate: "Lihat skor saya",
    generating: "Sedang mengira…",
    score: "Skor kesiapsiagaan digital",
    recommendations: "Langkah awal yang disyorkan",
    edit: "Ubah jawapan saya",
    suggested: "Pakej yang disyorkan",
    plans: "Bandingkan pakej",
    whatsapp: "Bincang skor saya melalui WhatsApp",
    whatsappMessage: "Salam Duta Integra, saya telah melengkapkan penilaian digital dan ingin membincangkan keputusan saya.",
    packages: [
      { name: "Core", price: "RM199/bulan", scope: "Laman web satu halaman, sokongan komputer dan sandaran awan." },
      { name: "Advance", price: "RM699/bulan", scope: "Laman web berbilang halaman, automasi WhatsApp dan sokongan e-Invois." },
      { name: "Pro", price: "Daripada RM1,499/bulan", scope: "Pelaporan, aliran kerja bersepadu dan sokongan khusus." },
    ],
    followUp: "Minta kami hubungi anda",
    followUpDescription: "Berikan butiran hubungan jika anda mahu kami membincangkan keputusan dan mencadangkan langkah seterusnya.",
    send: "Hantar permintaan susulan",
    sending: "Sedang menghantar…",
    name: "Nama penuh",
    email: "E-mel kerja",
    company: "Nama perniagaan",
    phone: "Telefon atau WhatsApp (pilihan)",
    notes: "Apakah yang ingin anda bincangkan? (pilihan)",
    previewError: "Skor anda tidak dapat dikira. Sila cuba lagi.",
    sendError: "Permintaan anda tidak dapat dihantar. Sila cuba lagi.",
    sent: "Permintaan susulan anda telah dihantar.",
  },
}

export function DigitalAssessmentPage() {
  const { lang } = useLanguage()
  const labels = copy[lang]
  const [result, setResult] = useState<Result | null>(null)
  const [maturity, setMaturity] = useState("2")
  const [selected, setSelected] = useState<string[]>(["sales", "automation"])
  const [showContact, setShowContact] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(false)
  const [sent, setSent] = useState(false)
  const resultHeading = useRef<HTMLHeadingElement>(null)
  const suggestedPackage = result && labels.packages[result.score < 45 ? 0 : result.score < 78 ? 1 : 2]
  const whatsappUrl = result && suggestedPackage && (
    "https://wa.me/601154034051?text=" +
    encodeURIComponent([labels.whatsappMessage, labels.score + " " + result.score + "/100", labels.suggested + " " + suggestedPackage.name].join("\n"))
  )

  useEffect(() => {
    if (result) resultHeading.current?.focus()
  }, [result])

  async function getScore(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(false)
    try {
      const response = await fetch("/api/workspace/assessments/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digitalMaturity: Number(maturity), priorities: selected }),
      })
      if (!response.ok) throw new Error()
      setResult(await response.json())
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  async function requestFollowUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!result) return

    const details = new FormData(event.currentTarget)
    const message = [
      "Digital readiness score: " + result.score + "/100",
      "Digital maturity: " + maturity + "/5",
      "Business priorities: " + selected.join(", "),
      details.get("notes"),
    ].filter(Boolean).join("\n")

    setBusy(true)
    setError(false)
    try {
      const response = await fetch("/api/send-email", postWithCsrf({
        name: details.get("name"),
        email: details.get("email"),
        company: details.get("company"),
        phone: details.get("phone"),
        service: "Digital assessment follow-up",
        source: "contact-form",
        message,
      }))
      if (!response.ok) throw new Error()
      setSent(true)
    } catch {
      setError(true)
    } finally {
      setBusy(false)
    }
  }

  function editAnswers() {
    setResult(null)
    setShowContact(false)
    setError(false)
    setSent(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-navy via-slate-deep to-background">
      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
        <div className="pt-3 text-white">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl">{labels.title}</h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">{labels.description}</p>
        </div>

        <Card className="border-white/10 p-5 shadow-2xl sm:p-8">
          {result ? (
            <div className="space-y-5">
              <div>
                <h2 ref={resultHeading} tabIndex={-1} className="text-2xl font-bold">{labels.score}</h2>
                <p className="mt-3 text-4xl font-bold text-primary">{result.score}<span className="text-lg text-muted-foreground"> / 100</span></p>
                <p className="mt-2 font-medium">{result[lang].maturityLabel}</p>
              </div>
              <div>
                <h3 className="font-semibold">{labels.recommendations}</h3>
                <ul className="mt-3 space-y-2">
                  {result[lang].recommendations.map((recommendation) => (
                    <li key={recommendation} className="flex gap-2 text-sm leading-6">
                      <CheckCircle2 aria-hidden="true" size={17} className="mt-1 shrink-0 text-emerald-600" />
                      {recommendation}
                    </li>
                  ))}
                </ul>
              </div>
              {suggestedPackage && (
                <div className="rounded-lg border border-border bg-muted/40 p-4">
                  <h3 className="font-semibold">{labels.suggested}</h3>
                  <p className="mt-2 font-medium">{suggestedPackage.name} · {suggestedPackage.price}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{suggestedPackage.scope}</p>
                  <a href="/pricing#compare-offers" className="mt-3 inline-block text-sm font-semibold underline underline-offset-4">
                    {labels.plans}
                  </a>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                {!showContact && (
                  <Button variant="electric" onClick={() => setShowContact(true)}>{labels.followUp}</Button>
                )}
                {whatsappUrl && (
                  <Button asChild variant="outline">
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle aria-hidden="true" size={16} /> {labels.whatsapp}
                    </a>
                  </Button>
                )}
                <Button variant="outline" disabled={busy} onClick={editAnswers}>{labels.edit}</Button>
              </div>
              {showContact && (
                sent ? <p role="status" className="font-medium text-emerald-700 dark:text-emerald-400">{labels.sent}</p> : (
                  <form onSubmit={requestFollowUp} className="space-y-4 border-t border-border pt-5" aria-label={labels.followUp}>
                    <p className="text-sm text-muted-foreground">{labels.followUpDescription}</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label={labels.name}><Input name="name" autoComplete="name" required maxLength={120} /></Field>
                      <Field label={labels.email}><Input name="email" type="email" autoComplete="email" required maxLength={200} /></Field>
                      <Field label={labels.company}><Input name="company" autoComplete="organization" required maxLength={160} /></Field>
                      <Field label={labels.phone}><Input name="phone" type="tel" autoComplete="tel" maxLength={40} /></Field>
                    </div>
                    <Field label={labels.notes}><Textarea name="notes" maxLength={1500} rows={3} /></Field>
                    {error && <p role="alert" className="text-sm text-destructive">{labels.sendError}</p>}
                    <Button type="submit" variant="electric" disabled={busy}>{busy ? labels.sending : labels.send}</Button>
                  </form>
                )
              )}
            </div>
          ) : (
            <form onSubmit={getScore} className="space-y-5" aria-label={labels.assessment}>
              <h2 className="text-2xl font-bold">{labels.assessment}</h2>
              <Field label={labels.maturity}>
                <Select value={maturity} onChange={(event) => setMaturity(event.target.value)}>
                  {labels.levels.map((label, index) => <option key={label} value={index + 1}>{index + 1} — {label}</option>)}
                </Select>
              </Field>
              <fieldset>
                <legend className="mb-3 text-sm font-medium">{labels.priorities}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {priorities.map((priority) => (
                    <label key={priority.value} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border p-3 text-sm hover:bg-muted/60">
                      <input
                        type="checkbox"
                        checked={selected.includes(priority.value)}
                        onChange={(event) => {
                          const { checked } = event.target
                          setSelected((previous) => checked ? [...previous, priority.value] : previous.filter((value) => value !== priority.value))
                        }}
                        className="accent-cyan-500"
                      />
                      {priority[lang]}
                    </label>
                  ))}
                </div>
              </fieldset>
              {error && <p role="alert" className="text-sm text-destructive">{labels.previewError}</p>}
              <Button type="submit" variant="electric" size="lg" disabled={busy || selected.length === 0} className="w-full">
                {busy ? labels.generating : <>{labels.generate} <ArrowRight aria-hidden="true" size={16} /></>}
              </Button>
            </form>
          )}
        </Card>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>
}
