import { defineConfig, devices } from '@playwright/test'

/**
 * E2E config for the agent-web prototype.
 *
 * The layout is measured at runtime — the action bar folds by measuring available width, the
 * shell swaps to overlay drawers below 768px — so the behaviours that matter cannot be
 * asserted from the DOM alone; they need a real browser at real widths. These tests drive
 * one, which is also how we visually verify UI changes without a manual pass.
 *
 * `webServer` boots the Vite dev server (the same `npm run dev` used by hand) and waits for
 * it before the suite runs. `PORT` is honoured by vite.config.ts, so the URL is fixed here
 * rather than left to Vite's 5173→5174 walk, which would collide with consumer-web.
 */
const PORT = 4318
const BASE_URL = `http://localhost:${PORT}`

export default defineConfig({
  testDir: './tests',
  // Prototype suite: keep output terse and fail fast in CI.
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'line' : 'list',
  use: {
    baseURL: BASE_URL,
    // On first retry only, so a green run stays cheap but a flake leaves evidence.
    trace: 'on-first-retry',
    // Seed the flag that suppresses the on-load "This is a prototype" notice. The modal is
    // open on mount for real visitors and would overlay every test's first interaction; the
    // app reads this key (and never writes it), so seeding it here keeps the suite clean while
    // real loads still show the disclaimer. Kept in sync with `SUPPRESS_KEY` in
    // src/components/PrototypeNotice.tsx.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: BASE_URL,
          localStorage: [{ name: 'ra-suppress-prototype-notice', value: '1' }],
        },
      ],
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    env: { PORT: String(PORT) },
    // Reuse a server already running locally; always start a fresh one in CI.
    reuseExistingServer: !process.env.CI,
    // Panda codegen runs before Vite, so allow a generous cold-start window.
    timeout: 120_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
