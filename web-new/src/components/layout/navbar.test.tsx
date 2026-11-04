import { beforeEach, describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"

import { Navbar } from "@/components/layout/navbar"

/**
 * Ask Duta is grounded on what Duta Integra publishes, so it must not appear on
 * the authenticated app screens — those have /api/ai/chat, which is grounded on
 * the signed-in company's own compliance rows. Two assistants in one chrome is
 * how a visitor ends up asking about their own account where nothing can see it.
 */

const MARKETING_PATHS = ["/", "/services", "/products", "/pricing", "/case-studies", "/about", "/contact", "/quiz", "/digital-assessment", "/proposal/abc"]
const APP_PATHS = ["/dashboard", "/compliance", "/billing", "/catalog-enrichment", "/portal/proposals", "/portal/compliance", "/login", "/signin", "/signup", "/ask"]

function renderAt(path: string) {
  // localStorage, not the router: useLanguage reads window.location, which
  // MemoryRouter does not change under jsdom.
  localStorage.setItem("language", "en")
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Navbar />
    </MemoryRouter>,
  )
}

function askLink() {
  return screen.queryByRole("link", { name: "Ask Duta" })
}

beforeEach(() => {
  localStorage.clear()
})

describe("Ask Duta nav entry gating", () => {
  it.each(MARKETING_PATHS)("offers Ask Duta on the public page %s", (path) => {
    renderAt(path)
    expect(askLink()).not.toBeNull()
  })

  it.each(APP_PATHS)("does not offer it on the app screen %s", (path) => {
    renderAt(path)
    expect(askLink()).toBeNull()
  })

  it("treats the /ms tree like the English one, both ways", () => {
    renderAt("/ms/pricing")
    expect(askLink()).not.toBeNull()
  })

  it("still hides it on an app screen reached through /ms", () => {
    renderAt("/ms/dashboard")
    expect(askLink()).toBeNull()
  })

  it("is a plain link — no disclosure chevron, unlike Services", () => {
    renderAt("/")
    // Services renders an icon child; Ask Duta must not look like a menu.
    const services = screen.getByRole("link", { name: /Services/ })
    const ask = askLink()
    expect(services.querySelector("svg")).not.toBeNull()
    expect(ask?.querySelector("svg")).toBeNull()
  })
})
