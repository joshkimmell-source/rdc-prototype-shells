## Context

See `proposal.md` — Why. The `realassist-trigger` capability already models the "Ask RealAssist+" trigger placement as a URL-driven A/B test: `abParam.ts` reads `?ab=` once at startup, coerces it to an `AbVariant`, and falls back to a `DEFAULT_VARIANT` for any missing or unknown value. Two variants existed — `a` (the corner FAB) and `b` (the inline `ActionBar` header action) — with `a` as the default. `Shell.tsx` reads the variant once into fixed session state and collapses the placement decision into a single boolean, `actionBar`, that both the header and the FAB read: when `true` the trigger lives in the header `ActionBar`, when `false` it stays on the FAB. Previously that boolean was simply `variant === 'b'`. The shell already tracks a reactive `isMobile` flag from the mobile breakpoint. `agent-web` and `agent-vision` carry near-identical copies of `abParam.ts` and the relevant `Shell.tsx` logic.

## Goals / Non-Goals

**Goals:**
- Add a responsive-blend variant `c` (FAB on mobile, inline `ActionBar` action elsewhere) and make it the default and fallback for `?ab=`.
- Keep the placement decision expressed as the existing single `actionBar` boolean, derived reactively so variant `c` flips as the viewport crosses the mobile breakpoint.
- Mirror the variant/default change identically across `agent-web` and `agent-vision`.

**Non-Goals:**
- No change to how variants `a` and `b` render the trigger, or to the FAB and inline `ActionBar` components themselves — only which one shows by default changes.
- No on-screen variant switcher and no write-back of `?ab=`; the parameter stays read-only, as before.
- No change to the read-once-per-session model: the selected variant is still fixed for the life of the session.
- The agent-vision Leads/Home polish items are visual and are out of scope for the spec delta (tracked in tasks only).

## Decisions

**Decision: Make variant `c` the default and fallback rather than adding it as an opt-in arm.**
`DEFAULT_VARIANT` changes from `a` to `c`, and `c` joins the accepted-variant list; the `AbVariant` type widens to `'a' | 'b' | 'c'`. A missing `?ab=` and an unknown value both resolve to `c`.
- Why: The goal is that a plain shared link opens the preferred (responsive) placement without anyone appending a query parameter. Keeping `a` and `b` addressable by explicit `?ab=a` / `?ab=b` preserves the ability to force either fixed arm for comparison.
- Alternative considered — leave `a` as default and require `?ab=c`: rejected, because the point is that the unqualified link is the one under evaluation, so the blend must be the default.

**Decision: Express variant `c` as `variant === 'b' || (variant === 'c' && !isMobile)`.**
The single `actionBar` boolean the header and FAB already share is derived from the variant plus the reactive `isMobile` flag: `b` is always inline; `c` is inline everywhere except mobile, where it falls back to the FAB; `a` is always the FAB.
- Why: Reusing the existing boolean keeps the header/FAB rendering paths untouched — they still read one flag. Sourcing it from the reactive `isMobile` state means `c` flips live when the viewport crosses the breakpoint, without re-reading the URL.
- Alternative considered — a separate resolver that maps variant + width to a placement enum: rejected as over-engineering for a two-way (FAB vs. inline) choice already captured by one boolean.

**Decision: Apply the change identically in both shells.**
`agent-web` and `agent-vision` receive the same `abParam.ts` edit and the same `actionBar` derivation.
- Why: The two shells are intentionally kept in parity; a divergent default would make a shared link behave differently between them.

## Risks / Trade-offs

- **Default behavior changes for existing links** — links opened without `?ab=` now show `c` instead of `a`, so a desktop viewer who previously saw the corner FAB now sees the inline header action. Mitigation: `?ab=a` still forces the old default for anyone who needs the prior behavior.
- **Live breakpoint flip** — because `c` reads reactive `isMobile`, resizing across the mobile breakpoint moves the trigger between the FAB and the header mid-session. Mitigation: this is intended; the placement decision was already a single reactive boolean, so the transition uses the same rendering paths as a normal resize.
- **Two `abParam.ts` copies must stay in sync** — the agent-web and agent-vision files are near-identical. Mitigation: apply the exact same edit to both and confirm the variant list, type, and default match.

## Migration Plan

Purely a front-end default/behavior change with no data or API migration. Deploy through the normal front-end build for both apps. Rollback is a straight revert of the `abParam.ts` and `Shell.tsx` edits (restoring `DEFAULT_VARIANT = 'a'`, the two-value variant list, and `actionBar = variant === 'b'`); explicit `?ab=a` and `?ab=b` links are unaffected by either direction.
