import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import { BillingPage } from "@/pages/billing"

/**
 * The billing page renders itself from `/api/billing/providers` and only offers
 * providers the server has keys for. HerePay additionally needs the payer's own
 * details and a bank, which the server refuses to invent — so the form must
 * collect them, or checkout 400s after the click.
 */

const COMPANY = {
  id: "c1",
  name: "Mokhtar Trading",
  email: "ops@mokhtar-trading.my",
  subscriptionTier: "starter",
  subscriptionStatus: "inactive",
}

function catalog(overrides: Partial<{ hitpay: boolean; billplz: boolean; herepay: boolean }> = {}) {
  const { hitpay = true, billplz = false, herepay = true } = overrides
  return {
    plans: [
      { id: "starter", amount: 79900 },
      { id: "growth", amount: 189900 },
    ],
    providers: [
      { id: "hitpay", configured: hitpay },
      { id: "billplz", configured: billplz },
      {
        id: "herepay",
        configured: herepay,
        banks: [
          { prefix: "MBB2E", label: "Maybank2u" },
          { prefix: "CIMB", label: "CIMB Clicks" },
        ],
      },
    ],
  }
}

let checkoutCalls: Array<Record<string, unknown>>

function mockFetch(catalogBody = catalog()) {
  globalThis.fetch = vi.fn(async (url: string, init?: RequestInit) => {
    const u = String(url)
    if (u.endsWith("/api/companies")) return { ok: true, status: 200, json: async () => ({ company: COMPANY }) }
    if (u.endsWith("/api/billing/providers")) return { ok: true, status: 200, json: async () => catalogBody }
    if (u.endsWith("/api/billing/payments")) return { ok: true, status: 200, json: async () => ({ payments: [] }) }
    if (u.endsWith("/api/auth/me")) return { ok: true, status: 200, json: async () => ({ company: COMPANY }) }
    if (u.endsWith("/api/billing/checkout")) {
      checkoutCalls.push(JSON.parse(String(init?.body ?? "{}")))
      return { ok: true, status: 200, json: async () => ({ checkoutUrl: "https://provider.example/pay" }) }
    }
    return { ok: false, status: 404, json: async () => ({}) }
  }) as unknown as typeof fetch
}

function renderPage() {
  return render(
    <MemoryRouter>
      <BillingPage />
    </MemoryRouter>,
  )
}

describe("BillingPage", () => {
  beforeEach(() => {
    checkoutCalls = []
    localStorage.setItem("language", "en")
    Object.defineProperty(window, "location", {
      writable: true,
      value: { ...window.location, assign: vi.fn(), pathname: "/billing" },
    })
    mockFetch()
  })

  it("offers only the providers the server has configured", async () => {
    renderPage()
    // HerePay is configured, so its radio (and bank list) must appear.
    expect(await screen.findByLabelText("FPX online banking")).toBeTruthy()
    expect(screen.getByLabelText("HitPay")).toBeTruthy()
    // Billplz is unset, so it is hidden rather than offered and then rejected.
    expect(screen.queryByLabelText("Billplz")).toBeNull()
  })

  it("hides HerePay when the server reports it unconfigured", async () => {
    mockFetch(catalog({ herepay: false }))
    renderPage()
    expect(await screen.findByLabelText("HitPay")).toBeTruthy()
    expect(screen.queryByLabelText("FPX online banking")).toBeNull()
  })

  it("sends a plain checkout body for HitPay (no payer block)", async () => {
    renderPage()
    await screen.findByLabelText("HitPay")
    fireEvent.click(screen.getByRole("button", { name: /Proceed to payment/ }))
    await waitFor(() => expect(checkoutCalls.length).toBe(1))
    expect(checkoutCalls[0]).toEqual({ provider: "hitpay", plan: "starter" })
  })

  it("collects the payer and bank for HerePay and forwards them", async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText("FPX online banking"))

    fireEvent.change(await screen.findByLabelText("Full name"), { target: { value: "Ahmad Bin Mokhtar" } })
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "ahmad@mokhtar-trading.my" } })
    fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "0123456789" } })
    fireEvent.change(screen.getByLabelText("Bank"), { target: { value: "MBB2E" } })

    fireEvent.click(screen.getByRole("button", { name: /Proceed to payment/ }))
    await waitFor(() => expect(checkoutCalls.length).toBe(1))
    expect(checkoutCalls[0]).toEqual({
      provider: "herepay",
      plan: "starter",
      customer: {
        name: "Ahmad Bin Mokhtar",
        email: "ahmad@mokhtar-trading.my",
        phone: "0123456789",
        bankPrefix: "MBB2E",
      },
    })
  })

  it("refuses to submit HerePay without the payer details", async () => {
    renderPage()
    fireEvent.click(await screen.findByLabelText("FPX online banking"))
    fireEvent.click(screen.getByRole("button", { name: /Proceed to payment/ }))

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("name, email and phone")
    expect(checkoutCalls.length).toBe(0)
  })
})
