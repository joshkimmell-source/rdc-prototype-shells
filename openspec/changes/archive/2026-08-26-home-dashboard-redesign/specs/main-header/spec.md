## MODIFIED Requirements

### Requirement: Screens supply their own header content

The shared header SHALL accept its title, count label, an optional lead region, per-screen actions, and overflow-menu rows from the screen it sits above, while keeping one shared header structure. When a lead region is provided, the header MUST render it in place of the title/count block. A count label is no longer shown for every screen: agent-web shows one only on Home; agent-vision shows none.

#### Scenario: Only agent-web's Home screen shows a count label

- **WHEN** the agent-web Home screen is displayed
- **THEN** the header shows a count label ("N clients," or "N of M clients" when a filter is active) on a second line below the title
- **WHEN** any other agent-web screen is displayed, or any agent-vision screen is displayed
- **THEN** the header shows only the title, with no count label below it

#### Scenario: Search shows a lead region instead of a title

- **WHEN** the Search screen is displayed
- **THEN** the header renders Search's lead region (the MLS selector and search field) in place of the title/count block
- **AND** the lead region shrinks but does not grow, yielding free width to the control cluster beside it

#### Scenario: Per-screen actions and menu appear

- **WHEN** the Tours screen is displayed
- **THEN** the header shows Tours' actions (Export and Add to calendar) and Tours' overflow-menu rows
- **WHEN** the Search screen is displayed
- **THEN** the header shows Search's Save search action and Search's overflow-menu rows
