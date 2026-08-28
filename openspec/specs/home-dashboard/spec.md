# home-dashboard Specification

## Purpose

Defines the agent-vision Home dashboard — the canvas-coloured, hero-first layout that summarizes leads ready to be promoted to clients, the boxed "Qualified leads" and "Client needs" cards, and the borderless "Client pipeline," "Saved homes by client," and "Upcoming tours" grid beneath them. agent-web has no equivalent Home dashboard and is out of scope for this capability.

## Requirements

### Requirement: Home renders as a canvas-coloured hero-first dashboard

The agent-vision Home screen SHALL render as a canvas-coloured page (header included) built around a single borderless hero, rather than a white page with a floating KPI bar, boxed charts, stage filters, and a client table.

#### Scenario: Home reads as one focal point plus a plain book of business

- **WHEN** the agent-vision Home screen is displayed
- **THEN** the page background, including the header above it, is canvas-coloured rather than white
- **AND** a single hero is shown at the top, above the rest of the dashboard's content

### Requirement: Hero summarizes ready-to-promote leads and the day's other stats

The hero SHALL show a headline derived from the count of leads ready to be promoted to clients, and a stat box carrying the day's other top-line stats — Active clients, Upcoming tours, and Invites pending — without repeating the ready-to-promote count a second time.

#### Scenario: Headline reflects the ready-to-promote count

- **WHEN** one or more leads are ready to be promoted to clients
- **THEN** the hero headline states how many leads are ready to become clients
- **WHEN** no leads are ready to be promoted
- **THEN** the hero headline reads "You're all caught up"

#### Scenario: Stat box excludes the ready-to-promote count

- **WHEN** the hero is displayed
- **THEN** its stat box shows Active clients, Upcoming tours, and Invites pending
- **AND** it does not repeat the ready-to-promote lead count, since the headline already carries it

#### Scenario: Hero switches to a compact layout at its own breakpoint

- **WHEN** the viewport narrows to 1040px or less
- **THEN** the hero switches to a compact, stacked treatment (smaller headline, full-width stat box with each stat sharing the width equally)
- **AND** this switch happens independently of the shell's separate mobile breakpoint

### Requirement: Qualified leads and Client needs render as boxed cards side by side

Below the hero, a "Qualified leads" card and a "Client needs" card SHALL render as boxed cards side by side (stacked on mobile).

#### Scenario: Qualified leads card lists leads to work

- **WHEN** the Qualified leads card is displayed
- **THEN** it lists up to four leads, ready-to-work leads first and then the most recent
- **AND** each row opens that lead's detail page when activated
- **AND** a "View all" control opens the full Leads list
- **WHEN** there are no open leads
- **THEN** the card shows an empty-state message instead of a list

#### Scenario: Client needs card lists open needs with an Ask action

- **WHEN** the Client needs card is displayed
- **THEN** it lists each open need with its client and an open-needs count
- **AND** each row includes an "Ask RealAssist" action for that need

### Requirement: The rest of the book of business renders borderless on one shared grid

"Client pipeline," "Saved homes by client," and "Upcoming tours" SHALL render without card borders, sharing one grid rather than each carrying its own ad hoc spacing.

#### Scenario: Pipeline and saved-homes share a row, tours spans beneath

- **WHEN** the dashboard is displayed above the mobile breakpoint
- **THEN** "Client pipeline" and "Saved homes by client" render side by side
- **AND** "Upcoming tours" spans the full width of the grid beneath them

#### Scenario: Grid collapses to one column on mobile

- **WHEN** the dashboard is displayed at or below the mobile breakpoint
- **THEN** "Client pipeline," "Saved homes by client," and "Upcoming tours" stack in a single column
