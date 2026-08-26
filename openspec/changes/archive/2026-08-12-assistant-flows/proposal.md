## Why

The RealAssist+ assistant panel (`agent-web`) opened on a single working flow — the multi-turn tour-coordination walkthrough — while the rest of the panel's promise ("here's what RealAssist+ can do") was aspirational. The home state advertised capability cards, but tapping most of them dead-ended on the generic fallback reply because no flow was wired behind them. This change fills in the assistant's menu: it ships a conversational **Add Client** onboarding flow and the **Client Pulse**, **Catch Up**, and **Search Optimization** flows, surfaces each as a capability card, and hides the cards whose flow is not yet built so the menu only ever offers something that actually works.

## What Changes

- Add a conversational **Add Client** onboarding flow: a stepwise, chat-only path that collects the client group's people, then free-text search preferences and location, then runs backend tool stubs to create the group, save private context, and create a saved search. The flow is a multi-state machine held in Shell state across turns and driven by the local rule-based responder so its copy is deterministic. The conversation's thread title updates from "Add Client" to "Onboarding {Full Name} as New Client" once the group is created; co-buyers are supported as multiple group members. Free-text preferences are parsed into structured criteria (beds, baths, property type, budget, amenities), with timeline and soft wants kept as private context notes rather than hard filters.
- Add a **Client Pulse** flow: a single-group deep-dive that produces a client profile, an engagement/intent read, a 7d/30d activity table, saved searches, deep-linked top property interests, prioritized suggested actions (the top one carrying a ready-to-send draft), a confidence read, and the upcoming-tour card, then an interactive action picker. Values are derived from the real sample dataset and drafts sign as the agent.
- Add a **Catch Up** flow: an agent-initiated daily briefing that streams through its analysis states, then presents prioritized items (critical / important / FYI) with suggested actions and, where relevant, the upcoming-tour card.
- Add a **Search Optimization** flow: a client-picker entry, then a structured "Search Optimization Analysis" report that reads client behavior and recommends search refinements.
- Surface each flow as a **capability card** on the assistant's home state; tapping a card sends its prompt to kick that flow off in the transcript.
- **Hide unbuilt capability cards** (Check Listing Status, Manage Client Notes) behind a `hidden` flag on the `Capability` type, filtered at render, so each can be un-hidden in one place once its flow is wired. Shrink the capability card description text so more fits in each card; titles are unchanged.
- Out of scope: no changes to `agent-vision`; the tour-coordination flow already shipped and is unchanged except where it shares the responder module.

## Capabilities

### New Capabilities
- `realassist-assistant`: The RealAssist+ assistant panel's flow menu in `agent-web` — the named conversational flows it offers (Add Client, Client Pulse, Catch Up, Search Optimization), their presentation as capability cards on the home state, and the rule that only built/available cards are shown.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **Affected code (agent-web):**
  - `agent-web/src/assistant.ts` — the local rule-based responder gains the Add Client onboarding state machine (`AddClientState`/`AddClientFlow`, `triggersAddClient`, `stepAddClient`/`runAddClient`, preference parsing) and the Client Pulse, Catch Up, and Search Optimization flows (their card types, `triggersClientPulse`/`triggersCatchUp`/`triggersSearchOpt`, and builders that read the sample dataset).
  - `agent-web/src/panels/AssistantPanel.tsx` — the `Capability` type gains a `hidden` flag; the `CAPABILITIES` menu adds Add Client, Catch Up, Client Pulse, and Search Optimization entries and marks Check Listing Status and Manage Client Notes hidden; the home grid renders only non-hidden cards; and the new flow cards are rendered in the transcript.
  - `agent-web/src/Shell.tsx` — holds the add-client flow state and the conversation thread title across turns, routes triggering messages into the flows, and reflects the running thread title in the threads list.
  - `agent-web/src/shell.css` — shrinks the capability card description text (12px, tighter line-height).
  - `agent-web/src/components/ActionBar.tsx`, `agent-web/src/components/primitives.tsx`, `agent-web/src/useMobile.ts`, `agent-web/public/mini-tour-map.html` — supporting UI shipped alongside the flows (width-measured ActionBar degradation, touch-suppressed tooltips, the embedded mini tour map).
- **Tests:** `agent-web/tests/add-client-flow.spec.ts`, `agent-web/tests/client-pulse-flow.spec.ts`, `agent-web/tests/catch-up-flow.spec.ts`, `agent-web/tests/search-optimization-flow.spec.ts`, `agent-web/tests/action-bar.spec.ts`.
- **Not affected:** `agent-vision` (no changes); the existing tour-coordination flow's behavior; theme tokens.
