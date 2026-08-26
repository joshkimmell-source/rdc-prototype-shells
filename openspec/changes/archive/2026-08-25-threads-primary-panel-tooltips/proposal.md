## Why

On the RealAssist+ panel, the Threads toggle read as just another icon circle sitting next to the panel label, so the primary way into the threads list had no visual weight and did not stand out as the panel's main action. Separately, the panel toggle controls — the mobile drawer button in the main header and the subnav close buttons — relied on native `title` attributes for their labels, which render inconsistently and use generic wording ("Open subnav" / "Close subnav") rather than naming the section being shown or hidden. The panel open/close icons also needed a cleaner glyph. This change raises the Threads action to a proper Primary button, replaces the native titles with Haven tooltips that name the action, and swaps in updated panel icons — applied identically to both shells.

## What Changes

- Present the Threads toggle on the RealAssist+ panel as a Haven **Primary** (icon-only) button, to the left of the panel label, with an "Open threads" tooltip. Hide it while the panel is expanded and the docked threads list is already showing (that surface carries its own header and close).
- Give the panel toggle controls Haven tooltips instead of native `title` attributes:
  - The main-header drawer button reads "Show Clients" / "Show Tours", driven by a new `subnavLabel` prop that names the current subnav section.
  - The subnav close buttons read "Hide Clients" / "Hide Tours".
- Swap the `IconPanelOpen` / `IconPanelClose` SVG glyphs for the updated panel icons (both the 16px and 24px viewBox variants).
- Apply all of the above identically to both `agent-web` and `agent-vision`.

## Capabilities

### New Capabilities
- `threads-panel`: The RealAssist+ panel's Threads action and the panel toggle controls shared by `agent-web` and `agent-vision` — the Threads Primary button, the tooltips on the panel open/close controls, and the panel toggle icon.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **Affected code (agent-vision):** `agent-vision/src/Shell.tsx` (passes `subnavLabel`), `agent-vision/src/components/MainHeader.tsx` (drawer button tooltip + `subnavLabel` prop), `agent-vision/src/components/Subnav.tsx` (close-button tooltips), `agent-vision/src/panels/AssistantPanel.tsx` (Threads Primary button), `agent-vision/src/icons.tsx` (`IconPanelOpen` / `IconPanelClose` glyphs).
- **Affected code (agent-web):** `agent-web/src/Shell.tsx`, `agent-web/src/components/MainHeader.tsx`, `agent-web/src/components/Subnav.tsx`, `agent-web/src/panels/AssistantPanel.tsx`, `agent-web/src/icons.tsx` (same changes).
- **Design system:** uses the Haven `Tooltip` and `Button` (`styleType="Primary"`, `size="sm"`, `iconOnly`) components from `@rdc-npm/rdc-ui-v4`.
- **Not affected:** the navigation rail, the RealAssist+ FAB, and other non-panel surfaces.
