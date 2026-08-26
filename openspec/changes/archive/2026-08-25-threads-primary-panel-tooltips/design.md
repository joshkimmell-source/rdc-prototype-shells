## Context

See `proposal.md` — Why. On the RealAssist+ panel header, the Threads toggle was a `CircleButton` (icon-only) sitting to the left of the panel label; it opened the threads subnav and highlighted (`background: C.hair`) while that subnav was open, and its label came from a native `title="Open threads"`. The panel toggle controls used the same native-`title` approach: the main header's `DrawerButton` (a `HoverButton`) carried `title="Open subnav"`, and the subnav close buttons (`CircleButton`) carried `title="Close subnav"`. The panel open/close glyphs were the `IconPanelOpen` / `IconPanelClose` SVGs in `icons.tsx`. `agent-web` and `agent-vision` are near-identical, so each of these lived in both shells.

## Goals / Non-Goals

**Goals:**
- Make the Threads action read as the panel's primary action by rendering it as a Haven `Button` with `styleType="Primary"`, `size="sm"`, icon-only.
- Replace native `title` labels on the panel toggle controls with Haven `Tooltip`s whose text names the action ("Show <section>" / "Hide <section>").
- Update the `IconPanelOpen` / `IconPanelClose` glyphs.
- Mirror every change identically across both shells.

**Non-Goals:**
- No change to what the Threads toggle does (still opens the threads subnav via `onToggleOver`) or to the panel's layout beyond the button swap.
- No change to the "New conversation" action in the panel's right-hand action group.
- No change to the navigation rail, the RealAssist+ FAB, or other surfaces.

## Decisions

**Decision: Render the Threads toggle as a Haven Primary icon-only Button.**
Replace the `CircleButton` with `<Button styleType="Primary" size="sm" iconOnly={<IconSubnav size={16} />} .../>`, keeping the same `onClick={onToggleOver}` and `aria-label="Open threads"`, and wrap it in a `Tooltip body="Open threads"`.
- Why: The Primary style gives the panel's main entry point into threads clear visual weight, and reusing the Haven `Button` keeps it on the design system rather than a bespoke circle.

**Decision: Hide the Threads button while the docked threads list is showing.**
Render the button only when `!(expanded && over)` — i.e. hide it when the panel is expanded and the threads list is already docked over the panel, since that surface has its own header and close control.
- Why: Showing an "Open threads" button while threads are already open would be redundant and confusing.

**Decision: Use Haven Tooltips (not native `title`) for the panel toggle controls, with section-specific text.**
The main-header `DrawerButton` is wrapped in a `Tooltip` and its `title` is dropped; its label is now "Show <section>", driven by a new optional `subnavLabel` prop on `MainHeader` that the shell sets from the active subnav variant ("Clients" / "Tours"). The subnav close buttons are wrapped in a `Tooltip` reading "Hide Clients" / "Hide Tours" and drop their `title`.
- Why: Native `title` tooltips render inconsistently and generically; Haven tooltips are consistent, and naming the section ("Show Clients", "Hide Tours") is clearer than "Open subnav" / "Close subnav".
- Note: `aria-label` is preserved on each control (updated to match the new wording) so the accessible name does not depend on the tooltip.

**Decision: Swap the IconPanelOpen / IconPanelClose glyphs in place.**
Replace the SVG `path` data for both the 16px and 24px viewBox variants of `IconPanelOpen` and `IconPanelClose`; the component signatures and default sizes are unchanged.
- Why: Cleaner panel open/close glyphs; keeping the component API stable means callers need no changes.

**Decision: Mirror all edits across both shells.**
Apply the identical edits to the `agent-web` and `agent-vision` copies of `Shell.tsx`, `MainHeader.tsx`, `Subnav.tsx`, `AssistantPanel.tsx`, and `icons.tsx`.
- Why: The two shells are near-identical and must stay in parity.

## Risks / Trade-offs

- **Threads visibility condition** — hiding the button on `expanded && over` must line up with when the docked threads list actually shows, or the entry point could disappear unexpectedly. Mitigation: gate on the same `expanded`/`over` state the panel already tracks.
- **Tooltip vs accessible name divergence** — the tooltip text and `aria-label` must stay consistent. Mitigation: keep `aria-label` on each control and match it to the tooltip wording.
- **Two shells must stay in sync** — the change touches five files in each app. Mitigation: apply the exact same edits to both and confirm parity.
- **Icon glyph regression** — swapping SVG paths risks a wrong or mis-sized glyph. Mitigation: keep both viewBox variants and default sizes; verify the rendered open/close icons.

## Migration Plan

Purely visual/interaction front-end change with no data or API migration. Deploy through the normal front-end build for both apps. Rollback is a straight revert of the affected files in both shells.
