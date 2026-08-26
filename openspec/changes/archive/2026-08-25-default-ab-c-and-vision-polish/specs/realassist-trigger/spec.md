## MODIFIED Requirements

### Requirement: Default and fallback trigger placement

The `?ab=` mechanism SHALL support three placement variants — `a`, `b`, and `c` — and SHALL treat variant `c` as the default. When no `?ab=` value is supplied, or when the supplied value is not a recognized variant, the trigger placement SHALL default to variant `c`. Variant `c` SHALL place the trigger responsively: the floating corner FAB on mobile (as in variant `a`), and the inline `ActionBar` header action at every other viewport width (as in variant `b`). Variants `a` and `b` SHALL remain selectable by explicit `?ab=a` and `?ab=b` values and SHALL render unchanged.

#### Scenario: No `?ab=` value supplied

- **WHEN** the app is opened with no `?ab=` value in the URL
- **THEN** the selected placement variant is `c`
- **AND** on a mobile-width viewport the trigger is shown as the floating corner FAB
- **AND** at every other viewport width the trigger is shown as the inline `ActionBar` header action

#### Scenario: Unknown `?ab=` value falls back to the default

- **WHEN** the app is opened with an unrecognized `?ab=` value
- **THEN** the value falls back to variant `c` rather than an undefined variant
- **AND** the trigger is placed according to variant `c`'s responsive rule

#### Scenario: Variant `c` placement follows the viewport width

- **WHEN** variant `c` is in effect
- **AND** the viewport is at or below the mobile breakpoint
- **THEN** the trigger is shown as the floating corner FAB
- **AND** when the viewport is above the mobile breakpoint the trigger is shown as the inline `ActionBar` header action

#### Scenario: Explicit `a` and `b` variants remain available

- **WHEN** the app is opened with `?ab=a`
- **THEN** the trigger is shown only as the floating corner FAB at every width
- **AND** when the app is opened with `?ab=b` the trigger is shown only as the inline `ActionBar` header action at every width
