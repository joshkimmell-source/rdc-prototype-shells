## 1. Shared viewport watcher

- [x] 1.1 Add `agent-web/src/useMobile.ts` exporting `MOBILE_QUERY` (`(max-width: 768px)`), a synchronous `isMobileViewport()`, and a `useIsMobile()` hook. Verify the initial state is read synchronously so the first paint is already correct, and that a `matchMedia` `change` listener keeps it current.
- [x] 1.2 Replace `Shell`'s inline `matchMedia` state with `useIsMobile()`. Verify resizing across 768px flips the layout and no duplicate listeners remain.

## 2. Mobile navigation

- [x] 2.1 Export `NAV_ITEMS` from `agent-web/src/components/NavRail.tsx` and drop the `isMobile` branch from its hover-vs-click logic (the rail is desktop-only now). Verify the desktop rail is unchanged.
- [x] 2.2 Add `agent-web/src/components/NavBar.tsx` — a bottom tab bar reusing `NAV_ITEMS` and the account footer, exporting `NAV_BAR_HEIGHT`. Verify it renders the same destinations/icons as the rail and marks the active tab with `aria-current="page"`.
- [x] 2.3 In `Shell`, render `NavRail` only above the breakpoint and `NavBar` in the footer below it, outside the content row so it takes height from `main` rather than overlaying it. Verify `main` keeps full width in both layouts and the assistant FAB is lifted clear of the bar on mobile.

## 3. Side panels as overlays

- [x] 3.1 Give `Subnav` a `drawerMax` mode: below the breakpoint it leaves the flow and slides in over `main`, capped so a strip of scrim stays tappable, using `visibility` to stay out of the tab order while off-canvas. Verify it docks in flow on desktop and overlays on mobile.
- [x] 3.2 Add `open` and `mobile` props to `AssistantPanel`: drive `visibility` from `open` (held until the close transition ends) and render a full-screen overlay with no expand control on mobile. Verify a closed panel exposes no focusable controls.
- [x] 3.3 In `Shell`, default the subnav and push panel open on desktop and closed on a phone, and collapse both on the way into the mobile layout. Verify neither overlay buries `main` on first load at phone width.
- [x] 3.4 Add the scrim behind the subnav drawer (tap to dismiss) and an Escape handler that backs out one overlay at a time, topmost first. Add the floating map trigger for Tours on mobile. Verify tap-scrim and Escape both close overlays and the Tours list is reachable over the map.

## 4. Responsive screens and assets

- [x] 4.1 In `MainHeader`, add a `mobile` prop for tighter gutters and wrapping the control group below the title; extract the drawer button. Verify the title and controls no longer squeeze off-screen at 320px.
- [x] 4.2 In `HomeScreen`, make the stat/tour grids use `auto-fit` with `min(floor, 100%)` tracks and turn the stage filters into a horizontally scrolling pill row; keep the client table on its fixed floor scrolling sideways. Verify no track overflows the container and the table scrolls rather than the page.
- [x] 4.3 In `ClientsScreen`, split the tile pair across the row on mobile and switch the listing grid to `minmax(min(288px, 100%), 1fr)`. Verify the tiles and cards fit at 320px.
- [x] 4.4 Add `.ra-shell { height: 100vh; height: 100dvh; }` to `shell.css` and apply the class to the shell root. Verify the composer stays clear of collapsing mobile browser chrome.
- [x] 4.5 Add `@media (max-width: 768px)` rules to `public/search-map.html` and `public/tours-map.html` so the map headers wrap and the tours split reverts to stacked. Verify both maps are usable at narrow width.

## 5. URL-addressable screens

- [x] 5.1 Add `agent-web/src/navParam.ts` — read `?view=` on load (unknown/missing → Home), push a history entry on navigation, write no parameter for Home, and guard `pushState` for `file://`. Verify a reloaded/shared URL lands on the named screen and Back/Forward walk destinations.
- [x] 5.2 Seed `activeNav` from `readNavParam`, write on every `navigate`, and handle `popstate`. Verify navigation stays in sync with the URL and history.
- [x] 5.3 Update the Vite `dev-html-entry` middleware to carry the query string across to the template. Verify `/?view=clients` reaches `dev.html` like a bare `/`.

## 6. Seed consumer-web from the shared dataset

- [x] 6.1 Add `consumer-web/src/data/sample/index.ts` and `sample-data.json` (the shared fictional dataset) and `consumer-web/src/data/sample/adapters.ts` mapping `Listing` records to the card's `ConsumerListing` shape plus derived `searchLocation`, `resultCount`, and `initialSavedIds`. Verify `adapters.ts` sits outside the skill's overwrite path.
- [x] 6.2 Replace `consumer-web/src/Shell.tsx`'s four hardcoded listings, count, location, and status wording with the adapter values. Verify the grid, heading, and results meta all read from the dataset.

## 7. Dev-server ports

- [x] 7.1 Add a `consumer-web` entry to `.claude/launch.json` with `--strictPort`, and set `agent-web` to `autoPort` on 5173; make `vite.config.ts` read `PORT` so the launcher can hand over the port it picked. Verify both shells launch from the workspace.
- [x] 7.2 Move `consumer-web` off 5174 (Vite's auto-walk target when 5173 is taken) to 5176, out of the 5173–5175 range. Verify `consumer-web`'s strict-port launch succeeds even when `agent-web` is started first.

## 8. Verification

- [x] 8.1 Build/lint both shells (`agent-web`, `consumer-web`) and verify no type or lint errors are introduced.
- [x] 8.2 Manually verify `agent-web` at ~320px, ~768px, and desktop: bottom tab bar vs. rail, overlay vs. docked panels, `main` at full width, no horizontal overflow, and the composer clear of mobile browser chrome.
- [x] 8.3 Verify accessibility: closed overlays expose no focusable controls, the scrim and Escape both dismiss, and the active tab/screen is programmatically indicated.
- [x] 8.4 Verify `consumer-web` renders the shared sample listings and that both shells run side by side on their fixed ports.
