## Purpose

Defines the gate a viewer passes through when the agent-web prototype loads. In this first version the gate is notice-only: an on-load, dismissible disclaimer that states the prototype is a prototype and its content is sample data, so no viewer mistakes a sample client, listing, or address for a real one. There is no authentication at this stage — the gate informs but does not restrict access.

## ADDED Requirements

### Requirement: On-load prototype notice

On first load, the prototype SHALL display a notice that informs the viewer it is a prototype and that its content is sample data. The notice MUST be presented before the viewer interacts with any screen.

#### Scenario: Notice shown on load

- **WHEN** the prototype is loaded by a viewer
- **THEN** a notice is displayed stating that this is a prototype
- **AND** the notice states that everything shown is sample data for demonstration only
- **AND** the notice states that none of the people, listings, or addresses represent real individuals, properties, or locations

#### Scenario: Notice overlays before interaction

- **WHEN** the prototype finishes loading
- **THEN** the notice is presented over the app, ahead of any screen interaction

### Requirement: Notice is dismissible

The notice SHALL be dismissible by the viewer through a clear confirmation action. Once dismissed, the prototype SHALL be fully usable.

#### Scenario: Dismiss with the confirmation action

- **WHEN** the viewer selects the notice's "Okay" action
- **THEN** the notice is dismissed
- **AND** the underlying prototype becomes fully interactive

#### Scenario: Notice re-appears on a fresh load

- **WHEN** the viewer dismisses the notice and then reloads the prototype
- **THEN** the notice is shown again, because dismissal is not persisted across loads

### Requirement: Notice is informational only, without authentication

At this version the gate SHALL be notice-only. It MUST NOT require a password, credentials, or any other authentication, and MUST NOT restrict access to the prototype based on the viewer's identity.

#### Scenario: No credentials required to proceed

- **WHEN** the viewer is shown the notice
- **THEN** no password or credentials are requested
- **AND** dismissing the notice is the only step required to use the prototype

### Requirement: Test-only suppression flag

The prototype SHALL support a single read-only suppression flag so an automated test suite can prevent the notice from overlaying test interactions. The application MUST only read this flag and MUST NOT write it, so real viewers, who never set it, always see the notice.

#### Scenario: Suppression flag hides the notice

- **WHEN** the prototype loads and the suppression flag is set to its enabled value
- **THEN** the notice does not appear

#### Scenario: Absent flag shows the notice

- **WHEN** the prototype loads and the suppression flag is not set
- **THEN** the notice appears as on a normal first load

#### Scenario: Unavailable storage defaults to showing the notice

- **WHEN** the prototype cannot read the suppression flag because storage is unavailable
- **THEN** the notice is shown by default
