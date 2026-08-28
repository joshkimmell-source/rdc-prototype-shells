# navigation-rail Specification

## Purpose

Defines the visual composition and interaction behavior of the vertical navigation rail shared by the agent-web and agent-vision apps — how each rail cell arranges its icon and text label and how the hover, selected, and active states are presented.

## Requirements

### Requirement: Rail cell separates icon container from label

Each navigation rail cell SHALL render its icon inside a visual container and its text label as a separate element positioned outside (below) that container. The label MUST NOT sit on top of the container's background.

#### Scenario: Cell renders icon and label as separate regions

- **WHEN** a rail cell is displayed
- **THEN** the icon appears inside a bounded visual container
- **AND** the text label appears below the container as a separate element
- **AND** the icon and label remain vertically stacked and horizontally centered within the cell

#### Scenario: Label uses existing label typography

- **WHEN** a rail cell's label is displayed
- **THEN** the label retains the rail's established label typography and single-line truncation behavior

### Requirement: Hover and selected background wrap only the icon container

The rounded hover and selected background treatment SHALL be applied only to the icon container, not to the full cell and not to the label.

#### Scenario: Hover highlights only the icon container

- **WHEN** the user hovers over an interactive rail cell that is not the active item
- **THEN** the hover background appears behind the icon container only
- **AND** the label does not receive a background highlight

#### Scenario: Selected background wraps only the icon container

- **WHEN** a rail cell is the active (selected) item
- **THEN** the selected background appears behind the icon container only
- **AND** the label does not receive a background highlight

#### Scenario: Container keeps its rounded shape

- **WHEN** a hover or selected background is shown
- **THEN** the background is drawn with the rail's rounded container shape sized to the icon container

### Requirement: Active item remains indicated and emphasized

The active rail item SHALL remain distinguishable from inactive items, and its label SHALL retain active-state emphasis even though the label sits outside the highlighted container.

#### Scenario: Active label is emphasized

- **WHEN** a rail cell is the active item
- **THEN** its label is shown with the active-state emphasis (such as heavier weight and primary text color)
- **AND** inactive cells' labels use the inactive text treatment

#### Scenario: Active state is programmatically indicated

- **WHEN** a rail cell is the active item
- **THEN** it is marked as the current page for assistive technology

### Requirement: Treatment applies to all rail cell types in both apps

The label-outside-container treatment SHALL be applied consistently to every rail cell that uses the shared cell pattern — the primary navigation items, the non-interactive inert items, and the Account cell — in both the agent-web and agent-vision apps.

#### Scenario: Primary navigation items follow the treatment

- **WHEN** the primary navigation items are displayed (Clients, Search, Tours in agent-web; Home, Leads, Clients, Search, Tours in agent-vision)
- **THEN** each renders its label outside the icon container with the icon-only hover/selected background

#### Scenario: Inert items and Account cell follow the treatment

- **WHEN** a non-interactive inert item or the Account cell is displayed
- **THEN** it renders its label outside the icon container consistent with the primary navigation items

#### Scenario: Both apps present the same rail composition

- **WHEN** the navigation rail is displayed in agent-web and in agent-vision
- **THEN** both use the same label-outside-container cell composition

### Requirement: Rail items are generously spaced with a legible collapsed logo

The navigation rail SHALL space its items generously rather than tightly packing them, and its collapsed logo mark SHALL render large enough to read clearly, in both the agent-web and agent-vision apps.

#### Scenario: Rail items are spaced generously

- **WHEN** the navigation rail is displayed
- **THEN** its items are separated by generous spacing rather than a tight, cramped gap

#### Scenario: Collapsed logo scales by height, not a fixed square

- **WHEN** the rail's collapsed logo mark is displayed
- **THEN** it renders at a height large enough to read clearly, with its width scaling proportionally rather than being forced into a fixed square

### Requirement: Interactive cells remain single activatable controls

Restructuring the cell SHALL NOT change how interactive rail cells are activated. Each interactive cell MUST remain a single control activatable by pointer and keyboard, with its label included in the control's accessible name.

#### Scenario: Cell activates navigation on interaction

- **WHEN** the user activates an interactive rail cell by click or keyboard
- **THEN** the app navigates to that cell's destination, unchanged from prior behavior

#### Scenario: Label contributes to accessible name

- **WHEN** assistive technology inspects an interactive rail cell
- **THEN** the cell's label text is part of its accessible name
