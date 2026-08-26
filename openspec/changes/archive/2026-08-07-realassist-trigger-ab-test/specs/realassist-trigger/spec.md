## Purpose

Defines where the "Ask RealAssist+" trigger is placed in the agent-web app and how a URL-driven `?ab=` A/B test selects that placement — the available placement variants, the default/fallback behavior, and the specific location each variant renders the trigger in (a corner floating action button, an inline header action bar, or a framed map top bar).

## ADDED Requirements

### Requirement: The `?ab=` parameter selects a trigger placement variant

The app SHALL read a `?ab=` query parameter at startup and use its value to select which placement variant of the "Ask RealAssist+" trigger the session sees. The selected variant SHALL be fixed for the life of the session and SHALL NOT be written back to the URL or changed by any on-screen control.

#### Scenario: Variant is read from the URL at startup

- **WHEN** the app loads with a `?ab=` value that names a known variant
- **THEN** the session uses the placement variant that value names
- **AND** the value is compared case-insensitively

#### Scenario: Variant is fixed for the session

- **WHEN** a session is already running under a selected variant
- **THEN** the variant does not change while the session is open
- **AND** the only way to view a different variant is to reload with a different `?ab=` value

#### Scenario: No visible experiment control is presented

- **WHEN** a participant uses the app under any variant
- **THEN** no on-screen switcher or indicator reveals that a placement test is running
- **AND** the app does not write the `?ab=` value back to the URL

### Requirement: Unknown or absent values fall back to the default variant

The default placement variant SHALL be `a` (the floating FAB in the bottom-right corner), which is the shipped behavior. When `?ab=` is absent, empty, or names a value that is not a known variant, the app SHALL fall back to variant `a`.

#### Scenario: Missing parameter falls back to the default

- **WHEN** the app loads with no `?ab=` parameter
- **THEN** the session uses variant `a`, the floating FAB in the bottom-right corner

#### Scenario: Unknown value falls back to the default

- **WHEN** the app loads with a `?ab=` value that is empty or not a known variant (for example a typo)
- **THEN** the session uses variant `a` rather than any undefined placement

### Requirement: Variant A places the trigger as the corner floating action button

Under variant `a`, the "Ask RealAssist+" trigger SHALL render as the floating action button fixed to the bottom-right corner of the viewport, unchanged from the shipped behavior, and no inline header or map action bar trigger SHALL appear.

#### Scenario: Corner FAB is shown in variant A

- **WHEN** the session is on variant `a`
- **THEN** the "Ask RealAssist+" trigger appears as the floating action button in the bottom-right corner
- **AND** it steps aside while the push panel or a mobile drawer is open, as before

#### Scenario: No inline trigger in variant A

- **WHEN** the session is on variant `a`
- **THEN** no header action bar Ask control and no map top-bar Ask control is shown

### Requirement: Variant B places the trigger inline in the page header action bar

Under variant `b`, on pages that render a header, the "Ask RealAssist+" trigger SHALL render as the primary (brand-gradient) action at the right end of a header action bar, and the corner floating action button SHALL be hidden.

#### Scenario: Header action bar carries the Ask trigger in variant B

- **WHEN** the session is on variant `b` and a page with a header is shown
- **THEN** the header renders an action bar whose primary action is the "Ask RealAssist+" trigger, positioned at the right end of the row
- **AND** the corner floating action button is not shown

#### Scenario: Action bar collapses labels by measurement

- **WHEN** the header action bar has less width than its labelled actions need
- **THEN** it drops labels one at a time from the left, keeping the primary Ask action labelled longest
- **AND** an action whose label is dropped becomes a circular icon-only control with a tooltip

#### Scenario: Ask trigger opens the panel and hides while it is open

- **WHEN** the header Ask action is activated
- **THEN** the assistant panel opens
- **AND** while that panel is on screen the Ask action is removed from the action bar, returning when the panel closes

### Requirement: Variant B places the trigger in the map top bar on framed map screens

Under variant `b`, on the Search and Tours screens — which fill their viewport with an embedded map iframe — the "Ask RealAssist+" trigger SHALL render inside the map's own top bar. The `?ab=` variant SHALL be forwarded into the iframe, and a same-origin message bridge SHALL carry the trigger's activation up to the shell and the assistant panel's open/closed state back down to the frame.

#### Scenario: Framed map renders the Ask control under variant B

- **WHEN** the session is on variant `b` and the Search or Tours screen is shown
- **THEN** the variant is forwarded into the map iframe's URL
- **AND** the map's top bar renders the "Ask RealAssist+" control

#### Scenario: Framed Ask activation opens the shell's panel

- **WHEN** the Ask control in the framed map is activated
- **THEN** the frame posts a message up to the shell
- **AND** the shell, having verified the message origin matches the app origin, opens the assistant panel

#### Scenario: Framed Ask control hides while the panel is open

- **WHEN** the assistant panel's open state changes
- **THEN** the shell posts that state down into the frame
- **AND** the framed Ask control hides while the panel is on screen and reappears when it closes

### Requirement: The trigger reads as the same control across every placement

Every placement of the "Ask RealAssist+" trigger SHALL present the same RealAssist+ brand identity so that the variants differ in position, not in the control's appearance.

#### Scenario: Shared brand appearance across placements

- **WHEN** the trigger is rendered as the corner FAB, as the header action bar's primary action, or in a framed map top bar
- **THEN** each uses the shared RealAssist+ brand gradient and mark
- **AND** the RealAssist+ mark scales to the control's size without being clipped
