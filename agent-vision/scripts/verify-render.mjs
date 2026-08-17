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
const errors = []
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')))
page.on('requestfailed', (r) => errors.push('REQFAIL: ' + r.url() + ' — ' + r.failure()?.errorText))

await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' }).catch(() => {})
await page.waitForTimeout(1500)

const rootHtmlLen = await page.evaluate(() => (document.getElementById('root')?.innerHTML || '').length)
const bodyText = (await page.evaluate(() => document.body.innerText || '')).slice(0, 300)
const navVisible = await page.getByRole('navigation', { name: 'Main' }).isVisible().catch(() => false)

await browser.close()
server.close()

console.log('root innerHTML length:', rootHtmlLen)
console.log('nav rail visible:', navVisible)
console.log('body text (first 300):', JSON.stringify(bodyText))
console.log('console/page errors:', errors.length)
errors.slice(0, 15).forEach((e) => console.log('  •', e))
process.exit(rootHtmlLen > 500 && errors.length === 0 ? 0 : 1)
