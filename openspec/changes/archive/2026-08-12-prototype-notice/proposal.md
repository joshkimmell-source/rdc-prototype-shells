## Why

The agent-web prototype is seeded end-to-end with sample data — fictional clients, listings, tours, and addresses. When a tester or stakeholder opens it cold, nothing on screen signals that the content is fabricated, so a sample client or a sample address can be mistaken for a real one. The prototype needs an unmissable, up-front disclaimer that states plainly that this is a prototype and everything in it is sample data, shown before the viewer starts interacting.

## What Changes

- Add an on-load "This is a prototype" notice: a Haven `Modal` that is open on first mount for every real visitor, with copy making the fictional, sample-data nature of the prototype explicit.
- The notice is dismissible via an "Okay" primary button (and the modal's own overlay/escape/close affordances). Dismissal is not persisted, so a fresh page load shows the notice again.
- Provide a single test-only escape hatch: a `ra-suppress-prototype-notice` localStorage flag that, when set to `'1'`, keeps the notice closed. The app only reads this flag and never writes it; the E2E suite seeds it so the overlay never overlays every test's first interaction, while real loads always show the notice.
- This first version is **notice-only** — an informational disclaimer with no authentication, password, or access control of any kind.
- Secondary polish shipped alongside (not the focus of this capability): in the medium viewport band (769–1279px) the docked subnav and assistant panel become mutually exclusive so the content column is never squished (both still dock together at ≥1280px); and an icon-only ActionBar action now clears its tooltip on click so it no longer lingers over the panel the click revealed.

## Capabilities

### New Capabilities
- `prototype-access-gate`: The gate a viewer passes through when the prototype loads. In this first version it is a notice-only disclaimer — an on-load, dismissible modal that states the prototype is a prototype and its data is sample data — with a test-only suppression flag and no authentication yet.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **New code (agent-web):** `agent-web/src/components/PrototypeNotice.tsx` — the Haven `Modal` + `Button` disclaimer, its open-on-mount state, the `SUPPRESS_KEY` (`ra-suppress-prototype-notice`) read, and its "Okay" dismissal.
- **Affected code (agent-web):** `agent-web/src/Shell.tsx` renders `<PrototypeNotice />` at the top of the shell so it overlays on load.
- **Test infrastructure (agent-web):** `agent-web/playwright.config.ts` seeds the `ra-suppress-prototype-notice` localStorage flag so the modal never blocks the suite; `agent-web/tests/prototype-notice.spec.ts` drops that seed to exercise the genuine first-load-and-dismiss.
- **Secondary — medium-band panel exclusion:** `agent-web/src/useMobile.ts` adds `MEDIUM_QUERY`, `isMediumViewport`, and `useIsMedium`; `agent-web/src/Shell.tsx` makes the subnav and assistant panel mutually exclusive in the medium band; `agent-web/tests/assistant-panel.spec.ts` covers it.
- **Secondary — tooltip-on-click fix:** `agent-web/src/components/ActionBar.tsx` clears the icon-only action's tooltip on click; `agent-web/tests/action-bar.spec.ts` covers it.
- **Not affected:** agent-vision, and any non-shell surfaces. No data model, API, or persisted state changes (the notice's dismissal is deliberately not persisted).
