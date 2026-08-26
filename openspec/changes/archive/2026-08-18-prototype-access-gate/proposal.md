## Why

The `prototype-access-gate` capability today is notice-only: the "This is a prototype" modal states that the content is sample data and is dismissed with an "Okay" button. That is fine for the disclaimer, but the prototype is now hosted at a public demo URL, so anyone who finds the link can walk straight into the app. We want a lightweight barrier that keeps casual visitors out of a shared link while still letting invited viewers and shareable/tracked links in without friction. This is deliberately a **soft** gate — the credentials ship in the client bundle — so it deters a casual visitor, not a determined reader of the source.

## What Changes

- Turn the notice into an **access gate**: until the correct shared password is entered, the modal cannot be dismissed — its overlay, escape, and close affordances are inert — so the app behind it stays blocked. The primary button reads "Enter" (and is disabled while the field is empty) until access is granted, then reverts to "Okay".
- **Remember a successful unlock for the browser session** (a `sessionStorage` flag). A reload shows the sample-data disclaimer again but does not re-prompt for the password within the session.
- Add a **`?key=<token>` link-token bypass**: a shareable link carrying a valid token pre-unlocks the gate on load, earning the same session memory as a typed password. The token is deliberately **distinct from the human password** because it travels in URLs — including the mirrored/shared links produced by `track.ts` — and the typed password should not.
- **Auto-close on a valid token**: when a valid `?key=` token is present on initial mount, the modal closes immediately — no disclaimer, no password, no flash. (This supersedes the token's earlier behavior, which only pre-unlocked the password step and still showed the disclaimer for an "Okay" dismissal.) Without a token the gate is unchanged.
- Apply the **same gate and token behavior to both shells** (`agent-web` and `agent-vision`).
- Preserve the existing **`SUPPRESS_KEY` E2E short-circuit** so the gate never blocks the test suite, and update the test/verification harnesses that previously dismissed the notice with "Okay" to enter the password instead.
- Later refinement (2026-08-25): update the bypass token value to `rp-preview-internal` in both shells.
- Out of scope: any real (server-side) authentication — this remains a soft, client-side gate; the disclaimer copy itself is unchanged.

## Capabilities

### Modified Capabilities
- `prototype-access-gate`: Evolves from a notice-only disclaimer into an authenticated soft gate. Passing the gate now requires either the shared password or a valid `?key=` token; a valid token auto-closes the gate with no manual step; the behavior is identical across both shells; and a successful unlock is remembered for the browser session. The prior sample-data disclaimer and the test-only suppression flag are retained.

## Impact

- **Affected code (agent-web):** `agent-web/src/components/PrototypeNotice.tsx` — password field, validation and error state, session `UNLOCK_KEY` (`ra-prototype-unlocked`), inert overlay/escape while locked, "Enter"/"Okay" button, `hasAccessToken()` + `?key=` bypass, and the auto-close-on-token branch of the open-on-mount state.
- **Affected code (agent-vision):** `agent-vision/src/components/PrototypeNotice.tsx` — the identical gate, session memory, `?key=` bypass, and auto-close behavior.
- **Test / verification harnesses:** `agent-web/tests/prototype-notice.spec.ts` and `agent-vision/scripts/verify-invite.mjs` now unlock the gate by entering the password (`#prototype-password` → `Enter`) instead of clicking "Okay".
- **Styling:** inline `style` objects plus theme tokens in `theme.ts` (`C.dark`/`C.sub` text, `C.border`, `C.white`, `C.brand` for the error/invalid state). No new styling mechanism.
- **Storage:** reads/writes `sessionStorage` `ra-prototype-unlocked`; continues to read the `localStorage` `SUPPRESS_KEY` (`ra-suppress-prototype-notice`) test flag but never writes it.
- **Not affected:** the sample-data disclaimer copy, the Haven `Modal`/`Button` usage, and any non-shell surfaces. No server-side auth, data model, or API changes.
