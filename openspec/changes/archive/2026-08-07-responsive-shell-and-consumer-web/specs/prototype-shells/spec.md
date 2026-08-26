## Purpose

Extends the prototype-shells capability with responsive behavior and URL-addressable screens for the `agent-web` shell, a second consumer-facing shell (`consumer-web`) hosted in the same workspace and seeded from the shared sample dataset, and a fixed, non-colliding dev-server port per shell so they run side by side.

## ADDED Requirements

### Requirement: agent-web shell is responsive across breakpoints

The `agent-web` shell SHALL present a working layout from narrow phone widths (~320px) up to desktop. In either layout the primary content region (`main`) SHALL occupy the full available viewport width, and no layout region SHALL overflow the viewport horizontally.

#### Scenario: Desktop layout

- **WHEN** the shell is displayed above the mobile breakpoint (wider than 768px)
- **THEN** the vertical navigation rail is shown
- **AND** the second-level subnav and the assistant panel dock in the flow beside `main` when open
- **AND** `main` fills the remaining width

#### Scenario: Mobile layout

- **WHEN** the shell is displayed at or below the mobile breakpoint (768px or narrower)
- **THEN** the navigation rail is replaced by a bottom tab bar
- **AND** the subnav and the assistant panel become overlays over `main` rather than reserving a column beside it
- **AND** `main` keeps the full viewport width

#### Scenario: Content adapts without horizontal overflow

- **WHEN** the shell is displayed at ~320px
- **THEN** grid tracks collapse to the container instead of overflowing it
- **AND** content that cannot reflow (such as the wide client table) scrolls within its own region rather than forcing the page to scroll sideways
- **AND** the shell root uses the dynamic viewport height so the assistant composer is not left under collapsing mobile browser chrome

### Requirement: Mobile overlays default closed and stay out of the tab order when closed

Below the mobile breakpoint the subnav and assistant overlays SHALL start closed and SHALL collapse when the layout crosses into mobile. A closed overlay SHALL NOT expose focusable controls to keyboard or assistive technology.

#### Scenario: Overlays start closed on a phone

- **WHEN** the shell first renders at or below the mobile breakpoint
- **THEN** the subnav and assistant overlays are closed
- **AND** neither overlay covers `main`

#### Scenario: Overlays collapse entering the mobile layout

- **WHEN** the viewport crosses from above the breakpoint to at or below it
- **THEN** any docked subnav and assistant panel collapse to closed overlays

#### Scenario: Closed overlay is removed from the tab order

- **WHEN** an overlay is closed
- **THEN** its controls are not reachable by keyboard tabbing and are hidden from the accessibility tree

#### Scenario: Overlays are dismissible

- **WHEN** the subnav drawer is open on mobile
- **THEN** tapping the scrim behind it dismisses it
- **AND** pressing Escape backs out one open overlay at a time, topmost first

### Requirement: agent-web top-level screen is addressable via the URL

The `agent-web` shell SHALL mirror its active top-level screen into the URL query parameter `view`, so that a shared or reloaded URL restores the named screen and browser Back/Forward navigate between visited screens. The default (Home) screen SHALL write no parameter.

#### Scenario: Reloaded or shared URL restores the screen

- **WHEN** a URL carrying `?view=<screen>` for a known screen is loaded
- **THEN** the shell opens on that screen
- **AND** a URL with a missing or unknown `view` value opens on the default Home screen

#### Scenario: Navigation updates history

- **WHEN** the user navigates to another top-level screen
- **THEN** the URL's `view` parameter updates to that screen (and is cleared for Home)
- **AND** browser Back and Forward move between the visited screens

### Requirement: Workspace hosts a consumer-web shell alongside agent-web

The workspace SHALL host a second prototype shell, `consumer-web` — a consumer-facing prototype — alongside `agent-web`, with its own launch entry so it can run at the same time. `consumer-web` SHALL populate its listings from the shared fictional sample dataset rather than from hardcoded data.

#### Scenario: consumer-web runs alongside agent-web

- **WHEN** the workspace launcher starts the shells
- **THEN** both `agent-web` and `consumer-web` start from their own launch entries
- **AND** each is reachable at its own URL

#### Scenario: consumer-web renders shared sample data

- **WHEN** `consumer-web` displays its listing results
- **THEN** the listings, the result count, the results-page location, and the pre-saved state are derived from the shared sample dataset
- **AND** no listing content is hardcoded in the shell

### Requirement: Each shell's dev server runs on a fixed, non-colliding port

Each prototype shell's dev server SHALL be assigned a fixed port that does not collide with any other shell's port, so the shells can run simultaneously.

#### Scenario: Shells do not contend for a port

- **WHEN** more than one shell's dev server is running at the same time
- **THEN** each binds its own assigned port
- **AND** no shell fails to start because another has taken its port

#### Scenario: Strict-port shell avoids the auto-walk range

- **WHEN** a shell is pinned to a strict port
- **THEN** that port lies outside the range another shell's dev server auto-selects when its own default port is already taken
