import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { AlertCircle, CreditCard, LoaderCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { DutaosAccountBar } from "@/components/dutaos-account-bar"
import { useLanguage } from "@/hooks/use-language"

type Company = {
  id: string
  name: string
  email: string
  subscriptionTier: string
  subscriptionStatus: string
}

type Payment = {
  id: string
  companyId: string
  provider: string
  amount: number
  currency: string
  status: string
  providerPaymentId: string | null
  checkoutUrl: string | null
  plan: string | null
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

type Plan = "starter" | "growth"
type Provider = "hitpay" | "billplz" | "herepay"

type Bank = { prefix: string; label: string }
type ProviderInfo = { id: Provider; configured: boolean; banks?: Bank[] }
type Catalog = { plans: { id: string; amount: number }[]; providers: ProviderInfo[] }

const PLAN_LABELS: Record<string, { en: string; bm: string }> = {
  starter: { en: "Starter", bm: "Permulaan" },
  growth: { en: "Growth", bm: "Pertumbuhan" },
}

// Plan amounts in cents. Kept in step with `PLANS` in server/payments.mjs; the
// catalog endpoint is authoritative and these are only the pre-load fallback.
const PLAN_AMOUNT: Record<string, number> = {
  starter: 79900,
  growth: 189900,
}

const DEFAULT_PROVIDERS: ProviderInfo[] = [
  { id: "hitpay", configured: true },
  { id: "billplz", configured: true },
]

const PROVIDER_LABELS: Record<string, { en: string; bm: string }> = {
  hitpay: { en: "HitPay", bm: "HitPay" },
  billplz: { en: "Billplz", bm: "Billplz" },
  herepay: { en: "FPX online banking", bm: "Perbankan dalam talian FPX" },
}

function formatAmount(cents: number): string {
  return `RM ${(cents / 100).toLocaleString("en-MY")}`
}

export function BillingPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { t, lang } = useLanguage()
  const [company, setCompany] = useState<Company | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [checkoutError, setCheckoutError] = useState("")
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [provider, setProvider] = useState<Provider>("hitpay")
  const [plan, setPlan] = useState<Plan>("starter")
  const [providers, setProviders] = useState<ProviderInfo[]>(DEFAULT_PROVIDERS)
  const [planAmounts, setPlanAmounts] = useState<Record<string, number>>(PLAN_AMOUNT)
  const [payerName, setPayerName] = useState("")
  const [payerEmail, setPayerEmail] = useState("")
  const [payerPhone, setPayerPhone] = useState("")
  const [bankPrefix, setBankPrefix] = useState("")

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/companies", { credentials: "same-origin" })
        if (res.status === 401) {
          if (active) navigate(`/signin?next=${encodeURIComponent(window.location.pathname)}`)
          return
        }
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || t("billingLoadFailed"))
        if (active) setCompany((data.company as Company) ?? null)
      } catch (e) {
        if (active) setError(e instanceof Error && e.message ? e.message : t("billingLoadFailed"))
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [navigate, t])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/billing/payments", { credentials: "same-origin" })
        if (!res.ok) throw new Error("Failed to load payment history")
        const data = await res.json()
        if (active) setPayments((data.payments as Payment[]) ?? [])
      } catch {
        // Payment history is a nicety; a missing history list must not block the page.
      }
    })()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const res = await fetch("/api/billing/providers", { credentials: "same-origin" })
        if (!res.ok) return
        const data = (await res.json()) as Catalog
        if (!active) return
        if (Array.isArray(data.providers) && data.providers.length) setProviders(data.providers)
        if (Array.isArray(data.plans)) {
          setPlanAmounts(
            Object.fromEntries(data.plans.map((p) => [p.id, p.amount])),
          )
        }
      } catch {
        // Fall back to the defaults above; the server still enforces configuration.
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const paymentStatus = params.get("payment")
  const flashMessage =
    paymentStatus === "success"
      ? t("billingPaymentSuccess")
      : paymentStatus === "cancelled"
        ? t("billingPaymentCancelled")
        : null

  const isActive = company?.subscriptionStatus === "active"
  const tier = company?.subscriptionTier ?? "starter"
  const planLabel = PLAN_LABELS[tier] ?? { en: tier, bm: tier }
  const price = formatAmount(planAmounts[tier] ?? 0)
  const selectedAmount = planAmounts[plan] ?? 0

  const activeProviders = providers.filter((p) => p.configured)
  const currentProvider = activeProviders.find((p) => p.id === provider)
  const needsPayer = currentProvider?.id === "herepay"
  const banks = currentProvider?.banks ?? []

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    setCheckoutError("")
    if (!currentProvider) {
      setCheckoutError(t("billingNoProvider"))
      return
    }
    if (needsPayer) {
      if (!payerName.trim() || !payerEmail.trim() || !payerPhone.trim()) {
        setCheckoutError(t("billingHerepayPayerRequired"))
        return
      }
      if (!bankPrefix) {
        setCheckoutError(t("billingHerepayBankRequired"))
        return
      }
    }
    setCheckoutLoading(true)
    try {
      const body: Record<string, unknown> = { provider, plan }
      if (needsPayer) {
        body.customer = {
          name: payerName.trim(),
          email: payerEmail.trim(),
          phone: payerPhone.trim(),
          bankPrefix,
        }
      }
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Checkout failed")
      window.location.assign(data.checkoutUrl as string)
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : "Checkout failed")
    } finally {
      setCheckoutLoading(false)
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><LoaderCircle className="animate-spin h-8 w-8" /></div>
  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="p-8 max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive">{error}</p>
        <Button
          variant="electric"
          className="mt-6"
          onClick={() => navigate("/contact")}
        >
          {t("billingContactUs")}
        </Button>
      </Card>
    </div>
  )
  if (!company) return null

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <DutaosAccountBar />
        <div className="mb-10">
          <h1 className="text-3xl font-heading font-bold">{t("billingPageTitle")}</h1>
          <p className="text-muted-foreground">{t("billingPageSub")}</p>
        </div>

        {flashMessage && (
          <Card className="mb-6 p-4 border-emerald/50 bg-emerald/50">
            <p className="text-emerald-700">{flashMessage}</p>
          </Card>
        )}

        <Card className="p-8 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <p className="text-sm text-muted-foreground">{t("billingCurrentPlan")}</p>
              <h2 className="text-3xl font-heading font-bold">{planLabel[lang]}</h2>
              <p className="text-muted-foreground">
                {price} {t("billingPricePerMonth")}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium border ${
                  isActive
                    ? "border-emerald/50 bg-emerald/50 text-emerald-700"
                    : "border-amber/50 bg-amber/50 text-amber-700"
                }`}
              >
                {isActive ? t("billingStatusActive") : t("billingStatusInactive")}
              </span>
            </div>
          </div>

          <form onSubmit={handleCheckout} className="mt-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t("billingPayWith")}
                </label>
                {activeProviders.length === 0 && (
                  <p className="text-sm text-amber-700">{t("billingNoProvider")}</p>
                )}
                {activeProviders.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 mt-2 first:mt-0">
                    <input
                      id={`provider-${p.id}`}
                      type="radio"
                      name="provider"
                      value={p.id}
                      checked={provider === p.id}
                      onChange={() => setProvider(p.id)}
                      className="h-4 w-4 text-primary"
                    />
                    <label htmlFor={`provider-${p.id}`} className="text-sm font-medium">
                      {PROVIDER_LABELS[p.id]?.[lang] ?? p.id}
                    </label>
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  {t("billingPlan")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="plan-starter"
                    type="radio"
                    name="plan"
                    value="starter"
                    checked={plan === "starter"}
                    onChange={() => setPlan("starter")}
                    className="h-4 w-4 text-primary"
                  />
                  <label htmlFor="plan-starter" className="text-sm font-medium">
                    {PLAN_LABELS.starter[lang]}
                  </label>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input
                    id="plan-growth"
                    type="radio"
                    name="plan"
                    value="growth"
                    checked={plan === "growth"}
                    onChange={() => setPlan("growth")}
                    className="h-4 w-4 text-primary"
                  />
                  <label htmlFor="plan-growth" className="text-sm font-medium">
                    {PLAN_LABELS.growth[lang]}
                  </label>
                </div>
              </div>
              {needsPayer && (
                <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-6">
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">{t("billingHerepayIntro")}</p>
                  </div>
                  <div>
                    <Label htmlFor="payer-name">{t("billingPayerName")}</Label>
                    <Input
                      id="payer-name"
                      className="mt-1"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="payer-phone">{t("billingPayerPhone")}</Label>
                    <Input
                      id="payer-phone"
                      className="mt-1"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="payer-email">{t("billingPayerEmail")}</Label>
                    <Input
                      id="payer-email"
                      type="email"
                      className="mt-1"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label htmlFor="payer-bank">{t("billingPayerBank")}</Label>
                    <Select
                      id="payer-bank"
                      className="mt-1"
                      value={bankPrefix}
                      onChange={(e) => setBankPrefix(e.target.value)}
                    >
                      <option value="">{t("billingPayerBankSelect")}</option>
                      {banks.map((b) => (
                        <option key={b.prefix} value={b.prefix}>
                          {b.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
              )}
              <div className="col-span-1 sm:col-span-2">
                <p className="text-sm text-muted-foreground mb-2">
                  {t("billingAmount")}: {formatAmount(selectedAmount)} {t("billingPricePerMonth")}
                </p>
                {checkoutError && (
                  <p role="alert" className="text-sm text-destructive mb-3">
                    {checkoutError}
                  </p>
                )}
                <Button
                  type="submit"
                  variant="electric"
                  disabled={checkoutLoading}
                  className="w-full"
                >
                  <CreditCard className="w-4 h-4 mr-2" />{" "}
                  {checkoutLoading ? "…" : t("billingCheckoutButton")}
                </Button>
              </div>
            </div>
          </form>

          <p className="mt-6 text-sm text-muted-foreground">
            {t("billingComingSoon")}
          </p>
        </Card>

        <Card className="p-8">
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-lg font-heading font-semibold">{t("billingPaymentHistory")}</h2>
          </div>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("billingNoPayments")}</p>
          ) : (
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="pb-2">{t("billingDate")}</th>
                  <th className="pb-2">{t("billingProvider")}</th>
                  <th className="pb-2">{t("billingPlan")}</th>
                  <th className="pb-2">{t("billingAmount")}</th>
                  <th className="pb-2">{t("billingStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b last:border-0">
                    <td className="py-3">{new Date(p.createdAt).toLocaleDateString(lang === "bm" ? "ms-MY" : "en-US")}</td>
                    <td className="py-3">{PROVIDER_LABELS[p.provider]?.[lang] ?? p.provider}</td>
                    <td className="py-3">{p.plan ?? "—"}</td>
                    <td className="py-3">{p.amount / 100} {p.currency}</td>
                    <td className="py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium border ${
                          p.status === "paid"
                            ? "border-emerald/50 bg-emerald/50 text-emerald-700"
                            : p.status === "failed"
                              ? "border-rose/50 bg-rose/50 text-rose-700"
                              : "border-amber/50 bg-amber/50 text-amber-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
