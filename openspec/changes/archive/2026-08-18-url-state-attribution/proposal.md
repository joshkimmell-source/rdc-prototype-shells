## Why

During moderated user testing, a shared link, a screenshot, or an over-the-shoulder screen recording of the RealAssist+ prototype gives no reliable signal of *who* the participant is or *what* they were looking at. The URL sat mostly static while the participant moved through the assistant panel, flows, and subnavs. We want the URL itself to annotate the session — carry the participant tag and reflect the current on-screen state — so a link reproduces the same view and observed sessions attribute cleanly, without adding any data collection or network dependency.

## What Changes

- Add a small `track.ts` helper module to both shells with two functions:
  - `readParticipant()` — reads the `?u=` participant tag once at boot; the app never writes it.
  - `mirrorState(key, value)` — reflects one piece of UI state into the URL, preserving all other params, using `history.replaceState` so it never adds Back-button entries, and guarded so it is inert under `file://`.
- Mirror the current session state into the URL as it changes, using present-state semantics (a key is set only while its state is true and removed otherwise — no history log is kept). Params mirrored:
  - `?u=` — participant tag (read at boot; never written).
  - `?panel=open` — the RealAssist+ assistant panel is open.
  - `?expanded=1` — the panel is expanded to near-full-width (only while the panel is open).
  - `?threads=open` — the panel's threads/conversation subnav is showing (only while the panel is open).
  - `?subnav=open|closed` — the Clients/Tours subnav state, mirrored only on screens that have one.
  - `?flow=<task>` — the active assistant flow (`add-client` | `catch-up` | `search-opt` | `client-pulse`).
  - `?done=<task>` — the most recent AI task to reach a "Completed" step this conversation (`add-client` | `catch-up` | `search-opt` | `client-pulse` | `tour`).
  - `?chat=new` — the participant is sitting in a freshly-started conversation (New chat clicked, no message sent yet).
- Surface the participant tag on the shell root as a `data-participant` attribute so a screenshot or DOM inspection also carries it.
- Apply identically to **both** apps: `agent-web` and `agent-vision`.
- Out of scope: any network sink or event/history collection. The URL names present state only; recording the *sequence* of what happened would require a collector, which these prototypes intentionally ship without. Existing navigation params (`?view=`, `?lead=`, `?ab=`) are unchanged and simply preserved by the mirror.

## Capabilities

### New Capabilities
- `url-attribution`: Mirroring the RealAssist+ prototype's current UI state and participant tag into the URL — for attribution during user testing — shared by `agent-web` and `agent-vision`.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **New code (agent-web):** `agent-web/src/track.ts` (`readParticipant`, `mirrorState`).
- **New code (agent-vision):** `agent-vision/src/track.ts` (identical to agent-web's).
- **Affected code (agent-web):** `agent-web/src/Shell.tsx` — reads `?u=` at boot into `participant` state, adds `data-participant` to the shell root, tracks `completedTask` and `newConversation` state, adds a `turnShowsCompleted` predicate, and adds `useEffect` mirrors for `panel`/`subnav`/`flow`/`done`/`expanded`/`threads`/`chat`.
- **Affected code (agent-vision):** `agent-vision/src/Shell.tsx` — the same changes.
- **Not affected:** existing param handling (`navParam.ts` `?view=`/`?lead=`, `abParam.ts` `?ab=`) — those remain the only params read for navigation restore and are preserved untouched by the mirror; no network, storage, or analytics code is added.
