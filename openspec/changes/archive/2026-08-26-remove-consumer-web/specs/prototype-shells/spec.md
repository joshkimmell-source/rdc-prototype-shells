## MODIFIED Requirements

### Requirement: Shell can be launched by name

The workspace SHALL provide a repo-relative launch configuration so a prototype shell's dev server can be started by name without rediscovering its invocation, and that configuration MUST reference only shells that exist in the workspace — it MUST NOT reference the removed `consumer-web` shell.

#### Scenario: Launch config starts the shell

- **WHEN** tooling reads `.claude/launch.json`
- **THEN** it finds the `agent-web` configuration mapping to `npm --prefix agent-web run dev` on port `5173`
- **AND** the configuration is repo-relative project config that travels with a clone rather than machine-local setup

#### Scenario: No consumer-web launch entry remains

- **WHEN** `.claude/launch.json` is inspected
- **THEN** it contains no `consumer-web` configuration and no reference to `consumer-web`'s `5176` / `--strictPort` port
- **AND** no config comment or skill in the workspace names a `consumer-web` shell or its dev-server port

### Requirement: Fixed dev-server ports keep shells from colliding

Each prototype shell SHALL pin its dev-server port so shells can run side by side without colliding, and the comments explaining the pin MUST NOT name the removed `consumer-web` shell as the colliding party.

#### Scenario: Port pin is explained without referencing consumer-web

- **WHEN** a reader inspects the `PORT` / `server.port` note in `agent-web/vite.config.ts` or `agent-vision/vite.config.ts`, or the `webServer` note in either shell's `playwright.config.ts`
- **THEN** the comment still explains that Vite silently walks `5173→5174` when `5173` is taken, which is why the port is fixed
- **AND** it describes the collision generically (for example, "another shell's dev server") rather than naming `consumer-web`

## REMOVED Requirements

### Requirement: Workspace hosts a launchable consumer-web shell

**Reason:** The `consumer-web` prototype shell and all references to it were removed from the repo; the workspace's prototype shells are now `agent-web` and `agent-vision` only.
