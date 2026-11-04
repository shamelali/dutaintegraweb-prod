import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import { HomePage } from "@/pages/home"

/**
 * The hero pilot form is the site's primary CTA. It used to send no `service`,
 * which `/api/send-email` requires, and to ignore `res.ok` — so every booking
 * got a 400, stored nothing, and still showed the prospect a confirmation.
 */

function reply(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function setField(id: string, value: string) {
  const input = document.getElementById(id)
  if (!(input instanceof HTMLInputElement)) throw new Error(`no input #${id}`)
  fireEvent.change(input, { target: { value } })
}

/** The booking form, found through its email field rather than by text. */
function bookingForm() {
  const email = document.getElementById("pilot-email")
  if (!(email instanceof HTMLInputElement)) throw new Error("the booking form is not on the page")
  if (!email.form) throw new Error("the booking email is outside a form")
  return email.form
}

function bookingButton() {
  const button = bookingForm().querySelector('button[type="submit"]')
  if (!(button instanceof HTMLButtonElement)) throw new Error("the booking form has no submit button")
  return button
}

function fillBooking() {
  setField("pilot-name", "Ahmad")
  setField("pilot-email", "ahmad@syarikat.com")
  setField("pilot-company", "Syarikat Sdn Bhd")
  setField("pilot-volume", "50")
  setField("pilot-time", "Isnin 10:00 pagi")
}

/** Every POST the page made to the lead endpoint. */
function bookingCalls() {
  return (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.filter(
    ([url]) => String(url) === "/api/send-email",
  )
}

function sentBooking() {
  const calls = bookingCalls()
  if (calls.length === 0) throw new Error("no POST to /api/send-email")
  return JSON.parse(String(calls[0][1].body)) as Record<string, unknown>
}

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe("pilot booking form", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(200, { success: true }))
  })

  afterEach(() => {
    window.history.replaceState({}, "", "/")
  })

  it("is a real section on the page, so #pilot from the pricing page lands on it", () => {
    renderHome()

    // It used to be a collapsed <details> that only opened when the URL already
    // carried #pilot — most visitors met a hidden booking form.
    const section = document.getElementById("pilot")
    expect(section?.tagName).toBe("SECTION")
    expect(document.getElementById("pilot-email")).not.toBeNull()
  })

  it("sends the fields the server requires, with the funnel and the volume", async () => {
    renderHome()
    fillBooking()
    fireEvent.click(bookingButton())

    await waitFor(() => expect(bookingCalls()).toHaveLength(1))
    // `service` is `required: true` in validateEnquiry; without it the whole
    // funnel 400s. `source` is what makes the booking countable per funnel.
    expect(sentBooking()).toMatchObject({
      name: "Ahmad",
      email: "ahmad@syarikat.com",
      company: "Syarikat Sdn Bhd",
      service: "WhatsApp lead follow-up pilot",
      source: "pilot-booking",
    })
    // volume and meeting time have no columns, so they ride in the message.
    expect(String(sentBooking().message)).toContain("50 enquiries/month")
    expect(String(sentBooking().message)).toContain("Isnin 10:00 pagi")
  })

  it("posts once per click", async () => {
    renderHome()
    fillBooking()
    fireEvent.click(bookingButton())

    await waitFor(() => expect(bookingCalls()).toHaveLength(1))
    // The button lives inside the form, so an onClick alongside the submit
    // handler wrote two rows for one booking.
    expect(bookingCalls()).toHaveLength(1)
  })

  it("confirms only when the server accepted the booking", async () => {
    renderHome()
    fillBooking()
    fireEvent.click(bookingButton())

    await waitFor(() => expect(document.getElementById("pilot-email")).toBeNull())
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it("shows the server's reason and keeps the form when the booking is refused", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(400, { error: "Service is required" }))

    renderHome()
    fillBooking()
    fireEvent.click(bookingButton())

    const alert = await screen.findByRole("alert")
    expect(alert.textContent).toContain("Service is required")
    // The prospect must still see the form: a confirmation with no stored lead
    // is how this funnel lost people silently.
    expect(document.getElementById("pilot-email")).not.toBeNull()
  })

  it("says something useful when the network fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))

    renderHome()
    fillBooking()
    fireEvent.click(bookingButton())

    await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy())
    expect(document.getElementById("pilot-email")).not.toBeNull()
  })
})

/**
 * `pilotFaq1..5` sat in `translations.ts` for months — translated, bundled, and
 * read by no component. These exist so the answer a prospect needs before
 * booking is on the page rather than in the artifact.
 */
describe("pilot FAQ", () => {
  function faqBlocks() {
    return [...document.querySelectorAll<HTMLDetailsElement>("#pilot details")]
  }

  function renderIn(language: "en" | "bm") {
    localStorage.setItem("language", language)
    renderHome()
  }

  it("renders all five questions under the pilot section", () => {
    renderIn("en")

    expect(screen.queryByText("The questions people actually ask before booking")).not.toBeNull()
    expect(faqBlocks()).toHaveLength(5)
    for (const block of faqBlocks()) {
      expect(block.querySelector("summary")?.textContent?.trim()).not.toBe("")
      expect(block.querySelector("p")?.textContent?.trim()).not.toBe("")
    }
  })

  it("states the managed-IT rule the booking decision turns on: pilot no, ongoing yes", () => {
    renderIn("en")

    const managed = faqBlocks().find((b) => b.querySelector("summary")?.textContent?.includes("managed IT plan"))
    if (!managed) throw new Error("the managed-IT question is not on the page")
    const answer = String(managed.querySelector("p")?.textContent)
    expect(answer).toContain("For the pilot, no")
    expect(answer).toContain("add-on to an active managed IT plan")
  })

  it("answers in Malay when the site is in Malay", () => {
    renderIn("bm")

    expect(screen.queryByText("Adakah saya perlu pelan IT terurus sedia ada?")).not.toBeNull()
    expect(document.body.textContent).not.toContain("Do I need an existing managed IT plan?")
  })
})
