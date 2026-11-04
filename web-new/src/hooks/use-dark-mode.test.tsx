import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

import { useDarkMode } from "./use-dark-mode"

function stubStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
  }
}

beforeEach(() => {
  // Fresh localStorage per case so one case's "disabled" doesn't leak into another.
  const storage = stubStorage()
  vi.stubGlobal("localStorage", storage)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("useDarkMode default", () => {
  it("defaults to dark when no localStorage preference exists", () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.isDark).toBe(true)
  })

  it("defaults to light when localStorage says disabled", () => {
    localStorage.setItem("darkMode", "disabled")
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.isDark).toBe(false)
  })

  it("stays dark when localStorage says enabled", () => {
    localStorage.setItem("darkMode", "enabled")
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.isDark).toBe(true)
  })

  it("persists the toggle to localStorage and the document class", () => {
    const { result } = renderHook(() => useDarkMode())
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("darkMode")).toBe("enabled")

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isDark).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(localStorage.getItem("darkMode")).toBe("disabled")

    act(() => {
      result.current.toggle()
    })

    expect(result.current.isDark).toBe(true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("darkMode")).toBe("enabled")
  })
})
