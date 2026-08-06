import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

/**
 * The Vite template lives at `dev.html`, not `index.html`.
 *
 * RealPrototypes serves a single self-contained HTML document, so the root `index.html`
 * is reserved for the bundled output of `npm run bundle`. Keeping the template under a
 * separate name lets both live at the project root without one overwriting the other.
 */
export default defineConfig({
  /**
   * Relative asset URLs, not absolute `/assets/...`.
   *
   * GitHub Pages serves a project site from `/<repo>/`, so absolute paths would resolve
   * against the domain root and 404. Relative paths work there, at the domain root, and
   * from `file://` — which also keeps `npm run bundle`'s single-file artifact portable.
   */
  base: './',
  plugins: [
    react(),
    tsconfigPaths(),
    {
      // Serve the template at `/` so the dev URL stays clean.
      name: 'dev-html-entry',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/' || req.url === '/index.html') req.url = '/dev.html'
          next()
        })
      },
    },
  ],
  css: { postcss: './postcss.config.cjs' },
  resolve: {
    alias: { 'styled-system': path.resolve(__dirname, './styled-system') },
  },
  build: {
    rollupOptions: { input: path.resolve(__dirname, 'dev.html') },
  },
})
