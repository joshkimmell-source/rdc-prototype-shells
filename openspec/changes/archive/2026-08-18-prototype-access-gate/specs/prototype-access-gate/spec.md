## Purpose

Defines the gate a viewer passes through when the prototype loads. This delta evolves the capability from a notice-only sample-data disclaimer into an authenticated soft gate: passing it now requires either the shared password or a valid `?key=` link token, a valid token auto-closes the gate with no manual step, and the same behavior applies to both the agent-web and agent-vision shells.

## MODIFIED Requirements

### Requirement: On-load access gate

The prototype SHALL present, on load, a modal that both states the content is sample data and gates access to the app behind it. The modal SHALL NOT be dismissible until access is granted by entering the shared password OR arriving with a valid `?key=` token. Until then its overlay, escape, and close affordances MUST be inert. This is a soft gate: the credentials ship in the client bundle and are intended to deter casual visitors, not to provide real authentication. The same gate behavior SHALL apply identically in both the agent-web and agent-vision shells.

#### Scenario: Gate is locked on first load without credentials

- **WHEN** a viewer loads the prototype with no valid token and no remembered session unlock
- **THEN** the modal is shown with the sample-data disclaimer and a password field
- **AND** the primary button reads "Enter" and is disabled while the password field is empty
- **AND** the modal cannot be dismissed by its overlay, escape, or close affordances

#### Scenario: Correct password unlocks and dismisses the gate

- **WHEN** the viewer enters the shared password and submits (button or Enter key)
- **THEN** the gate unlocks and the modal closes
- **AND** the app behind it becomes reachable

#### Scenario: Incorrect password is rejected

- **WHEN** the viewer submits an incorrect password
- **THEN** an error message is shown and the modal stays open
- **AND** the gate remains locked

#### Scenario: A successful unlock is remembered for the browser session

- **WHEN** the viewer has unlocked the gate earlier in the same browser session
- **THEN** a reload shows the sample-data disclaimer again but does not re-prompt for the password
- **AND** the disclaimer can be dismissed with an "Okay" button

#### Scenario: Test-only suppression flag still short-circuits the gate

- **WHEN** the test-only suppression flag is set in local storage (seeded by the E2E suite)
- **THEN** the gate stays closed and does not block the app
- **AND** the app only reads this flag and never writes it

## ADDED Requirements

### Requirement: Link-token bypass via `?key=`

A shareable link carrying a valid `?key=<token>` SHALL grant access to the prototype without the viewer typing the password. The token SHALL be distinct from the typed password by design, because it travels in URLs — including the mirrored/shared links produced by the tracking layer — where the human password should not appear. A token-based unlock SHALL earn the same session memory as a typed password. This behavior SHALL apply identically in both shells. The token remains a soft credential shipped in the client bundle.

#### Scenario: Valid token grants access without password entry

- **WHEN** a viewer loads the prototype with a valid `?key=` token
- **THEN** access is granted without the viewer entering the password

#### Scenario: Token unlock is remembered for the session

- **WHEN** a viewer has arrived with a valid `?key=` token in the current session
- **THEN** removing the `?key=` parameter or reloading within the session does not re-prompt

#### Scenario: Token is distinct from the typed password

- **WHEN** the bypass token and the shared password are compared
- **THEN** they are different values, so the human password never needs to appear in a URL

#### Scenario: Both shells honor the same token behavior

- **WHEN** a valid `?key=` link is opened in agent-web and in agent-vision
- **THEN** both grant access with the same token behavior

### Requirement: Valid token auto-closes the gate on load

When a valid `?key=` token is present on the initial mount, the gate SHALL close immediately — with no disclaimer shown, no password prompt, and no flash of the modal. Without a valid token the gate SHALL behave unchanged (disclaimer shown, password required).

#### Scenario: Valid token closes the modal on mount

- **WHEN** the prototype mounts with a valid `?key=` token in the URL
- **THEN** the modal starts closed and the viewer lands directly in the app
- **AND** no disclaimer or password prompt is shown

#### Scenario: Without a token the gate is unchanged

- **WHEN** the prototype mounts without a valid `?key=` token
- **THEN** the modal is shown and the password is required as normal
