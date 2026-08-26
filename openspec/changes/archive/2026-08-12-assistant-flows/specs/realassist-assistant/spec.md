## Purpose

Defines the RealAssist+ assistant panel's flow menu in `agent-web` — the named conversational flows the assistant offers (Add Client, Client Pulse, Catch Up, Search Optimization), how those flows are presented as capability cards on the assistant's home state, and the rule that only flows that are actually built are offered.

## ADDED Requirements

### Requirement: Assistant offers named flows

The RealAssist+ assistant SHALL offer a set of named conversational flows — Add Client, Client Pulse, Catch Up, and Search Optimization — each reachable both by selecting its capability card and by typing an equivalent request. Selecting a flow SHALL begin that flow in the conversation transcript.

#### Scenario: Add Client onboarding flow guides the agent through onboarding

- **WHEN** the agent starts the Add Client flow
- **THEN** the assistant collects the client group's people and free-text search preferences over multiple turns
- **AND** it runs the create-group, save-context, and create-saved-search steps and confirms the result
- **AND** the conversation's thread title updates from "Add Client" to "Onboarding {Full Name} as New Client" once the group is created

#### Scenario: Client Pulse flow produces a client deep-dive

- **WHEN** the agent starts the Client Pulse flow for a client group
- **THEN** the assistant presents a deep-dive covering the client profile, an engagement/intent read, an activity view, saved searches, top property interests, prioritized suggested actions, a confidence read, and any upcoming tour
- **AND** it offers an interactive way to act on the suggestions

#### Scenario: Catch Up flow produces a prioritized briefing

- **WHEN** the agent starts the Catch Up flow
- **THEN** the assistant analyzes recent activity and presents a prioritized briefing of items with suggested actions

#### Scenario: Search Optimization flow recommends refinements

- **WHEN** the agent starts the Search Optimization flow for a client
- **THEN** the assistant analyzes the client's behavior and presents a structured report recommending search refinements

#### Scenario: A flow can be started by typing an equivalent request

- **WHEN** the agent types a request that names one of the flows (for example, "catch me up" or "add a new client")
- **THEN** the assistant begins that same flow, matching the behavior of selecting its capability card

### Requirement: Flows are presented as capability cards

The assistant's home state SHALL present its available flows as a menu of capability cards, each naming the flow and, when selected, sending that flow's prompt to begin it in the transcript.

#### Scenario: Home state lists the available flows as cards

- **WHEN** the assistant panel is shown in its home state
- **THEN** each available flow is shown as a capability card with its title and description

#### Scenario: Selecting a capability card starts its flow

- **WHEN** the agent selects a capability card
- **THEN** the card's prompt is sent to the assistant and that flow begins in the conversation transcript

### Requirement: Only built flows are offered

The home state SHALL show only capability cards whose flow is built and available. A capability whose flow is not yet built MUST be hidden from the menu so the agent is never offered a flow that dead-ends.

#### Scenario: Unbuilt capability cards are hidden

- **WHEN** the assistant home state is shown
- **THEN** capabilities marked as not-yet-built (such as Check Listing Status and Manage Client Notes) do not appear in the menu
- **AND** the built flows (Add Client, Catch Up, Client Pulse, Search Optimization) do appear

#### Scenario: A hidden capability is retained for later enablement

- **WHEN** a capability is hidden because its flow is not built
- **THEN** its definition is retained and filtered out at render, so it can be made visible in one place once its flow is wired
