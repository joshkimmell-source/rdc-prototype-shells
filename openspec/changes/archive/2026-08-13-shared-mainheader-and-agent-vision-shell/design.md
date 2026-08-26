## Context

See `proposal.md` — Why. Before this change, `MainHeader` was rendered only on Clients and Home; it was hidden on Tours and Search (`visible={!isSearch && !isTours}`), which handed their whole viewport to an embedded Leaflet map. Each map page (`tours-map.html`, `search-map.html`) therefore drew its *own* header, actions, and — for Search — the MLS selector and search field, inside the iframe. Because those in-iframe action bars could not touch the React assistant panel directly, an `ASK_MESSAGE` `postMessage` bridge (`askBridge.ts`) and a `?ab=` param forwarded into the frame (`abParam.ts`, `map-actionbar.js`) carried the interaction across the boundary. The single `actionBar` boolean prop on `MainHeader` both selected the `ActionBar` control cluster and implied the inline Ask action. Titles were a single `<h1>` with the count label inline.

Separately, the workspace had three shells from the original `prototype-shells` change — `agent-web` (the primary agent-facing surface), `client-web`, and `consumer-web`. A second agent-facing direction needed its own shell without diverging from the current `agent-web` code.

## Goals / Non-Goals

**Goals:**
- Make `MainHeader` the single source of truth for the header on every screen (Clients, Home, Tours, Search); the map iframes render only the map.
- Let each screen supply its own header content (lead region, per-screen actions, overflow menu) through props while keeping one shared structure and one shared `ActionBar`.
- Remove the cross-iframe Ask plumbing now that the Ask action lives in the React header for all screens.
- Add an `agent-vision` shell that starts identical to `agent-web` (a duplicate), so it inherits the shared header and can diverge later.

**Non-Goals:**
- No change to the Leaflet maps' own content (routes, chips, view toggles) beyond removing their header/action chrome.
- No new styling system: the header keeps the existing inline-style + primitives approach.
- `client-web` and `consumer-web` are untouched; `agent-vision` is not yet differentiated from `agent-web` in this change.

## Decisions

**Decision: Render one `MainHeader` for every screen; make the map pages pure renderers.**
`MainHeader` is always `visible`; Tours and Search stop drawing their own headers inside the iframe. The shell derives each screen's `title`, `countLabel`, `lead`, `actions`, and `menuItems` and passes them in, so the header reads identically everywhere.
- Why: One header implementation, one place for the Ask action, and a consistent title/action treatment across screens.
- Alternative — keep per-screen headers and only unify styling: rejected; it leaves two implementations and the cross-iframe Ask bridge in place.

**Decision: Merge Search's MLS selector and field into a header `lead` region (`SearchHeaderLead`).**
The header takes an optional `lead: ReactNode`; when set, it renders in place of the title/count block and shrinks-but-never-grows so it hands free width to the `ActionBar` beside it. Search passes `SearchHeaderLead`; the map keeps only map/chips/toggles.
- Why: Puts Search's controls in the same header as every other screen while leaving the map as a pure renderer.

**Decision: Split the single `actionBar` prop into `useActionBar` + `showAsk`, and let screens pass `actions`/`menuItems`.**
`useActionBar` chooses the `ActionBar` control cluster (true for Tours/Search in either arm — their labelled pills need it — and for Clients/Home under `?ab=b`); `showAsk` includes the inline Ask action (only in the `?ab=b` arm, since the FAB arm floats it in the corner). Per-screen `actions` render before Ask; `menuItems` default to the Clients set and are overridden by Tours/Search.
- Why: The two concerns were conflated; Tours/Search need the bar without necessarily showing the inline Ask, and each screen needs to inject its own controls.

**Decision: Pin the primary Ask/FAB action in the `ActionBar` so it never folds.**
The `ActionBar` still drops labels left-to-right then folds circles into the overflow menu, but folding now stops one short of the rightmost brand-toned (primary) action. That action collapses to a circle at narrow widths but always stays visible at the right of the `•••`.
- Why: The assistant should always be one click away; folding it into a menu buried the primary action.

**Decision: Stack the count label below the title; hide the Tours switcher on mobile.**
The title block becomes a two-line column (title, then count label on its own line). The Tours Vertical/Horizontal view switcher is hidden at `<=768px` where the layout is already stacked.
- Why: Small visual polish that reads better and avoids a redundant control on mobile.

**Decision: Seed `agent-vision` as a duplicate of `agent-web`.**
Copy `agent-web`'s tracked source, tests, configs, public assets, and scripts into `agent-vision`; rename the package to `agent-vision-shell`. Leave out `node_modules`, `dist`, `styled-system`, and other generated/ignored artifacts — they are regenerated via `npm ci` + `npm run build`.
- Why: Starting from the current `agent-web` (including the shared header) gives the new agent-facing surface a known-good baseline to diverge from, without hand-porting.

## Risks / Trade-offs

- **Regression on screens that gained the header** — Tours and Search now show the shell header for the first time; verify layout, title/count, and actions read correctly and the map still fills the remaining viewport. Mitigation: shared-header test coverage for Tours/Search pills and repointed tour-flow locators.
- **Lost cross-iframe Ask path** — deleting the `ASK_MESSAGE` bridge and `?ab=` forwarding means anything relying on the in-frame Ask is gone. Mitigation: the Ask action now lives in the React header on every screen, so the bridge is dead code.
- **`agent-vision` starts as a near-exact copy of `agent-web`** — the two will drift and must be maintained separately from here on. Mitigation: intentional — the duplicate is the seed for an independent direction, not a shared library.
- **Duplicated artifacts must rebuild cleanly** — since generated files were excluded, `agent-vision` must build from a clean `npm ci`. Mitigation: only tracked source/config/assets/scripts were copied; the build regenerates the rest.

## Migration Plan

Front-end-only change. For the shared header: deploy through the normal `agent-web` build; rollback is a revert of the `MainHeader`/`Shell`/screens/`ActionBar` edits and restoration of the deleted iframe header plumbing. For `agent-vision`: run `npm ci` then `npm run build` in the new directory to regenerate `node_modules`, `styled-system`, and `dist`; the shell is otherwise self-contained and does not affect the other shells.
