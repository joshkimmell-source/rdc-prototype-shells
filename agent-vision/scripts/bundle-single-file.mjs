/**
 * Bundles `dist/` into one self-contained `index.html` for RealPrototypes, which serves a
 * single HTML document rather than a directory of assets.
 *
 * Everything the page fetches relatively gets inlined:
 *   - the built CSS + JS
 *   - the three rail/FAB SVGs the bundle references by path
 *   - the Haven stylesheet
 *   - search-map.html / tours-map.html, injected as blob URLs so the iframes still work
 *
 * The Galano faces are NOT inlined: they load from the public static.rdc.moveaws.com
 * CDN, because the licensed .otf binaries are not committed to this public repo.
 *
 * Leaflet stays on unpkg — the map pages load it from CDN, as they did in the DC original.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const read = (p) => readFileSync(resolve(dist, p), 'utf8')
const b64 = (p) => readFileSync(resolve(dist, p)).toString('base64')

const dataUrl = {
  svg: (p) => `data:image/svg+xml;base64,${b64(p)}`,
}

// ── Haven stylesheet ──────────────────────────────────────────────────────────
// Its @font-face rules already point at the public CDN, so there is nothing to inline.
let havenCss = read('haven/colors_and_type.css')
// Drop the Google Fonts @import — it is a network hop for a mono face nothing here uses.
havenCss = havenCss.replace(
  /@import\s+url\('https:\/\/fonts\.googleapis\.com[^']*'\);?/g,
  ''
)

// ── Map pages, self-contained so they survive as blob URLs ────────────────────
// A blob document has no base URL, so `haven/colors_and_type.css` would never resolve.
function inlineMapPage(file) {
  return read(file).replace(
    /<link rel="stylesheet" href="haven\/colors_and_type\.css">/,
    `<style>${havenCss}</style>`
  )
}

const maps = {
  search: inlineMapPage('search-map.html'),
  tours: inlineMapPage('tours-map.html'),
}

// ── Onboarding page, opened in a new tab as a blob URL ────────────────────────
// The invite flow calls window.open('rdc-plus-onboarding.html'); inline it like the map
// pages so the single-file bundle serves it with no separate document. Its one relative
// asset is the realtor.com+ logo — swap it for the same data URL used elsewhere. The
// blob URL is same-origin with the shell, so the page's localStorage handoff still works.
const onboarding = read('rdc-plus-onboarding.html').replaceAll(
  'assets/logo-realtor-plus.svg',
  dataUrl.svg('assets/logo-realtor-plus.svg')
)

// ── Built CSS + JS ────────────────────────────────────────────────────────────
// The build emits `dev.html` (see vite.config.ts — the root index.html is the bundle target).
const html = read('dev.html')
const cssHref = html.match(/href="\.?\/?(assets\/[^"]+\.css)"/)[1]
const jsSrc = html.match(/src="\.?\/?(assets\/[^"]+\.js)"/)[1]

let css = read(cssHref)
let js = read(jsSrc)

// The bundle references these by path; inline each as a data URL.
for (const svg of [
  'logo-rail-collapsed.svg',
  'logo-rail-expanded.svg',
  'logo-realassist-ai.svg',
  'logo-realtor-plus.svg',
  'menu-logo.svg',
]) {
  const url = dataUrl.svg(`assets/${svg}`)
  js = js.replaceAll(`"assets/${svg}"`, JSON.stringify(url))
  css = css.replaceAll(`assets/${svg}`, url)
}

// Point the two iframes at blob URLs built from the inlined documents.
js = js.replaceAll('"search-map.html"', '__mapUrl("search")')
js = js.replaceAll('"tours-map.html"', '__mapUrl("tours")')

// Same for the onboarding page the invite flow opens in a new tab.
js = js.replaceAll('"rdc-plus-onboarding.html"', '__onboardUrl()')

/**
 * The map documents are embedded base64-encoded. Inlining them as JS string literals
 * would break the surrounding <script>: they contain `</script>` and quote sequences
 * that terminate it early.
 */
const mapShim = `
window.__MAPS__ = {
  search: "${Buffer.from(maps.search, 'utf8').toString('base64')}",
  tours: "${Buffer.from(maps.tours, 'utf8').toString('base64')}"
};
window.__mapUrl = function (key) {
  window.__mapUrlCache = window.__mapUrlCache || {};
  if (!window.__mapUrlCache[key]) {
    var bytes = Uint8Array.from(atob(window.__MAPS__[key]), function (c) { return c.charCodeAt(0) });
    window.__mapUrlCache[key] = URL.createObjectURL(
      new Blob([bytes], { type: 'text/html' })
    );
  }
  return window.__mapUrlCache[key];
};
window.__ONBOARD__ = "${Buffer.from(onboarding, 'utf8').toString('base64')}";
window.__onboardUrl = function () {
  if (!window.__onboardUrlCache) {
    var bytes = Uint8Array.from(atob(window.__ONBOARD__), function (c) { return c.charCodeAt(0) });
    window.__onboardUrlCache = URL.createObjectURL(new Blob([bytes], { type: 'text/html' }));
  }
  return window.__onboardUrlCache;
};
`.trim()

// ── Assemble ──────────────────────────────────────────────────────────────────
// Drop the stylesheet links (inlined below). The preconnect is kept: the Galano faces
// are fetched from static.rdc.moveaws.com at runtime, so the hint still earns its place.
let shell = html
  .replace(/<link rel="stylesheet"[^>]*>/g, '')
  .replace(/<script type="module"[^>]*><\/script>/, '')

// The replacements go in as FUNCTIONS, not strings. A string replacement treats `$&`,
// `$\``, `$'`, `$1` as special patterns, and the minified app JS contains `$&` and `$\``
// literally — as a string arg those would splice the matched/preceding markup into the
// script, injecting stray `<` and breaking it with `Unexpected token '<'`. A function
// replacement is inserted verbatim, no `$` interpretation.
const out = shell
  .replace('</head>', () => `<style>${havenCss}</style>\n<style>${css}</style>\n</head>`)
  .replace(
    '</body>',
    () => `<script>${mapShim}</script>\n<script type="module">${js}</script>\n</body>`
  )

mkdirSync(resolve(root, 'upload'), { recursive: true })
const target = resolve(root, 'upload/index.html')
writeFileSync(target, out)

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
console.log(`wrote upload/index.html  ${kb(Buffer.byteLength(out))}`)
console.log(`  haven css   ${kb(havenCss.length)} (fonts from CDN)`)
console.log(`  app css     ${kb(css.length)}`)
console.log(`  app js      ${kb(js.length)}`)
console.log(`  map pages   ${kb(maps.search.length + maps.tours.length)}`)
console.log(`  onboarding  ${kb(onboarding.length)}`)
