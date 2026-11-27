import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv } from 'vite'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { pageMetadataPlugin } from './page-metadata-plugin.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, '')
  return {
  plugins: [react(), tailwindcss(), pageMetadataPlugin()],
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
