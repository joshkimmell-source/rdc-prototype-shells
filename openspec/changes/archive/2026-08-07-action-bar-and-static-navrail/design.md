## Context

See `proposal.md` — Why. The action bar (variant B of the FAB-placement test, `?ab=b`) laid its actions in a light/dark/brand pill row: secondary toggles first, the primary Ask action rightmost in the RealAssist+ brand gradient. Responsiveness was already measured rather than keyed to a breakpoint — the bar renders a hidden full-width mirror of itself, measures each pill in it, and derives the answer from that fixed geometry so the decision never feeds its own output back as input — but the row itself was a horizontal scroller: it dropped labels left-to-right to icon-only circles, then rested at the end of its scroll range so the primary action stayed visible. Two things went wrong with that. `overflow-x: auto` clips vertical overflow, shearing the pills' hover lift and shadow; and the scroller's leftmost item scrolled away first, so the overflow menu had to be lifted out of the scroller to keep it from vanishing. The shell's other "⋯" marks were inert glyphs, and the standalone `search-map.html` / `tours-map.html` pages — which cannot import the React component and duplicate the bar in `public/map-actionbar.js` — positioned their menu panel with static `right: 0` CSS that grew it leftward off a narrow frame. The nav rail (`NavRail.tsx`) grew 64→192px on hover, driven by `railMode` state threaded through `Shell.tsx`.

## Goals / Non-Goals

**Goals:**
- Keep every action reachable at any width with no horizontal scroller, and stop the row clipping its own vertical overflow so the hover lift survives.
- Degrade the row gracefully and deterministically, primary-action-last, from a fixed measurement that cannot oscillate.
- Make every "⋯" in the shell a single, real, accessible overflow menu whose panel can never be clipped or truncated, wherever the toggle sits.
- Make the rail static and share one headshot across the two navs.
- Cover the width-measured behaviour with a browser-driven test, since the DOM alone cannot express it.

**Non-Goals:**
- No change to the action set, the pill tones (light/dark/brand), or the RealAssist+ brand gradient.
- No new styling paradigm — the shell keeps its inline-`style` + measured-mirror approach; no CSS-in-JS or media queries are introduced.
- The `?ab=b` variant gate is unchanged; this is not a decision to ship the action bar by default.
- No data or API change.

## Decisions

**Decision: Fold, don't scroll — a measured three-stage ladder.**
The bar renders a hidden, fully-labelled mirror, measures each pill's expanded width once, and computes the row width for every `(collapsed, folded)` state against the outer box's own width (flex basis `0`, so its width is a function of the header and title, not of its contents). It walks states in order of increasing degradation — first drop labels left-to-right to `HEIGHT`-wide circles, then, only once every visible action is a circle and the row still overflows, fold circles into the overflow menu left-to-right — and takes the first state that fits, with the menu-alone floor if none do. The primary action is rightmost, so it degrades last at both stages.
- Why: A scroller clips vertical overflow (the hover lift) and can strand actions off-screen. Folding keeps every action reachable and lets the row show its overflow. Measuring off fixed geometry, not the live row, keeps the decision from feeding its own output back as input and oscillating.
- Alternative considered — keep scrolling but resting at the primary end: rejected; it still clips the lift and still hides the leftmost actions behind a scroll.

**Decision: The overflow menu is the bar's far-left item, owned by the bar, and never folds.**
The menu sits leftmost at every width, outside anything that collapses, and the bar composes its contents: the caller's static rows first, then any folded actions appended below a hairline separator, each folded row carrying its original pill icon and firing its original handler.
- Why: It has no label to drop, so it is a fixed cost rather than something to measure; leftmost and un-folding, it is the one control that never has to pay for the row's overflow. Owning its contents in the bar means an open panel updates live as the width changes.

**Decision: One real `Menu`, placed dynamically with `position: fixed`.**
Every "⋯" opens the shared `Menu` (`aria-haspopup="menu"` → `role="menu"`/`menuitem`); the loose `IconMore` glyph is deleted and the subnav header and rows adopt `Menu` via new `bare`/`size` props so they keep their shape. The panel is `fixed` (not `absolute`) so it escapes any clipping ancestor — the action bar hides vertical overflow — and is positioned by hand: anchored to open rightward from the toggle, clamped to the viewport with an 8px margin, flipped above the toggle when there is no room below. It re-places on every render (reflows from the subnav closing or the panel docking fire no event), through the 220ms animated reflows via a `requestAnimationFrame` loop, and on `resize`/capture-phase `scroll`. Opening one menu closes any other, so a keyboard-opened menu cannot leave two panels on screen. The map pages mirror the same math in `map-actionbar.js`.
- Why: An absolute panel is clipped by the scrolling/overflow-hidden ancestor and, aligned `right: 0` to a leftmost toggle, grows off the left edge of a narrow frame and truncates its labels. Fixed + hand-placement + clamping is the only way to guarantee it stays fully on screen wherever the toggle is.
- Alternative considered — delegate to Haven's `Menu`: rejected here to keep the figma-aligned toggle geometry and panel shadow/radius exact.

**Decision: Make the rail static and share the headshot.**
Replace the hover-expand rail with a fixed 64px column (exported as `RAIL_WIDTH`) that always shows icon-over-label at 11px; drop the `railMode`/hover/pinned state from the shell. Extract the agent headshot into `AccountAvatar`, used by both the rail's Account cell and the mobile tab bar, with a shared initials fallback.
- Why: The hover-expand moved the layout under the reader for no functional gain. A single avatar component means the two navs cannot show a different identity.

**Decision: Close the assistant panel by default.**
The RealAssist+ push panel starts closed at every width; the agent opens it via the FAB, an Ask action, or a deep link.
- Why: Docked-open-on-desktop occupied the content on arrival; opening it should be a deliberate act.

## Risks / Trade-offs

- **Fold measurement could oscillate** if it read the live row it resizes. Mitigation: measure only the fully-labelled mirror against the flex-basis-`0` outer box, so the input never changes as the output is applied; verified by the fold-ladder tests at several widths.
- **A `fixed` panel's coordinates go stale the instant the toggle moves.** Mitigation: re-place on every render, on a rAF loop through animated reflows, and on resize + capture-phase scroll; a browser test opens the menu at a narrow width and asserts the panel is fully within the viewport.
- **Two implementations of the bar (React + `map-actionbar.js`) can drift.** Mitigation: the map JS mirrors the component's fold ladder and placement math deliberately, and the Playwright suite exercises all three (React bar + both map pages) against the same contract.
- **Deleting `IconMore` / changing `Menu`'s props** could break a caller still drawing its own glyph. Mitigation: every "⋯" is migrated to `Menu` in the same change; `bare`/`size` keep the subnav's toggles the same shape.
- **Browser-driven tests are heavier than unit tests.** Accepted: the behaviour is width-measured and cannot be asserted from the DOM alone, and the suite doubles as the visual-verification pass.

## Migration Plan

Front-end-only change to the `agent-web` prototype, behind the existing `?ab=b` variant gate for the action bar; no data or API migration. Ship through the normal Vite build. Playwright is added as a dev dependency with its own config and ignored artifacts; run with the app's test script against the Vite dev server (fixed port 4318). Rollback is a straight revert of the listed files.
