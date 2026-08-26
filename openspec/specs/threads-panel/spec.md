# threads-panel Specification

## Purpose

Defines the presentation and labeling of the RealAssist+ panel's Threads action and the panel toggle controls shared by the agent-web and agent-vision apps — how the Threads action is styled, how the panel open/close controls surface their labels, and which icon the panel toggle uses.

## Requirements

### Requirement: Threads action is presented as a Primary button

The RealAssist+ panel's Threads toggle SHALL be presented as a Haven Primary, icon-only button positioned to the left of the panel label. Activating it SHALL open the threads list, and the button SHALL be hidden while the docked threads list is already showing.

#### Scenario: Threads toggle renders as a Primary button

- **WHEN** the RealAssist+ panel header is displayed and the docked threads list is not showing
- **THEN** the Threads toggle appears as a Haven Primary, icon-only button to the left of the panel label
- **AND** activating it opens the threads list

#### Scenario: Threads button hidden while threads are docked

- **WHEN** the panel is expanded and the docked threads list is already showing
- **THEN** the Threads Primary button is not displayed

### Requirement: Panel toggle controls expose tooltips describing their action

The panel toggle controls — the main-header drawer button that opens a subnav and the subnav close buttons that hide it — SHALL expose a tooltip that names the action, and the tooltip text SHALL identify the affected section. The controls SHALL retain an accessible name that matches the tooltip.

#### Scenario: Threads toggle exposes an "Open threads" tooltip

- **WHEN** the user hovers or focuses the Threads Primary button
- **THEN** a tooltip reading "Open threads" is shown

#### Scenario: Drawer button names the section to show

- **WHEN** the main-header drawer button is displayed for a subnav section
- **THEN** its tooltip reads "Show <section>" (for example "Show Clients" or "Show Tours")
- **AND** its accessible name matches that wording

#### Scenario: Close buttons name the section to hide

- **WHEN** a subnav close button is displayed
- **THEN** its tooltip reads "Hide <section>" (for example "Hide Clients" or "Hide Tours")
- **AND** its accessible name matches that wording

### Requirement: Panel toggle uses the IconPanel icon

The panel toggle controls SHALL use the panel open/close icon (`IconPanelOpen` / `IconPanelClose`), rendered consistently at their small and large sizes.

#### Scenario: Drawer button renders the panel-open icon

- **WHEN** the main-header drawer button is displayed
- **THEN** it renders the `IconPanelOpen` glyph

#### Scenario: Close button renders the panel-close icon

- **WHEN** a subnav close button is displayed
- **THEN** it renders the `IconPanelClose` glyph

### Requirement: Both shells present the same Threads action and panel controls

The Threads Primary button, the panel toggle tooltips, and the panel toggle icon SHALL be presented identically in the agent-web and agent-vision apps.

#### Scenario: Both apps match

- **WHEN** the RealAssist+ panel and panel toggle controls are displayed in agent-web and in agent-vision
- **THEN** both use the same Threads Primary button, the same tooltip wording, and the same panel toggle icon
