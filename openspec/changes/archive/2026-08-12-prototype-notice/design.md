## Context

See `proposal.md` — Why. The agent-web prototype is populated entirely with fictional sample data (clients, listings, tours, addresses). Nothing on screen tells a first-time viewer that the content is fabricated, so it is easy to mistake a sample record for a real one. The shell (`agent-web/src/Shell.tsx`) is the single mount point every screen renders under, which makes it the natural place to hang an on-load overlay. The app already depends on the Haven design system (`@rdc-npm/rdc-ui-v4`), which provides a `Modal` and `Button`. The E2E suite is Playwright (`agent-web/playwright.config.ts`), and any modal that is open on mount would overlay the first interaction of every test unless there is a way to suppress it. This is the first version of what will grow into a prototype access gate; here it is notice-only, with no authentication.

## Goals / Non-Goals

**Goals:**
- Show an unmissable, up-front disclaimer on load that states plainly this is a prototype and everything in it is sample data.
- Make the notice dismissible with a single obvious action ("Okay") and re-show it on every fresh load so the disclaimer is never permanently silenced for a real viewer.
- Keep the automated test suite unblocked without weakening the disclaimer for real visitors.
- Reuse the existing Haven `Modal`/`Button` primitives; add no new styling mechanism.

**Non-Goals:**
- No authentication, password, or access control — this version only informs; it does not gate. (That is a later evolution of this capability.)
- No persistence of dismissal across page loads (a reload intentionally shows the notice again).
- No change to agent-vision or to any screen content; the sample data itself is unchanged.

## Decisions

**Decision: Render the notice open-on-mount from the shell.**
`PrototypeNotice` initializes its `open` state to `true` on first mount and is rendered once at the top of `Shell.tsx`, so it overlays before the viewer interacts with any screen.
- Why: The shell is the single common ancestor of every screen, so one mount point covers the whole prototype, and open-on-mount guarantees the disclaimer is seen first.

**Decision: Dismissal is transient, not persisted.**
The "Okay" button (and the modal's overlay/escape/close affordances) simply sets `open` to `false`; nothing is written to storage. A fresh page load re-shows the notice.
- Why: The disclaimer's value is that a viewer re-encounters it each session; a one-time "don't show again" would let the fictional-data caveat lapse for later loads.
- Alternative considered — persist a "seen" flag so it shows only once: rejected. It weakens the disclaimer for exactly the repeat viewers most likely to forget the data is fake.

**Decision: A single read-only localStorage flag suppresses the notice for tests.**
`SUPPRESS_KEY = 'ra-suppress-prototype-notice'`; when it reads `'1'` the notice initializes closed. The app only reads the flag and never writes it. The Playwright config seeds it as `storageState` for the whole suite; the dedicated notice spec drops the seed to exercise the real first load.
- Why: A modal open on mount would overlay the first interaction of every test. Seeding a read-only flag keeps the suite clean while guaranteeing real visitors — who never set it — always see the notice. Keeping the flag read-only in the app means the disclaimer can never be silently disabled at runtime.
- Alternative considered — disable the notice under a test/env build flag: rejected; a storage seed keeps the production code path identical for tests and real loads (only the seeded input differs) and keeps the real behavior exercised by a dedicated spec.

**Decision: Reading storage is wrapped defensively.**
The `SUPPRESS_KEY` lookup is wrapped in try/catch; if storage is blocked (private mode), it defaults to showing the disclaimer.
- Why: Failing open toward showing the disclaimer is the safe default for a caveat about fictional data.

## Risks / Trade-offs

- **A modal open on mount blocks the E2E suite** → mitigated by seeding the read-only `ra-suppress-prototype-notice` flag in `playwright.config.ts`, kept in sync with `SUPPRESS_KEY` in `PrototypeNotice.tsx`, with a dedicated spec that drops the seed to prove the real load still shows and dismisses the notice.
- **Notice re-appears on every load could annoy repeat viewers** → accepted deliberately; the recurring disclaimer is the point, and dismissal is a single click.
- **Suppression flag could be misused to hide the disclaimer** → the app only ever reads the flag, never writes it, so it cannot be toggled off through normal use; it exists solely as a test seam.
- **Secondary changes broaden the diff** → the medium-band panel exclusion (`useMobile.ts`, `Shell.tsx`) and the ActionBar tooltip-on-click fix ride along; each is covered by its own spec and is independent of the notice.

## Migration Plan

Purely additive front-end change for agent-web, shipped through the normal front-end build. No data, API, or persisted-state migration (the notice deliberately persists nothing). Rollback is removing the `<PrototypeNotice />` mount from `Shell.tsx`, deleting `PrototypeNotice.tsx`, and reverting the `playwright.config.ts` storage seed and the `prototype-notice.spec.ts` test.
