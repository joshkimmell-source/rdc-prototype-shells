## 1. FAB tooltip

- [x] 1.1 In `agent-web/src/Shell.tsx`, wrap the FAB's `Button` in a Haven `Tooltip` (`body="Ask RealAssist+"`, `placement="left"`). Verify hovering/focusing the FAB shows the tooltip.
- [x] 1.2 Move `fabHover` and the focus-outline styling from the Button's own `onMouseEnter`/`onFocus`/`onBlur` to the `Tooltip`'s `onOpen`/`onClose`. Verify the scale-up, gradient-darken, and outline still animate on hover/focus, and that clicking still opens the assistant panel.
- [x] 1.3 Apply the identical change to `agent-vision/src/Shell.tsx` (adding `Tooltip` to its `@rdc-npm/rdc-ui-v4` import). Verify parity with agent-web.
- [x] 1.4 Verify via Playwright in both apps: tooltip text and left placement, hover-scale/outline still animate, tooltip dismisses on mouse-away, click still opens the panel.

## 2. Tooltip-component parity across the shell (rode along, not spec-worthy)

- [x] 2.1 `ActionBar`'s collapsed icon-only actions use a real Haven `Tooltip` (controlled via a local `tipOpen` state so a click still dismisses it) instead of a hand-built, mouse-position-tracked tooltip `div`. Update `tests/action-bar.spec.ts` in both apps to assert against `getByRole('tooltip')` instead of the old `data-testid`.
- [x] 2.2 `MainHeader`'s Clients toggle circles and `Subnav`'s Add Client / Schedule Tour buttons use the same real `Tooltip` instead of a native `title` attribute.
- [x] 2.3 Apply 2.1–2.2 identically to `agent-vision`.

## 3. Visual polish (rode along, not spec-worthy)

- [x] 3.1 Clients' filter pills use Haven `Button` `styleType="Tertiary"`/`"Primary"` instead of a fully custom-styled control.
- [x] 3.2 Add `BRAND_GRADIENT_HOVER`/`BRAND_GRADIENT_PILL_HOVER`; wire into the FAB and `ActionBar`'s brand action hover state.
- [x] 3.3 `CapabilityCard` gains a hover background with a transition.
- [x] 3.4 `Initials`' default fill switches from a light hair-tint background to a dark-filled circle with white text.
- [x] 3.5 Clients' saved/tour-request tiles shrink from 164px to 124px.
- [x] 3.6 Apply 3.1–3.5 identically to `agent-vision`.

## 4. Verification

- [x] 4.1 `tsc --noEmit` clean in both apps after every change above.
- [x] 4.2 `tests/action-bar.spec.ts` passes (8/8) in both apps.
- [x] 4.3 Shipped: each item above went through its own commit → PR → squash-merge → per-shell `npm run deploy`.
