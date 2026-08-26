## Context

See `proposal.md` — Why. RealAssist+ lives in `agent-web`'s `AssistantPanel.tsx`, driven by `assistant.ts` (intents, a `respondLocally` responder, and a discriminated union of "card" response shapes). Responses render into a transcript column that already runs up to 720px wide (the Home-state capability cards fill it). The workspace ships a fictional sample dataset (`data/sample/adapters.ts`) with agents, clients, saved listings, and tours; Jordan & Mia Castellanos (`cli_02`) are the busiest active client and carry the richest upcoming tour — `tour_01`, three stops, originally dated Aug 15. Priyanka is a separate client with a pre-created single-stop tour (`tour_08`: 1442 92nd Court, Rivertown, 2:30 PM, Requested). The Tours experience has three surfaces that must agree with the assistant: the Home "Upcoming tours" list, the Tours subnav (Upcoming/Past lists with counts), and a framed `tours-map.html` embedded in `ToursScreen.tsx`, fed over `askBridge.ts` postMessage. The constraint throughout: invent nothing — every stop, conflict, ranked next step, draft message, and suggested day is derived from the real client's real data so the flow never contradicts the Tours screen.

## Goals / Non-Goals

**Goals:**
- Drive a complete tour end to end from the assistant as a stepwise conversation — one follow-up question per step — for a real roster client, using only real sample data.
- Keep every surface consistent: a coordinated tour is withheld until booked, then appears on Home, the subnav, and the map with the same date/time the user picked in the assistant.
- Default the map to a real client tour (Priyanka) rather than an empty state, and make it follow the subnav's selected tour.
- Present the assistant's rich responses as full-width Haven v4 `ActionCard`s rather than hand-rolled narrow cards.

**Non-Goals:**
- No real backend, calendar integration, or messaging — draft outreach and the tool trace are presentational, assembled from local data.
- No support for the two unwired listing-selection methods (they render as disabled "Coming soon").
- No changes to `agent-vision`; this flow is `agent-web` only.
- Not a redesign of the Clients/Search screens beyond the nav-rail/landing and bubble-size polish carried alongside.

## Decisions

**Decision: Model the flow as a stepwise, question-driven sequence rather than one shot.**
The conversation is: create a tour → pick a client → choose how to select listings → review the (undated) coordinated tour → choose a date & start time → build the full plan → confirm & schedule. Each step is a card (`clientPicker`, `selectMethod`, `tourListings`/`tourPlan`, `dateTime`, `tourTimeline`/`tourOutreach`/`tourSummary`, `upcomingTour`), with the step's question carried in the card heading and the text reply left empty.
- Why: A guided, one-question-at-a-time flow reads as coordination the agent controls, and it lets each step derive its content from the answers so far. It replaced an earlier one-shot coordination plan and a single-step date picker.
- Alternative considered — a single "coordinate this tour" response: rejected as harder to follow and less demonstrative of assistant-led coordination.

**Decision: Acknowledgements ride in a separate `preReply` rendered before the cards they introduce.**
"Got it —" style acknowledgements are emitted as `preReply` text so they appear above the step's cards; question cards themselves leave the reply text empty and carry the prompt in their heading.
- Why: Keeps the acknowledgement visually ahead of the card it introduces without coupling it to the card body.

**Decision: Derive all content from the real client's real data.**
Stops, per-property caveats ("A few things to note"), conflicts (read off unconfirmed stop statuses and the open-house window), ranked next steps (with a confidence marker), showing facts (from status and days-on-market), and per-agent outreach drafts (`LISTING_AGENTS`) are all computed from `cli_02`'s listings and `tour_01`. The suggested/best-fit day is derived from the same tour.
- Why: The flow must agree with the Tours screen; invented content would contradict it.

**Decision: Withhold the coordinated tour everywhere until "Confirm & schedule".**
The assistant-coordinated client (`cli_02`) is filtered out of the initial Home upcoming-tours seed, and `tour_01` is added to `WITHHELD_TOUR_IDS` (derived from `ASSISTANT_COORDINATED_CLIENT_IDS`) so it is also held out of the subnav Upcoming list and off the map. The tour data still exists (the flow reads it to build the plan); it is just not displayed. `createdTourIds` state in `Shell.tsx` drives the subnav list and Upcoming/Past counts, and booking reveals and selects the tour via `scheduled.tourId`. Priyanka's tour and `cli_02`'s past tours stay visible from the start.
- Why: The coordinated tour should only appear once the agent has actually booked it, mirroring real behavior; Home and the subnav must behave identically.

**Decision: Make creation idempotent.**
Booking replaces the client's existing row rather than appending, and `ScheduledTour` carries the stop-count `type` so the created row reads "Buyer tour · 3 stops" rather than a hardcoded "1 stop".
- Why: Re-running the flow (e.g. during a demo) must not duplicate the tour.

**Decision: Drive the framed map from the subnav's `selectedTour`, with a Priyanka default.**
`adapters.ts` derives `tourMapData` (a `MapTour` per roster tour) from the dataset — addresses via the existing `stopAddress`/listing join, status from the listing, times/tour-status from the stop, drive/walk from the tour (hidden for single-stop), and a deterministic pseudo-coordinate per address (the fictional cities carry no real location). `tours-map.html` becomes a pure renderer of the posted tour keyed by id, with a Priyanka fallback for standalone opens and graceful handling of a stopless tour; `askBridge.ts` exposes `ra:tour-select` / `useSelectedTour`. The map opens on Priyanka's tour and booking selects the coordinated one.
- Why: This evolved from an empty-state-until-booked map, to a Priyanka-default/Castellanos-on-booking toggle, to following any of the five roster tours the subnav selects — the most general behavior while preserving the default/booking story. A route token guards against a late OSRM response drawing a route over a tour the user has since switched away from.

**Decision: Carry the booked date/time across all Tours surfaces.**
`ScheduledTour` carries the booked ISO date and start time; `Shell.tsx` tracks per-tour reschedules and re-labels the subnav row and re-dates the framed map via `rescheduleTourViews` (`adapters.ts`). The schedule step books on the user's selection, threaded through the summary card.
- Why: The date/time the user picks in the assistant must be the date/time every surface shows.

**Decision: Rebuild the rich cards on Haven v4 `ActionCard` and let them fill the transcript column.**
Drop the 340px `maxWidth` cap so every rich response reads as a full-width card, and rebuild the Home capability cards, the listing-selection method rows, and the upcoming-tour suggestions on the `ActionCard` primitive. Interactive method rows use `ActionCard`'s `CardLink` (which renders `role=button` with an `aria-label`, preserving existing accessible-name selectors); "Coming soon" rows are non-interactive bordered cards with a `Tag` and no `CardLink`/button role.
- Why: Consistency with the design system and with the full-width Home-state cards; the narrow cards read as a strip beside the wider text bubbles.

## Risks / Trade-offs

- **Flow and surfaces can drift out of sync** — the assistant, Home, the subnav, and the map all key off `cli_02` / `tour_01`. Mitigation: withheld/booked state is centralized (`ASSISTANT_COORDINATED_CLIENT_IDS` → `WITHHELD_TOUR_IDS`, `createdTourIds` in `Shell`), and E2E covers both withheld-initial and created-after-flow states across surfaces.
- **Late async map responses** — an OSRM route call could resolve after the user switches tours and draw the wrong route. Mitigation: a per-render route token; single-stop tours skip OSRM and center on the pin.
- **Idempotency** — re-running the flow could duplicate the tour. Mitigation: booking replaces the client's row by id.
- **Accessible names via `ActionCard`** — moving to `CardLink`/`role=button` could break existing name-based selectors. Mitigation: `CardLink` exposes an `aria-label`, and the E2E suite asserts the accessible names still resolve.
- **Standalone map opens** — `tours-map.html` is also opened directly by action-bar tests with no posted tour. Mitigation: it keeps a Priyanka fallback and renders immediately when loaded standalone.

## Migration Plan

Front-end-only prototype change in `agent-web`, no data or API migration. Sample tour data (`tour_01`, `tour_08`) already exists in the dataset; the flow reads it and controls only visibility, selection, and date/time labeling. Ships through the normal front-end build. `?view=home` still resolves so existing flow specs keep working after Home is dropped from the nav. Rollback is a straight revert of the listed `agent-web` files.
