## Context

See `proposal.md` — Why. Today the "Ask RealAssist+" trigger in `agent-web` is a single floating action button (`FAB.tsx`) that the `Shell` pins to the bottom-right corner; it steps aside only while a push panel or mobile drawer is open. The trigger opens the assistant push panel. Content pages render a `MainHeader` above the active screen with a cluster of icon-only toggle circles (bell / flame / chart / star on Clients) plus a `•••` menu; Search and Tours are the exception — they hand their entire viewport to a Leaflet map served from `public/search-map.html` and `public/tours-map.html` and embedded via `<iframe>`, so they show no `MainHeader`. Those map pages are standalone documents that cannot import the app's modules. We want to compare the corner FAB against an inline header placement in live sessions without any visible experiment control.

## Goals / Non-Goals

**Goals:**
- Let a single `?ab=` query parameter select where the Ask trigger is placed, read once and fixed for the session.
- Keep variant `a` byte-for-byte the shipped experience (corner FAB), and make it the fallback for any unknown or missing value.
- In variant `b`, place the same action inline: as the primary item of a header `ActionBar` on pages that have a header, and in the map top bar for the two full-viewport map screens.
- Present the same control as the same control across all four surfaces (FAB, header pill, Search map pill, Tours map pill) — one brand gradient, one geometry.
- Avoid any on-screen switcher or written-back state that would reveal the test to participants.

**Non-Goals:**
- No change to `agent-vision`; this test lives only in `agent-web`.
- No third variant, no runtime toggle, and no persistence beyond reading the URL at load.
- No change to what the assistant panel contains or to how it is closed (its own ✕).
- No analytics/telemetry wiring is defined here — this change delivers the placement mechanism, not measurement plumbing.

## Decisions

**Decision: Select the variant from a read-only `?ab=` query parameter, fixed for the session.**
`abParam.ts` exposes `readAbParam()`, which parses `?ab=`, lower-cases it, and returns it only if it is in the known set `['a', 'b']`; otherwise it returns the default `a`. `Shell` reads it once into `useState(readAbParam)` so it never changes mid-session; a reload with a different `?ab=` is the only way to switch arms.
- Why: Switching arms mid-test would defeat the purpose, and an on-screen switcher would tell testers they are in a test. Reading from the URL lets a link fully determine the experience.
- Alternative considered — a persisted flag or an in-app toggle: rejected. Persistence risks a stale arm across sessions, and a toggle is a visible experiment control.

**Decision: Default and fall back to variant `a` (the corner FAB) for unknown or absent values.**
`a` is the shipped behavior, so an empty, misspelled, or unexpected `?ab=` value renders the product exactly as it ships today rather than a broken or undefined state.
- Why: A typo in a tester's URL must never put them on a third, undefined variant.

**Decision: In variant `b`, replace the header control cluster with a measured `ActionBar` and hide the FAB.**
`MainHeader` renders `ActionBar` instead of the icon-only cluster when the arm is `b`; `Shell` computes `fabVisible = !actionBar && ...` so the corner is empty in arm `b`. The Ask action is appended last (right end of the row, echoing the FAB's corner), rendered in the brand gradient as the primary item.
- Why: One arm should have exactly one Ask trigger. Keeping Ask last preserves the toggles' existing order and mirrors the corner placement.

**Decision: Collapse the action bar by measurement, not by breakpoint, and degrade gradually.**
`ActionBar` renders a hidden full-width mirror of every labelled pill, measures each, and drops labels one at a time from the left until the live row fits; collapsed pills become circles with tooltips. It re-measures via `ResizeObserver` on the row and the mirror and after `document.fonts.ready`.
- Why: The available width depends on the page title, the nav rail, and the width the user has dragged the assistant panel to — none of which a media query can see. Dropping from the left keeps the primary Ask action labelled longest so the row degrades instead of jumping to icon-only.

**Decision: Open (not toggle) the panel, and drop the Ask trigger while the panel is open.**
The header/map Ask action calls `openPush` (open only). The action is omitted from the row while `askOpen` is true.
- Why: A header button that also closed the panel would duplicate the panel's own ✕ and the two could disagree about state; and offering "open" for something already on screen says nothing. Dropping it also frees width for the toggles' labels.

**Decision: Bridge the framed map screens with same-origin postMessage.**
Search and Tours own their viewport via an iframe, so their Ask button lives in the map's own top bar. `withAbParam` forwards `?ab=` onto the iframe `src` so the frame renders the matching arm. `askBridge` defines two messages: `ra:ask` posted up on click (handled by `Shell`'s listener, bound only in arm `b`) and `ra:ask-visible` posted down (via `useAskVisibility`, also on frame load) so the framed button hides while the panel is open. Both sides check `event.origin` against the app origin.
- Why: The button is in a different document from the panel it opens. A message bridge is the only way to carry the intent up and the state back down, and the origin check keeps anything else from driving the panel.

**Decision: Share one brand gradient and one control geometry across all four surfaces.**
The gradient is lifted into `BRAND_GRADIENT` (FAB circle) and `BRAND_GRADIENT_PILL` (wide pill) in `theme.ts`; `IconRealAssist` is fixed to scale via its `viewBox`; and the map pages duplicate the pill geometry (36px tall, 16px sides, 13px label, 16px icon) because they cannot import the app's modules.
- Why: The point of the test is a placement difference, so the control must read as the same thing in each spot rather than as different buttons. The duplicated numbers must be changed together.

## Risks / Trade-offs

- **Duplicated geometry drifts** — the pill dimensions and the RealAssist+ mark are copied into `search-map.html`, `tours-map.html`, and `ActionBar.tsx`. Mitigation: the shared numbers are documented in-file as a set that must be changed together; the brand gradient is a single token.
- **postMessage timing/security** — an effect that posts before the frame's listener has parsed would post into nothing, and a message from another origin should never drive the panel. Mitigation: `useAskVisibility` also posts on the frame's `onLoad`, and both ends verify `event.origin`.
- **Measured collapse could oscillate** — deriving the fit from the live (already-collapsing) row could feed back on itself. Mitigation: measurements are taken from a stable full-width mirror whose inputs do not change as the live row collapses.
- **Overflow reachability** — below the point where even the circles overflow, the row rests scrolled to its end so the primary Ask action is what is visible without scrolling; the fixed auto-left-margin change keeps the overflow on the scrollable end and out of the unreachable start edge.
- **Unknown `?ab=` values** — mitigated by the strict allow-list fallback to `a`.

## Migration Plan

Front-end-only change scoped to `agent-web`, with no data or API migration. Variant `a` is unchanged from what ships, so with no `?ab=` present the app behaves exactly as before; the new behavior is reached only by opening a link with `?ab=b`. Deploy through the normal front-end build. Rollback is a straight revert of the added files (`abParam.ts`, `askBridge.ts`, `ActionBar.tsx`) and the edits to `Shell.tsx`, `MainHeader.tsx`, `FAB.tsx`, `theme.ts`, `icons.tsx`, the two screens, the two map HTML pages, and `shell.css`.
