## 1. Foldable action bar

- [x] 1.1 In `agent-web/src/components/ActionBar.tsx`, replace the horizontal scroller with a measured fold. Keep the hidden fully-labelled mirror and measure each pill's expanded width off it; compute the row width for a given `(collapsed, folded)` state against the outer box's own width (flex basis `0`). Verify the fold decision is derived from fixed geometry and does not read the live row it resizes.
- [x] 1.2 Implement the three-stage ladder: full pills → drop labels left-to-right to icon-only circles → fold circles into the overflow menu left-to-right, taking the first state that fits and the menu-alone floor if none do. Verify at a wide width every action is a labelled pill, at a middle width the leftmost actions are icon-only circles, and at a narrow width the leftmost actions have folded into the menu.
- [x] 1.3 Keep the primary (rightmost) action degrading last at each stage so it stays reachable longest. Verify the primary Ask action keeps its label after the others and is the last to fold.
- [x] 1.4 Confirm the row no longer clips its own vertical overflow, so the pills' hover lift and shadow are not sheared off. Verify a hovered pill's lift/shadow renders fully.

## 2. Overflow menu owned by the bar

- [x] 2.1 Make the overflow menu the bar's far-left item at every width and never fold it; own its contents from the bar. Verify the ⋯ menu is always leftmost and present at every width.
- [x] 2.2 Compose the menu contents as the caller's static rows first, then folded actions appended below a hairline separator, each folded row carrying its original pill icon and firing its original handler. Verify a folded action appears as a labelled row under the separator and invoking it does what its pill did.

## 3. One real ⋯ menu everywhere

- [x] 3.1 In `agent-web/src/components/Menu.tsx`, make every "⋯" open the shared `Menu` with `aria-haspopup="menu"` → `role="menu"`/`menuitem`, and add `bare`/`size` props so the subnav's toggles keep their shape. Migrate the subnav header and its list rows (`Subnav.tsx`) to `Menu`, add hand-written equivalents on the map pages, and delete the loose `IconMore` glyph from `icons.tsx`. Verify no bare three-dot glyph remains and each ⋯ opens a real menu.
- [x] 3.2 Ensure opening one menu closes any other, including a keyboard-opened menu. Verify two panels are never on screen at once.

## 4. Dynamic panel placement

- [x] 4.1 Position the menu panel with `position: fixed` so it escapes any clipping ancestor, anchored to open rightward from the toggle, clamped to the viewport with an 8px margin, and flipped above the toggle when there is no room below. Verify at a narrow width the panel stays fully on screen and its labels are not truncated.
- [x] 4.2 Re-place the panel on every render, through the animated reflows (rAF loop), and on `resize` + capture-phase `scroll`, so its fixed coordinates never go stale as the toggle moves. Verify the panel follows the toggle when the subnav closes, the assistant panel docks, or the page scrolls.
- [x] 4.3 Mirror the same placement math on the standalone map pages in `agent-web/public/map-actionbar.js` (`fixed`, open-rightward, clamp, flip-above; repositions on open, resize, scroll). Verify `search-map.html` and `tours-map.html` open their overflow panel on-screen at a narrow width.

## 5. Static nav rail

- [x] 5.1 In `agent-web/src/components/NavRail.tsx`, replace the hover-expand rail with a static fixed-width column (export `RAIL_WIDTH = 64`) that always shows every destination as an icon over its label at 11px; keep `aria-current` on the active cell. Verify the rail is 64px wide and does not widen on hover.
- [x] 5.2 In `agent-web/src/Shell.tsx`, drop the `railMode`/hover/pinned rail-expand state and have the layout math track `RAIL_WIDTH` instead of a literal. Verify no rail-expand state remains and the expanded push panel leaves exactly the rail's width uncovered.
- [x] 5.3 Add `agent-web/src/components/AccountAvatar.tsx` and use it for both the rail's Account cell and the mobile tab bar (`NavBar.tsx`), with a shared initials fallback. Verify the desktop rail and the mobile Account tab show the same headshot.

## 6. Assistant panel default

- [x] 6.1 In `agent-web/src/Shell.tsx`, close the RealAssist+ push panel by default at every width; it opens only via the FAB, an Ask action, or a deep link. Verify the panel is closed on a desktop load and the FAB opens and closes it.

## 7. Playwright coverage

- [x] 7.1 Add `@playwright/test` and `agent-web/playwright.config.ts` (Chromium project; `webServer` boots the Vite dev server on fixed port 4318), and ignore its artifacts in `.gitignore`. Verify the suite boots the app and runs.
- [x] 7.2 Add `agent-web/tests/action-bar.spec.ts` covering the fold ladder on the React bar and both map pages (labelled → circle → folded, primary reachable at every width) and on-screen panel placement at a narrow width. Verify the tests pass.
- [x] 7.3 Add `agent-web/tests/nav-rail.spec.ts` (static 64px rail, no hover widen, active `aria-current`, shared headshot on desktop and mobile) and `agent-web/tests/assistant-panel.spec.ts` (closed by default, FAB opens/closes). Verify the tests pass.

## 8. Verification

- [x] 8.1 Run the app's build/lint in `agent-web` and confirm no type or lint errors are introduced.
- [x] 8.2 Run the Playwright suite and confirm all action-bar, nav-rail, and assistant-panel specs pass.
- [x] 8.3 Confirm the change is confined to `agent-web` (React shell + standalone map pages, tests, and tooling) with no API or data-model change.
