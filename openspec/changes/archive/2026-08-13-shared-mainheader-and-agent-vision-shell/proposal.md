## Why

The Clients and Home screens draw the shared React `MainHeader`, but Tours and Search each drew their own header *inside* the embedded Leaflet map iframe (`tours-map.html`, `search-map.html`). That meant two header implementations to keep in sync, an Ask action stranded inside the iframe that had to `postMessage` up to reach the assistant panel, and a title/action treatment that read differently from the rest of the app. The fix is to make `MainHeader` the single source of truth on every screen and turn the map pages into pure renderers. Separately, the workspace needed a second agent-facing shell — `agent-vision` — for a parallel RealAssist+ direction, seeded by duplicating `agent-web` so both surfaces start from the same, current codebase (including the newly shared header).

## What Changes

- Render the shared `MainHeader` above **every** screen (Clients, Home, Tours, Search) instead of hiding it on Tours/Search, and remove the duplicate headers the Tours and Search map iframes used to draw — the map pages become pure renderers.
- Move Search's MLS selector and search field out of the iframe into a header **lead region** (`SearchHeaderLead`), rendered in place of the title/count block; the map keeps only its map, chips, and view toggles.
- Let each screen hand the shared header its own content: a `lead` region, per-screen `actions` (Tours' Export / Add to calendar, Search's Save search), and overflow `menuItems`, while Clients keeps its toggle cluster. Tours and Search always render the `ActionBar` (their actions need labelled pills); Clients/Home use it only in the `?ab=b` arm. Split the old `actionBar` prop into `useActionBar` + `showAsk`.
- Pin the primary Ask/FAB action in the `ActionBar` so it never folds into the overflow menu — it collapses to a circle like the rest but always stays at the right of the `•••`.
- Stack the header's count label onto a second line below the title.
- Hide the Tours Vertical/Horizontal view switcher at `<=768px` (the layout is already stacked there).
- Delete the now-dead cross-iframe plumbing: `public/map-actionbar.js`, the `ASK_MESSAGE` ask bridge, and the `?ab=` param forwarding into the frames.
- Add a second agent-facing prototype shell, `agent-vision`, duplicated from `agent-web` at current main (source, tests, configs, public assets, scripts only; generated/ignored artifacts regenerated via `npm ci` + `npm run build`). Package renamed to `agent-vision-shell`.

## Capabilities

### New Capabilities
- `main-header`: The shared header component rendered above every screen — its title/count block, optional lead region, per-screen actions and overflow menu, and the single `ActionBar`/toggle control cluster — so Clients, Home, Tours, and Search all read with one consistent header.

### Modified Capabilities
- `prototype-shells`: The prototype-shell workspace now includes a second agent-facing shell, `agent-vision`, alongside `agent-web` (and the `client-web` / `consumer-web` sibling surfaces), initially duplicated from `agent-web`.

## Impact

- **New shared-header behavior (agent-web):** `agent-web/src/components/MainHeader.tsx` (new `useActionBar`, `showAsk`, `lead`, `actions`, `menuItems` props; count label stacked below title), new `agent-web/src/components/SearchHeaderLead.tsx`, `agent-web/src/components/ActionBar.tsx` (pinned primary action), `agent-web/src/Shell.tsx` (renders one `MainHeader` for every screen; derives per-screen title/count/actions/menu/lead), `agent-web/src/screens/ToursScreen.tsx` and `agent-web/src/screens/SearchScreen.tsx` (reduced to map renderers), `agent-web/src/icons.tsx` (added header/action icons).
- **Map pages:** `agent-web/public/tours-map.html` and `agent-web/public/search-map.html` no longer draw their own header/actions; `agent-web/public/map-actionbar.js` deleted; dead `agent-web/src/askBridge.ts` / `agent-web/src/abParam.ts` code removed.
- **Tests:** `agent-web/tests/action-bar.spec.ts` (drop the MAP_PAGES loop; assert the primary action never folds; add shared-header pill coverage for Tours/Search), `agent-web/tests/tour-flow.spec.ts` (locators repointed to the shell header).
- **New shell (agent-vision):** `agent-vision/` — full Vite + React + TS + Panda shell duplicated from `agent-web` (`src/`, `public/`, `tests/`, `scripts/`, `package.json` renamed `agent-vision-shell`, configs, `README.md`). Excludes `node_modules`, `dist`, `styled-system`, and other generated/ignored artifacts (regenerated on build).
- **Not affected:** `client-web` and `consumer-web`; no product/service code.
