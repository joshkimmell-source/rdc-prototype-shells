## Why

The workspace's prototype shells were built for desktop widths. `agent-web` lays itself out as `[nav rail][subnav][main][push panel]` inside a fixed `100vh` column; below a phone width its 64px rail costs a fifth of a 320px screen, and its two side panels — docked open — bury `main` before the first interaction. Anyone opening a shared prototype link on a phone, which is how stakeholders actually review one, gets a broken layout. On top of that the active screen lived only in component state, so a reloaded or shared URL always dropped back to Home.

Separately, the workspace's second shell, `consumer-web`, carried its own four hardcoded listings rather than the shared fictional dataset the other shells read from, and had no launch entry of its own — so it neither matched the rest of the workspace's sample content nor started reliably beside `agent-web`.

## What Changes

- Make `agent-web` responsive across breakpoints. Below 768px the nav rail is replaced by a bottom `NavBar` tab bar, and the subnav and assistant (push) panel leave the flow to become overlays over `main`, so `main` keeps the full viewport width in either layout.
- Start both overlays closed on a phone and collapse them on the way into the mobile layout — a panel docked beside desktop content would otherwise cover all of a 320px screen. Closed overlays flip `visibility` so they drop out of the tab order and the accessibility tree rather than lingering as a zero-width strip of focusable controls. A scrim behind the subnav drawer makes it dismissible by tap, and Escape backs out one overlay at a time.
- Apply narrow-viewport fixes at the screen level: grid `minmax` floors become `min(floor, 100%)` so tracks can't outgrow their container, the Home stage filters become a horizontally scrolling pill row, the Clients tiles split the row, and the embedded maps get their own narrow-viewport rules. The shell root uses `100dvh` so the composer isn't left under collapsing mobile browser chrome.
- Mirror the active top-level screen into the URL as `?view=`, so a linked or reloaded URL lands where it names and Back/Forward walk the destinations. The dev-server HTML-entry middleware carries the query across to the template.
- Seed `consumer-web` from the shared fictional sample dataset instead of four hardcoded listings, and give it a `launch.json` entry of its own so it runs alongside `agent-web`.
- Give each shell a fixed dev-server port so they can run side by side without colliding: `agent-web` starts on 5173, and `consumer-web` is pinned with `--strictPort` on a port clear of the 5173–5175 range Vite auto-walks into when 5173 is taken.

## Capabilities

### Modified Capabilities

- `prototype-shells`: `agent-web` gains a responsive layout across breakpoints and URL-addressable top-level screens; the workspace now hosts a second launchable shell, `consumer-web`, seeded from the shared sample dataset; and each shell's dev server runs on a fixed, non-colliding port.

### New Capabilities

<!-- None. `consumer-web` is an additional shell within the existing `prototype-shells` capability, not a separate capability. -->

## Impact

- **Affected code (agent-web shell):** `agent-web/src/Shell.tsx` — mobile/desktop branching, the subnav and push panel as overlays, the scrim, Escape handling, `?view=` sync, the `100dvh` root class, the floating map trigger, and `NavBar` in the footer.
- **Affected code (agent-web, new modules):** `agent-web/src/useMobile.ts` (the `(max-width: 768px)` watcher — `MOBILE_QUERY`, `isMobileViewport`, `useIsMobile`), `agent-web/src/navParam.ts` (`?view=` read/write, guarded for `file://`), and `agent-web/src/components/NavBar.tsx` (the bottom tab bar, reusing the rail's exported `NAV_ITEMS`).
- **Affected code (agent-web components/screens):** `NavRail.tsx` (export `NAV_ITEMS`, drop the mobile-click branch), `Subnav.tsx` (`drawerMax` overlay-drawer mode), `MainHeader.tsx` (`mobile` prop, wrapping, drawer button), `panels/AssistantPanel.tsx` (`open`/`mobile` props, `visibility`, full-screen overlay), `screens/HomeScreen.tsx` and `screens/ClientsScreen.tsx` (responsive grids, scrolling pill row, split tiles), and `shell.css` (`.ra-shell` `100dvh`).
- **Affected assets (agent-web):** `public/search-map.html` and `public/tours-map.html` gain narrow-viewport media queries; `vite.config.ts` carries the query string through the `dev-html-entry` middleware and reads `PORT`.
- **Affected code (consumer-web shell):** `consumer-web/src/Shell.tsx` now reads listings from the shared dataset, plus new `consumer-web/src/data/sample/` files (`adapters.ts`, `index.ts`, `sample-data.json`).
- **Workspace config:** `.claude/launch.json` — `agent-web` gains `autoPort`, and `consumer-web` gets its own `--strictPort` entry on a non-colliding port.
- **Not affected:** `agent-vision` and any non-shell surfaces.
