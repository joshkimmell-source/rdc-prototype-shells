## Purpose

Defines how the RealAssist+ prototype — shared by the agent-web and agent-vision apps — reflects its current session state and participant tag into the URL for attribution during user testing: which pieces of UI state are mirrored, how they behave (present-state, no history log, no collection), and how the participant tag is read on load.

## ADDED Requirements

### Requirement: Current UI state is mirrored into the URL

The shell SHALL reflect relevant current UI state into the URL as it changes, using present-state semantics: a param is set only while its state is true and removed when it is not, so the URL names only what is currently true. Every write MUST preserve all other URL params.

The mirrored params are:

- `?panel=open` — the RealAssist+ assistant panel is open.
- `?expanded=1` — the panel is expanded to near-full-width (only while the panel is open).
- `?threads=open` — the panel's threads/conversation subnav is showing (only while the panel is open).
- `?subnav=open|closed` — the Clients/Tours subnav state, mirrored only on screens that have a subnav.
- `?flow=<task>` — the active assistant flow, one of `add-client`, `catch-up`, `search-opt`, `client-pulse`.
- `?done=<task>` — the most recent AI task to reach a "Completed" step this conversation, one of `add-client`, `catch-up`, `search-opt`, `client-pulse`, `tour`.
- `?chat=new` — the participant is in a freshly-started conversation (New chat clicked, no message sent yet).

#### Scenario: Opening and closing the assistant panel

- **WHEN** the assistant panel opens
- **THEN** the URL gains `?panel=open`
- **AND** when the panel closes the `?panel` param is removed

#### Scenario: Panel sub-states are gated on the panel being open

- **WHEN** the panel is open and expanded to near-full-width
- **THEN** the URL gains `?expanded=1`
- **AND** when the panel's threads/conversation subnav is showing the URL gains `?threads=open`
- **AND** when the panel is closed neither `?expanded` nor `?threads` is present

#### Scenario: Clients/Tours subnav is mirrored only where it exists

- **WHEN** the active screen is Clients or Tours
- **THEN** the URL carries `?subnav=open` or `?subnav=closed` reflecting the subnav state
- **AND** on any other screen the `?subnav` param is absent

#### Scenario: Active assistant flow is named

- **WHEN** an assistant flow is active
- **THEN** `?flow` names it as one of `add-client`, `catch-up`, `search-opt`, or `client-pulse`
- **AND** when no flow is active the `?flow` param is removed

#### Scenario: Task completion is recorded as present state

- **WHEN** an AI task reaches its "Completed" step this conversation
- **THEN** `?done` names the task that produced it (`add-client`, `catch-up`, `search-opt`, `client-pulse`, or `tour`)
- **AND** it holds a single slot reflecting the most recent completion, not a list

#### Scenario: Freshly-started conversation

- **WHEN** the participant starts a New chat and has not yet sent a message
- **THEN** the URL carries `?chat=new`
- **AND** once a message is sent the `?chat` param is removed

#### Scenario: Other params are preserved on every write

- **WHEN** any mirrored param is set or removed
- **THEN** all other URL params, including `?u=`, `?view=`, and `?lead=`, are left unchanged

### Requirement: Participant tag is read from the URL at load and never written

The shell SHALL read a participant tag from `?u=` once at load, keep it fixed for the session, and never write or overwrite it. The tag SHALL also be surfaced on the shell root element as a `data-participant` attribute.

#### Scenario: Participant tag is restored on load

- **WHEN** the app loads from a URL containing `?u=<tag>`
- **THEN** the participant tag is read and applied for the session
- **AND** it is surfaced on the shell root as `data-participant=<tag>`
- **AND** the app never writes or changes the `?u=` param

#### Scenario: No participant tag

- **WHEN** the app loads from a URL without `?u=`
- **THEN** no participant tag is set
- **AND** the shell root carries no `data-participant` attribute

### Requirement: Mirroring does not collect data or record history

Mirroring SHALL be attribution-only: it MUST NOT make any network request or persist an event stream, and it MUST NOT keep a history of past states — a param names present state only, so a removed param leaves no trace that it was ever set.

#### Scenario: A cleared param leaves no trace

- **WHEN** a mirrored state becomes false and its param is removed
- **THEN** the URL retains no record that the param was previously set

#### Scenario: No network sink

- **WHEN** any UI state changes and is mirrored
- **THEN** no network request is made and no event log is persisted

### Requirement: Mirrored state does not pollute browser history

Mirroring SHALL update the URL with `history.replaceState` rather than `pushState`, so reflecting UI state never adds a Back-button entry; only genuine navigation params (`?view=`/`?lead=`) create history entries.

#### Scenario: Reflecting UI state adds no history entry

- **WHEN** a mirrored param is set or removed as UI state changes
- **THEN** the current history entry is replaced in place
- **AND** no new Back-button entry is created

### Requirement: Mirroring is inert under file://

Mirroring SHALL be guarded so that when the bundled single-file artifact is opened from disk (`file://`), where `history.replaceState` throws, the write fails silently and the app continues to function.

#### Scenario: Opening the bundle from disk

- **WHEN** the app runs from a `file://` URL and a mirrored state changes
- **THEN** the failed history write is caught and ignored
- **AND** the app does not crash

### Requirement: Behavior applies to both shells

The URL attribution behavior — the participant tag, the mirrored params, present-state semantics, `replaceState` writes, and the `file://` guard — SHALL be implemented identically in both the agent-web and agent-vision apps.

#### Scenario: Both apps mirror the same state

- **WHEN** the same interaction occurs in agent-web and in agent-vision
- **THEN** both reflect the same params into the URL with the same present-state semantics
- **AND** both read `?u=` at load and surface it as `data-participant`
