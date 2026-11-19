import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join, resolve } from "node:path"
import type { Plugin } from "vite"
import { marketingMetadata } from "./src/lib/marketing-metadata.ts"

const origin = "https://dutaintegra.my"

export function pageMetadataPlugin(): Plugin {
  let output: string

  return {
    name: "marketing-page-metadata",
    apply: "build",
    configResolved(config) {
      output = resolve(config.root, config.build.outDir)
    },
    closeBundle() {
      const indexPath = join(output, "index.html")
      const template = readFileSync(indexPath, "utf8")
      const directory = join(output, "page-metadata")
      mkdirSync(directory, { recursive: true })

      for (const [route, { bm }] of Object.entries(marketingMetadata)) {
        const html = template
          .replace(/<html lang="[^"]+">/, '<html lang="ms">')
          .replace(/<title>[^<]*<\/title>/, () => "<title>" + escapeHtml(bm.title) + "</title>")
          .replace(/(<meta name="description" content=")[^"]*/, (_, prefix) => prefix + escapeHtml(bm.description))
          .replace(/(<meta property="og:title" content=")[^"]*/, (_, prefix) => prefix + escapeHtml(bm.title))
          .replace(/(<meta property="og:description" content=")[^"]*/, (_, prefix) => prefix + escapeHtml(bm.description))
          .replace(/(<meta property="og:url" content=")[^"]*/, (_, prefix) => prefix + origin + route)
        const path = route === "/" ? indexPath : join(directory, route.slice(1) + ".html")
        writeFileSync(path, html)
      }
    },
  }
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;")
}
