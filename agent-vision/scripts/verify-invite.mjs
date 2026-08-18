import http from 'node:http'
import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const bundle = readFileSync(resolve(root, 'upload/index.html'))

const server = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' })
  res.end(bundle)
})
await new Promise((r) => server.listen(0, r))
const port = server.address().port

const browser = await chromium.launch()
const page = await browser.newPage()

// Simulate the RealPrototypes sandbox: no localStorage in ANY frame (shell or blob iframe),
// so the only handoff that can personalize the onboarding preview is postMessage. This runs
// in every frame before its scripts, so the onboarding page's localStorage read yields null.
await page.addInitScript(() => {
  const dead = {
    getItem: () => null,
    setItem: () => { throw new Error('localStorage disabled (sandbox sim)') },
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    get length() { return 0 },
  }
  try { Object.defineProperty(window, 'localStorage', { get: () => dead, configurable: true }) } catch {}
})

const errors = []
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

const click = (re) =>
  page.evaluate((src) => {
    const el = [...document.querySelectorAll('button')].find((b) => new RegExp(src).test(b.innerText))
    if (el) el.click()
    return !!el
  }, re.source)

// The "This is a prototype" notice is now a password gate: its button reads "Enter" and stays
// disabled until the password is typed. localStorage is disabled here (sandbox sim), so the
// SUPPRESS_KEY short-circuit can't fire — we must actually unlock it to reach the app beneath.
const unlockGate = async () => {
  const input = page.locator('#prototype-password')
  if (await input.count()) {
    await input.fill('B0bsYourUncle')
    await input.press('Enter')
    await page.waitForTimeout(300)
  }
}

await page.goto(`http://localhost:${port}/?ab=b&view=leads`, { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(1000)

// Unlock the password gate if it's up (its overlay intercepts clicks).
await unlockGate()
// Open the lead, unlock again in case the gate is still up, open the invite composer, send.
await click(/Camille Fontaine/); await page.waitForTimeout(600)
await unlockGate()
await click(/^Work with /); await page.waitForTimeout(500)
await click(/^Send invite$/); await page.waitForTimeout(900)

const frame = page.frameLocator('iframe[title^="RDC+ onboarding preview"]')
const greet = await frame.locator('#mailGreet').innerText().catch(() => '(no #mailGreet)')
const fldFirst = await frame.locator('#fldFirst').innerText().catch(() => '')
const fldEmail = await frame.locator('#fldEmail').innerText().catch(() => '')
const homeCount = await frame.locator('#mailHomesList .home-card').count().catch(() => -1)
const firstAddr = await frame.locator('#mailHomesList .home-card .home-addr').first().innerText().catch(() => '')

await browser.close()
server.close()

console.log('greeting:      ', JSON.stringify(greet))
console.log('form first:    ', JSON.stringify(fldFirst))
console.log('form email:    ', JSON.stringify(fldEmail))
console.log('home cards:    ', homeCount)
console.log('first address: ', JSON.stringify(firstAddr))
console.log('page errors:   ', errors.length)
errors.forEach((e) => console.log('  •', e))

const ok = /Hi \S+,/.test(greet) && homeCount > 0 && errors.length === 0
console.log(ok ? '\nPASS — personalized via postMessage with localStorage disabled' : '\nFAIL')
process.exit(ok ? 0 : 1)
