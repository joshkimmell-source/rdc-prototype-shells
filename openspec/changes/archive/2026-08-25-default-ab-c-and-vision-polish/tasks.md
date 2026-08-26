## 1. Default `?ab=` to variant `c`

- [x] 1.1 In `agent-web/src/abParam.ts`, widen `AbVariant` to `'a' | 'b' | 'c'`, add `c` to the accepted-variant list, and change `DEFAULT_VARIANT` from `a` to `c`. Verify a URL with no `?ab=` resolves to `c` and an unknown value falls back to `c`.
- [x] 1.2 Update the `abParam.ts` doc comment so `a` is no longer marked default, `c` is documented as the default responsive blend (FAB on mobile, inline `ActionBar` elsewhere), and the fallback note refers to `c`. Verify the comment matches the code.
- [x] 1.3 In `agent-web/src/Shell.tsx`, derive the `actionBar` boolean as `variant === 'b' || (variant === 'c' && !isMobile)` and update the module doc comment to describe variant `c`. Verify with `?ab=c` (or no param) the header shows the inline `ActionBar` at desktop widths and the FAB on mobile, that `?ab=a` still shows only the FAB, and `?ab=b` still shows only the inline action.
- [x] 1.4 Apply the identical `abParam.ts` change (type, variant list, default, comment) to `agent-vision/src/abParam.ts`. Verify parity with the agent-web file.
- [x] 1.5 Apply the identical `actionBar` derivation and doc-comment update to `agent-vision/src/Shell.tsx`. Verify the same variant behavior as agent-web.

## 2. agent-vision Leads + Home polish

- [x] 2.1 In `agent-vision/src/screens/LeadsScreen.tsx`, freeze the Actions column when the table scrolls horizontally and add a gradient overlay indicating data flowing under it (overlay used because `box-shadow` is dropped on `border-collapse` cells). Verify the Actions column stays pinned on horizontal scroll with the gradient visible.
- [x] 2.2 In `agent-vision/src/components/ActionBar.tsx`, add an `iconOnly` action mode. Verify an `iconOnly` action renders as an icon-only control.
- [x] 2.3 In `agent-vision/src/Shell.tsx`, add an icon-only Settings action (`IconSettings`) to the Leads action bar, positioned between the overflow menu and the pinned Ask action. Verify order and rendering on Leads.
- [x] 2.4 In `agent-vision/src/components/MainHeader.tsx`, add a `brand` slot in the header's title space, and render the Realtor.com+ wordmark in it on Home from `agent-vision/src/Shell.tsx`. Verify the wordmark appears on Home and scales with the mobile/desktop size.
- [x] 2.5 Apply the shared Subnav / `MainHeader` icon updates (the `IconPanelOpen` drawer button) across both shells (`agent-web` and `agent-vision`). Verify the drawer button uses the updated icon in both.

## 3. Verification

- [x] 3.1 Run each app's build/lint in `agent-web` and `agent-vision` and verify no type or lint errors are introduced (notably the widened `AbVariant` union).
- [x] 3.2 Verify variant behavior end-to-end in both apps: no `?ab=` and `?ab=c` show the responsive blend (FAB on mobile, inline action elsewhere); `?ab=a` shows only the FAB; `?ab=b` shows only the inline action; an unknown value falls back to `c`.
- [x] 3.3 Verify the placement flips live as the viewport crosses the mobile breakpoint under variant `c`, using the same rendering paths as a normal resize.
- [x] 3.4 Confirm the agent-vision polish items render correctly and do not affect the `a` / `b` arms.
