import { fireEvent, render, screen } from "@testing-library/react"
import { expect, it, vi } from "vitest"
import { DigitalAssessmentPage } from "@/pages/digital-assessment"

it("shows a score before offering an optional contact request", async () => {
  localStorage.setItem("language", "en")
  const fetch = vi.spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(Response.json({
      score: 40,
      en: { maturityLabel: "Digital Growth", recommendations: ["Map repetitive workflows."] },
      bm: { maturityLabel: "Pertumbuhan Digital", recommendations: ["Petakan aliran kerja berulang."] },
    }))
    .mockResolvedValueOnce(Response.json({ success: true }))
  render(<DigitalAssessmentPage />)

  expect(screen.queryByLabelText("Work email")).toBeNull()
  fireEvent.submit(screen.getByRole("form", { name: "Free digital assessment" }))
  await screen.findByRole("heading", { name: "Digital readiness score" })
  expect(screen.queryByLabelText("Work email")).toBeNull()
  expect(fetch).toHaveBeenCalledTimes(1)
  const [url, request] = fetch.mock.calls[0]
  expect(url).toBe("/api/workspace/assessments/preview")
  expect(JSON.parse(String(request?.body))).toEqual({ digitalMaturity: 2, priorities: ["sales", "automation"] })

  fireEvent.click(screen.getByRole("button", { name: "Request a follow-up" }))
  expect(fetch).toHaveBeenCalledTimes(1)
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Example Visitor" } })
  fireEvent.change(screen.getByLabelText("Work email"), { target: { value: "visitor@example.test" } })
  fireEvent.change(screen.getByLabelText("Business name"), { target: { value: "Example business" } })
  fireEvent.submit(screen.getByRole("form", { name: "Request a follow-up" }))
  await screen.findByRole("status")
  const [leadUrl, leadRequest] = fetch.mock.calls[1]
  expect(leadUrl).toBe("/api/send-email")
  expect(leadRequest?.headers).toHaveProperty("X-CSRF-Token")
  expect(JSON.parse(String(leadRequest?.body))).toMatchObject({
    email: "visitor@example.test",
    service: "Digital assessment follow-up",
    message: expect.stringContaining("40/100"),
  })
})
