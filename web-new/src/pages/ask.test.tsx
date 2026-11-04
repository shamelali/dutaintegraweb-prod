import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import { AskPage } from "@/pages/ask"

/**
 * The contract these tests exist to hold: an answer arrives without the visitor
 * giving anything, and the contact form appears ONLY after Ask Duta admits it has
 * no answer. If a future version gates every reply behind a form, or shows the
 * form alongside a real answer, these fail.
 *
 * Core matchers only — this repo does not install @testing-library/jest-dom.
 */

function jsonResponse(body: unknown, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body }
}

function renderAsk() {
  localStorage.setItem("language", "en")
  return render(
    <MemoryRouter initialEntries={["/ask"]}>
      <AskPage />
    </MemoryRouter>,
  )
}

function askBody() {
  return vi.mocked(globalThis.fetch).mock.calls.find(([url]) => String(url) === "/api/ask-duta")?.[1]
}

function leadCall() {
  return vi.mocked(globalThis.fetch).mock.calls.find(([url]) => String(url) === "/api/send-email")
}

function typeQuestion(value: string) {
  fireEvent.change(screen.getByLabelText(/What would you like to know/), { target: { value } })
}

function submitChat() {
  const form = document.querySelector("form")
  if (!form) throw new Error("the chat form did not render")
  fireEvent.submit(form)
}

beforeEach(() => {
  localStorage.clear()
  document.cookie = "csrf_token=; Max-Age=0; path=/"
  globalThis.fetch = vi.fn(async () => jsonResponse({ answer: "unconfigured stub", answered: true }))
})

describe("Ask Duta page", () => {
  it("greets without contacting the network", () => {
    renderAsk()
    expect(screen.queryByText(/I'm Ask Duta/)).not.toBeNull()
    expect(globalThis.fetch).not.toHaveBeenCalled()
  })

  it("owns the document title while it is open and hands it back on the way out", () => {
    // /ask is listed in sitemap.xml, so the title a crawler reads is user-facing.
    const siteTitle = "Duta Integra Solutions — AI Operating System for Malaysian SMEs"
    document.title = siteTitle
    const view = renderAsk()

    expect(document.title).toBe("Ask Duta — Duta Integra Solutions")
    view.unmount()
    expect(document.title).toBe(siteTitle)
  })

  it("titles the page in the visitor's language", () => {
    localStorage.setItem("language", "bm")
    render(
      <MemoryRouter initialEntries={["/ask"]}>
        <AskPage />
      </MemoryRouter>,
    )
    expect(document.title).toMatch(/^Tanya Duta/)
  })

  it("sends the question with the page language and renders the answer", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ answer: "AI Growth is RM 1,490 / month.", answered: true, topic: "pricing", source: "rule", lang: "en" }),
    )
    renderAsk()
    typeQuestion("how much is Growth")
    submitChat()

    await waitFor(() => expect(screen.queryByText(/RM 1,490 \/ month/)).not.toBeNull())
    expect(JSON.parse(String(askBody()?.body))).toEqual({ message: "how much is Growth", lang: "en" })
  })

  it("does not open the lead form when it actually answered", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ answer: "Yes — WhatsApp +60 11-5403 4051.", answered: true, topic: "contact", source: "rule", lang: "en" }),
    )
    renderAsk()
    typeQuestion("how do I reach you")
    submitChat()

    await waitFor(() => expect(screen.queryByText(/WhatsApp \+60/)).not.toBeNull())
    expect(screen.queryByText(/Let a person answer that/)).toBeNull()
  })

  it("opens the lead form only after a declared no-answer, and sends it as an ask-duta lead", async () => {
    globalThis.fetch = vi.fn(async (url: unknown) =>
      String(url) === "/api/ask-duta"
        ? jsonResponse({ answer: "I do not have that. A person can answer.", answered: false, topic: "handoff", source: "handoff", lang: "en" })
        : jsonResponse({ success: true }),
    )
    renderAsk()
    typeQuestion("do you file GST returns")
    submitChat()

    await waitFor(() => expect(screen.queryByText(/Let a person answer that/)).not.toBeNull())

    fireEvent.change(document.getElementById("ask-lead-name")!, { target: { value: "Aisyah" } })
    fireEvent.change(document.getElementById("ask-lead-email")!, { target: { value: "aisyah@kedai.my" } })
    const leadForm = screen.getByText(/Send my question/).closest("form")
    if (!leadForm) throw new Error("lead submit is not inside a form")
    fireEvent.submit(leadForm)

    await waitFor(() => expect(leadCall()).toBeDefined())
    const [, init] = leadCall()!
    const payload = JSON.parse(String((init as RequestInit).body))
    expect(payload).toMatchObject({
      name: "Aisyah",
      email: "aisyah@kedai.my",
      service: "Ask Duta",
      message: "do you file GST returns",
      source: "ask-duta",
    })
    // The double-submit CSRF header is what made every React lead 403 in production.
    const headers = (init as RequestInit).headers as Record<string, string>
    expect(headers["X-CSRF-Token"]).toMatch(/^[0-9a-f]{64}$/)
    expect(headers["Content-Type"]).toBe("application/json")
    // The promise has to be the one the contact form actually makes, so the
    // assertion tracks translations.ts `askLeadDone` rather than a paraphrase.
    await waitFor(() => expect(screen.queryByText(/within 24 hours/)).not.toBeNull())
  })

  it("surfaces the rate limit instead of a blank bubble", async () => {
    globalThis.fetch = vi.fn(async () => jsonResponse({ error: "Too many requests" }, 429))
    renderAsk()
    typeQuestion("price")
    submitChat()

    await waitFor(() => expect(screen.queryByText(/asked a few too many questions/)).not.toBeNull())
  })

  it("surfaces a transport failure", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("offline")
    })
    renderAsk()
    typeQuestion("price")
    submitChat()

    await waitFor(() => expect(screen.queryByText(/Something went wrong reaching us/)).not.toBeNull())
  })

  it("a quick prompt sends its own label", async () => {
    globalThis.fetch = vi.fn(async () =>
      jsonResponse({ answer: "Our plans start at RM 690.", answered: true, topic: "pricing", source: "rule", lang: "en" }),
    )
    renderAsk()
    fireEvent.click(screen.getByRole("button", { name: "What does it cost?" }))

    await waitFor(() => expect(askBody()).toBeDefined())
    expect(JSON.parse(String(askBody()?.body)).message).toBe("What does it cost?")
  })
})
