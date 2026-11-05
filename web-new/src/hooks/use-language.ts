import { useState, useEffect, useCallback } from "react"
import { translations, type Language, type TranslationKey } from "@/i18n/translations"


function getInitialLanguage(): Language {
  if (typeof window === "undefined") return "bm"
  const stored = localStorage.getItem("language")
  if (stored === "en" || stored === "bm") return stored
  if (window.location.pathname.startsWith("/ms")) return "bm"
  return "bm"
}

export function useLanguage() {
  const [lang, setLang] = useState<Language>(getInitialLanguage)

  useEffect(() => {
    document.documentElement.lang = lang === "bm" ? "ms" : "en"
    localStorage.setItem("language", lang)
  }, [lang])

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[key]?.[lang] ?? translations[key]?.en ?? key
    },
    [lang]
  )

  const toggle = useCallback(
    () => setLang((prev) => (prev === "en" ? "bm" : "en")),
    []
  )

  return { lang, t, toggle }
}
