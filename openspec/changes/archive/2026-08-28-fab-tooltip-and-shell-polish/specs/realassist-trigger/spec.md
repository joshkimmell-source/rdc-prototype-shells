## MODIFIED Requirements

### Requirement: Variant A places the trigger as the corner floating action button

Under variant `a`, the "Ask RealAssist+" trigger SHALL render as the floating action button fixed to the bottom-right corner of the viewport, and no inline header or map action bar trigger SHALL appear. Because the FAB carries no visible label, it SHALL show a tooltip naming it ("Ask RealAssist+") on hover or keyboard focus, placed to the left of the control. This applies wherever the FAB is shown, including under variant `c` at mobile viewport widths.

#### Scenario: Corner FAB is shown in variant A

- **WHEN** the session is on variant `a`
- **THEN** the "Ask RealAssist+" trigger appears as the floating action button in the bottom-right corner
- **AND** it steps aside while the push panel or a mobile drawer is open, as before

#### Scenario: No inline trigger in variant A

- **WHEN** the session is on variant `a`
- **THEN** no header action bar Ask control and no map top-bar Ask control is shown

#### Scenario: Hovering or focusing the FAB shows a naming tooltip

- **WHEN** the FAB is hovered or receives keyboard focus
- **THEN** a tooltip reading "Ask RealAssist+" appears, placed to the left of the FAB
- **AND** the tooltip is dismissed when the pointer leaves or the FAB loses focus
