import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { cpSync, existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { pageMetadataPlugin } from './page-metadata-plugin.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// The standalone static pages (pks.html, audit.html, css/, js/, …) live in the
// repo-root public/ tree and are deployed beside the SPA, but a build of
// web-new/ alone never saw them: a static deployment of dist/ then answered
// /pks.html with the SPA shell, whose router showed the not-found page. Serve
// and copy them alongside the app, minus the deployment-owned files that must
// not leak between hosts.
const STATIC_ROOT = join(__dirname, "..", "public")
const STATIC_EXCLUDE = new Set(["index.html", "_headers", "_redirects", "assets"])

function staticPagesPlugin(): Plugin {
  return {
    name: "standalone-static-pages",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req.url ?? "").split("?")[0]
        if (url === "/") return next()
        const candidate = join(STATIC_ROOT, url.slice(1))
        if (!candidate.startsWith(STATIC_ROOT)) return next()
        if (!existsSync(candidate) || !statSync(candidate).isFile()) return next()
        res.setHeader("content-type", url.endsWith(".html") ? "text/html; charset=utf-8" : "application/octet-stream")
        res.end(readFileSync(candidate))
      })
    },
    closeBundle() {
      copyStatic(join(__dirname, "dist"))
    },
  }
}

function copyStatic(dest: string) {
  for (const entry of readdirSync(STATIC_ROOT)) {
    if (STATIC_EXCLUDE.has(entry)) continue
    cpSync(join(STATIC_ROOT, entry), join(dest, entry), { recursive: true })
  }
}


export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  return {
  plugins: [react(), tailwindcss(), pageMetadataPlugin(), staticPagesPlugin()],
  resolve: {
    alias: {
      "@": `${__dirname}/src`,
    },
  },
  server: {
    proxy: {
      "/api": {
        target: `http://localhost:${env.API_PORT || "3000"}`,
        // Keep the browser's Host header: the Node server's checkOrigin()
        // compares Origin against Host, and rewriting Host to the API
        // server's own made every browser POST fail with "Invalid origin".
        changeOrigin: false,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
  },
}})
