## Context

See `proposal.md` — Why. The RealAssist+ prototype (`Shell.tsx`, near-identical in `agent-web` and `agent-vision`) already seeds a few pieces of state from the URL at boot via pre-existing helpers: `readNavParam` (`?view=`), `readLeadParam` (`?lead=`, agent-vision only), and `readAbParam` (`?ab=`), and it writes `?view=`/`?lead=` on genuine navigation. Everything else — the assistant panel being open, whether it's expanded, its threads subnav, the Clients/Tours subnav, the active assistant flow, task completion, a freshly-started chat — lived only in React state and left no trace in the URL. For user testing we want the URL to be self-describing: who the participant is and what is on screen right now, so a shared link, screenshot, or observed session attributes cleanly. This is explicitly attribution, not analytics — no network calls, no event log.

## Goals / Non-Goals

**Goals:**
- Read a participant tag from `?u=` once at boot and keep it fixed for the session; surface it in the URL and on the shell root.
- Reflect the relevant current UI state into the URL as it changes, with present-state semantics (set while true, removed otherwise).
- Preserve all other URL params on every write, and never pollute browser history or the Back button.
- Keep the helper inert and crash-free when the bundle is opened from disk (`file://`).
- Mirror the exact same behavior across both `agent-web` and `agent-vision`.

**Non-Goals:**
- No data collection: no network sink, no analytics, no persisted event stream.
- No history/sequence recording — the URL names present state only; you cannot later tell that a now-removed key was once set.
- No change to the existing navigation params (`?view=`, `?lead=`, `?ab=`) or how the screen/lead/variant are restored on load — those keep their current behavior and are simply preserved.
- No change to icons, destinations, flows, or the assistant panel's own logic beyond the state needed to describe it.

## Decisions

**Decision: A dedicated `track.ts` module with `readParticipant` + `mirrorState`, identical in both shells.**
Keep the attribution concern in one tiny, well-documented file rather than threading URL writes through the components. `readParticipant()` reads `?u=` and trims it; `mirrorState(key, value)` sets or deletes a single param.
- Why: One place to reason about the "URL reflects present state, no collection" contract, and the two shells stay byte-for-byte identical (the committed files share the same content hash).

**Decision: Use `history.replaceState`, never `pushState`.**
Every mirror write replaces the current history entry rather than adding one.
- Why: Mirrored UI state (panel open, flow, etc.) is not navigation. Only genuine navigation (`?view=`/`?lead=` via `navParam.ts`) should create Back-button entries; the mirror must not.

**Decision: Present-state semantics — `true` writes `1`; `false`/`null`/`''` deletes the key.**
`mirrorState` normalizes its value: `true → "1"`, any of `false | null | undefined | ""` → delete the key, otherwise stringify. A write that would not change the URL is skipped (`url.href === window.location.href`).
- Why: The URL should name only what is currently true. Deleting on falsey keeps it from accumulating stale flags, and the equality short-circuit avoids redundant `replaceState` churn.

**Decision: Read `?u=` at boot; never write it. Also surface it on the shell root.**
`participant` is seeded once with `useState(readParticipant)` and rendered as `data-participant` on the shell root div (omitted when null).
- Why: The participant tag is an input to the session, not state the app mutates; leaving it untouched keeps a shared testing link stable, and the DOM attribute means a screenshot or inspection carries it even without the URL bar.

**Decision: Derive `?flow` from the active-flow states; mirror only persistent flows.**
`?flow` is computed from `addFlow`/`catchUpFlow`/`searchOptFlow`/`clientPulseFlow` (first match wins) → `add-client`/`catch-up`/`search-opt`/`client-pulse`, else cleared. One-off prompts are not mirrored.
- Why: `?flow` answers "which prompt am I in" — persistent current state. One-off prompts are events, not state, and would violate the present-state contract.

**Decision: `?done` names the most recent AI task to reach a "Completed" step, via a shared `turnShowsCompleted` predicate.**
`turnShowsCompleted(cards)` mirrors the render conditions for the design's "Completed" marker (the `catchUpBriefing`, `searchAnalysis`, `clientPulseReport`, and `upcomingTour` cards always carry it; an `addClientMessage` carries it when its own `completed` flag is set). On each turn the caller attributes completion to the task that produced it — `add-client`, `catch-up`, `search-opt`, `client-pulse`, or `tour` (a booked tour or upcoming-tour deep-dive). Client Pulse keys off its report card directly because it reuses the add-client message card.
- Why: `?done` names the AI task, not the card, and stays in sync with the panel's own completion UI. It is a single slot (present state), reset on New chat.

**Decision: Mirror `?subnav` only on screens that have a subnav.**
`?subnav=open|closed` is written only when `activeNav` is `clients` or `tours`; on other screens the key is cleared.
- Why: A subnav open/closed flag is meaningless on screens without one; leaving it off keeps the URL honest.

**Decision: Gate `?expanded` and `?threads` on the panel being open.**
`?expanded=1` is written only while `pushContent && pushExpanded`; `?threads=open` only while `pushContent && pushOver`.
- Why: Both describe sub-states of the assistant panel; without the panel open they have no meaning.

**Decision: `?chat=new` tracks a freshly-started conversation.**
A `newConversation` flag is set true on the New-chat click (which also clears `completedTask` and the flows/thread title) and set false when the next message is sent; it mirrors to `?chat=new`.
- Why: Distinguishes "sitting in a new, empty conversation" from an in-progress one for attribution.

## Risks / Trade-offs

- **`replaceState` throws under `file://`.** The single-file artifact from `npm run bundle` opens from disk, where `history.replaceState` throws. Mitigation: `mirrorState` wraps the write in try/catch and is simply inert there; `readParticipant` still works (it only reads `location.search`).
- **Present-state vs. history confusion.** Because a removed key leaves no trace, an observer cannot infer the sequence of what happened — only the current snapshot. This is intentional (attribution, not analytics); the module doc calls it out so no one mistakes the URL for an event log.
- **Two files must stay in sync.** `Shell.tsx` and `track.ts` are near-identical across the two apps. Mitigation: `track.ts` is byte-for-byte identical, and the `Shell.tsx` edits are applied identically; confirm parity.
- **`?done` drifting from the panel UI.** The `turnShowsCompleted` predicate duplicates the panel's "Completed" render conditions. Mitigation: it is documented as "keep in sync with `CompletedMarker` usage in AssistantPanel.tsx"; Client Pulse is special-cased to avoid a false positive from the shared message card.

## Migration Plan

Purely additive front-end change: a new `track.ts` per app plus `Shell.tsx` wiring. No data, storage, API, or schema migration. Deploy through the normal front-end build for both apps. Existing links keep working — the mirror only adds/removes its own keys and preserves the rest. Rollback is a straight revert of the two `Shell.tsx` edits and deletion of the two `track.ts` files; no persisted state to unwind.
