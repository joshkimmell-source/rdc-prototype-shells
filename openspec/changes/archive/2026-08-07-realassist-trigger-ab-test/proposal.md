## Why

The "Ask RealAssist+" trigger currently lives in one place only: a floating action button (FAB) fixed to the bottom-right corner of the viewport. We want to learn whether that corner is the best home for the action or whether placing it inline in each page's header — where it sits beside the page's other controls — gets it used more. To test this without telling participants they are in a test, we need a way to serve two placements of the same action to different sessions, chosen up front and left fixed, driven entirely by the URL.

## What Changes

- Introduce a URL-driven A/B test in `agent-web`: a `?ab=` query parameter selects which placement of the "Ask RealAssist+" trigger a session sees. The value is read once at startup and fixed for the life of the session.
- Define two placement variants:
  - **`a` (default):** the floating FAB in the bottom-right corner — the existing, shipped placement, unchanged.
  - **`b`:** the same action moved inline into every content page's header as the primary item of a new `ActionBar` component; the corner FAB is hidden in this arm.
- Fall back to variant `a` for any unknown or absent `?ab=` value, so a typo in a tester's link cannot land them on an undefined placement.
- Read the parameter only — nothing in the UI writes it back and there is no on-screen switcher, so a participant sees a finished product rather than a visible experiment control.
- In variant `b`, header pages render the trigger through `ActionBar`, which collapses its labels by measurement (dropping labels one at a time from the left so the primary Ask action keeps its label longest, and turning collapsed items into circles with tooltips), and the trigger drops out while the assistant panel it opens is already on screen.
- In variant `b`, the Search and Tours screens — which hand their whole viewport to an embedded map iframe — render the Ask control inside the iframe's own top bar. The `?ab=` value is forwarded into the iframe, and an `askBridge` postMessage channel carries the click up to the shell and the panel's open/closed state back down so the framed button can hide while the panel is showing.
- Fold three fixes surfaced by the arm-`b` work: the action row's overflow is sent off the end edge (where LTR can scroll it) via an auto left margin; `IconRealAssist` scales via its `viewBox` instead of being clipped in a fixed box; and the Tours map pill geometry is aligned so the Ask control is the same size on Search and Tours at a given viewport.

## Capabilities

### New Capabilities
- `realassist-trigger`: The placement of the "Ask RealAssist+" trigger in `agent-web` and the `?ab=` A/B mechanism that selects it — the variants, the default/fallback behavior, and where each variant renders the trigger (corner FAB, inline header action bar, or framed map top bar).

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **Affected code (agent-web):**
  - `agent-web/src/abParam.ts` (new) — reads `?ab=`, defines the `AbVariant` type, the default/fallback, and `withAbParam` for forwarding the value onto iframe URLs.
  - `agent-web/src/askBridge.ts` (new) — the `ra:ask` / `ra:ask-visible` postMessage contract and the `useAskVisibility` hook for the framed maps.
  - `agent-web/src/components/ActionBar.tsx` (new) — the measured, self-collapsing labelled control row used by variant `b`.
  - `agent-web/src/Shell.tsx` — reads the variant once, hides the FAB in arm `b`, opens the panel via `openPush`, binds the postMessage listener, and passes the variant/`askOpen` state to `MainHeader`, `SearchScreen`, and `ToursScreen`.
  - `agent-web/src/components/MainHeader.tsx` — swaps the icon-only control cluster for `ActionBar` under arm `b`, with the Ask action as the primary item that drops out while the panel is open.
  - `agent-web/src/components/FAB.tsx` and `agent-web/src/theme.ts` — the RealAssist+ brand gradient is lifted into shared `BRAND_GRADIENT` / `BRAND_GRADIENT_PILL` tokens so the FAB and the pill read as the same control.
  - `agent-web/src/icons.tsx` — `IconRealAssist` scales via its `viewBox` instead of a clipping box.
  - `agent-web/src/screens/SearchScreen.tsx`, `agent-web/src/screens/ToursScreen.tsx` — forward the variant into the iframe and wire the `askBridge` visibility channel.
  - `agent-web/public/search-map.html`, `agent-web/public/tours-map.html` — render the Ask control (and, in Tours, labelled Export/Add-to-calendar pills) in the map top bar under `?ab=b`, posting the click up and reacting to the panel's visibility.
  - `agent-web/src/shell.css` — a scrollbar-hiding `ra-scroll-x` utility for the action row.
- **Not affected:** `agent-vision` (this change is scoped to `agent-web`); the assistant panel's own contents and its ✕ close control; all navigation, routing, and other screens' behavior in variant `a`.
