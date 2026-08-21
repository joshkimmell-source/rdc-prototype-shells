## Context

See `proposal.md` — Why. Today each rail cell is a single element (interactive cells are a `HoverButton`, i.e. a real `<button>`; the Account cell is a `<div>`). That element carries the shared `cellBase` styling — a rounded shape (`borderRadius: 14`) and the hover/selected background — and contains both the icon span and the label span as children. The result is that the highlighted "pill" spans the whole cell including the label. Styling is done with inline `style` objects plus theme tokens (`C.alt` hover/selected background, `C.dark`/`C.sub` text colors); hover is tracked by the `HoverButton` primitive's internal state and merged via a `hoverStyle` prop. `agent-web/src/components/NavRail.tsx` and `agent-vision/src/components/NavRail.tsx` are near-identical (agent-vision adds Home and Leads items).

## Goals / Non-Goals

**Goals:**
- Move the rounded hover/selected background so it wraps only the icon, with the label rendered as a sibling below the highlighted container.
- Keep the change confined to the existing inline-style + `HoverButton` approach and mirror it identically across both apps and all three cell renderers (nav items, inert items, Account cell).
- Preserve interaction and accessibility: interactive cells stay a single activatable control, keep `aria-current`, and keep the label in the accessible name.

**Non-Goals:**
- No new styling mechanism (no new CSS files, styled-components, or Panda recipes) introduced for this component.
- No change to the `HoverButton` primitive's public behavior, to theme token values, or to icons/labels/destinations.
- Mobile `NavBar.tsx` and the RealAssist+ FAB are untouched (see proposal — Impact).

## Decisions

**Decision: Keep the full-cell control; move the highlighted background to an inner icon container.**
The interactive cell remains a single `HoverButton` (`<button>`) spanning the whole cell, and the label stays a child of that button. Introduce an inner "icon container" element that wraps only the icon span and carries the rounded shape and the hover/selected background. The label becomes a sibling of the icon container (below it) but still inside the control.
- Why: This satisfies "label outside the visual (highlighted) container" while keeping the label inside the control, so the accessible name, the click/hit target, and keyboard activation are all unchanged. The visual container the user perceives is the highlighted icon wrapper; the label sits outside it.
- Alternative considered — move the label fully outside the `<button>` (sibling of the button): rejected. It drops the label from the accessible name and from the click target, forcing a re-added `aria-label` and a separate hit area, which adds complexity and risks an accessibility regression for no visual benefit.

**Decision: Drive the icon container's hover background from the cell's hover/active state rather than from the control element's own style.**
The hover/selected background and `borderRadius` move off the control (which becomes transparent and unrounded) and onto the inner icon container. Hover is still tracked at the cell/control level (the same technique `HoverButton` already uses) so that hovering anywhere in the cell highlights the icon container; the computed background is applied to the icon container instead of the button.
- Why: Inline styles cannot express `:hover`, and the file already models hover as component state. Lifting that state to select the icon container keeps the mechanism consistent with the existing code.
- Alternative considered — CSS `:hover` pseudo-class via a stylesheet/styled-components: rejected to avoid introducing a second styling paradigm for one component.

**Decision: Apply the same structural change to inert items and the Account cell.**
All three renderers use the identical inside-the-container pattern, so the icon-container wrapper is applied uniformly for visual consistency across the rail.
- Why: Mixed treatments (some cells with label-in-pill, some label-outside) would look inconsistent.

**Decision: Preserve the column layout and label typography.**
Keep the cell's centered column layout, gap, and existing `labelStyle` (size, line height, truncation). Move the container padding onto the icon container; keep active-state label emphasis (weight/color) on the label even though it is now outside the highlighted container.

## Risks / Trade-offs

- **Hover no longer originates on the styled element** → the icon container's background is derived from lifted hover state; verify that entering/leaving anywhere in the cell (icon or label) toggles the icon-container highlight cleanly. Mitigation: track hover on the control element and apply to the icon container.
- **Focus-visible appearance changes** — the focus ring is on the full-cell control while the background is now only on the icon. Mitigation: confirm the focus indicator still reads clearly against the new composition during implementation; adjust only if it regresses.
- **Vertical rhythm / spacing regression** — the label now sits below the padded icon container rather than inside one padded block. Mitigation: retain the existing gap and centering; move padding to the icon container so overall cell height stays close to today's.
- **Two files must stay in sync** — agent-web and agent-vision `NavRail.tsx` are near-identical. Mitigation: apply the exact same structural edit to both and confirm parity.

## Migration Plan

Purely visual/structural front-end change with no data or API migration. Deploy through the normal front-end build for both apps. Rollback is a straight revert of the two `NavRail.tsx` files.
