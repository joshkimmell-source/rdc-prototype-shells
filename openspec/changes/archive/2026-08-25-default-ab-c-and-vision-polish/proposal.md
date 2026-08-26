## Why

The "Ask RealAssist+" trigger placement A/B test defined two arms: `a`, the floating FAB in the bottom-right corner, and `b`, an inline `ActionBar` action in every page header — with `a` as the default and fallback so a plain link (no `?ab=`) served the shipped FAB. Neither arm is ideal on its own: the FAB is the right fit for narrow, thumb-driven mobile widths, while the inline header action reads better once there is room for a labelled control. We want the placement a participant sees by default to be a responsive blend of the two rather than one fixed arm, so a shared link with no query parameter opens the preferred placement at whatever width it is viewed. This change introduces that blend as variant `c` and makes it the new default. A handful of agent-vision Leads and Home visual-polish items were completed in the same commit and are noted below, but the spec change is centered on the default-variant behavior.

## What Changes

- Add a third placement variant, **`c`**, to the `?ab=` test and make it the **default** — the value used when `?ab=` is missing, and the fallback for any unknown value (previously `a`).
- Define variant `c` as a responsive blend: the floating FAB on mobile (as in `a`), and the inline `ActionBar` header action at every other width (as in `b`). The blend is derived from the reactive mobile-breakpoint state, so it flips live as the viewport crosses the mobile breakpoint.
- Widen the `AbVariant` type and the accepted-variant list to include `c`, and update the read-once fallback so a typo now lands on `c` rather than `a`.
- Apply the identical change to **both** apps: `agent-web` and `agent-vision`.
- agent-vision Leads + Home visual polish (rode along in the same commit, not the focus of the spec delta):
  - Leads: freeze the Actions column when the table scrolls horizontally, with a gradient overlay indicating data flowing under it (a `box-shadow` is dropped on `border-collapse` cells, so an overlay is used instead).
  - `ActionBar`: add an `iconOnly` action mode; add an icon-only Settings button on Leads positioned between the overflow menu and the pinned Ask action.
  - Home: add the Realtor.com+ wordmark via a new `MainHeader` `brand` slot in the header's title space.
  - Shared: Subnav / `MainHeader` icon updates (the `IconPanelOpen` drawer button) across both shells.

## Capabilities

### Modified Capabilities
- `realassist-trigger`: The default/fallback placement changes from variant `a` (corner FAB) to variant `c`, and a new responsive-blend variant `c` is added to the `?ab=` mechanism. When no `?ab=` value is supplied, the trigger now defaults to `c` — the FAB on mobile and the inline `ActionBar` header action at every other width.

## Impact

- **Affected code (agent-web):**
  - `agent-web/src/abParam.ts` — add `c` to `AbVariant` and the accepted-variant list; change `DEFAULT_VARIANT` from `a` to `c`; update the doc comment describing the variants and fallback.
  - `agent-web/src/Shell.tsx` — derive the `actionBar` boolean as `variant === 'b' || (variant === 'c' && !isMobile)` so the header/FAB placement reads from one reactive flag; update the module doc comment.
- **Affected code (agent-vision):**
  - `agent-vision/src/abParam.ts` — identical variant/default change to agent-web.
  - `agent-vision/src/Shell.tsx` — identical `actionBar` derivation; plus the Leads `ActionBar` icon-only Settings action and the Home `brand` wordmark slot.
  - `agent-vision/src/components/ActionBar.tsx` — add the `iconOnly` action mode.
  - `agent-vision/src/components/MainHeader.tsx` — add the `brand` slot in the title space.
  - `agent-vision/src/screens/LeadsScreen.tsx` — freeze the Actions column on horizontal scroll with a gradient overlay.
  - `agent-vision/src/components/Subnav.tsx`, `agent-vision/src/icons.tsx`, `agent-web/src/components/Subnav.tsx`, `agent-web/src/icons.tsx`, `agent-web/src/components/MainHeader.tsx` — shared Subnav / MainHeader icon updates (`IconPanelOpen` drawer button).
- **Not affected:** the assistant panel's own contents and its close control; the FAB and inline `ActionBar` renderings themselves (unchanged — only which one shows by default changes); navigation, routing, and the `?ab=a` / `?ab=b` arms, which continue to behave exactly as before.
