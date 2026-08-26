## Purpose

The runnable prototype-shell workspace used for end-to-end user testing. This delta records the addition of a second agent-facing shell, `agent-vision`, to the existing workspace.

## MODIFIED Requirements

### Requirement: Workspace provides the prototype shells

The prototype-shell workspace SHALL provide a Vite + React + TypeScript + Haven (Panda CSS) shell for each testing surface. It SHALL include two agent-facing shells — `agent-web` and `agent-vision` — alongside the `client-web` (client/PRO) and `consumer-web` (consumer) sibling surfaces. Each shell MUST build and run on its own.

#### Scenario: Agent-facing shells are present

- **WHEN** the workspace is inspected
- **THEN** both `agent-web` and `agent-vision` exist as agent-facing prototype shells
- **AND** the `client-web` and `consumer-web` sibling surfaces are also present

#### Scenario: Each shell builds and runs independently

- **WHEN** a shell's dependencies are installed and it is built (`npm ci` then `npm run build`)
- **THEN** that shell builds without depending on any other shell
- **AND** it can be started and rendered on its own

### Requirement: agent-vision is seeded as a duplicate of agent-web

The `agent-vision` shell SHALL be seeded by duplicating `agent-web` at the current mainline, so it starts from the same codebase (including the shared header). The duplication SHALL copy only tracked source, tests, configs, public assets, and scripts, and MUST exclude generated or ignored artifacts (`node_modules`, `dist`, `styled-system`), which are regenerated on build. The package SHALL be renamed to `agent-vision-shell`.

#### Scenario: agent-vision starts identical to agent-web

- **WHEN** the `agent-vision` shell is first created
- **THEN** its source, tests, configs, public assets, and scripts match `agent-web` at the duplication point
- **AND** it inherits the shared header and the rest of `agent-web`'s current behavior

#### Scenario: Only source and configuration are copied

- **WHEN** `agent-vision` is added to the workspace
- **THEN** `node_modules`, `dist`, `styled-system`, and other generated or ignored artifacts are not committed
- **AND** those artifacts are regenerated via `npm ci` and `npm run build`

#### Scenario: Package is renamed

- **WHEN** `agent-vision/package.json` is inspected
- **THEN** the package name is `agent-vision-shell`
