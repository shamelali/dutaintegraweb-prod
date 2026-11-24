import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, render, screen, within } from "@testing-library/react"

import { ProductsPage } from "@/pages/products"

function reply(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response
}

function renderProducts(language: "en" | "bm") {
  localStorage.setItem("language", language)
  return render(<ProductsPage />)
}

beforeEach(() => {
  localStorage.clear()
  vi.spyOn(console, "error").mockImplementation(() => undefined)
})

describe("product catalog states", () => {
  it.each([
    ["en", "Loading products…"],
    ["bm", "Memuatkan produk…"],
  ] as const)("announces loading in %s", async (language, message) => {
    let resolve!: (response: Response) => void
    globalThis.fetch = vi.fn(() => new Promise<Response>((done) => { resolve = done }))

    renderProducts(language)
    expect(screen.getByRole("status").textContent).toContain(message)

    await act(async () => resolve(reply(200, { products: [] })))
  })

  it.each([
    ["en", "No products published yet."],
    ["bm", "Belum ada produk yang diterbitkan."],
  ] as const)("shows an empty catalog in %s without presenting an error", async (language, message) => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(200, { products: [] }))

    renderProducts(language)
    expect(await screen.findByRole("heading", { name: message })).toBeTruthy()
    expect(screen.queryByRole("alert")).toBeNull()
  })

  it.each([
    ["en", "We couldn't load the product catalog."],
    ["bm", "Kami tidak dapat memuatkan katalog produk."],
  ] as const)("shows a backend failure in %s instead of an empty catalog", async (language, message) => {
    globalThis.fetch = vi.fn().mockResolvedValue(reply(503, { error: "Supabase list failed: 503" }))

    renderProducts(language)
    const alert = await screen.findByRole("alert")
    expect(within(alert).getByRole("heading", { name: message })).toBeTruthy()
    expect(alert.textContent).not.toContain("Supabase")
    expect(screen.queryByRole("heading", { name: language === "bm" ? "Belum ada produk yang diterbitkan." : "No products published yet." })).toBeNull()
  })

  it("shows the error state when the network request fails", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"))

    renderProducts("en")
    const alert = await screen.findByRole("alert")
    expect(within(alert).getByRole("heading", { name: "We couldn't load the product catalog." })).toBeTruthy()
    expect(screen.queryByRole("heading", { name: "No products published yet." })).toBeNull()
  })
})
