## 1. On-load prototype notice

- [x] 1.1 Add `agent-web/src/components/PrototypeNotice.tsx` as a Haven `Modal` (size `sm`) with a header titled "This is a prototype", a body explaining that everything is sample data for demonstration only and that none of the people, listings, or addresses are real, and a footer with a Primary "Okay" button. Verify the modal renders with the disclaimer copy and the "Okay" CTA.
- [x] 1.2 Initialize the notice `open` on first mount so it shows on every real page load; wire "Okay" (and the modal's overlay/escape/close affordances) to close it without persisting anything. Verify the notice is visible on load and a reload shows it again.
- [x] 1.3 Read a `SUPPRESS_KEY` (`ra-suppress-prototype-notice`) localStorage flag on init: when it equals `'1'` the notice starts closed; only read the flag, never write it; wrap the read in try/catch and default to showing the notice when storage is unavailable. Verify that with the flag set the notice does not appear and without it the notice appears.
- [x] 1.4 Render `<PrototypeNotice />` once at the top of `agent-web/src/Shell.tsx` so it overlays before the viewer interacts with any screen. Verify the notice overlays the shell on load across screens.

## 2. Test infrastructure

- [x] 2.1 Seed the `ra-suppress-prototype-notice` localStorage flag as `storageState` in `agent-web/playwright.config.ts` so the notice never blocks the suite, with a comment keeping it in sync with `SUPPRESS_KEY`. Verify the general suite runs without the modal overlaying first interactions.
- [x] 2.2 Add `agent-web/tests/prototype-notice.spec.ts` that drops the seeded suppress flag (clean origin) and asserts the notice shows on load with its title and sample-data copy and is dismissed by the "Okay" button. Verify the spec passes.

## 3. Secondary polish

- [x] 3.1 Add `MEDIUM_QUERY` (`(min-width: 769px) and (max-width: 1279px)`), `isMediumViewport`, and `useIsMedium` to `agent-web/src/useMobile.ts`. Verify the hook reports medium only within the band.
- [x] 3.2 In `agent-web/src/Shell.tsx`, make the docked subnav and assistant panel mutually exclusive in the medium band (opening one retracts the other, including on resize into the band) while both still dock together at ≥1280px. Add `agent-web/tests/assistant-panel.spec.ts` coverage. Verify the content column is never squished in the band and both panels dock above it.
- [x] 3.3 In `agent-web/src/components/ActionBar.tsx`, clear an icon-only action's tooltip on click so it no longer lingers over the panel the click revealed; add the dismiss case to `agent-web/tests/action-bar.spec.ts`. Verify the tooltip is cleared after clicking the collapsed action.

## 4. Verification

- [x] 4.1 Run the agent-web build/lint and Playwright suite; verify no type or lint errors and that the prototype-notice, assistant-panel, and action-bar specs pass.
- [x] 4.2 Manually verify a cold load shows the notice, "Okay" dismisses it, and a reload shows it again; and that agent-vision and non-shell surfaces are untouched.
