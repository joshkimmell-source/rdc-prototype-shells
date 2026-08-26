## 1. Threads Primary button

- [x] 1.1 In `agent-web/src/panels/AssistantPanel.tsx`, replace the Threads `CircleButton` with a Haven `Button` (`styleType="Primary"`, `size="sm"`, `iconOnly={<IconSubnav size={16} />}`), keeping `onClick={onToggleOver}` and `aria-label="Open threads"`. Verify the Threads toggle renders as a Primary icon-only button to the left of the panel label.
- [x] 1.2 Wrap the Threads button in a Haven `Tooltip body="Open threads" placement="bottom"`. Verify hovering the button shows the "Open threads" tooltip.
- [x] 1.3 Render the Threads button only when `!(expanded && over)` so it is hidden while the docked threads list is already showing. Verify the button disappears once the threads list is docked over the expanded panel and returns otherwise.
- [x] 1.4 Apply the identical Threads button change to `agent-vision/src/panels/AssistantPanel.tsx`. Verify parity with agent-web.

## 2. Panel toggle tooltips

- [x] 2.1 In `agent-web/src/components/MainHeader.tsx`, add an optional `subnavLabel` prop and wrap the `DrawerButton` in a Haven `Tooltip`; drop the native `title`, keep `aria-label`, and label the button "Show <subnavLabel>" (falling back to "Show"). Verify the drawer button shows a "Show Clients" / "Show Tours" tooltip.
- [x] 2.2 In `agent-web/src/Shell.tsx`, pass `subnavLabel` to `MainHeader` derived from the active subnav variant ("Clients" for clients, "Tours" for tours, otherwise undefined). Verify the drawer button names the correct section.
- [x] 2.3 In `agent-web/src/components/Subnav.tsx`, wrap each subnav close `CircleButton` in a Haven `Tooltip` reading "Hide Clients" / "Hide Tours"; drop the native `title` and update `aria-label` to match. Verify the close buttons show the correct hide tooltip.
- [x] 2.4 Apply the identical MainHeader, Shell, and Subnav changes to the `agent-vision` copies (`agent-vision/src/components/MainHeader.tsx`, `agent-vision/src/Shell.tsx`, `agent-vision/src/components/Subnav.tsx`). Verify parity with agent-web.

## 3. IconPanel swap

- [x] 3.1 In `agent-web/src/icons.tsx`, replace the `IconPanelOpen` and `IconPanelClose` SVG `path` data for both the 16px and 24px viewBox variants; leave component signatures and default sizes unchanged. Verify the updated open/close glyphs render at both sizes.
- [x] 3.2 Apply the identical icon swap to `agent-vision/src/icons.tsx`. Verify parity with agent-web.

## 4. Verification

- [x] 4.1 Run each app's build/lint in `agent-web` and `agent-vision` and verify no type or lint errors are introduced.
- [x] 4.2 Manually verify in both shells: the Threads action is a Primary icon-only button with an "Open threads" tooltip that hides while threads are docked; the drawer button shows "Show Clients"/"Show Tours"; the subnav close buttons show "Hide Clients"/"Hide Tours"; and the panel icons render correctly.
- [x] 4.3 Confirm parity between the two shells for all five affected files.
