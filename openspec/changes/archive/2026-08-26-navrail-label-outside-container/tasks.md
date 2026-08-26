## 1. agent-web NavRail

- [x] 1.1 In `agent-web/src/components/NavRail.tsx`, split the shared cell styling so the rounded shape (`borderRadius: 14`) and hover/selected background move off the full-cell control onto a new inner icon-container element; the control (`HoverButton`) becomes transparent and unrounded while keeping its column layout, gap, and centering. Verify by inspecting a rendered cell: the highlight is a rounded box around the icon only, not the whole cell.
- [x] 1.2 Restructure the primary nav-item renderer (`NAV_ITEMS` map) so the icon span sits inside the icon container and the label span is a sibling below it, still inside the `HoverButton`. Verify each of Clients / Search / Tours shows its label below the icon container.
- [x] 1.3 Drive the icon container's hover and selected background from the cell's hover/active state (reusing the existing hover-tracking approach) so hovering anywhere in the cell highlights the icon container. Verify hovering an inactive cell (over icon or label) highlights the icon container only, and the active cell shows the selected background on the icon container only.
- [x] 1.4 Keep active-state emphasis on the label (weight/color) and `aria-current` on the active cell even though the label is outside the highlighted container. Verify the active item's label is emphasized and inactive labels use the inactive treatment.
- [x] 1.5 Apply the same icon-container/label-sibling structure to the inert-item renderer (`INERT_ITEMS`) and the Account cell. Verify all rail cells render labels outside the icon container consistently.

## 2. agent-vision NavRail

- [x] 2.1 Apply the identical structural change from tasks 1.1–1.5 to `agent-vision/src/components/NavRail.tsx`, including the extra Home and Leads items. Verify Home / Leads / Clients / Search / Tours each render the label below the icon container with icon-only highlight, and inert items + Account cell match.
- [x] 2.2 Confirm parity between the two files: diff `agent-web/src/components/NavRail.tsx` and `agent-vision/src/components/NavRail.tsx` and verify the only differences are the `NAV_ITEMS` entries (agent-vision's extra Home/Leads) — the cell structure/styling is otherwise identical.

## 3. Verification

- [x] 3.1 Run each app's build/lint (e.g. `npm run build` / `npm run lint` in `agent-web` and `agent-vision`) and verify no type or lint errors are introduced by the change.
- [x] 3.2 Manually verify hover, selected, and active states in both apps against the reference: the rounded highlight wraps only the icon, the label sits below outside the highlight, and vertical rhythm/cell height is preserved.
- [x] 3.3 Verify accessibility is unchanged: each interactive cell remains a single control activatable by pointer and keyboard, the label is part of its accessible name, the active item exposes current-page state, and the focus indicator still reads clearly with the new composition.
- [x] 3.4 Confirm out-of-scope surfaces are untouched: the mobile `NavBar.tsx` and the RealAssist+ FAB are unchanged.
