# clients-subnav Specification

## Purpose

Defines the Clients subnav shared by the agent-web and agent-vision apps — the relationship-status tabs that segment the Clients surface (Active / Invited / Requests), how the client list is filtered and counted per tab, the pinned agent feed row, and the lead-invite affordance that produces an "Invited" client.

## Requirements

### Requirement: Clients subnav segments the Clients surface into status tabs

The Clients subnav SHALL present a set of tabs that segment the Clients surface by relationship status, and the tabs SHALL be, in order, **Active**, **Invited**, and **Requests**. Each tab MUST display the true count of clients in its category.

#### Scenario: Three status tabs are shown

- **WHEN** the Clients subnav is displayed
- **THEN** it shows exactly three tabs labeled Active, Invited, and Requests, in that order
- **AND** each tab shows, in parentheses, the number of clients whose status matches that tab

#### Scenario: Counts reflect true per-category totals

- **WHEN** the set of clients changes (for example, a lead is invited)
- **THEN** each tab's count reflects the current number of clients in that category

#### Scenario: Resting and active tabs are visually distinct

- **WHEN** a tab is not the selected tab
- **THEN** its label is shown in the resting (alternate) text treatment
- **AND** the selected tab's label is shown in the emphasized (base) text treatment

### Requirement: Client list filters to the selected tab

The client list below the tabs SHALL show only clients whose status matches the selected tab, further narrowed by the search query. Selecting a different tab MUST change which clients are listed.

#### Scenario: List shows only the selected category

- **WHEN** a tab is selected
- **THEN** the list shows only clients whose status matches that tab
- **AND** clients belonging to the other tabs are not listed

#### Scenario: Search narrows within the selected tab

- **WHEN** the user types a search query
- **THEN** the list shows only clients in the selected tab whose name matches the query

#### Scenario: Empty states distinguish search from empty category

- **WHEN** a search query is present and no client in the selected tab matches it
- **THEN** the list shows "No clients match your search."
- **WHEN** no search query is present and the selected tab has no clients
- **THEN** the list shows "No clients in this list."

### Requirement: Agent feed row is pinned above the list

The agent's own feed row SHALL be pinned above the search input, separate from the tabbed client list, and MUST NOT be counted within or filtered by any status tab.

#### Scenario: Agent feed sits above the tabs and list

- **WHEN** the Clients subnav is displayed
- **THEN** the agent's own feed row appears above the search input
- **AND** it is not included in any tab's count or in the tabbed list below

### Requirement: A lead can be invited and surfaces as an Invited client

Inviting a lead SHALL create an "Invited" client from that lead's information, and that client SHALL appear under the Clients subnav's **Invited** tab. The invited client MUST persist for the current session so it survives a reload.

#### Scenario: Invited lead appears under the Invited tab

- **WHEN** the agent invites a lead to become a connected client
- **THEN** an "Invited" client is created from the lead's information
- **AND** it appears under the Clients subnav's Invited tab
- **AND** it also appears in the Home/Clients data

#### Scenario: Invitation persists across a reload within the session

- **WHEN** a lead has been invited and the app is reloaded within the same session
- **THEN** the invited client still appears under the Invited tab
- **AND** in a fresh session the invited client is no longer present

### Requirement: Both shells present the same Clients subnav

The agent-web and agent-vision apps SHALL present the same Clients subnav with the same status tabs, filtering, and pinned agent feed row.

#### Scenario: Same subnav in both apps

- **WHEN** the Clients subnav is displayed in agent-web and in agent-vision
- **THEN** both show the same Active / Invited / Requests tabs, per-tab filtering, and pinned agent feed row

#### Scenario: agent-web has no leads feed into the subnav

- **WHEN** the Clients subnav is displayed in agent-web, which has no leads feature
- **THEN** it lists the full client roster segmented by the same tabs
- **AND** no session-invited clients are added, since there is no lead-invite flow in that app
