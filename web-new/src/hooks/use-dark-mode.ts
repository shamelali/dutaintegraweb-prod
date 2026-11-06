import { useState, useEffect } from "react"

export function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("darkMode") === "enabled"
    }
    return false
  })

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark)
    try {
      localStorage.setItem("darkMode", isDark ? "enabled" : "disabled")
    } catch {
      // storage unavailable — theme still works, just won't persist
    }
  }, [isDark])

  // sync across tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "darkMode") setIsDark(e.newValue === "enabled")
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const toggle = () => setIsDark((prev) => !prev)

  return { isDark, toggle }
}
