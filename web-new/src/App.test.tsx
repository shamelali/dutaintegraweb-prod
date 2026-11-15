import { describe, expect, it } from "vitest"

import { portalLayoutRoutes, topLevelPortalRoutes } from "@/App"

/**
 * The identity a guarded route needs is not implied by its path, and getting it
 * wrong locks out a real user: `/portal/compliance` reads `/api/compliance-items`,
 * which is DutaOS-scoped, so it must check the DutaOS session even though it sits
 * under `/portal/*` beside three portal-identity routes. This test pins that
 * mapping so a later "tidy-up" cannot quietly flip it.
 */
describe("guarded route identity", () => {
  it("maps each portal-layout route to the session its endpoint requires", () => {
    const byPath = Object.fromEntries(portalLayoutRoutes.map((r) => [r.path, r.identity]))
    expect(byPath).toEqual({
      proposals: "portal",
      "proposals/:id": "portal",
      digests: "portal",
      compliance: "dutaos",
    })
  })

  it("guards every top-level dashboard route with the DutaOS session", () => {
    for (const r of topLevelPortalRoutes) {
      expect(r.identity, `${r.path} should be dutaos`).toBe("dutaos")
    }
  })
})
