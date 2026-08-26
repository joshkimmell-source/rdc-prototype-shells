## Context

See `proposal.md` — Why. The RealAssist+ assistant lives in `agent-web` as a push panel (`AssistantPanel.tsx`) whose home state shows a menu of capability cards, backed by a local rule-based responder in `assistant.ts`. The DC prototype called `window.claude.complete(...)`, a global that only exists inside the Claude Design runtime; a Vite app has no such global, so `assistant.ts` provides a deterministic stand-in that reproduces the same contract — plain-text replies plus the cards the chat renders — and only defers to `window.claude.complete` if a host injects it. Before this change the only real flow behind that contract was the multi-turn tour-coordination walkthrough; the other cards sent prompts that fell through to the generic fallback reply. Shell state (`Shell.tsx`) already threads per-conversation state (e.g. the tour flow) across turns and owns the threads list. Card copy, values, and drafts are meant to read as real: flows derive their values from the workspace's sample dataset (clients, saved searches, listings, tours) and sign drafts as the agent (Georgia).

## Goals / Non-Goals

**Goals:**
- Ship four named assistant flows — Add Client, Client Pulse, Catch Up, Search Optimization — each reachable both by a capability card tap and by typing the equivalent request.
- Make Add Client a conversational, multi-turn onboarding path that collects people and free-text preferences, then runs the create-group / save-context / create-saved-search tool stubs, with deterministic copy.
- Present the flows as capability cards on the home state, and show only cards whose flow is actually built.
- Keep every value the flows display grounded in the real sample dataset rather than invented.

**Non-Goals:**
- No changes to `agent-vision`.
- No change to the existing tour-coordination flow's behavior, or to the `window.claude.complete` deferral contract.
- No real backend: the Add Client tool calls (`create_client`, `save_context`, `create_saved_search`) are stubs that render as cards, not network calls.
- Not building the Check Listing Status or Manage Client Notes flows — their cards are hidden until wired.

## Decisions

**Decision: Model Add Client as an explicit multi-state machine held in Shell state across turns.**
`AddClientFlow` carries a `state` (`people` → `prefs` → `location` → `confirm`) plus the accumulated `data`; `Shell.tsx` holds the active flow and passes it back into `stepAddClient`/`runAddClient` each turn, advancing the state and updating the collected members, parsed criteria, locations, and transaction as it goes. While a flow is active (or a message triggers `triggersAddClient`), the add-client path takes precedence over the general responder.
- Why: Onboarding is inherently multi-turn — it collects people, then preferences, then confirms — and the copy must be deterministic and testable. An explicit state machine in Shell state makes each turn a pure function of `(state, data, text)`, which the responder can drive without an LLM.
- Alternative considered — a single-shot prompt that asks for everything at once: rejected. It produces a worse conversation (one giant form-in-chat), can't parse and confirm incrementally, and doesn't match the guided onboarding the design calls for.

**Decision: Drive all flows from the local rule-based responder, keyed by `triggers*` matchers.**
Each flow has a matcher (`triggersAddClient`, `triggersClientPulse`, `triggersCatchUp`, `triggersSearchOpt`) that recognizes both the capability card's prompt and natural phrasings ("add another client", "catch me up", "client pulse", "optimize a client search"). The responder dispatches the first match to that flow's builder.
- Why: The prototype must run in a plain Vite app with no LLM available, and card copy needs to be stable for Playwright specs. Rule-based matchers on the same text contract keep behavior deterministic and let a card tap and a typed request enter the same flow.
- Alternative considered — depend on `window.claude.complete` for flow routing: rejected. It isn't present in the Vite runtime, so the flows would never fire; the deferral is retained only as a fallback for hosts that do inject it.

**Decision: Represent flow output as typed cards pushed into the transcript, alongside plain-text replies.**
Each flow emits structured card objects (e.g. tool-trace/tool-run cards, the add-client message card with an optional confirm button or next-step chips, the Client Pulse report card, the Catch Up briefing card, the Search Optimization analysis card) that `AssistantPanel.tsx` renders. Tool calls render as self-animating cards; a sequence collapses into an expandable "Used N tools" summary, and working turns end with a "Completed" marker.
- Why: Reuses the card-rendering contract the tour flow already established, so new flows compose the same way and stay visually consistent.
- Alternative considered — render everything as Markdown text: rejected. It loses the interactive affordances (confirm buttons, action pickers, deep links) and the tool-call animation the design depends on.

**Decision: Parse free-text preferences into structured criteria, but keep timeline and soft wants as private context notes.**
`parseCriteria` extracts beds, baths, property types, a price ceiling, and amenities into hard search filters; timeline and soft constraints are stored as `contextNotes` and surfaced as saved private context rather than as filters on the search.
- Why: Hard filters that encode fuzzy wants ("hoping to move in a few months") would over-constrain the saved search and hide good matches. Keeping them as context preserves the intent for the agent without narrowing results.

**Decision: Update the conversation thread title from the flow, and reflect it in the threads list.**
`stepAddClient` returns a `threadTitle` — "Add Client" on entry, then "Onboarding {Full Name} as New Client" once the group is created — which `Shell.tsx` stores and floats to the top of the threads list.
- Why: Gives the in-progress onboarding a recognizable, evolving label in the threads list, matching the design walkthrough.

**Decision: Gate capability cards with a `hidden` flag filtered at render, rather than deleting unbuilt entries.**
The `Capability` type gains an optional `hidden` flag; Check Listing Status and Manage Client Notes are marked `hidden`, and the home grid renders `CAPABILITIES.filter((cap) => !cap.hidden)`.
- Why: Their prompts would otherwise dead-end on the generic fallback reply, which reads as broken. Keeping the entries (not deleting them) means each flow can be wired and its card un-hidden in one place once ready.
- Alternative considered — delete the unbuilt entries: rejected. It loses the intended copy/icon and the single-point-of-truth for un-hiding, so re-adding later is error-prone.

## Risks / Trade-offs

- **Rule-based matchers can misfire or miss phrasings** → a typed request might not match its intended flow, or two matchers could both match. Mitigation: matchers are narrow and ordered, capability cards send known-good prompts, and each flow has a Playwright spec that exercises the trigger.
- **Flow state persists in Shell across turns** → a half-finished Add Client flow could bleed into an unrelated next message. Mitigation: the add-client path only takes precedence while a flow is active or a trigger fires, `runAddClient` clears the flow (`flow: null`) when it completes, and resetting the conversation clears both the flow and the thread title.
- **Deterministic copy must stay in sync with the sample dataset** → hard-coded phrasing that references dataset values (client names, saved searches, tours, drafts) can drift if the dataset changes. Mitigation: flows read values from the dataset at build time rather than embedding them, and specs assert on the rendered output.
- **Hidden cards are still one edit from shipping unfinished** → un-hiding a card before its flow exists would re-expose the dead-end. Mitigation: the `hidden` flag's doc comment ties un-hiding to wiring the flow, and the filter is the single render-time gate.

## Migration Plan

Additive front-end change to `agent-web` only, behind no feature flag and requiring no data or API migration; the Add Client tool calls are local stubs. Deploy through the normal `agent-web` front-end build. Rollback is a straight revert of the three touched source files (`assistant.ts`, `AssistantPanel.tsx`, `Shell.tsx`) plus `shell.css`; hidden cards revert with them.
