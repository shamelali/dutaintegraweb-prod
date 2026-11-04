import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, Send, Sparkles } from "lucide-react"
import { AskDutaLeadForm } from "@/components/ask-duta-lead-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useLanguage } from "@/hooks/use-language"
import type { TranslationKey } from "@/i18n/translations"

type Message = { role: "user" | "assistant"; content: string }

const QUICK_PROMPTS: TranslationKey[] = ["askQuickPrice", "askQuickAudit", "askQuickDutaos", "askQuickPdpa"]

export function AskPage() {
  const { t, lang } = useLanguage()
  const [messages, setMessages] = useState<Message[]>(() => [
    { role: "assistant", content: t("askWelcome") },
  ])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [handoffQuestion, setHandoffQuestion] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  // The SPA ships one <title> for every route, so a crawler arriving from
  // sitemap.xml saw the homepage title on /ask too. Restored on unmount rather
  // than hard-coded, because the real title lives in index.html.
  const originalTitle = useRef(document.title)
  const pageTitle = t("askPageTitle")

  useEffect(() => {
    document.title = pageTitle
    return () => {
      document.title = originalTitle.current
    }
  }, [pageTitle])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy, handoffQuestion])

  async function send(raw: string) {
    const text = raw.trim()
    if (!text || busy) return
    setInput("")
    setBusy(true)
    setHandoffQuestion(null)
    setMessages((old) => [...old, { role: "user", content: text }])
    try {
      const res = await fetch("/api/ask-duta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ message: text, lang }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.status === 429) {
        setMessages((old) => [...old, { role: "assistant", content: t("askTooMany") }])
      } else if (!res.ok) {
        // Never the server's own wording: the visitor gains nothing from it, and
        // whatever the endpoint adds later was not written for a public page.
        setMessages((old) => [...old, { role: "assistant", content: t("askError") }])
      } else {
        setMessages((old) => [...old, { role: "assistant", content: data.answer }])
        // Only a genuine miss opens the hand-off form; an answer stands on its own.
        if (data.answered === false) setHandoffQuestion(text)
      }
    } catch {
      setMessages((old) => [...old, { role: "assistant", content: t("askError") }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="py-16 md:py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <Badge variant="electric" className="mb-4 inline-flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> Duta Integra
        </Badge>
        <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3">{t("askTitle")}</h1>
        <p className="text-muted-foreground mb-8 max-w-2xl">{t("askIntro")}</p>

        <div
          ref={scrollRef}
          role="log"
          aria-live="polite"
          className="h-[46vh] min-h-[320px] overflow-y-auto rounded-lg border border-border/60 bg-card p-4 space-y-3"
        >
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <p
                className={
                  m.role === "user"
                    ? "max-w-[85%] rounded-lg px-4 py-2.5 text-sm bg-primary text-primary-foreground whitespace-pre-line"
                    : "max-w-[85%] rounded-lg px-4 py-2.5 text-sm bg-muted text-foreground whitespace-pre-line"
                }
              >
                {m.content}
              </p>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <p className="rounded-lg px-4 py-2.5 text-sm bg-muted text-muted-foreground">{t("askThinking")}</p>
            </div>
          )}
        </div>

        {handoffQuestion && (
          <div className="mt-4">
            <AskDutaLeadForm question={handoffQuestion} />
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault()
            void send(input)
          }}
          className="mt-4 flex gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("askPlaceholder")}
            maxLength={2000}
            aria-label={t("askPlaceholder")}
            disabled={busy}
          />
          <Button type="submit" variant="electric" disabled={busy || !input.trim()} aria-label={t("askSend")}>
            <Send className="w-4 h-4" />
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => void send(t(key))}
              disabled={busy}
              className="rounded-full border border-border/70 px-3.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-electric hover:text-electric disabled:opacity-50"
            >
              {t(key)}
            </button>
          ))}
        </div>

        <p className="mt-6 text-xs text-muted-foreground">{t("askDisclaimer")}</p>
        <Link
          to="/contact"
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-electric hover:underline"
        >
          {t("navContact")} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </section>
  )
}
