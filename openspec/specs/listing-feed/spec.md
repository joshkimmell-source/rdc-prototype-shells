# listing-feed Specification

## Purpose

Defines the agent-web Clients screen's listing feed and the shared fictional sample dataset that backs it — the dataset's fictional/safe guarantees and degenerate records, how the feed is rendered from the dataset, how the shell is scoped to five clients each with their own feed, and how home imagery is sourced.

## Requirements

### Requirement: Sample dataset is fully fictional and safe

The shared sample dataset SHALL contain only fictional, non-reachable identities and places, so that a user-testing participant who acts on any contact detail cannot reach a real person. Phone numbers MUST be in the fictional `555` block, email addresses MUST be on `example.com` (RFC 2606), MLS identifiers MUST carry a `SAMPLE:` prefix, and cities/states MUST be invented (the state code `ST` is not a real code).

#### Scenario: Contact details cannot reach a real person

- **WHEN** the dataset supplies a phone number, email address, or MLS identifier
- **THEN** the phone number is in the `555` block
- **AND** the email address is on the `example.com` domain
- **AND** the MLS identifier is prefixed `SAMPLE:`

#### Scenario: Places are invented

- **WHEN** a listing or record exposes a city and state
- **THEN** the city name is fictional and the state is the non-real code `ST`

#### Scenario: Data is fixed across runs

- **WHEN** the dataset is injected into a shell more than once, or into more than one shell
- **THEN** the same people and properties appear each time, so screenshots and testing sessions are comparable

#### Scenario: Degenerate records are preserved

- **WHEN** the dataset is injected
- **THEN** the deliberate edge-case records remain present (a listing with null square footage, a one-photo gallery, a tour with no stops, a client with zero saves, an archived client with saves)
- **AND** they are not removed to make a screen's grid look fuller

### Requirement: agent-web renders a listing feed from the dataset

The agent-web Clients screen SHALL render a date-grouped feed of listing cards built entirely from the shared sample dataset, mapped through a per-shell adapter so that no shell component is reshaped around the dataset's types.

#### Scenario: Feed renders grouped listing cards

- **WHEN** the Clients screen is displayed
- **THEN** listings from the dataset render as cards grouped under day-section headings (such as Today and Yesterday)
- **AND** each card presents the listing's photo, price, status, and property details from the dataset

#### Scenario: Card details are derived, not invented

- **WHEN** a listing card shows its recency and its saved state
- **THEN** the recency reflects the listing's position in the feed against a deterministic feed clock, stable across runs
- **AND** a listing on an upcoming tour stop is shown as saved

#### Scenario: Dataset values reach the screen through the adapter

- **WHEN** the shell's exported listing/client constants are consumed by the screen
- **THEN** their values come from the sample dataset via the adapter, with the existing component types unchanged

### Requirement: Clients screen is scoped to five clients each with their own feed

The Clients screen SHALL be scoped to a roster of five clients, and each client SHALL have their own listing feed whose size differs from the others, so the screen presents an agent's book as different sizes for different people.

#### Scenario: Feeds differ in size and follow the selected client

- **WHEN** a client is selected in the Clients subnav
- **THEN** the screen shows that client's own feed of listings (the five clients see 5, 4, 3, 2, and 1 listings respectively)
- **AND** the pill counts, tile numbers, and header count reflect the selected client's feed

#### Scenario: Feeds overlap and share consistent ages

- **WHEN** two clients' feeds include the same listing
- **THEN** that listing appears in both feeds
- **AND** it reads with the same day-heading grouping and age on each client's screen

#### Scenario: Roster preserves degenerate states

- **WHEN** the five-client roster is applied
- **THEN** it retains the records that drive degenerate states (a client with zero saves and no saved search, an archived client with saves, a client with a zero-stop tour)
- **AND** tours are scoped to the roster so no tour names a client the list cannot open

### Requirement: Home imagery uses a fixed photo library

Property imagery SHALL be sourced from a fixed home-photo library so that every listing card shows a home and the same URL always returns the same picture. Person avatars MAY remain on arbitrary placeholder seeds, since they stand in for people rather than property.

#### Scenario: Listing photos are fixed homes

- **WHEN** a listing card renders its photo
- **THEN** the photo is a fixed image of a home matching the library entry's label
- **AND** the same photo is returned on every run

#### Scenario: Tiles draw from the fixed library

- **WHEN** the Clients screen's summary tiles need a photo with no listing behind them
- **THEN** each tile draws a home from the fixed library by a stable key, so the tiles differ from each other and do not change between runs

#### Scenario: Avatars stay on placeholder seeds

- **WHEN** an agent or client avatar is displayed
- **THEN** it uses a placeholder seed image, distinct from the fixed property library
