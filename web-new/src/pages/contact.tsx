import { useState } from "react"
import { MessageCircle, Mail, Clock, MapPin, Send, Building2, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/hooks/use-language"
import { useScrollReveal } from "@/hooks/use-scroll-reveal"
import { useToast } from "@/hooks/use-toast"
import { postWithCsrf } from "@/lib/csrf"
import { ProposalForm } from "@/components/proposal-form"
import { RoiCalculator } from "@/components/roi-calculator"

const routingChannels = [
  {
    icon: MessageCircle,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    badge: "Paling Pantas",
    title: "Jualan PKS & Startup",
    desc: "Tanya tentang Pakej Core (RM199), Advance (RM699) atau binaan laman web baharu.",
    cta: "WhatsApp Jualan PKS",
    whatsappMsg: "Salam Duta Integra, saya ingin maklumat lanjut mengenai Pakej PKS & Laman Web untuk bisnes saya.",
  },
  {
    icon: Wrench,
    color: "bg-blue-500/10 text-[#1565C0] dark:text-[#00d4ff] border-blue-500/20",
    badge: "Sokongan Harian",
    title: "Bantuan Teknikal & Komputer",
    desc: "Isu WiFi kedai, komputer perlahan, sokongan POS atau sandaran fail awan.",
    cta: "WhatsApp Helpdesk",
    whatsappMsg: "Salam Duta Integra, saya perlukan bantuan teknikal segera untuk komputer/sistem kedai saya.",
  },
  {
    icon: Building2,
    color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    badge: "Pilot 30-Hari",
    title: "Konsultasi Pilot & Enterprise",
    desc: "Tempahan pilot DutaConnect RM999, penyelarasan MyInvois LHDN, atau audit sistem penuh.",
    cta: "WhatsApp Perundingan",
    whatsappMsg: "Salam Duta Integra, saya berminat untuk menjadualkan sesi perbincangan pilot / enterprise.",
  },
]

export function ContactPage() {
  const { lang, t } = useLanguage()
  const heroRef = useScrollReveal()
  const channelsRef = useScrollReveal()
  const formRef = useScrollReveal()
  const { visible, message: toastMsg, show } = useToast()

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    company: "",
    phone: "",
    service: "PKS Advance (RM699/bln)",
    message: "",
  })
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const res = await fetch("/api/send-email", postWithCsrf({
        name: form.fullName,
        email: form.email,
        company: form.company,
        phone: form.phone,
        service: form.service,
        message: form.message,
        source: "contact-form",
      }))

      if (res.ok) {
        show(lang === "bm" ? "Mesej berjaya dihantar! Pegawai kami akan menghubungi anda dalam 24 jam." : "Message sent! We'll get back to you within 24 hours.")
        setForm({ fullName: "", email: "", company: "", phone: "", service: "PKS Advance (RM699/bln)", message: "" })
      } else {
        show(lang === "bm" ? "Terdapat masalah teknikal. Sila cuba lagi atau terus WhatsApp kami." : "Something went wrong. Please try again or WhatsApp us.")
      }
    } catch {
      show(lang === "bm" ? "Ralat rangkaian. Sila cuba lagi atau terus WhatsApp kami." : "Network error. Please try again or WhatsApp us.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background text-foreground transition-colors duration-200">
      {/* Toast */}
      {visible && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-[#0a2540] dark:bg-slate-800 text-white px-6 py-3.5 rounded-2xl shadow-2xl font-bold text-xs sm:text-sm border border-white/20 animate-in fade-in slide-in-from-bottom-4">
          {toastMsg}
        </div>
      )}

      {/* Hero Section */}
      <section ref={heroRef} className="py-20 md:py-28 bg-gradient-to-br from-[#0a2540] via-[#0d3b66] to-[#0a2540] text-center text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <Badge variant="electric" className="mb-6 uppercase tracking-wider font-semibold">
            {lang === "bm" ? "🇲🇾 Pasukan Sokongan Tempatan Cyberjaya" : "🇲🇾 Local Cyberjaya Support Team"}
          </Badge>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-white mb-6 leading-tight">
            {lang === "bm"
              ? "Hubungi Kami — Kami Sedia Menyelesaikan Isu Bisnes Anda."
              : "Get in Touch — We Are Ready to Solve Your IT & Business Headaches."}
          </h1>
          <p className="text-base sm:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            {lang === "bm"
              ? "Sama ada perlukan sebut harga rasmi, bantuan komputer, atau nak sembang santai tentang laman web baharu, kami hanya selangkah di WhatsApp."
              : "Whether you need a formal quotation, everyday computer help, or a quick consultation on a new sales website, we are just a WhatsApp message away."}
          </p>
        </div>
      </section>

      {/* 3 WhatsApp Quick-Routing Channels (High-Converting) */}
      <section ref={channelsRef} className="py-12 px-6 max-w-7xl mx-auto -mt-12 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {routingChannels.map((ch) => {
            const Icon = ch.icon
            return (
              <div
                key={ch.title}
                className="rounded-2xl border border-border dark:border-slate-800 p-6 bg-card dark:bg-[#111927] shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${ch.color}`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-muted dark:bg-slate-800 text-foreground/80">
                      {ch.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-navy dark:text-white mb-2">
                    {ch.title}
                  </h3>
                  <p className="text-xs text-muted-foreground dark:text-slate-400 leading-relaxed mb-6">
                    {ch.desc}
                  </p>
                </div>
                <a
                  href={`https://wa.me/601154034051?text=${encodeURIComponent(ch.whatsappMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-xs font-bold bg-[#25D366] hover:bg-[#20ba59] text-white shadow-sm transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>{ch.cta} ➔</span>
                </a>
              </div>
            )
          })}
        </div>
      </section>

      {/* Form + Information Details */}
      <section ref={formRef} className="py-16 px-6 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-3 gap-12 items-start">
          {/* Info sidebar */}
          <div className="space-y-6">
            <Card className="p-6 border border-border dark:border-slate-800 bg-card dark:bg-[#111927]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm mb-1 text-navy dark:text-white">
                    {lang === "bm" ? "WhatsApp Rasmi" : "Official WhatsApp"}
                  </h4>
                  <p className="text-muted-foreground text-xs mb-2">
                    {lang === "bm" ? "Respons pantas waktu bekerja" : "Fast response during office hours"}
                  </p>
                  <a
                    href="https://wa.me/601154034051?text=Salam%20Duta%20Integra,%20saya%20berminat%20dengan%20perkhidmatan%20anda."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#1565C0] dark:text-[#00d4ff] text-sm font-bold hover:underline"
                  >
                    +60 11-5403 4051
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-border dark:border-slate-800 bg-card dark:bg-[#111927]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-[#1565C0] dark:text-[#00d4ff] flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm mb-1 text-navy dark:text-white">
                    {lang === "bm" ? "E-mel Rasmi Syarikat" : "Company Email"}
                  </h4>
                  <p className="text-muted-foreground text-xs mb-2">
                    {lang === "bm" ? "Untuk dokumen tender, RFP & permohonan rasmi" : "For tenders, RFPs and formal inquiries"}
                  </p>
                  <a href="mailto:info@dutaintegra.my" className="text-[#1565C0] dark:text-[#00d4ff] text-sm font-bold hover:underline">
                    info@dutaintegra.my
                  </a>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-border dark:border-slate-800 bg-card dark:bg-[#111927]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm mb-1 text-navy dark:text-white">
                    {lang === "bm" ? "Waktu Operasi" : "Operating Hours"}
                  </h4>
                  <p className="text-muted-foreground text-xs mb-2">
                    {lang === "bm" ? "Isnin hingga Jumaat" : "Monday to Friday"}
                  </p>
                  <p className="text-foreground text-xs font-semibold">9:00 Pagi – 6:00 Petang (MYT)</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Sokongan kecemasan pelayan aktif 24/7</p>
                </div>
              </div>
            </Card>

            <Card className="p-6 border border-border dark:border-slate-800 bg-card dark:bg-[#111927]">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-heading font-bold text-sm mb-1 text-navy dark:text-white">
                    {lang === "bm" ? "Ibu Pejabat" : "Headquarters"}
                  </h4>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Duta Integra Solutions Sdn Bhd<br />
                    Cyberjaya, 63000 Cyberjaya, Selangor, Malaysia
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Formal Quotation / Contact Form */}
          <div className="lg:col-span-2">
            <Card className="p-8 md:p-10 border border-border dark:border-slate-800 bg-card dark:bg-[#111927] shadow-sm">
              <h3 className="text-2xl font-heading font-extrabold text-navy dark:text-white mb-2">
                {lang === "bm" ? "Borang Permohonan Sebut Harga & Pertanyaan" : t("contactFormTitle")}
              </h3>
              <p className="text-muted-foreground text-xs sm:text-sm mb-8 leading-relaxed">
                {lang === "bm"
                  ? "Sila isi butiran di bawah. Pegawai perunding teknikal kami akan menghantar sebut harga atau cadangan penyelesaian dalam tempoh 1 hari bekerja."
                  : t("contactFormSub")}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-xs font-semibold">
                      {lang === "bm" ? "Nama Penuh Anda *" : t("contactFullName")}
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={form.fullName}
                      onChange={handleChange}
                      required
                      placeholder="cth: Kamaruddin Ahmad"
                      className="bg-background dark:bg-[#0a0f1d] text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-xs font-semibold">
                      {lang === "bm" ? "E-mel Rasmi *" : t("contactEmail")}
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="kamaruddin@syarikat.com"
                      className="bg-background dark:bg-[#0a0f1d] text-sm"
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-xs font-semibold">
                      {lang === "bm" ? "Nama Bisnes / Syarikat" : t("contactCompany")}
                    </Label>
                    <Input
                      id="company"
                      name="company"
                      value={form.company}
                      onChange={handleChange}
                      placeholder="cth: Maju Jaya Engineering"
                      className="bg-background dark:bg-[#0a0f1d] text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-xs font-semibold">
                      {lang === "bm" ? "Nombor WhatsApp / Telefon" : t("contactPhone")}
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="012 345 6789"
                      className="bg-background dark:bg-[#0a0f1d] text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service" className="text-xs font-semibold">
                    {lang === "bm" ? "Pakej / Perkhidmatan Yang Diminati" : t("contactService")}
                  </Label>
                  <select
                    id="service"
                    name="service"
                    value={form.service}
                    onChange={handleChange}
                    className="w-full h-11 rounded-xl border border-input bg-background dark:bg-[#0a0f1d] px-3.5 text-xs sm:text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <option value="PKS Core (RM199/bln)">Pakej CORE — Web 1-Halaman & IT Kedai (RM199/bln)</option>
                    <option value="PKS Advance (RM699/bln)">Pakej ADVANCE — Web Jualan, Bot WhatsApp & e-Invois (RM699/bln)</option>
                    <option value="PKS Pro (RM1499+/bln)">Pakej PRO — Papan Pemuka Untung Rugi & Aliran Stor (Dari RM1,499/bln)</option>
                    <option value="WhatsApp Pilot (RM999)">DutaConnect WhatsApp Pilot 30-Hari (RM999)</option>
                    <option value="IT Support & Cloud Backup">Sokongan IT Diurus & Sandaran Awan Kedai</option>
                    <option value="Custom Enterprise">Penyelesaian Kustom / Rundingan Lain</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="text-xs font-semibold">
                    {lang === "bm" ? "Keterangan Keperluan / Masalah Bisnes *" : t("contactMessage")}
                  </Label>
                  <Textarea
                    id="message"
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder={lang === "bm" ? "Ceritakan secara ringkas masalah semasa (cth: laman web lama nak dibaiki, perlukan e-invois LHDN, atau WhatsApp jualan auto-reply)..." : t("contactMessagePlaceholder")}
                    className="bg-background dark:bg-[#0a0f1d] text-xs sm:text-sm"
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full bg-[#1565C0] hover:bg-[#0a2540] dark:bg-[#00d4ff] dark:hover:bg-[#00b8e6] text-white dark:text-[#0a0f1d] font-bold shadow-md"
                  disabled={submitting}
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {t("contactSending")}
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      {lang === "bm" ? "Hantar Permohonan Sebut Harga" : t("contactSubmit")}
                    </span>
                  )}
                </Button>

                <p className="text-[11px] text-muted-foreground text-center">
                  {lang === "bm"
                    ? "Kami menghormati privasi anda. Maklumat anda tidak akan dikongsi kepada pihak ketiga."
                    : t("contactPrivacyNote")}
                </p>
              </form>
            </Card>
          </div>
        </div>
      </section>

      {/* ROI leakage calculator */}
      <section className="py-16 px-6 bg-muted/20 dark:bg-slate-950/20 border-t border-border/40 dark:border-slate-800">
        <div className="max-w-5xl mx-auto">
          <RoiCalculator />
        </div>
      </section>

      {/* 3-step proposal form */}
      <section id="proposal" className="py-16 px-6 bg-muted/40 dark:bg-slate-900/40 border-t border-border/40 dark:border-slate-800">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <Badge variant="electric" className="mb-4">{t("proposalSectionEyebrow")}</Badge>
          <h2 className="text-3xl md:text-4xl font-heading font-bold mb-4">{t("proposalSectionTitle")}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm">{t("proposalSectionDesc")}</p>
        </div>
        <ProposalForm />
      </section>
    </div>
  )
}
