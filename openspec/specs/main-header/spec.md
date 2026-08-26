# main-header Specification

## Purpose

Defines the shared header component rendered above every screen of the agent-facing prototype shell — how it composes its title/count block or optional lead region, its per-screen actions and overflow menu, and its single control cluster — so Clients, Home, Tours, and Search all read with one consistent header rather than each screen (or its embedded map) drawing its own.

## Requirements

### Requirement: One shared header renders above every screen

The shell SHALL render a single shared header component above every screen — Clients, Home, Tours, and Search — as the one source of truth for the header. Screens whose content is an embedded map MUST NOT draw their own header inside that map.

#### Scenario: Header is present on every screen

- **WHEN** any screen (Clients, Home, Tours, or Search) is displayed
- **THEN** the shared header is rendered above the screen's content
- **AND** the header reads with the same structure and control treatment on each screen

#### Scenario: Embedded map screens render only their content

- **WHEN** the Tours or Search screen is displayed
- **THEN** its embedded map renders only the map and its own in-map controls
- **AND** the screen's title, actions, and overflow menu are shown in the shared header, not inside the map

### Requirement: Screens supply their own header content

The shared header SHALL accept its title, count label, an optional lead region, per-screen actions, and overflow-menu rows from the screen it sits above, while keeping one shared header structure. When a lead region is provided, the header MUST render it in place of the title/count block.

#### Scenario: Each screen shows its own title and count

- **WHEN** a screen is displayed
- **THEN** the header shows that screen's title
- **AND** any count label is shown on a second line below the title

#### Scenario: Search shows a lead region instead of a title

- **WHEN** the Search screen is displayed
- **THEN** the header renders Search's lead region (the MLS selector and search field) in place of the title/count block
- **AND** the lead region shrinks but does not grow, yielding free width to the control cluster beside it

#### Scenario: Per-screen actions and menu appear

- **WHEN** the Tours screen is displayed
- **THEN** the header shows Tours' actions (Export and Add to calendar) and Tours' overflow-menu rows
- **WHEN** the Search screen is displayed
- **THEN** the header shows Search's Save search action and Search's overflow-menu rows

### Requirement: Control cluster selection is independent of the Ask action

The header SHALL choose between the labelled-pill action bar and the icon-toggle cluster independently of whether it shows the inline Ask action. Tours and Search MUST use the action bar in either experiment arm because their actions need labelled pills; Clients and Home use the action bar only in the labelled-action arm. The inline Ask action MUST appear only in the arm where the Ask trigger is not floated separately.

#### Scenario: Tours and Search always use the action bar

- **WHEN** the Tours or Search screen is displayed in either experiment arm
- **THEN** the header renders its controls as the labelled-pill action bar

#### Scenario: Inline Ask shown only in its arm

- **WHEN** the header is shown in the arm that carries the inline Ask action
- **THEN** the "Ask RealAssist+" action appears in the control cluster
- **WHEN** the header is shown in the arm where the Ask trigger floats separately
- **THEN** the inline Ask action is omitted from the control cluster

### Requirement: Primary action stays reachable in the action bar

When the action bar collapses to fit a narrow width, the primary (brand-toned, rightmost) action SHALL never fold into the overflow menu. It MAY collapse to an icon-only circle, but MUST remain a visible control positioned at the right of the overflow trigger.

#### Scenario: Primary action never folds

- **WHEN** the action bar is too narrow to show every action fully
- **THEN** it drops labels and folds other actions into the overflow menu as needed
- **AND** the primary action remains a visible control (at most collapsed to a circle) to the right of the overflow trigger, never inside the menu
