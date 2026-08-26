## 1. Password gate (agent-web)

- [x] 1.1 In `agent-web/src/components/PrototypeNotice.tsx`, add a shared `PASSWORD` constant and a session `UNLOCK_KEY` (`ra-prototype-unlocked`); initialize an `unlocked` state from `sessionStorage`. Verify the app reads but never writes `SUPPRESS_KEY`.
- [x] 1.2 Render a password `<input>` (with label, placeholder, and an error/`role="alert"` message) inside the modal body while locked, and make the primary button read "Enter" and stay disabled until the field is non-empty. Verify the disclaimer copy is unchanged.
- [x] 1.3 Validate on submit (button click or Enter key): on a correct password, set `unlocked`, persist `UNLOCK_KEY` to `sessionStorage`, and close the modal; on an incorrect password, show the error and keep the modal open. Verify a wrong entry does not dismiss the gate.
- [x] 1.4 Make the modal blocking while locked: `onClose` (overlay/escape/close) only dismisses once `unlocked`. Verify the modal cannot be dismissed without the password.
- [x] 1.5 Remember the unlock for the browser session so a reload shows the disclaimer again but does not re-prompt for the password. Verify a reload within the session skips the password field.
- [x] 1.6 Preserve the `SUPPRESS_KEY` E2E short-circuit. Verify the seeded flag still keeps the gate closed for the suite.

## 2. Password gate (agent-vision)

- [x] 2.1 Apply the identical gate from tasks 1.1–1.6 to `agent-vision/src/components/PrototypeNotice.tsx`. Verify parity with the agent-web component (behavior/keys/copy identical).

## 3. `?key=` link-token bypass (both shells)

- [x] 3.1 Add an `ACCESS_PARAM` (`key`) and `ACCESS_TOKEN` constant plus a `hasAccessToken()` helper that reads `?key=` from `window.location.search`; keep the token value distinct from the typed password. Apply to both shells.
- [x] 3.2 When a valid token is present, pre-unlock the gate and grant it the same session memory as a typed password (persist `UNLOCK_KEY`), so removing the param or reloading does not re-prompt. Verify a token link does not ask for the password again on reload.
- [x] 3.3 Confirm the E2E password test is untouched by the bypass (it navigates without `?key=`, so the gate still shows and validates the password path).

## 4. Auto-close on valid token (both shells)

- [x] 4.1 In the open-on-mount state, check `hasAccessToken()` first and start the modal closed when the token is valid — no disclaimer, no password, no flash. Verify a valid `?key=` link lands directly in the app.
- [x] 4.2 Verify that without a token the gate is unchanged (disclaimer shown, password required).

## 5. Test / verification harnesses

- [x] 5.1 Update `agent-web/tests/prototype-notice.spec.ts` to unlock the gate by entering the password instead of clicking "Okay".
- [x] 5.2 Update `agent-vision/scripts/verify-invite.mjs` to fill `#prototype-password` and press Enter (storage-disabled context, so `SUPPRESS_KEY` can't short-circuit) instead of dismissing with "Okay".

## 6. Token-value refinement (2026-08-25)

- [x] 6.1 Update the `?key=` bypass token value from `rp-preview-2026` to `rp-preview-internal` in both `agent-web/src/components/PrototypeNotice.tsx` and `agent-vision/src/components/PrototypeNotice.tsx`. Verify only the constant changed and the bypass/auto-close behavior is unchanged.

## 7. Verification

- [x] 7.1 Manually verify both shells: gate is blocking until the password is entered; a wrong password errors; a correct password unlocks and is remembered for the session; a valid `?key=` link auto-closes the modal.
- [x] 7.2 Run each shell's build/lint and confirm no type or lint errors are introduced.
- [x] 7.3 Confirm parity between the two `PrototypeNotice.tsx` files (gate, session memory, `?key=` bypass, auto-close, and token value identical).
