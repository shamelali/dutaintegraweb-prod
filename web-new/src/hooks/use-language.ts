import { useCallback, useSyncExternalStore } from "react"
import { translations, type Language, type TranslationKey } from "@/i18n/translations"

const languageChangeEvent = "duta:language-change"

function defaultLanguage(): Language {
  return "bm"
}

function currentLanguage(): Language {
  const stored = localStorage.getItem("language")
  return stored === "en" || stored === "bm" ? stored : defaultLanguage()
}

function subscribe(callback: () => void) {
  window.addEventListener(languageChangeEvent, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(languageChangeEvent, callback)
    window.removeEventListener("storage", callback)
  }
}

function toggle() {
  localStorage.setItem("language", currentLanguage() === "en" ? "bm" : "en")
  window.dispatchEvent(new Event(languageChangeEvent))
}

export function useLanguage() {
  const lang = useSyncExternalStore(subscribe, currentLanguage, defaultLanguage)

  const t = useCallback(
    (key: TranslationKey) => translations[key]?.[lang] ?? translations[key]?.en ?? key,
    [lang],
  )

  return { lang, t, toggle }
}
