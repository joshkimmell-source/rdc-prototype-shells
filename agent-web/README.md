# RealAssist+ Content Orchestration Shell (`agent-web`)

Agent-facing prototype shell for the Design AI Infrastructure Studio. Ported from
`ContentOrchestrationShell.dc.html` to React + TypeScript + Vite, using the Haven
design system (`@rdc-npm/rdc-ui-v4`) via Panda CSS.

## Running it

```bash
npm install
npm run dev      # http://localhost:5173
```

`npm install` needs the internal Artifactory registry for the `@rdc-npm` scope, so you
must be on the VPN for the install to resolve. The `.npmrc` that points at it is
gitignored (it names internal infrastructure); copy `.npmrc.example` from the repo root
to `agent-web/.npmrc` and fill in the registry host.

The licensed Galano Grotesque Alt `.otf` files are also not committed — this repo is
public. Both `dev.html` and `public/haven/colors_and_type.css` load the same faces from
the public `static.rdc.moveaws.com` CDN, so nothing is missing visually and no font
binary is ever published.

```bash
npm run build    # -> dist/
npm run bundle   # -> upload/index.html (single self-contained file)
npm run deploy   # build + publish dist/ to the gh-pages branch
npm run preview  # serve the built output
```

`dev` and `build` both run `panda codegen && panda cssgen` first, which regenerates
`styled-system/` and `src/panda.css`.

## The two `.html` files at the root

- **`index.html`** — the RealPrototypes upload artifact, produced by `npm run bundle`.
  One self-contained document with the CSS, JS, SVGs, fonts, and both map pages
  inlined. Do not edit by hand; it is generated.
- **`dev.html`** — the Vite template. `vite.config.ts` points the dev server and the
  build at this file so the generated `index.html` is never overwritten. The dev server
  still serves it at `/`.

## Hosting on GitHub Pages

Live at **https://joshkimmell-source.github.io/rdc-prototype-shells/**.

```bash
npm run deploy   # build, then publish dist/ to the gh-pages branch
```

`scripts/deploy-pages.mjs` commits `dist/` to an orphan `gh-pages` branch through a
detached worktree in a temp dir, so your working tree and current branch are untouched.
History is reset each deploy — it's a build artifact, so keeping it would only grow the
repo.

There is no GitHub Actions workflow for this, and that's deliberate: `@rdc-npm/rdc-ui-v4`
resolves from internal Artifactory, which Actions runners can't reach. The build has to
happen on the VPN, so only the compiled output is pushed.

Two things make the build work under the Pages `/<repo>/` subpath:

- `vite.config.ts` sets `base: './'`, so assets resolve relatively instead of against
  the domain root.
- The deploy script copies `dev.html` to `index.html` (Pages serves `index.html` at a
  directory URL) and writes `.nojekyll` (Jekyll would skip `_`-prefixed paths).

**The deploy script never publishes font binaries.** Any local `.otf`/`.woff` copies in
`public/haven/fonts/` get swept into `dist/` by Vite, and the root `.gitignore` does not
apply to the `gh-pages` branch — so the script filters them out by extension and aborts
the deploy if one would slip through anyway.

## Packaging for RealPrototypes

RealPrototypes serves a single HTML document, not a directory of assets — a normal
Vite `dist/` uploads without error but renders blank, because `assets/*.js` is never
served. `npm run bundle` produces the artifact it does accept:

```bash
npm run bundle   # writes upload/index.html (~1.3 MB)
```

`scripts/bundle-single-file.mjs` inlines the built CSS and JS, the three rail/FAB SVGs
the bundle references by path, and the Haven stylesheet with its `.otf` faces as data
URLs. The two Leaflet map pages are embedded base64-encoded and handed to the iframes
as blob URLs — they are base64 rather than plain string literals because their markup
contains `</script>` sequences that would terminate the inline script early. Leaflet
itself still loads from unpkg, as it did in the DC original, so the prototype needs
network access for the maps to draw.

## Layout

```
src/
  Shell.tsx          root: all shell state + derived layout
  theme.ts           color/font tokens
  data.ts            seeded book of business
  assistant.ts       RealAssist+ responder
  icons.tsx
  components/        NavRail, Subnav, MainHeader, FAB, Menu, primitives, ImageSlot,
                     ResizeHandle
  screens/           Home, Clients, Search, Tours
  panels/            AssistantPanel, ThreadsList
public/
  search-map.html    Leaflet map iframes, carried over from the DC original
  tours-map.html
  haven/             Galano Grotesque font faces + Haven color/type CSS
```

## Two substitutions from the DC original

Both are places where the original depended on the Claude Design authoring runtime,
which has no equivalent in a standalone Vite app.

1. **`src/assistant.ts`** replaces `window.claude.complete(...)`. It is a local
   rule-based responder reproducing the same contract — plain-text replies plus the
   two card types the chat renders (`show_client_card`, `schedule_tour`). It checks
   for `window.claude.complete` first and defers to it if a host injects one, with the
   tool `run` handlers intact, so it remains a drop-in.

2. **`src/components/ImageSlot.tsx`** replaces the `<image-slot>` custom element. The
   original persisted dropped images to an `.image-slots.state.json` sidecar through
   the runtime's file bridge; this keeps drop-to-fill and click-to-browse but persists
   to `localStorage`.

## Authoring props

The DC file exposed `railMode`, `subnavWidth`, and `pushWidth` as editor-editable
props. There is no editor surface here, so they are constants at the top of
`Shell.tsx` (`RAIL_MODE`, `SUBNAV_WIDTH`, `PUSH_WIDTH`) set to the `data-props`
defaults.

`PUSH_WIDTH` is now only the *initial* width — the panel is user-resizable (below).

## Resizing the push panel

`components/ResizeHandle.tsx` puts a drag handle on the left edge of the RealAssist+
panel. `Shell.tsx` owns the width (`pushW`) and passes it down; the handle is rendered
only while the panel is docked open, since the expanded width belongs to the expand
control and a closed panel has no edge to grab.

- Drag the edge, or focus the handle and use `←`/`→` (16px steps, 64px with `Shift`),
  `Home`/`End` for the bounds, `Enter` to reset.
- Double-click resets to `PUSH_WIDTH`.
- Bounds are `PUSH_MIN` (320px) to `window.innerWidth - PUSH_MAX_GAP`, so `main` always
  keeps 360px. Shrinking the window narrows the panel to fit; growing it again does not
  widen it back, so a deliberately chosen width is never overridden.
- The width persists to `localStorage` under `ra-push-width`, the same approach
  `ImageSlot` uses.

Both the panel width and `main`'s `margin-right` drop their 220ms transition mid-drag —
easing them makes the edge lag the pointer. The drag uses pointer capture so it keeps
tracking across the Leaflet iframes and scroll areas it passes over.
