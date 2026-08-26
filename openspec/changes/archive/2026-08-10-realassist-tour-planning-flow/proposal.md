## Why

RealAssist+ (the in-app assistant in `agent-web`) could answer questions but had no way to actually help an agent coordinate a multi-stop buyer tour — the highest-value, most tedious task in the roster. We want to demonstrate the assistant driving a real tour end to end for an existing client, using the workspace's real sample data rather than invented content, so that what the assistant says and books stays consistent with what the Tours screen, the Tours subnav, and the Home upcoming-tours list show. The flow must feel like a guided conversation (one question at a time), and the resulting tour must only surface on the Tours surfaces once it has actually been coordinated and booked — not before.

## What Changes

- Add a stepwise RealAssist+ tour-planning conversation for an existing roster client (Jordan & Mia Castellanos, `cli_02`, and their upcoming three-stop tour `tour_01`): create a tour → pick a client → choose how to select listings → review the (undated) coordinated tour → choose a date & start time → build the full plan → confirm & schedule. Each step is a single follow-up question; acknowledgements ride ahead of the cards they introduce.
- Assemble every step from the client's real saved listings and tour data: a tool-trace card, a listing-selection card, a plan table with per-property "A few things to note" caveats, a Tour Timeline, per-listing-agent Showing Requirements & Outreach draft messages, and a Potential Conflicts / Recommended Next Steps summary — all derived from real status, days-on-market, access notes, and the open-house window.
- Wire only the "Choose the top 3" listing-selection method; render the other two methods as disabled "Coming soon" rows.
- Reach the flow from the assistant's empty-state chips and the busiest-client nudge, both led by "Plan a tour".
- Withhold the assistant-coordinated tour from the Home "Upcoming tours" list, the Tours subnav Upcoming list, and the map until the flow's "Confirm & schedule" step books it; Priyanka's pre-created tour and the client's past tours stay visible from the start. Re-running the flow replaces the client's row rather than duplicating it.
- Default the Tours map to Priyanka's already-created single-stop tour (`tour_08`) instead of an empty state, and drive the map from the subnav's `selectedTour` so it renders whichever of the five roster tours is selected; booking the coordinated tour reveals and selects it.
- Carry the tour's booked date and start time from the assistant's picker to the Home card, the Tours subnav row, and the framed Tour map, so the date/time is consistent across every surface; the schedule step books on the user's selection rather than the dataset default.
- Render the assistant's rich responses as full-width Haven v4 `ActionCard`s that fill the transcript column (up to 720px) instead of narrow, hand-rolled 340px cards.
- Alongside: drop Home from the nav rail/bar and default the landing screen to Clients (`?view=home` still resolves for the flow), and set the user chat bubble font size to a consistent 14px.

## Capabilities

### New Capabilities
- `realassist-tours`: The RealAssist+ tour-planning / tour-coordination flow in `agent-web` — the stepwise assistant conversation for an existing client, the rich `ActionCard`-based responses, and the propagation of a coordinated tour (its visibility, selection, and date/time) across the Home upcoming-tours list, the Tours subnav, and the framed Tours map.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **Affected code (assistant):** `agent-web/src/assistant.ts` (card union and builders — `TourPlanCard`/`DatePickerCard` then `toolTrace`/`tourListings`/`tourPlan`/`tourTimeline`/`tourOutreach`/`tourSummary`/`upcomingTour`/`clientPicker`/`selectMethod`/`dateTime`; `PlanProperty`, `LISTING_AGENTS`, `showingFacts`; the `plan_tour`/`start_tour`/`schedule_tour` intents and `respondLocally`; `preReply` acknowledgements; `ScheduledTour` carrying stop-count `type`, booked ISO date, and start time).
- **Affected code (panels):** `agent-web/src/panels/AssistantPanel.tsx` (all card views; full-width transcript cards; Haven `ActionCard` rebuild of Home capability cards, listing-selection method rows, and upcoming-tour suggestions).
- **Affected code (shell/screens):** `agent-web/src/Shell.tsx` (render `preReply` before its cards; `createdTourIds` state; booking reveals/selects via `scheduled.tourId`; `rescheduleTourViews`), `agent-web/src/screens/HomeScreen.tsx`, `agent-web/src/screens/ToursScreen.tsx`, `agent-web/src/components/Subnav.tsx`, `agent-web/src/components/NavRail.tsx`.
- **Affected code (map + bridge):** `agent-web/public/tours-map.html` (pure renderer of the posted tour, keyed by id; Priyanka fallback for standalone opens; single-stop centering; route token guarding late OSRM responses), `agent-web/src/askBridge.ts` (`ra:tour-select` / `useSelectedTour`).
- **Affected code (data):** `agent-web/src/data.ts`, `agent-web/src/data/sample/adapters.ts` (lead chips + busiest-client nudge with "Plan a tour"; `WITHHELD_TOUR_IDS` from `ASSISTANT_COORDINATED_CLIENT_IDS`; `tourMapData` / `TOUR_MAP_DATA` per roster tour; `rescheduleTourViews`), `agent-web/src/navParam.ts`, `agent-web/src/icons.tsx`, `agent-web/src/theme.ts`.
- **Tests:** `agent-web/tests/tour-flow.spec.ts` (six-step flow, withheld/revealed tour visibility, dynamic subnav, framed-map default/switch) and `agent-web/tests/nav-rail.spec.ts`.
- **Not affected:** `agent-vision`, and any surface outside the assistant panel and the Tours/Home surfaces above.
