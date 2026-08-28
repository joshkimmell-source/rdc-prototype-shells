## ADDED Requirements

### Requirement: Rail items are generously spaced with a legible collapsed logo

The navigation rail SHALL space its items generously rather than tightly packing them, and its collapsed logo mark SHALL render large enough to read clearly, in both the agent-web and agent-vision apps.

#### Scenario: Rail items are spaced generously

- **WHEN** the navigation rail is displayed
- **THEN** its items are separated by generous spacing rather than a tight, cramped gap

#### Scenario: Collapsed logo scales by height, not a fixed square

- **WHEN** the rail's collapsed logo mark is displayed
- **THEN** it renders at a height large enough to read clearly, with its width scaling proportionally rather than being forced into a fixed square
