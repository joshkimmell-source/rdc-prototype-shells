# prototype-access-gate Specification

## Purpose

Defines the gate a viewer passes through when the prototype loads. On load the prototype presents an access gate that both states the content is sample data and gates entry to the app behind it. Access requires either the shared password or a valid `?key=` link token; a valid token auto-closes the gate with no manual step. A successful unlock is remembered for the browser session, the same behavior applies identically in the agent-web and agent-vision shells, and an automated test suite can short-circuit the gate. This is a soft gate: the credentials ship in the client bundle to deter casual visitors, not to provide real authentication.

## Requirements

### Requirement: On-load access gate

The prototype SHALL present, on load, a modal that both states the content is sample data and gates access to the app behind it. The modal SHALL NOT be dismissible until access is granted by entering the shared password OR arriving with a valid `?key=` token, and until then its overlay, escape, and close affordances MUST be inert. The same gate behavior SHALL apply identically in both the agent-web and agent-vision shells.

#### Scenario: Gate is locked on first load without credentials

- **WHEN** a viewer loads the prototype with no valid token and no remembered session unlock
- **THEN** the modal is shown with the sample-data disclaimer and a password field
- **AND** the disclaimer states everything shown is sample data and none of the people, listings, or addresses represent real individuals, properties, or locations
- **AND** the primary button reads "Enter" and is disabled while the password field is empty
- **AND** the modal cannot be dismissed by its overlay, escape, or close affordances

#### Scenario: Both shells present the same gate

- **WHEN** the prototype is loaded in agent-web and in agent-vision
- **THEN** both shells present the same locked gate with identical behavior

### Requirement: Shared password unlock

The gate SHALL unlock when the viewer submits the correct shared password, and SHALL reject an incorrect password without granting access.

#### Scenario: Correct password unlocks and dismisses the gate

- **WHEN** the viewer enters the shared password and submits (button or Enter key)
- **THEN** the gate unlocks and the modal closes
- **AND** the app behind it becomes reachable

#### Scenario: Incorrect password is rejected

- **WHEN** the viewer submits an incorrect password
- **THEN** an error message is shown and the modal stays open
- **AND** the gate remains locked

### Requirement: Link-token bypass via `?key=`

A shareable link carrying a valid `?key=<token>` SHALL grant access to the prototype without the viewer typing the password. The token SHALL be a distinct value from the typed password by design, because it travels in URLs — including the mirrored/shared links produced by the tracking layer — where the human password should not appear. This behavior SHALL apply identically in both shells, and the token remains a soft credential shipped in the client bundle.

#### Scenario: Valid token grants access without password entry

- **WHEN** a viewer loads the prototype with a valid `?key=` token (value `rp-preview-internal`)
- **THEN** access is granted without the viewer entering the password

#### Scenario: Token is distinct from the typed password

- **WHEN** the bypass token and the shared password are compared
- **THEN** they are different values, so the human password never needs to appear in a URL

#### Scenario: Both shells honor the same token behavior

- **WHEN** a valid `?key=` link is opened in agent-web and in agent-vision
- **THEN** both grant access with the same token behavior

### Requirement: Valid token auto-closes the gate on load

When a valid `?key=` token is present on the initial mount, the gate SHALL close immediately — with no disclaimer shown, no password prompt, and no flash of the modal. Without a valid token the gate SHALL behave unchanged, showing the disclaimer and requiring the password.

#### Scenario: Valid token closes the modal on mount

- **WHEN** the prototype mounts with a valid `?key=` token in the URL
- **THEN** the modal starts closed and the viewer lands directly in the app
- **AND** no disclaimer or password prompt is shown

#### Scenario: Without a token the gate is unchanged

- **WHEN** the prototype mounts without a valid `?key=` token
- **THEN** the modal is shown and the password is required as normal

### Requirement: Successful unlock is remembered for the browser session

A successful unlock — whether by typed password or by a valid `?key=` token — SHALL be remembered for the remainder of the browser session, so a reload within the session does not re-prompt for credentials.

#### Scenario: Session unlock avoids re-prompting on reload

- **WHEN** the viewer has unlocked the gate earlier in the same browser session
- **THEN** a reload shows the sample-data disclaimer again but does not re-prompt for the password
- **AND** the disclaimer can be dismissed with an "Okay" button

#### Scenario: Token unlock is remembered for the session

- **WHEN** a viewer has arrived with a valid `?key=` token in the current session
- **THEN** removing the `?key=` parameter or reloading within the session does not re-prompt

### Requirement: Test-only suppression flag

The prototype SHALL support a single read-only suppression flag so an automated test suite can prevent the gate from blocking test interactions. The application MUST only read this flag and MUST NOT write it, so real viewers, who never set it, always see the gate.

#### Scenario: Suppression flag short-circuits the gate

- **WHEN** the test-only suppression flag is set in local storage (seeded by the E2E suite)
- **THEN** the gate stays closed and does not block the app
- **AND** the app only reads this flag and never writes it

#### Scenario: Absent flag shows the gate

- **WHEN** the prototype loads and the suppression flag is not set
- **THEN** the gate appears as on a normal load

#### Scenario: Unavailable storage defaults to showing the gate

- **WHEN** the prototype cannot read the suppression flag because storage is unavailable
- **THEN** the gate is shown by default
