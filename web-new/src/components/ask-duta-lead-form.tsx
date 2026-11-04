import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { postWithCsrf } from "@/lib/csrf"
import { useLanguage } from "@/hooks/use-language"

/**
 * Hand-off form shown when Ask Duta has no published answer. It reuses
 * `/api/send-email` exactly as contact.tsx does, so the CSRF double-submit,
 * server-side validation, and the `leads` pipeline all stay in one place.
 * `source` must be a member of WEBSITE_LEAD_SOURCES on the server, or
 * normaliseLeadSource() silently rewrites it to "contact-form".
 */
export function AskDutaLeadForm({ question }: { question: string }) {
  const { t } = useLanguage()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle")

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setState("sending")
    try {
      const res = await fetch(
        "/api/send-email",
        postWithCsrf({
          name,
          email,
          phone,
          service: "Ask Duta",
          message: question,
          source: "ask-duta",
        }),
      )
      setState(res.ok ? "sent" : "error")
    } catch {
      setState("error")
    }
  }

  if (state === "sent") {
    return <p className="text-sm text-electric font-medium py-2">{t("askLeadDone")}</p>
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-4">
      <div>
        <h3 className="font-heading font-semibold text-sm">{t("askLeadTitle")}</h3>
        <p className="text-xs text-muted-foreground mt-1">{t("askLeadHint")}</p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ask-lead-name" className="text-xs">{t("askLeadName")}</Label>
        <Input
          id="ask-lead-name"
          name="name"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={state === "sending"}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ask-lead-email" className="text-xs">{t("askLeadEmail")}</Label>
        <Input
          id="ask-lead-email"
          name="email"
          type="email"
          required
          maxLength={200}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={state === "sending"}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ask-lead-phone" className="text-xs">{t("askLeadPhone")}</Label>
        <Input
          id="ask-lead-phone"
          name="phone"
          type="tel"
          maxLength={40}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          disabled={state === "sending"}
        />
      </div>

      {state === "error" && (
        <p role="alert" className="text-xs text-destructive">{t("askLeadError")}</p>
      )}

      <Button type="submit" variant="electric" size="sm" disabled={state === "sending"}>
        {state === "sending" ? t("askLeadSending") : t("askLeadSubmit")}
      </Button>
    </form>
  )
}
