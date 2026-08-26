## 1. track.ts helper (agent-web)

- [x] 1.1 Add `agent-web/src/track.ts` with `readParticipant()` that reads and trims `?u=` from `location.search`, returning the tag or `null`, and never writing it. Verify booting with `?u=tester07` yields `"tester07"` and no `?u=` yields `null`.
- [x] 1.2 Add `mirrorState(key, value)` that reflects one param into the URL: normalize `true → "1"`, `false`/`null`/`undefined`/`""` → delete the key, otherwise stringify; preserve all other params; skip the write when the URL is unchanged. Verify setting then clearing a key leaves the URL identical to before and other params untouched.
- [x] 1.3 Write via `history.replaceState` (not `pushState`) and wrap it in try/catch so it is inert under `file://`. Verify no new Back-button entry is created and that opening the bundled file from disk does not throw.

## 2. Shell wiring (agent-web)

- [x] 2.1 In `agent-web/src/Shell.tsx`, import from `./track`, seed `const [participant] = useState(readParticipant)` at boot, and render `data-participant={participant ?? undefined}` on the shell root div. Verify a `?u=` value appears on the root element and is absent otherwise.
- [x] 2.2 Add `completedTask` and `newConversation` state, and a `turnShowsCompleted(cards)` predicate matching the panel's "Completed" marker render conditions (`catchUpBriefing`, `searchAnalysis`, `clientPulseReport`, `upcomingTour`, or an `addClientMessage` with `completed === true`). On each assistant turn set `completedTask` to the producing task (`add-client`/`catch-up`/`search-opt`/`client-pulse`, `tour` for a booked or upcoming-tour deep-dive; Client Pulse keyed off its report card). Clear `newConversation` on send. Verify `completedTask` reflects the last completed task per conversation.
- [x] 2.3 Add `useEffect` mirrors: `?panel=open` while the panel is open; `?expanded=1` while `pushContent && pushExpanded`; `?threads=open` while `pushContent && pushOver`; `?subnav=open|closed` only on the Clients/Tours screens (cleared elsewhere); `?flow=<task>` derived from the active-flow states; `?done=<task>` from `completedTask`; `?chat=new` while `newConversation`. Verify each param appears/disappears as its state toggles.
- [x] 2.4 On the New-chat action, set `newConversation` true and reset `completedTask` (alongside the existing flow/thread-title resets). Verify New chat yields `?chat=new` with no `?flow`/`?done`, and that `?chat=new` clears once a message is sent.

## 3. Mirror to agent-vision

- [x] 3.1 Add `agent-vision/src/track.ts` identical to `agent-web/src/track.ts`. Verify the two files are byte-for-byte identical.
- [x] 3.2 Apply the identical `Shell.tsx` wiring from tasks 2.1–2.4 to `agent-vision/src/Shell.tsx` (preserving its existing `readLeadParam` usage). Verify parity: the only differences from agent-web's Shell are pre-existing (e.g. the `?lead=` handling), not the attribution mirroring.

## 4. Verification

- [x] 4.1 Run each app's build/lint in `agent-web` and `agent-vision` and verify no type or lint errors are introduced.
- [x] 4.2 Manually verify present-state semantics in both apps: opening/closing the panel, expanding it, toggling its threads subnav, toggling the Clients/Tours subnav, entering/leaving each flow, completing a task, and starting a new chat each set and later remove the corresponding param, and that unrelated params (`?u=`, `?view=`, `?lead=`, `?ab=`) are preserved throughout.
- [x] 4.3 Verify a shared/reloaded URL: `?u=` restores the participant tag and `data-participant`, and the preserved `?view=`/`?lead=`/`?ab=` params still land on the same screen/lead/variant.
- [x] 4.4 Verify no collection and `file://` safety: no network request is made by the mirror, no browser-history entry is added by mirrored state, and the bundled single-file artifact opens from disk without error.
