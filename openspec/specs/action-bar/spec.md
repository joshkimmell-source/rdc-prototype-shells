# action-bar Specification

## Purpose

Defines the behaviour of the agent-web shell's foldable action bar and its overflow menu, the shell's three-dot ("⋯") overflow-menu behaviour and dynamic panel placement, and the static navigation rail — how the action row degrades as space runs short, how every overflow menu opens and where its panel is placed so it can never truncate, and how the navigation rail presents its destinations.

## Requirements

### Requirement: Action bar folds instead of scrolling

The action bar SHALL keep every action reachable at any width without a horizontal scroller, degrading the row through measured stages rather than at a fixed breakpoint. The row MUST NOT clip its own vertical overflow.

#### Scenario: All actions are labelled pills when there is room

- **WHEN** the action bar has enough width for every action's full-labelled pill
- **THEN** each action is shown as a labelled pill
- **AND** nothing is folded into the overflow menu

#### Scenario: Labels drop to icon-only circles as space runs short

- **WHEN** the row cannot fit every labelled pill
- **THEN** actions drop their labels one at a time, from the left, becoming icon-only circles
- **AND** the amount of degradation is derived from a measurement of the fully-labelled row against the available width, not from the row currently displayed

#### Scenario: Circles fold into the overflow menu when still too narrow

- **WHEN** every visible action is already an icon-only circle and the row still overflows
- **THEN** actions fold into the overflow menu one at a time, from the left
- **AND** a folded action appears as a labelled row in the menu carrying its icon and firing its original handler

#### Scenario: Primary action degrades last and stays reachable

- **WHEN** the row degrades at any stage
- **THEN** the primary (rightmost) action keeps its label longest and is the last to fold
- **AND** at every width the primary action remains reachable, whether as a control in the bar or as a row in the menu

#### Scenario: Row does not clip the pills' hover lift

- **WHEN** an action pill is hovered
- **THEN** its raised hover state and shadow render fully without being sheared off by the row's overflow

### Requirement: Overflow menu is the bar's leftmost, un-folding item

The overflow menu SHALL be the action bar's far-left item at every width and SHALL never fold. Actions that overflow the bar SHALL be appended into this menu below its static rows.

#### Scenario: Menu is always present at the left

- **WHEN** the action bar is displayed at any width
- **THEN** the overflow ("⋯") menu is the leftmost item in the row
- **AND** it is never collapsed or scrolled out of reach

#### Scenario: Folded actions append below the static rows

- **WHEN** one or more actions have folded into the overflow menu
- **THEN** the menu shows its static rows first, then a separator, then the folded actions as labelled rows
- **AND** the panel updates as the width changes while it is open

### Requirement: Every three-dot control is a real overflow menu

Every "⋯" control in the shell SHALL open a real overflow menu exposed to assistive technology, and no inert three-dot glyph SHALL remain.

#### Scenario: Three-dot control opens an accessible menu

- **WHEN** the user activates a "⋯" control anywhere in the shell
- **THEN** it opens a menu whose toggle advertises a popup menu and whose panel and rows expose menu semantics to assistive technology

#### Scenario: Opening one menu closes any other

- **WHEN** a menu is open and the user opens another menu, including by keyboard
- **THEN** the first menu closes
- **AND** at most one menu panel is on screen at a time

### Requirement: Overflow menu panel is placed dynamically and never truncates

The overflow menu panel SHALL be positioned so it is always fully within the viewport and never clipped or truncated, wherever its toggle sits. It MUST escape any clipping ancestor and MUST be kept off the viewport edges.

#### Scenario: Panel opens on-screen from a leftmost toggle

- **WHEN** the overflow menu opens from a toggle near the left edge at a narrow width
- **THEN** the panel opens rightward from the toggle and stays fully within the viewport
- **AND** its labels are not truncated or clipped

#### Scenario: Panel flips above the toggle near the bottom edge

- **WHEN** there is not enough room below the toggle to show the panel
- **THEN** the panel opens above the toggle instead
- **AND** it remains within the viewport with a margin from each edge

#### Scenario: Panel follows the toggle when the layout moves

- **WHEN** the toggle moves after the panel opens — the panel's coordinates going stale on a reflow, an animated transition, a resize, or a scroll
- **THEN** the panel repositions to stay anchored to the toggle and on screen

#### Scenario: Standalone map pages place their panel the same way

- **WHEN** the overflow menu opens on the standalone search or tours map page at a narrow width
- **THEN** the panel is placed with the same dynamic logic and stays fully within the viewport

### Requirement: Navigation rail is static

The navigation rail SHALL be a fixed-width column that always shows every destination as an icon above its label, and SHALL NOT expand on hover.

#### Scenario: Rail shows icon over label at a fixed width

- **WHEN** the navigation rail is displayed on desktop
- **THEN** it is a fixed-width column showing each destination as an icon stacked above its text label
- **AND** the active destination is marked as the current page for assistive technology

#### Scenario: Rail does not widen on hover

- **WHEN** the user hovers over the navigation rail
- **THEN** the rail's width does not change

#### Scenario: Account headshot is shared with the mobile tab bar

- **WHEN** the account identity is shown in the desktop rail and in the mobile tab bar
- **THEN** both render the same shared headshot, with the same initials fallback
