## 1. Add Client onboarding flow

- [x] 1.1 In `agent-web/src/assistant.ts`, add the Add Client state model — `AddClientState` (`people` → `prefs` → `location` → `confirm`), `AddClientMember`, `AddClientCriteria`, `AddClientData`, and `AddClientFlow` — plus the `triggersAddClient` matcher that recognizes the "Add Client" prompt and "add another client". Verify the matcher fires on the card prompt and natural phrasings.
- [x] 1.2 Implement `stepAddClient`/`runAddClient` as the multi-turn machine: State 1 asks for the people; State 2 parses members (co-buyers supported), creates the group via the `create_client` stub, and asks about the search; the prefs/location states parse free-text into structured criteria (beds, baths, property type, budget, amenities) with timeline and soft wants kept as `contextNotes`; the confirm state runs the `save_context` and `create_saved_search` stubs and presents next-step options. Verify a full run collects people, parses preferences, and ends with the summary.
- [x] 1.3 Render the flow's output as cards in `agent-web/src/panels/AssistantPanel.tsx`: tool calls render as self-animating cards resolving to a "Used N tools" summary, the add-client message card carries an optional confirm button or next-step chips, and working turns end with a "Completed" marker. Verify the tool-group expand/collapse works.
- [x] 1.4 In `agent-web/src/Shell.tsx`, hold the add-client flow and the conversation thread title across turns, route messages into the flow while it's active or when `triggersAddClient` fires, update the title from "Add Client" to "Onboarding {Full Name} as New Client" once the group is created, and float the running title to the top of the threads list. Verify the thread title updates mid-flow and clears on reset.

## 2. Client Pulse, Catch Up, and Search Optimization flows

- [x] 2.1 In `agent-web/src/assistant.ts`, add the Client Pulse flow and its card types: `triggersClientPulse`, and a builder producing the profile, engagement/intent read, 7d/30d activity table, saved searches, deep-linked top property interests, prioritized suggested actions (top one carrying a ready-to-send draft signed as the agent), a confidence read, the upcoming-tour card, and the interactive action picker — all derived from the sample dataset. Verify the report renders for a picked client.
- [x] 2.2 Add the Catch Up daily-briefing flow: `triggersCatchUp`, the streaming analysis states, and the prioritized critical/important/FYI briefing with suggested actions and the embedded upcoming-tour card. Verify the briefing renders after the processing stream.
- [x] 2.3 Add the Search Optimization flow: `triggersSearchOpt`, the client-picker entry, and the structured "Search Optimization Analysis" report that reads client behavior and recommends refinements. Verify the picker leads into the analysis report.

## 3. Capability cards on the home state

- [x] 3.1 In `agent-web/src/panels/AssistantPanel.tsx`, add the `CAPABILITIES` entries for Add Client, Catch Up, Client Pulse, and Search Optimization, each with icon, title, description, and the `prompt` that kicks its flow off when the card is tapped. Verify tapping each card starts its flow in the transcript.
- [x] 3.2 Add an optional `hidden` flag to the `Capability` type, mark Check Listing Status and Manage Client Notes hidden, and render only non-hidden cards (`CAPABILITIES.filter((cap) => !cap.hidden)`). Verify the two unbuilt cards do not appear on the home menu while the built ones do.
- [x] 3.3 In `agent-web/src/shell.css`, shrink the capability card description text (12px, tighter line-height) while leaving titles unchanged. Verify descriptions are smaller and titles are unaffected.

## 4. Supporting UI

- [x] 4.1 Add the width-measured ActionBar degradation (pills → circles → overflow menu) with touch-suppressed tooltips and on-screen overflow placement (`agent-web/src/components/ActionBar.tsx`, `primitives.tsx`, `useMobile.ts`), and the embedded mini tour map (`agent-web/public/mini-tour-map.html`) used by the flows.

## 5. Verification

- [x] 5.1 Add Playwright specs covering each flow: `add-client-flow.spec.ts` (capability trigger, the full flow, the thread-title update, tool-group expand/collapse), `client-pulse-flow.spec.ts`, `catch-up-flow.spec.ts`, `search-optimization-flow.spec.ts`, and `action-bar.spec.ts`. Verify all pass.
- [x] 5.2 Run `tsc --noEmit`, the full Playwright suite, and `npm run build` for `agent-web` and confirm all are clean/green.
- [x] 5.3 Confirm out-of-scope surfaces are untouched: `agent-vision` has no changes and the existing tour-coordination flow behaves as before.
