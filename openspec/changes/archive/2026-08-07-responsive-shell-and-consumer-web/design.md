## Context

See `proposal.md` — Why. The `agent-web` shell renders `[nav rail][subnav][main][push panel]` in a flex column that was fixed at `100vh`. Layout is done with inline `style` objects and theme tokens; there is no responsive framework and no router — the active top-level screen lived in `Component`-style React state (`activeNav`) and nothing else. A single `matchMedia('(max-width: 768px)')` read already existed, but only to switch the nav rail from hover to click. The subnav and the assistant push panel were both in the document flow, reserving a column beside `main`, and both defaulted open.

`consumer-web` is the workspace's second shell — a consumer-facing (homebuyer/renter) prototype built on `@rdc-npm/rdc-ui-v4`. It already existed as a scaffold but rendered four listings hardcoded into `Shell.tsx`, and had no dev-server launch entry, so it did not participate in the workspace the way `agent-web` did. The `inject-dummy-data` skill produces a shared fictional dataset (`data/sample/index.ts` + `sample-data.json`) that the agent-facing shells already consume.

Both shells run under Vite. The workspace launcher (`.claude/launch.json`) starts each shell's dev server; Vite's default port is 5173 and it auto-walks to the next free port (5174, 5175, …) when that is taken.

## Goals / Non-Goals

**Goals:**
- Make `agent-web` usable from ~320px up to desktop without breaking its desktop layout, keeping `main` at full viewport width in either mode.
- Keep the change inside the existing inline-style + component-state approach — no router, no CSS framework, no new styling paradigm.
- Preserve keyboard and assistive-technology behavior: closed overlays leave the tab order and the a11y tree, and the drawer is dismissible without hunting for a close control.
- Make top-level screens linkable and reload-safe.
- Bring `consumer-web` into the workspace as a launchable shell seeded from the shared dataset, and make both shells start reliably side by side.

**Non-Goals:**
- No responsive work on `agent-vision` or any other surface — only `agent-web` and the `consumer-web` seeding.
- No general-purpose client-side router; `?view=` covers only the top-level destination.
- No change to the shared sample dataset's shape or to the `inject-dummy-data` skill.
- No visual redesign of the desktop layout; the mobile layout is an adaptation of it, not a new design.

## Decisions

**Decision: One shared viewport watcher, read synchronously for the first paint.**
`useMobile.ts` centralizes the `(max-width: 768px)` query as `MOBILE_QUERY`, a synchronous `isMobileViewport()` and a `useIsMobile()` hook. Several components below `Shell` need the answer, so the listener lives in one place instead of being duplicated. The initial state is read synchronously because the overlays default closed on mobile, and deciding that a frame late would flash the full-screen assistant panel across the viewport before it collapsed.
- Alternative — keep the inline `matchMedia` in `Shell` and thread a boolean down: rejected; the same query is now load-bearing in several components and the duplication would drift.

**Decision: Below 768px, move navigation to a bottom tab bar and the side panels to overlays.**
The rail's 64px column and the two docked panels each claim width a 320px screen cannot spare, so the rail is replaced by `NavBar` (a footer tab bar within thumb reach) and the subnav and push panel leave the flow to slide over `main`. `main` therefore keeps the full viewport width in both layouts. `NavBar` reuses the destinations and icons exported from `NavRail` (`NAV_ITEMS`) so the two navigations cannot drift apart; the rail's inert entries have no screen behind them and stay out of the bar.
- Alternative — shrink the desktop layout in place (narrower rail, collapsible panels): rejected; three columns cannot coexist legibly at 320px regardless of width.

**Decision: Toggle overlays with `visibility`, not just width/transform.**
A closed panel kept at zero width still leaves its controls in the tab order and the a11y tree — at mobile width that is a whole hidden screen of focusable elements. Closed overlays flip `visibility: hidden`, held until the close transition ends so the panel animates out rather than vanishing, then drop out of the tab order. A scrim behind the subnav drawer makes it dismissible by tap (its own close control can be the least obvious target at 320px), and Escape backs out one overlay at a time, topmost first.

**Decision: Fix narrow-viewport overflow at the track level with `min(floor, 100%)`.**
Grid tracks used bare `minmax(320px, 1fr)` / `minmax(288px, 1fr)` floors that, below the floor, grow wider than the container and overflow. Replacing the floor with `min(floor, 100%)` lets the track collapse to the container instead. Where reflow is impossible — the six-column client table — the content keeps a fixed floor and scrolls sideways inside a `min-width: 0` wrapper. The Home stage-filter column becomes a horizontally scrolling pill row rather than being dropped. Maps are iframed HTML, so each gets its own `@media (max-width: 768px)` block.

**Decision: `100dvh` for the shell root, with `100vh` as the fallback.**
Mobile browser chrome collapses on scroll; a `100vh` root leaves the assistant composer under the address bar. `.ra-shell` sets `height: 100vh` then `height: 100dvh`, so engines with dynamic viewport units track the chrome and older engines keep the static fallback.

**Decision: Mirror the top-level screen into `?view=` instead of adding a router.**
`navParam.ts` reads `?view=` on load (unknown/missing → Home) and pushes a history entry on navigation, so Back/Forward walk the destinations and a shared or reloaded URL lands where it names. Home writes no parameter, keeping the bare URL clean. `pushState` is wrapped in try/catch because it throws on a `file://` document — how the single-file `npm run bundle` artifact is opened — where the URL simply stops tracking. The Vite `dev-html-entry` middleware had to start carrying the query across so `/?view=clients` reaches the template like a bare `/`.

**Decision: Seed `consumer-web` through an adapter, not by editing the generated dataset.**
`consumer-web` reads the shared dataset but its `PropertyCard` grid wants a different shape (two address lines, decimal baths, consumer-facing status wording). `data/sample/adapters.ts` is the seam: it maps the structured `Listing` records to the card's `ConsumerListing` shape and derives the results-page location and count from the dataset itself. The skill overwrites `index.ts` and `sample-data.json` on every run but leaves `adapters.ts` alone, so anything prototype-specific belongs there.

**Decision: Give each shell a fixed port and move `consumer-web` clear of Vite's auto-walk range.**
Both shells needed to start together. `agent-web` keeps 5173 with `autoPort` (and reads `PORT`, since Vite ignores it, so the launcher can hand over the port it picked). `consumer-web` is pinned with `--strictPort`. It was first placed on 5174 — but 5174 is exactly what Vite walks to for `agent-web` when 5173 is taken, so starting `agent-web` first left `consumer-web`'s strict-port launch failing. `consumer-web` moved to 5176, out of the 5173–5175 range Vite reaches into.
- Alternative — give `consumer-web` `autoPort` too: rejected; a strict, known port keeps its launch entry deterministic and its URL stable.

## Risks / Trade-offs

- **First-paint layout flash** — an async viewport read would flash the desktop layout (or the open panels) before collapsing on mobile. Mitigation: `isMobileViewport()` is read synchronously for the initial state.
- **Hidden focusable controls** — an off-canvas overlay left in the tab order is an invisible trap. Mitigation: `visibility: hidden` on close removes it from the tab order and a11y tree; verify tabbing on a phone reaches only visible controls.
- **`100dvh` support** — engines without dynamic viewport units fall back to `100vh` and keep the pre-existing behavior; no regression, only the improvement is conditional.
- **`?view=` on `file://`** — `pushState` throws there; wrapped so the bundled single-file artifact still renders, just without URL tracking.
- **Port contention** — the first port choice (5174) collided with Vite's auto-walk target; resolved by moving `consumer-web` to 5176. Future shells must be assigned ports outside the 5173–5175 auto-walk band.
- **Adapter vs. regenerated data** — re-running `inject-dummy-data` overwrites `index.ts`/`sample-data.json`; `adapters.ts` is intentionally outside that blast radius so the mapping survives.

## Migration Plan

Front-end and workspace-config change only — no data or API migration. Ship through the normal Vite build for both shells. `consumer-web` picks up the shared dataset on next build; its four hardcoded listings are removed in the same change. Rollback is a straight revert of the listed files, including the `.claude/launch.json` entries; reverting restores the desktop-only `agent-web` layout, the hardcoded `consumer-web` listings, and removes the second launch entry.
