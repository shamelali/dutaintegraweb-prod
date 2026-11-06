import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

import { useDarkMode } from "./use-dark-mode"

// Fresh localStorage per case so one case's preference doesn't leak into another.
function stubStorage() {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => (key in store ? store[key] : null),
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
}

beforeEach(() => {
  const storage = stubStorage()
  vi.stubGlobal("localStorage", storage)
  document.documentElement.classList.remove("dark")
})

afterEach(() => {
  vi.unstubAllGlobals()
  document.documentElement.classList.remove("dark")
})

describe("useDarkMode", () => {
  it("defaults to light mode when nothing is stored", () => {
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.isDark).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("reads stored 'enabled' from localStorage on init", () => {
    localStorage.setItem("darkMode", "enabled")
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.isDark).toBe(true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
  })

  it("reads stored 'disabled' from localStorage on init", () => {
    localStorage.setItem("darkMode", "disabled")
    const { result } = renderHook(() => useDarkMode())
    expect(result.current.isDark).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
  })

  it("toggle() enables dark mode and persists it", () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => {
      result.current.toggle()
    })
    expect(result.current.isDark).toBe(true)
    expect(document.documentElement.classList.contains("dark")).toBe(true)
    expect(localStorage.getItem("darkMode")).toBe("enabled")
  })

  it("toggle() twice returns to light mode and persists 'disabled'", () => {
    const { result } = renderHook(() => useDarkMode())
    act(() => {
      result.current.toggle()
      result.current.toggle()
    })
    expect(result.current.isDark).toBe(false)
    expect(document.documentElement.classList.contains("dark")).toBe(false)
    expect(localStorage.getItem("darkMode")).toBe("disabled")
  })

  it("tolerates localStorage.setItem throwing (private mode / blocked storage)", () => {
    const throwing = stubStorage()
    throwing.setItem = () => {
      throw new Error("QuotaExceededError")
    }
    vi.stubGlobal("localStorage", throwing)

    const { result } = renderHook(() => useDarkMode())
    expect(() => act(() => result.current.toggle())).not.toThrow()
  })
})
