## MODIFIED Requirements

### Requirement: Prototype-shell workspace surfaces

The prototype-shell workspace SHALL contain only the runnable shells that are maintained for user testing: `agent-web` (the primary agent-facing RealAssist+ content-orchestration surface), `agent-vision`, and `consumer-web`. The workspace SHALL NOT contain a `client-web` shell, and tooling or documentation that enumerates the workspace's shells MUST list only shells that exist.

#### Scenario: Workspace contains only existing shells

- **WHEN** the repository's prototype-shell workspace is inspected
- **THEN** the shells present are `agent-web`, `agent-vision`, and `consumer-web`
- **AND** no `client-web/` directory is present
- **AND** no build, launch, or deploy tooling references a `client-web` shell

#### Scenario: inject-dummy-data doc lists only existing shells

- **WHEN** the `inject-dummy-data` skill doc names the workspace's target shells
- **THEN** it lists `agent-vision`, `agent-web`, and `consumer-web`
- **AND** it does not name `client-web` or point at a `client-web/src/Shell.tsx` constant block

## REMOVED Requirements

### Requirement: client-web sibling surface

**Reason:** The `client-web` prototype shell was removed from the workspace — its directory and every reference to it were deleted — because the surface never moved past its initial scaffold and is not maintained for user testing.
