## Why

The corner FAB (the "Ask RealAssist+" trigger under variant `a`, and under variant `c` at mobile widths) was the one placement of the trigger with no visible naming. Every other placement already surfaces a name: the header action bar's icon-only circles carry a tooltip per the `action-bar` spec, and the labelled-pill states carry a visible label. The FAB relied on `aria-label` alone — invisible to a sighted mouse or keyboard user hovering or focusing it. This change adds a Haven `Tooltip` (`body="Ask RealAssist+"`, `placement="left"`) to the FAB in both `agent-web` and `agent-vision`, closing that gap. Doing so surfaced a real composability hazard in the FAB's existing hover/focus wiring, described below. A handful of smaller implementation and visual-polish items shipped in the same work session and are noted below; the spec delta is centered on the FAB's new tooltip.

## What Changes

- Add a Haven `Tooltip` to the floating "Ask RealAssist+" FAB — appears on hover or keyboard focus, placed to the left of the control — in both `agent-web` and `agent-vision`.
- Fix the composability hazard this exposed: the FAB's trigger is a plain Haven `Button` whose own `onMouseEnter`/`onFocus`/`onBlur` drive its hover-scale, gradient-darken, and focus outline. Haven's `Tooltip` clones its own hover/focus handlers onto its child via `React.cloneElement`, which *replaces* same-named props rather than composing with them — wrapping the Button directly would have silently dropped those effects. Fixed by driving `fabHover` and the outline from `Tooltip`'s `onOpen`/`onClose` callbacks instead. One resulting, accepted behavior change: the focus outline now also appears on hover, not just keyboard focus.
- Rode along in the same work session (implementation/visual polish — the observable behavior these touch was already correct, or is purely cosmetic, so none of it is spec-worthy):
  - `ActionBar`'s icon-only collapsed actions, `MainHeader`'s Clients toggle circles, and `Subnav`'s Add Client / Schedule Tour buttons now use the same real Haven `Tooltip` instead of a hand-built, mouse-position-tracked tooltip `div` (or a native `title` attribute) — the same on-hover-naming behavior the `action-bar` spec already requires, just a better implementation.
  - Clients' filter pills use a real Haven `Button` with `styleType="Tertiary"`/`"Primary"` instead of a fully custom-styled control.
  - Added `BRAND_GRADIENT_HOVER` / `BRAND_GRADIENT_PILL_HOVER` and wired them into the FAB and `ActionBar`'s brand action for a darkened hover state; `CapabilityCard` gained a hover background with a transition.
  - `Initials`' default fill switched from a light hair-tint background with action-colored text to a dark-filled circle with white text.
  - Clients' saved/tour-request tiles shrank from 164px to 124px.
  - Every item above was applied identically to both `agent-web` and `agent-vision`.

## Capabilities

### Modified Capabilities
- `realassist-trigger`: The corner FAB (variant `a`, and variant `c` at mobile widths) now shows a tooltip naming it ("Ask RealAssist+") on hover or keyboard focus, closing the gap where it was the only placement of the trigger with no visible name.

## Impact

- **Affected code (agent-web):** `agent-web/src/Shell.tsx` (FAB `Tooltip` + `onOpen`/`onClose`-driven hover/outline), `agent-web/src/components/ActionBar.tsx`, `agent-web/src/components/MainHeader.tsx`, `agent-web/src/components/Subnav.tsx`, `agent-web/src/components/Menu.tsx`, `agent-web/src/components/primitives.tsx`, `agent-web/src/components/FAB.tsx`, `agent-web/src/panels/AssistantPanel.tsx`, `agent-web/src/panels/ThreadsList.tsx`, `agent-web/src/screens/ClientsScreen.tsx`, `agent-web/src/theme.ts`, `agent-web/tests/action-bar.spec.ts`.
- **Affected code (agent-vision):** the identical files under `agent-vision/`.
- **Not affected:** variant `b` (inline `ActionBar` action) rendering; the framed-map trigger; routing; any data or API surface.
