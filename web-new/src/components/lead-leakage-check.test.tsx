import { beforeEach, describe, expect, it } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"

import { LeadLeakageCheck } from "@/components/lead-leakage-check"

/**
 * The whole point of the check is that a visitor gets a usable answer without
 * handing over anything. If a future version gates the result behind a form,
 * these tests should fail.
 */

function setField(id: string, value: string) {
  const input = document.getElementById(id)
  if (!(input instanceof HTMLInputElement)) throw new Error(`no input #${id}`)
  fireEvent.change(input, { target: { value } })
}

/** "13 enquiries likely going cold each month · RM … over 12 months" */
function coldLeadCount() {
  const line = screen.getByText(/enquiries likely going cold each month/)
  return Number(line.textContent?.match(/^(\d+)/)?.[1])
}

/** The currency figure sits directly above the "revenue at risk" caption. */
function monthlyAtRisk() {
  return screen.getByText(/revenue at risk per month/).previousElementSibling?.textContent ?? ""
}

function renderCheck() {
  localStorage.setItem("language", "en")
  return render(<LeadLeakageCheck />)
}

describe("Lead Leakage Check", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("shows an estimate with no contact fields on the page", () => {
    renderCheck()

    expect(document.querySelector("#lead-leakage-check")).not.toBeNull()
    expect(document.querySelectorAll('input[type="email"]').length).toBe(0)
    expect(document.querySelectorAll('input[type="text"]').length).toBe(0)
    expect(monthlyAtRisk()).toMatch(/^RM\s?\d/)
  })

  it("counts a one-hour reply as no leakage and a 24-hour reply as all of it", () => {
    renderCheck()
    setField("llc-enquiries", "60")

    setField("llc-hours", "1")
    expect(coldLeadCount()).toBe(0)

    setField("llc-hours", "24")
    expect(coldLeadCount()).toBe(60)
  })

  it("scales the money at risk with the win rate the visitor enters", () => {
    renderCheck()
    // 100 enquiries, all of them cold (24h), RM1,000 a deal: 10% wins = RM10,000.
    setField("llc-enquiries", "100")
    setField("llc-hours", "24")
    setField("llc-deal", "1000")

    setField("llc-winrate", "10")
    expect(monthlyAtRisk()).toContain("10,000")

    setField("llc-winrate", "20")
    expect(monthlyAtRisk()).toContain("20,000")
  })
})
