## 1. Assistant tour-planning flow

- [x] 1.1 In `agent-web/src/assistant.ts`, add the tour card shapes and their builders assembled from a client's real upcoming tour — first `TourPlanCard`/`DatePickerCard`, then the full union (`toolTrace`, `tourListings`, `tourPlan`, `tourTimeline`, `tourOutreach`, `tourSummary`, `upcomingTour`, `clientPicker`, `selectMethod`, `dateTime`) with `PlanProperty`, `LISTING_AGENTS` contacts, and `showingFacts` derived from real status/days-on-market. Verify the plan agrees with `cli_02`'s listings and `tour_01`.
- [x] 1.2 Add the `plan_tour` and `start_tour` intents ahead of `schedule_tour` and the multi-card `respondLocally` responses; emit "Got it —" acknowledgements as `preReply`. Verify a "Plan a tour" message opens the flow.
- [x] 1.3 In `agent-web/src/panels/AssistantPanel.tsx`, add the card views for every card shape (including the interactive date/time picker opening on the tour month with the best-fit day ringed). Verify each step renders its content.
- [x] 1.4 In `agent-web/src/Shell.tsx`, render `preReply` before the cards it introduces. Verify the acknowledgement appears above its step's cards.
- [x] 1.5 In `agent-web/src/data/sample/adapters.ts`, lead the empty-state chips and the busiest-client nudge with "Plan a tour". Verify the flow is reachable from both.

## 2. Stepwise, question-driven sequence

- [x] 2.1 Reshape the flow into the sequence create a tour → pick a client → choose how to select listings → review the undated coordinated tour → choose a date & start time → build the full plan → confirm & schedule. Verify each step is a single follow-up question.
- [x] 2.2 Add the `clientPicker`, `selectMethod`, and `dateTime` cards and drop the old one-step date picker. Verify the picker no longer appears as a single step.
- [x] 2.3 Wire only the "Choose the top 3" listing-selection method; render the other two as disabled "Coming soon" rows. Verify only "top 3" advances the flow.
- [x] 2.4 Carry each step's prompt in the card heading and leave the reply text empty; keep acknowledgements in `preReply`. Verify question cards show the prompt in their heading.

## 3. Withhold the coordinated tour until booked

- [x] 3.1 In `agent-web/src/data/sample/adapters.ts`, filter the assistant-coordinated client (`cli_02`) out of the initial Home upcoming-tours seed while keeping Priyanka's pre-created tour visible. Verify Home shows Priyanka but not Jordan & Mia at start.
- [x] 3.2 Carry the stop-count `type` on `ScheduledTour` so the created row reads "Buyer tour · 3 stops"; make creation idempotent so re-running the flow replaces the client's row rather than duplicating it. Verify the created row's label and that re-running does not add a second row.
- [x] 3.3 Derive `WITHHELD_TOUR_IDS` from `ASSISTANT_COORDINATED_CLIENT_IDS` and hold `tour_01` out of the Tours subnav Upcoming list and off the map until booked, keeping Priyanka's tour and `cli_02`'s past tours visible. In `Shell.tsx`, drive the subnav list and Upcoming/Past counts from `createdTourIds`, and reveal/select the tour on booking via `scheduled.tourId`. Verify the subnav withholds then reveals the tour.

## 4. Tours map default and subnav-driven selection

- [x] 4.1 In `agent-web/public/tours-map.html`, show Priyanka's single-stop tour (`tour_08`) by default instead of an empty state; add `renderTour(tour)` that re-populates the header, commute row (hidden for single-stop), table, pins, and route in place, with a route token so a late OSRM response cannot draw over a switched tour and single-stop tours centering on the pin with no OSRM call. Verify the framed map shows Priyanka by default.
- [x] 4.2 In `agent-web/src/data/sample/adapters.ts`, derive `tourMapData` / `TOUR_MAP_DATA` (a `MapTour` per roster tour) — addresses via the `stopAddress`/listing join, status from the listing, times/tour-status from the stop, drive/walk from the tour (hidden for single-stop), and a deterministic pseudo-coordinate per address. Verify each roster tour maps to a `MapTour`.
- [x] 4.3 In `agent-web/src/askBridge.ts`, replace `ra:tour-visible`/`useTourVisibility` with `ra:tour-select`/`useSelectedTour` posting the selected tour's payload; pass `TOUR_MAP_DATA[selectedTour]` from `Shell.tsx`/`ToursScreen.tsx` into the frame; make `tours-map.html` a pure renderer keyed by id with a Priyanka fallback for standalone opens and graceful handling of a stopless tour. Verify the map draws whichever roster tour the subnav selects, opens on Priyanka, and selects the coordinated tour on booking.

## 5. Carry tour date/time across surfaces

- [x] 5.1 Have `ScheduledTour` carry the booked ISO date and start time, and book the schedule step on the user's selection (threaded through the summary card) rather than the dataset default. Verify the booked tour reflects the picked date/time.
- [x] 5.2 In `Shell.tsx`, track per-tour reschedules and re-label the subnav row and re-date the framed map via `rescheduleTourViews` (`adapters.ts`). Verify the Home card, subnav row, and framed map all show the same picked date/time.

## 6. Rich Haven ActionCards filling the transcript

- [x] 6.1 In `AssistantPanel.tsx`, drop the 340px `maxWidth` cap so every rich response (tour plan, upcoming-tour panel, picker, timeline) fills the transcript column up to 720px. Verify the cards read as full-width.
- [x] 6.2 Rebuild the Home capability cards, the listing-selection method rows, and the upcoming-tour suggestions on the Haven v4 `ActionCard` primitive; interactive rows use `CardLink` (role=button + aria-label), "Coming soon" rows are non-interactive bordered cards with a `Tag` and no CardLink/button role. Verify accessible-name selectors still resolve for the interactive cards.

## 7. Nav and bubble polish (carried alongside)

- [x] 7.1 Drop Home from the nav rail (`NavRail.tsx`) and bar and default the landing screen to Clients, keeping `?view=home` resolvable for the flow specs (`navParam.ts`). Verify Home is absent from the nav but `?view=home` still loads.
- [x] 7.2 Set the user chat bubble font size to a consistent 14px and land the `HomeScreen` redesign / `theme.ts` additions carried alongside. Verify the user bubble text is 14px.

## 8. Verification

- [x] 8.1 Run the E2E suite (`agent-web/tests/tour-flow.spec.ts`, `nav-rail.spec.ts`): the six-step flow (chip → client picker → select method → coordinated tour → date/time → full plan → confirm & schedule), the withheld-initial / created-after-flow states on Home and the subnav, and the framed map showing Priyanka by default and Jordan & Mia after booking. Verify all pass.
- [x] 8.2 Run `tsc` and `npm run build` for `agent-web` and verify no type or build errors are introduced.
