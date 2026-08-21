## Why

In the vertical navigation rail, each cell's rounded hover/selected background currently wraps both the icon and its text label, so the highlighted "pill" spans the full cell. The intended visual treatment is for the hover/selected background to wrap only the icon, with the label sitting outside (below) that container as static text. This produces a cleaner, more focused active indicator and matches the reference design.

## What Changes

- In the navigation rail, restructure each cell so the icon lives inside a visual button container that carries the rounded shape and the hover/selected background, while the text label is rendered as a sibling **outside** that container.
- Apply the hover and selected (active) background treatment to the icon container only; the label no longer sits on the highlighted background.
- Keep the label visually associated with its cell (same vertical stack, centered, existing label typography and truncation) and keep the active-state emphasis on the label (e.g. weight/color) even though the label is outside the highlighted container.
- Apply this treatment to **all** rail cells that use the shared cell pattern: the primary nav items (Clients / Search / Tours, plus Home / Leads in agent-vision), the non-interactive "inert" items, and the Account cell.
- Apply identically to **both** apps: `agent-web` and `agent-vision`.
- Preserve current accessibility and interaction behavior: the interactive cells remain single activatable controls, keep `aria-current` on the active item, and the label remains part of the control's accessible name.
- Out of scope: the mobile bottom navigation (`NavBar.tsx`) is intentionally left unchanged; the "AI" element in the reference is the separate RealAssist+ FAB, not a rail cell, and is not affected.

## Capabilities

### New Capabilities
- `navigation-rail`: The vertical navigation rail shared by `agent-web` and `agent-vision` — its cells, their icon/label composition, and the hover/selected/active visual treatment.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **Affected code (agent-web):** `agent-web/src/components/NavRail.tsx` (cell markup + `cellBase`/`labelStyle` structure for the nav-item map, inert-item map, and Account cell).
- **Affected code (agent-vision):** `agent-vision/src/components/NavRail.tsx` (same structure; includes the extra Home / Leads items).
- **Styling:** inline `style` objects plus the `HoverButton` primitive and theme tokens in `theme.ts` (`C.alt` hover/selected background, `C.dark`/`C.sub` colors, `borderRadius: 14`). The hover/selected background and rounded shape move from the full cell to the icon container.
- **Shared primitive:** `HoverButton` (`primitives.tsx`) — behavior unchanged; only which element it wraps changes.
- **Not affected:** mobile `NavBar.tsx`, the RealAssist+ FAB (`FAB.tsx`), and any non-rail surfaces.
