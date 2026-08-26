## Why

The agent-web shell's action bar (variant B, `?ab=b`) put its actions in a horizontal scroller. The scroller's `overflow-x: auto` clipped the pills' vertical hover lift and its shadow, its right-end rest position could push the overflow menu off the left edge, and below ~430px the actions simply scrolled out of reach. Its "⋯" was a bare glyph, not a real menu, and the same was true of the other three-dot marks in the shell (the subnav header, its list rows, the standalone map pages) — none opened anything, and the ones that did place a panel used static CSS (`position: absolute; right: 0`) that grew leftward off a narrow frame and truncated its own labels. The nav rail, meanwhile, grew from 64px to 192px on hover, an incidental motion that moved the layout out from under whatever the agent was reading. None of this was covered by a browser-driven test, so width-measured behaviour could regress silently.

## What Changes

- Replace the action bar's horizontal scroller with a measured three-stage fold: full labelled pills, then icon-only circles dropped left-to-right, then circles folded into the overflow menu left-to-right — the primary (rightmost) action degrading last at each stage so it stays reachable longest. Folding rather than scrolling keeps every action reachable at any width and stops the row clipping its own vertical overflow (the hover lift and shadow survive).
- Make the overflow menu the bar's far-left item at every width and own it from the bar, so overflowing actions append into it as labelled rows beneath a separator; the menu never folds and so is the one control that never pays for the row's overflow.
- Make every "⋯" in the shell a real overflow menu (`aria-haspopup="menu"` → `role="menu"`/`menuitem`): the subnav header and its rows adopt the shared `Menu`, the standalone map pages get a hand-written equivalent, and the loose `IconMore` glyph is deleted.
- Place the menu panel dynamically so it can never truncate: `position: fixed` to escape any clipping ancestor, anchored to open rightward from the toggle, clamped to the viewport with an 8px margin, and flipped above the toggle when there is no room below. It re-places on every render, through animated reflows, and on resize/scroll. The map pages mirror the same placement in `map-actionbar.js`.
- Make the nav rail static: a fixed 64px column that always shows every destination as an icon over its label (11px), with no hover-expand. The shell no longer tracks a rail-expand state.
- Share the agent headshot between the rail's Account cell and the mobile tab bar through a new `AccountAvatar` component so the two navs cannot drift.
- Close the RealAssist+ assistant panel by default at every width; the agent opens it deliberately (FAB, an Ask action, a deep link) rather than it occupying the content on arrival.
- Add Playwright end-to-end coverage that drives a real browser at real widths for all of the above: the fold ladder on the React bar and both map pages, on-screen menu placement, the static rail, the shared avatar, and the panel default.

## Capabilities

### New Capabilities
- `action-bar`: The agent-web shell's foldable action bar and its overflow menu, the shell's three-dot ("⋯") overflow-menu behaviour and dynamic panel placement, and the static navigation rail.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **Affected code (React shell):** `agent-web/src/components/ActionBar.tsx` (scroller → measured fold, menu owned by the bar), `agent-web/src/components/Menu.tsx` (dynamic `fixed` placement, flip-above, single-open, icons/separator rows, `bare`/`size` toggle variants), `agent-web/src/components/Subnav.tsx` (header + rows adopt `Menu`), `agent-web/src/components/NavRail.tsx` (static 64px column), `agent-web/src/components/AccountAvatar.tsx` (new shared headshot), `agent-web/src/components/NavBar.tsx` (mobile Account tab uses the shared avatar), `agent-web/src/components/MainHeader.tsx`, `agent-web/src/Shell.tsx` (drop rail-expand state, panel closed by default, layout math tracks `RAIL_WIDTH`), `agent-web/src/icons.tsx` (delete `IconMore`), `agent-web/src/data.ts`.
- **Affected code (standalone map pages):** `agent-web/public/map-actionbar.js` (vanilla-JS fold ladder + dynamic panel placement), `agent-web/public/search-map.html`, `agent-web/public/tours-map.html`.
- **Testing / tooling (new):** `agent-web/playwright.config.ts`, `agent-web/tests/action-bar.spec.ts`, `agent-web/tests/nav-rail.spec.ts`, `agent-web/tests/assistant-panel.spec.ts`; `package.json`/`package-lock.json` add `@playwright/test`; `.gitignore` ignores its artifacts.
- **Scope:** limited to the `agent-web` app (React shell and its standalone map pages). No API or data-model change.
