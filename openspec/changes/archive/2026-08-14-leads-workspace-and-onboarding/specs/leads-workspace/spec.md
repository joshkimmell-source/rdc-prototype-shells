## Purpose

Defines the agent-vision Leads workspace — the leads list and detail surface, the invite-to-RDC+ flow that promotes a worked lead into a connected client, the lead-aware dashboard, and the personalized onboarding preview shown to the inviting agent, including its behavior inside the RealPrototypes sandbox.

## ADDED Requirements

### Requirement: Leads workspace surface

The agent-vision app SHALL provide a Leads workspace as a first-class navigation destination, presenting the agent's net-new prospect records — distinct from connected clients — as a browsable list with a detail page for each lead. The open lead SHALL be addressable in the URL so browser Back closes the detail.

#### Scenario: Leads is reachable from navigation

- **WHEN** the user selects Leads in the navigation
- **THEN** the app navigates to the Leads workspace (`?view=leads`)
- **AND** the Leads item sits directly above Clients in the navigation rail so the funnel reads top-to-bottom

#### Scenario: Leads list presents prospect records

- **WHEN** the Leads list is displayed
- **THEN** it shows the net-new prospect records, split into Buyer and Seller tabs
- **AND** the records are searchable by name, email, or phone
- **AND** the list is sortable and paginated, ordered by most recent activity first

#### Scenario: Opening a lead shows its detail page

- **WHEN** the user opens a lead from the list
- **THEN** the lead detail page is shown with the lead's name, status, contact row, and its pipeline and referral details
- **AND** the open lead is reflected in the URL as `?lead=<id>`
- **AND** using browser Back closes the detail and returns to the list

#### Scenario: A stale or unknown lead falls back to the list

- **WHEN** the leads view is opened with a `?lead=` id that matches no record
- **THEN** the workspace shows the leads list rather than a blank page

### Requirement: Invite flow to work with a lead

The workspace SHALL let the agent invite a lead that has been worked past first contact into RDC+, promoting the lead into a connected client. The invite action SHALL be offered only for ready leads, and promoting a lead SHALL remove it from the active leads list.

#### Scenario: Invite is offered only for ready leads

- **WHEN** a lead has been worked past first contact (Engaged, Met, Appointment set, or Offer made)
- **THEN** the lead exposes a "Work with" invite action and a "Ready to work together" indicator
- **AND** a New or Nurture lead does not expose the invite action

#### Scenario: Composer drafts the invite from the lead's data

- **WHEN** the agent opens the invite composer for a ready lead
- **THEN** it shows the captured qualifying-call data the invite is drafted from and an editable pre-filled message
- **AND** it shows a spotlight best-fit home plus selectable starter-search matches, attached to the invite by default

#### Scenario: Sending promotes the lead to a client

- **WHEN** the agent sends the invite
- **THEN** the lead is promoted to a connected client for the session
- **AND** the promoted lead is removed from the active leads list
- **AND** the composer is replaced with a confirmation

### Requirement: Lead-aware dashboard

The dashboard SHALL reflect lead state, surfacing the incoming leads, where they came from, and a count of the leads ready to work with, and SHALL prioritize ready leads and active clients. The lead figures SHALL reflect only open (un-promoted) leads.

#### Scenario: Dashboard surfaces new leads and their sources

- **WHEN** the dashboard is displayed
- **THEN** it shows a "New leads" list of open leads, with ready-to-work leads first and then the most recent
- **AND** it shows a "Lead sources" breakdown tallied by the Realtor.com product each lead came in through
- **AND** each surfaced lead can be opened to its detail page from the dashboard

#### Scenario: Qualified-leads count reflects ready, un-promoted leads

- **WHEN** the dashboard KPI stats are displayed
- **THEN** a "Qualified leads" stat shows the number of open leads ready to work with
- **AND** inviting a lead this session lowers that count as the lead is promoted out of the pool

#### Scenario: Ready leads and active clients are prioritized

- **WHEN** the dashboard lists leads and clients
- **THEN** ready-to-work leads and Active clients are ordered ahead of the rest

### Requirement: Personalized onboarding preview

Sending an invite SHALL show the agent a preview of the RDC+ onboarding flow the invited lead would receive, personalized with the lead's name and email and the homes attached to the invite.

#### Scenario: Preview reflects the invited lead and attached homes

- **WHEN** the agent sends an invite
- **THEN** a preview of the realtor.com+ onboarding flow is shown
- **AND** it is personalized with the invited lead's name and email
- **AND** the homes attached to the invite are rendered in the previewed email

#### Scenario: Preview can be reopened from the confirmation

- **WHEN** the confirmation screen is shown after sending
- **THEN** the agent can reopen the onboarding preview from the confirmation

### Requirement: Onboarding preview renders inside the RealPrototypes sandbox

The onboarding preview SHALL render and personalize correctly when the prototype is hosted inside the RealPrototypes sandboxed iframe, where popups are blocked and storage is partitioned or unavailable.

#### Scenario: Preview is shown in-app rather than a popup

- **WHEN** the invite is sent while the prototype runs inside the sandboxed iframe
- **THEN** the onboarding preview is shown in an in-app overlay iframe rather than a new browser tab
- **AND** the overlay's controls are clickable and drive the onboarding screens without being swallowed by the composer's modal overlay

#### Scenario: Personalization is delivered without shared storage

- **WHEN** the preview loads and cross-frame storage is partitioned or unavailable
- **THEN** the personalization payload is delivered to the preview over cross-frame messaging
- **AND** the preview announces readiness before the shell replies, so the payload is not missed
- **AND** the preview shows the personalized greeting and attached homes

#### Scenario: Preview is packaged into the single-file bundle

- **WHEN** the prototype is packaged as the single-file bundle for hosting
- **THEN** the onboarding page is inlined and served from the bundle with no separate document
- **AND** the packaged app renders without script-corruption errors
