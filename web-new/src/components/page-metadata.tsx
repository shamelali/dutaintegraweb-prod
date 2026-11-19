import { useEffect } from "react"
import { useLocation } from "react-router-dom"
import { useLanguage } from "@/hooks/use-language"

import { marketingMetadata } from "@/lib/marketing-metadata"

export function PageMetadata() {
  const { pathname } = useLocation()
  const { lang } = useLanguage()

  useEffect(() => {
    const route = pathname.replace(/^\/ms(?=\/|$)/, "").replace(/\/$/, "") || "/"
    const page = marketingMetadata[route as keyof typeof marketingMetadata]
    const { title, description } = (page ?? marketingMetadata["/"])[lang]

    document.documentElement.lang = lang === "bm" ? "ms" : "en"
    // Ask Duta supplies its own title.
    if (route !== "/ask") document.title = title
    setContent('meta[name="description"]', description)
    setContent('meta[property="og:title"]', title)
    setContent('meta[property="og:description"]', description)
    setContent('meta[property="og:url"]', new URL(route, "https://dutaintegra.my").href)
  }, [pathname, lang])

  return null
}

function setContent(selector: string, content: string) {
  document.querySelector(selector)?.setAttribute("content", content)
}
