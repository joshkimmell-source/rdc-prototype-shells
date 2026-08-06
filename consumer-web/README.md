# Consumer Web Shell

Prototype environment for realtor.com consumer web — desktop-first, responsive down to 390px.

## What's in the shell

- **`Nav`** (sticky) — realtor.com logo, primary nav (Buy / Rent / Sell / Mortgage), user slot
- **`Search`** — hero search input in a banner below the nav
- **`ContentSwitch`** — List / Map view toggle above the results
- **`PropertyCard` grid** — sample listing cards with `SaveButton`
- Content area placeholder for the Map view

## Start prototyping

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Hot reloads on save.

## How to add your prototype content

Edit `src/Shell.tsx`. The shell is organized into clear sections:

1. **`SAMPLE_LISTINGS`** — replace or extend with your prototype's listing data
2. **`PlaceholderContent`** — swap in your own component for the Map view (shown when the `ContentSwitch` toggles to Map)
3. **Content area** (`<main>`) — replace the `PropertyCard` grid / Map block with your prototype layout

Keep the `Nav`, `Search`, and `ContentSwitch` (List/Map toggle) in place — these are the shell chrome. Build inside the content area.

## Stack

- React 18 + TypeScript
- **Panda CSS** for tokens and custom-component styling — `css()`, `cva()` from `styled-system/css`; `hstack()`, `vstack()` from `styled-system/patterns`
- Tailwind utility classes for layout/spacing/responsive structure only — never for color
- `@rdc-npm/rdc-ui-v4` — `Search`, `PropertyCard`, `StatusBadge`, `SaveButton`, `Nav`, `Button`, `Chip`, `Avatar`, `ContentSwitch`, `Link`, and icons from `@rdc-npm/rdc-ui-v4/illustrations`

No `RdcUiThemeProvider` needed — tokens are generated at build time. Do NOT use `styled-components`, `rdcUiTheme`, or Tailwind color utilities; custom styling uses Panda semantic tokens (`bg.base`, `text.base`, `text.alternate`, `border.base`, etc.).

> The `dev`/`build` scripts run `panda codegen && panda cssgen --outfile src/panda.css` before Vite. If the shell ever renders unstyled, the server was started before a config change — restart it so `src/panda.css` regenerates.

## Surface rules

- Desktop: max-width `1280px` content container, `24px` horizontal gutter
- Mobile-responsive: grid collapses at `sm` (640px) and `xs` (390px)
- Use rdc-ui-v4 `PropertyCard`, `SaveButton`, `Search`, `ContentSwitch` for consumer UI patterns
- For custom layout between rdc-ui-v4 components: Tailwind utility classes (layout only)
- **Color**: semantic Panda tokens only — no hardcoded hex, no Tailwind color classes
