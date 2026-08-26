## Context

See `proposal.md` — Why. The `prototype-access-gate` capability was introduced (2026-08-12) as a notice-only disclaimer: `PrototypeNotice.tsx` renders a Haven `Modal` that is open on first mount, states the content is sample data, and is dismissed with an "Okay" `Button`. Dismissal is not persisted (a reload re-shows it), and the sole escape hatch is the `SUPPRESS_KEY` (`ra-suppress-prototype-notice`) `localStorage` flag that the Playwright config seeds so the overlay does not block the suite. The component exists in both shells (`agent-web/src/components/PrototypeNotice.tsx` and `agent-vision/src/components/PrototypeNotice.tsx`), which are kept near-identical. The prototype is now deployed to a public demo URL, so the notice needs to become a barrier — but only a soft one, since anything the client needs to validate the credential also ships in the client bundle.

## Goals / Non-Goals

**Goals:**
- Require the shared password to dismiss the gate, and keep the modal genuinely blocking (overlay/escape/close inert) until access is granted.
- Let a shareable `?key=<token>` link grant access with no manual step, and auto-close the modal on load when the token is valid.
- Remember a successful unlock for the browser session so reloads (or dropping the `?key=` param) don't re-prompt.
- Mirror the behavior identically across both shells and preserve the `SUPPRESS_KEY` E2E short-circuit.

**Non-Goals:**
- No real, server-side authentication. This is explicitly a soft gate; both the password and the token ship in the client bundle.
- No change to the sample-data disclaimer copy, and no new styling mechanism (stay on the existing inline-style + Haven `Modal`/`Button` approach).
- No persisted cross-session login (session memory only) and no change to the deploy pipeline.

## Decisions

**Decision: Keep the disclaimer modal as the gate; block dismissal until unlocked.**
Reuse the existing on-load `Modal` rather than adding a separate auth surface. While locked, the modal's `onClose` (overlay/escape/close) is inert, a password field is shown, and the primary button reads "Enter" and is disabled until the field is non-empty. On a correct entry the button reverts to "Okay" and the modal closes.
- Why: One surface for both the disclaimer and the gate keeps the code and the viewer's mental model simple; the disclaimer copy is preserved unchanged.
- Alternative considered — a distinct login screen ahead of the app: rejected as heavier than a soft gate warrants.

**Decision: Remember a successful unlock in `sessionStorage`, not `localStorage`.**
A correct password (or a valid token) sets `UNLOCK_KEY` (`ra-prototype-unlocked`) in `sessionStorage`, so reloads within the session skip the password prompt while a new browser session re-gates.
- Why: Session scope matches "deter casual visitors" without granting a permanent bypass; it is distinct from the `localStorage` `SUPPRESS_KEY` test flag, which the app only reads and never writes.

**Decision: Use a URL `?key=<token>` bypass with a token distinct from the typed password.**
`hasAccessToken()` reads `?key=` from `window.location.search` and compares it to the configured token. A match unlocks the gate and earns the same session memory as a typed password.
- Why: Shareable and tracked links (including the mirrored/shared links from `track.ts`) can carry the token so invited viewers arrive unblocked. The token is deliberately **not** the human password, because it rides along in URLs and we don't want the typed password leaking there. Both values are still soft (shipped in the bundle).

**Decision: A valid token auto-closes the modal on initial mount.**
The open-on-mount state checks `hasAccessToken()` first; if valid, the modal starts closed — no disclaimer, no password, no flash. This superseded the token's first iteration, which only pre-unlocked the password step and still showed the disclaimer for an "Okay" dismissal. Without a token, the gate behaves exactly as before.
- Why: A link recipient with a valid token should land directly in the app; showing and then closing the disclaimer produced an unnecessary flash.

**Decision (refinement, 2026-08-25): the bypass token value is `rp-preview-internal`.**
The `?key=` token shipped initially as `rp-preview-2026` and was later updated to `rp-preview-internal` in both `agent-web` and `agent-vision`. Only the constant value changed; the bypass, session-memory, and auto-close behavior are unchanged. Because it is a soft gate, rotating the value is a one-line constant edit in each shell.

## Risks / Trade-offs

- **Soft gate, not security** — both the password and the token ship in the client bundle and can be recovered from the source. Mitigation: this is stated explicitly in the component header; the gate is scoped to deterring casual visitors to a demo link, not protecting sensitive data.
- **Token leakage via URLs** — the `?key=` token travels in shareable/tracked links and browser history. Mitigation: keep the token distinct from the human password so the password never rides in a URL; rotate the token value when needed (see the 2026-08-25 refinement).
- **Gate could block automated tests** — a genuinely blocking modal can wedge E2E runs. Mitigation: preserve the `SUPPRESS_KEY` short-circuit for the suite, and update the harnesses (`prototype-notice.spec.ts`, `verify-invite.mjs`) that ran in storage-disabled contexts to actually enter the password.
- **Storage unavailable (sandboxed host)** — `sessionStorage` writes are wrapped in try/catch; if blocked, the gate simply re-evaluates the URL/password on the next load rather than erroring.
- **Two shells must stay in sync** — the two `PrototypeNotice.tsx` files are near-identical. Mitigation: apply the same edits to both and rotate the token in both together.

## Migration Plan

Purely client-side front-end change; no data or API migration. Ships through the normal front-end build for both shells. First-time visitors now see a password field; share invited/tracked links with the `?key=<token>` param so recipients land directly in the app. Rollback is a straight revert of the two `PrototypeNotice.tsx` files (and the harness edits) back to the notice-only behavior. Rotating the token is a one-line constant change in each shell.
