## 1. Variant selection

- [x] 1.1 Add `agent-web/src/abParam.ts` exposing an `AbVariant` type (`'a' | 'b'`), a `readAbParam()` that reads the `?ab=` query parameter, lower-cases it, and returns it only if it is one of the known variants — otherwise the default `a`. Verify that `?ab=a`, `?ab=b`, no param, `?ab=`, `?ab=x`, and mixed case each resolve to the expected variant (`b` only for `b`; everything unknown or absent to `a`).
- [x] 1.2 Add a `withAbParam(url, variant)` helper that appends `?ab=<variant>` to a URL for non-default variants and leaves the URL untouched for the default, for forwarding the arm into iframe `src`. Verify the default produces the bare URL and `b` produces `...?ab=b`.
- [x] 1.3 In `agent-web/src/Shell.tsx`, read the variant once into session state (`useState(readAbParam)`) so it is fixed for the life of the session, and derive `actionBar = variant === 'b'`. Verify the variant does not change without a reload.

## 2. Variant A — floating FAB (default, unchanged)

- [x] 2.1 Confirm that in variant `a` the FAB still renders in the bottom-right corner and still steps aside for the push panel and mobile drawer (`fabVisible = !actionBar && !pushContent && !drawerOpen`). Verify with no `?ab=` and with `?ab=a` the corner FAB behaves exactly as before this change.
- [x] 2.2 Confirm no header `ActionBar` and no map-page Ask control appear in variant `a`. Verify the header shows the existing icon-only cluster and the map pages show no Ask pill.

## 3. Variant B — inline header action bar

- [x] 3.1 Add `agent-web/src/components/ActionBar.tsx`: a labelled control row rendered at the right of the header. The primary (`brand`) action uses the RealAssist+ gradient; secondary actions render as light/dark pills; a label-less action stays a circle. Verify the pills render with the shared geometry.
- [x] 3.2 Make `ActionBar` collapse by measurement: render a hidden full-width mirror, measure each pill, drop labels one at a time from the left until the row fits, and turn collapsed pills into circles with tooltips; re-measure on `ResizeObserver` for the row and mirror and after `document.fonts.ready`. Verify labels drop from the left as width shrinks and the primary Ask action keeps its label longest.
- [x] 3.3 In `agent-web/src/components/MainHeader.tsx`, render `ActionBar` in place of the icon-only cluster when the arm is `b`, mapping the existing toggles to labelled actions and appending "Ask RealAssist+" as the last (primary) action. Verify the header shows labelled pills plus the Ask pill at the right end.
- [x] 3.4 In `agent-web/src/Shell.tsx`, hide the corner FAB in arm `b` (`fabVisible = !actionBar && ...`) and open the panel via an open-only `openPush` handler passed to the header as `onAsk`. Verify the corner is empty in arm `b` and the header Ask action opens the panel.
- [x] 3.5 Drop the Ask action from the row while the assistant panel is open (`askOpen`). Verify the Ask pill disappears once the panel opens and returns when it closes.

## 4. Variant B — framed map screens

- [x] 4.1 Add `agent-web/src/askBridge.ts` defining `ASK_MESSAGE` (`ra:ask`) and `ASK_VISIBLE_MESSAGE` (`ra:ask-visible`) and a `useAskVisibility` hook that posts the panel's visibility into the frame (and returns the poster for the frame's `onLoad`). Verify the hook posts on mount, on visibility change, and on frame load, targeting the app origin.
- [x] 4.2 In `agent-web/src/screens/SearchScreen.tsx` and `agent-web/src/screens/ToursScreen.tsx`, forward the variant into the iframe via `withAbParam(...)`, wire `useAskVisibility(frameRef, !askOpen)`, and post visibility on `onLoad`. Verify the iframe `src` carries `?ab=b` only in arm `b`.
- [x] 4.3 In `agent-web/public/search-map.html` and `agent-web/public/tours-map.html`, render the Ask control in the map top bar when the frame is loaded with `?ab=b`, post `ra:ask` up on click, and toggle the control's visibility from `ra:ask-visible`, checking `event.origin` on receipt. Verify clicking the framed Ask button opens the shell's panel and the button hides while the panel is open.
- [x] 4.4 In `agent-web/src/Shell.tsx`, bind the `message` listener only in arm `b`, verify `event.origin` matches the app origin, and open the panel on `ra:ask`. Verify no listener is bound in arm `a`.

## 5. Shared control fidelity and fixes

- [x] 5.1 Lift the RealAssist+ brand gradient into `BRAND_GRADIENT` and `BRAND_GRADIENT_PILL` in `agent-web/src/theme.ts` and use them from `FAB.tsx` and the pill controls. Verify the FAB and the pills share one gradient definition.
- [x] 5.2 Fix `IconRealAssist` in `agent-web/src/icons.tsx` to scale via its `viewBox` (24-unit box, artwork inset 2 units) rather than a fixed clipping box, so sizes below 24 scale instead of shearing; duplicate the same mark in the two map pages. Verify the mark renders whole at 16px on the pills and unchanged on the FAB.
- [x] 5.3 Fix the action row overflow to send off the end edge via an auto left margin (so an LTR scroller can reach it) and rest scrolled to the end so the primary action is visible without scrolling; add the `ra-scroll-x` scrollbar-hiding utility in `agent-web/src/shell.css`. Verify the leftmost actions are reachable below ~500px.
- [x] 5.4 Align the Tours map pill geometry so the Ask control is the same size on Search and Tours at a given viewport (pills keyed to the window, not the narrower iframe width). Verify the Ask control matches size across the two map pages at one viewport.

## 6. Verification

- [x] 6.1 Run the `agent-web` build/lint and verify no type or lint errors are introduced.
- [x] 6.2 Verify variant `a` (default) is unchanged: no `?ab=`, `?ab=a`, and unknown values all render the corner FAB with no inline Ask control anywhere.
- [x] 6.3 Verify variant `b`: the FAB is gone, the header shows the collapsing `ActionBar` with Ask as the primary action, the framed map screens show the Ask control in the map top bar, clicking Ask opens the panel, and the trigger hides while the panel is open.
- [x] 6.4 Confirm the arm cannot change mid-session and that there is no on-screen switcher; a different arm requires reloading with a different `?ab=`.
