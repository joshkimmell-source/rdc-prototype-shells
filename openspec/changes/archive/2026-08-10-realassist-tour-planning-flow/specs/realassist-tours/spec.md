## Purpose

Defines the RealAssist+ tour-planning / tour-coordination flow in the agent-web app — the stepwise assistant conversation that coordinates a multi-stop buyer tour for an existing client from real data, and how a coordinated tour propagates (its visibility, its map selection, and its booked date/time) across the Home upcoming-tours list, the Tours subnav, and the framed Tours map, with the assistant's rich responses rendered as full-width Haven ActionCards.

## ADDED Requirements

### Requirement: Stepwise tour-planning conversation

RealAssist+ SHALL coordinate a multi-stop tour for an existing client as a stepwise, question-driven conversation in which each step asks a single follow-up question and is derived from the answers so far. The flow SHALL proceed: create a tour, pick a client, choose how to select listings, review the coordinated tour, choose a date and start time, build the full plan, and confirm and schedule.

#### Scenario: Flow is reachable from the empty state and the nudge

- **WHEN** the assistant is at its empty state or shows the busiest-client nudge
- **THEN** a "Plan a tour" affordance is offered
- **AND** activating it starts the tour-planning conversation

#### Scenario: Each step asks one follow-up question

- **WHEN** the user advances a step in the flow
- **THEN** the assistant responds with a single card that carries that step's question in its heading
- **AND** any acknowledgement text is shown ahead of the card it introduces

#### Scenario: Only the wired listing-selection method advances

- **WHEN** the user is asked how to select listings
- **THEN** the "Choose the top 3" method is selectable and advances the flow
- **AND** the other methods are shown as disabled "Coming soon" options

#### Scenario: Steps are built from the client's real data

- **WHEN** the assistant builds the coordinated tour, its per-property notes, conflicts, ranked next steps, showing requirements, and outreach drafts
- **THEN** the content is derived from the selected client's real listings and tour data
- **AND** it does not contradict the tour shown on the Tours screen

### Requirement: A coordinated tour appears on Tours surfaces only once booked

The assistant-coordinated tour SHALL be withheld from the Home "Upcoming tours" list, the Tours subnav Upcoming list, and the Tours map until the flow's confirm-and-schedule step books it. Tours that are already created SHALL remain visible from the start. The tour's underlying data MAY be read by the flow before booking without being displayed.

#### Scenario: Coordinated tour is withheld before booking

- **WHEN** the workspace loads and the coordinated tour has not been booked
- **THEN** the coordinated client's upcoming tour does not appear in the Home upcoming-tours list, the Tours subnav Upcoming list, or on the map
- **AND** the pre-created tour and the coordinated client's past tours remain visible

#### Scenario: Coordinated tour appears after confirm and schedule

- **WHEN** the user completes the confirm-and-schedule step
- **THEN** the coordinated tour appears in the Home upcoming-tours list and the Tours subnav Upcoming list, and the subnav Upcoming/Past counts update
- **AND** the created row reflects its stop count (for example, "Buyer tour · 3 stops")

#### Scenario: Re-running the flow does not duplicate the tour

- **WHEN** the flow is completed again for the same client
- **THEN** the client's existing tour row is replaced rather than a second row added

### Requirement: The Tours map defaults to a client tour and follows the selected subnav tour

The Tours map SHALL show a client's real tour by default rather than an empty state, and SHALL render whichever tour the Tours subnav has selected. Booking the coordinated tour SHALL reveal and select it on the map.

#### Scenario: Map shows a default tour instead of an empty state

- **WHEN** the Tours map is displayed and no tour has been explicitly selected
- **THEN** the map shows the pre-created default tour (a single-stop tour centered on its pin) rather than an empty state

#### Scenario: Map follows the subnav selection

- **WHEN** the user selects a different tour in the Tours subnav
- **THEN** the map re-renders that tour's header, stops, pins, and route in place
- **AND** a single-stop tour hides the commute row and is centered on its pin without a routing call

#### Scenario: Booking selects the coordinated tour on the map

- **WHEN** the user books the coordinated tour via the flow
- **THEN** the map switches from the default tour to the coordinated tour

#### Scenario: A late routing response cannot draw over a switched tour

- **WHEN** a routing response resolves after the user has switched to a different tour
- **THEN** the stale route is not drawn over the currently selected tour

### Requirement: Tour date and time are consistent across surfaces

The date and start time chosen for a tour in the assistant's picker SHALL be carried to every surface that shows the tour — the Home card, the Tours subnav row, and the framed Tours map — so all surfaces show the same date and time. The schedule step SHALL book on the user's selection rather than a dataset default.

#### Scenario: Booked date and time propagate to all surfaces

- **WHEN** the user picks a date and start time and confirms the schedule
- **THEN** the Home card, the Tours subnav row, and the framed Tours map all show the picked date and start time

#### Scenario: Schedule uses the user's selection

- **WHEN** the tour is booked
- **THEN** the booked tour carries the user-selected date and start time rather than the dataset's default

### Requirement: Assistant responses render as full-width Haven ActionCards

The assistant's rich responses SHALL render as Haven v4 ActionCards that fill the transcript column rather than as narrow, hand-rolled cards. Interactive cards SHALL expose a button role with an accessible name; non-interactive cards SHALL NOT expose a button role.

#### Scenario: Rich responses fill the transcript column

- **WHEN** a rich response (such as the tour plan, upcoming-tour panel, picker, or timeline) is displayed
- **THEN** it fills the transcript column width rather than being capped to a narrow strip

#### Scenario: Interactive cards expose an accessible name

- **WHEN** an interactive ActionCard (such as a capability card or the wired listing-selection method) is displayed
- **THEN** it is exposed as a button with an accessible name
- **AND** a non-interactive "Coming soon" card is not exposed as a button
