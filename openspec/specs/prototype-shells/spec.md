# prototype-shells Specification

## Purpose

Defines the runnable prototype-shell workspace used for end-to-end user testing — the Vite + React + TypeScript shells built on the Haven design system via Panda CSS. The workspace hosts two agent-facing shells, `agent-web` and `agent-vision`, that share the same structure; how they resolve Panda tokens, stay responsive across breakpoints, run side by side on fixed non-colliding dev ports, deploy to GitHub Pages without leaking licensed assets, and can be launched by name.

## Requirements

### Requirement: Workspace provides the prototype shells

The prototype-shell workspace SHALL provide a Vite + React + TypeScript + Haven (Panda CSS) shell for each testing surface, and SHALL contain only the runnable shells that are maintained for user testing: `agent-web` (the primary agent-facing RealAssist+ content-orchestration surface) and `agent-vision`. The workspace SHALL NOT contain a `client-web` or `consumer-web` shell, and any tooling or documentation that enumerates the workspace's shells MUST list only shells that exist. Each shell MUST build and run on its own.

#### Scenario: Workspace contains only the existing shells

- **WHEN** the repository's prototype-shell workspace is inspected
- **THEN** the shells present are `agent-web` and `agent-vision`
- **AND** no `client-web/` or `consumer-web/` directory is present
- **AND** no build, launch, or deploy tooling references a removed `client-web` or `consumer-web` shell

#### Scenario: Both agent-facing shells are present

- **WHEN** the workspace is inspected
- **THEN** both `agent-web` and `agent-vision` exist as agent-facing prototype shells

#### Scenario: Each shell builds and runs independently

- **WHEN** a shell's dependencies are installed and it is built (`npm ci` then `npm run build`)
- **THEN** that shell builds without depending on any other shell
- **AND** it can be started and rendered on its own

#### Scenario: inject-dummy-data doc lists only existing shells

- **WHEN** the `inject-dummy-data` skill doc names the workspace's target shells
- **THEN** it lists only `agent-vision` and `agent-web`
- **AND** it does not name `client-web` or `consumer-web`

### Requirement: Prototype shell is a standalone Vite + React + Panda app on Haven

Each prototype shell SHALL be a standalone Vite + React + TypeScript application built on the Haven design system (`@rdc-npm/rdc-ui-v4`) styled with Panda CSS, runnable on its own for end-to-end user testing, without depending on the Claude Design authoring runtime.

#### Scenario: Shell runs a local dev server

- **WHEN** a developer installs dependencies against the internal `@rdc-npm` Artifactory scope (on the VPN) and starts the dev server
- **THEN** the `agent-web` shell renders the RealAssist+ content-orchestration flow at `http://localhost:5173`
- **AND** the app is styled with the Haven design system via Panda CSS

#### Scenario: Assistant works without the authoring runtime

- **WHEN** the shell runs standalone without a host-injected `window.claude.complete`
- **THEN** a local rule-based responder reproduces the same contract, returning plain-text replies and the `show_client_card` and `schedule_tour` cards the chat renders
- **AND** the responder defers to `window.claude.complete` if a host injects one

#### Scenario: Shell builds and packages for sharing

- **WHEN** the shell is built and bundled
- **THEN** `npm run build` produces `dist/` and `npm run bundle` produces a single self-contained `index.html` suitable for a RealPrototypes upload

### Requirement: agent-vision shares agent-web's shell structure

The `agent-vision` shell SHALL share `agent-web`'s structure, having been seeded by duplicating `agent-web` at mainline so it starts from the same codebase (including the shared header). The duplication SHALL copy only tracked source, tests, configs, public assets, and scripts, and MUST exclude generated or ignored artifacts (`node_modules`, `dist`, `styled-system`), which are regenerated on build. The `agent-vision` package SHALL be named `agent-vision-shell`.

#### Scenario: agent-vision matches agent-web's structure

- **WHEN** the `agent-vision` shell is inspected
- **THEN** its source, tests, configs, public assets, and scripts share `agent-web`'s structure
- **AND** it inherits the shared header and the rest of `agent-web`'s behavior

#### Scenario: Only source and configuration are tracked

- **WHEN** `agent-vision` is present in the workspace
- **THEN** `node_modules`, `dist`, `styled-system`, and other generated or ignored artifacts are not committed
- **AND** those artifacts are regenerated via `npm ci` and `npm run build`

#### Scenario: Package is named agent-vision-shell

- **WHEN** `agent-vision/package.json` is inspected
- **THEN** the package name is `agent-vision-shell`

### Requirement: Panda tokens are accessed via token(), not raw var() strings

Styling that references Panda design tokens SHALL use `token('…')` (from `styled-system/tokens`) rather than hand-written `var(--…)` CSS-variable strings, so Panda registers the token as used and always emits its variable.

#### Scenario: Token reference registers the variable

- **WHEN** a component needs a Panda color or shadow token (for example `colors.bg.base`, `colors.bg.alternate`, `shadows.lifted`, `colors.bg.inverse`, or `border.base`)
- **THEN** it calls `token('…')` for that token
- **AND** it does not embed a raw `var(--colors-…)` or `var(--shadows-…)` string
- **AND** Panda emits the corresponding CSS variable so the property resolves in a consumer build rather than being tree-shaken out

#### Scenario: Panda lint passes

- **WHEN** `lint:panda` runs across the shells
- **THEN** the `no-inline-panda-var` rule reports no violations

### Requirement: agent-web shell is responsive across breakpoints

The `agent-web` shell SHALL present a working layout from narrow phone widths (~320px) up to desktop. In either layout the primary content region (`main`) SHALL occupy the full available viewport width, and no layout region SHALL overflow the viewport horizontally.

#### Scenario: Desktop layout

- **WHEN** the shell is displayed above the mobile breakpoint (wider than 768px)
- **THEN** the vertical navigation rail is shown
- **AND** the second-level subnav and the assistant panel dock in the flow beside `main` when open
- **AND** `main` fills the remaining width

#### Scenario: Mobile layout

- **WHEN** the shell is displayed at or below the mobile breakpoint (768px or narrower)
- **THEN** the navigation rail is replaced by a bottom tab bar
- **AND** the subnav and the assistant panel become overlays over `main` rather than reserving a column beside it
- **AND** `main` keeps the full viewport width

#### Scenario: Content adapts without horizontal overflow

- **WHEN** the shell is displayed at ~320px
- **THEN** grid tracks collapse to the container instead of overflowing it
- **AND** content that cannot reflow (such as the wide client table) scrolls within its own region rather than forcing the page to scroll sideways
- **AND** the shell root uses the dynamic viewport height so the assistant composer is not left under collapsing mobile browser chrome

### Requirement: Mobile overlays default closed and stay out of the tab order when closed

Below the mobile breakpoint the subnav and assistant overlays SHALL start closed and SHALL collapse when the layout crosses into mobile. A closed overlay SHALL NOT expose focusable controls to keyboard or assistive technology.

#### Scenario: Overlays start closed on a phone

- **WHEN** the shell first renders at or below the mobile breakpoint
- **THEN** the subnav and assistant overlays are closed
- **AND** neither overlay covers `main`

#### Scenario: Overlays collapse entering the mobile layout

- **WHEN** the viewport crosses from above the breakpoint to at or below it
- **THEN** any docked subnav and assistant panel collapse to closed overlays

#### Scenario: Closed overlay is removed from the tab order

- **WHEN** an overlay is closed
- **THEN** its controls are not reachable by keyboard tabbing and are hidden from the accessibility tree

#### Scenario: Overlays are dismissible

- **WHEN** the subnav drawer is open on mobile
- **THEN** tapping the scrim behind it dismisses it
- **AND** pressing Escape backs out one open overlay at a time, topmost first

### Requirement: agent-web top-level screen is addressable via the URL

The `agent-web` shell SHALL mirror its active top-level screen into the URL query parameter `view`, so that a shared or reloaded URL restores the named screen and browser Back/Forward navigate between visited screens. The default (Home) screen SHALL write no parameter.

#### Scenario: Reloaded or shared URL restores the screen

- **WHEN** a URL carrying `?view=<screen>` for a known screen is loaded
- **THEN** the shell opens on that screen
- **AND** a URL with a missing or unknown `view` value opens on the default Home screen

#### Scenario: Navigation updates history

- **WHEN** the user navigates to another top-level screen
- **THEN** the URL's `view` parameter updates to that screen (and is cleared for Home)
- **AND** browser Back and Forward move between the visited screens

### Requirement: Fixed dev-server ports keep shells from colliding

Each prototype shell SHALL pin its dev-server port so shells can run side by side without colliding, and the comments explaining the pin MUST describe the collision generically rather than naming any removed shell.

#### Scenario: Shells do not contend for a port

- **WHEN** more than one shell's dev server is running at the same time
- **THEN** each binds its own assigned port
- **AND** no shell fails to start because another has taken its port

#### Scenario: Strict-port shell avoids the auto-walk range

- **WHEN** a shell is pinned to a strict port
- **THEN** that port lies outside the range another shell's dev server auto-selects when its own default port is already taken

#### Scenario: Port pin is explained generically

- **WHEN** a reader inspects the `PORT` / `server.port` note in `agent-web/vite.config.ts` or `agent-vision/vite.config.ts`, or the `webServer` note in either shell's `playwright.config.ts`
- **THEN** the comment still explains that Vite silently walks `5173→5174` when `5173` is taken, which is why the port is fixed
- **AND** it describes the collision generically (for example, "another shell's dev server") rather than naming a removed shell

### Requirement: Deploy publishes only compiled output and never publishes font binaries

The GitHub Pages deploy script SHALL publish only the compiled build to the `gh-pages` branch and MUST NOT publish licensed font binaries. It SHALL exclude blocked font extensions when copying the build and abort the deploy if such a file would still be staged.

#### Scenario: Only compiled output is published from a detached worktree

- **WHEN** `npm run deploy` runs (on the VPN, where the `@rdc-npm` build can resolve)
- **THEN** the app is built locally and only the compiled `dist/` is force-pushed to the `gh-pages` branch from a detached worktree in a temp dir
- **AND** the working tree and the current branch are left untouched

#### Scenario: Font binaries are filtered out of the publish

- **WHEN** the deploy copies `dist/` into the worktree
- **THEN** files with a blocked font extension (`.otf`, `.ttf`, `.woff`, `.woff2`) are excluded
- **AND** the published site loads the same faces from the public CDN, so rendering is unchanged

#### Scenario: Deploy aborts if a font binary would be staged

- **WHEN** a blocked font file would be staged for the `gh-pages` branch despite the filter
- **THEN** the deploy stops with a non-zero exit and reports the offending file
- **AND** nothing is pushed to `gh-pages`

### Requirement: Deploy cleans up its scratch branch so consecutive deploys work

The deploy script SHALL build the orphan branch under a `gh-pages-staging` scratch name pushed to `gh-pages` by refspec, and SHALL delete that scratch branch both before the run and in its cleanup step, so consecutive deploys succeed even after an earlier run dies before cleanup.

#### Scenario: Second consecutive deploy succeeds

- **WHEN** a deploy runs after a previous deploy already created the branch locally
- **THEN** the script deletes any leftover `gh-pages-staging` branch up front before checking out the orphan
- **AND** it stages the orphan under `gh-pages-staging` and pushes it to `gh-pages` by refspec

#### Scenario: Cleanup runs even when a deploy fails

- **WHEN** a deploy finishes or fails part-way
- **THEN** the `finally` step removes the temporary worktree, prunes worktrees, and deletes the `gh-pages-staging` branch
- **AND** the next deploy is not blocked by leftover state

### Requirement: Repo is safe to be public

The workspace and repo configuration SHALL keep the public repository free of licensed binaries, real contact details, and machine-local settings.

#### Scenario: Licensed font binaries are not tracked

- **WHEN** the repository is inspected
- **THEN** the licensed Galano Grotesque Alt `.otf` binaries are gitignored and not committed
- **AND** the Haven stylesheet and `dev.html` load those faces from the public CDN

#### Scenario: Placeholder contact details cannot reach a real person

- **WHEN** a prototype shell displays contact details
- **THEN** they use the `555-01xx` fictional-use block and an RFC 2606 reserved domain

#### Scenario: Machine-local settings are ignored

- **WHEN** `.claude/settings.local.json` exists locally
- **THEN** it is gitignored (scoped to that one file) so its local paths and granted permissions never ship
- **AND** `.claude/skills/` and a shared `settings.json` remain tracked

### Requirement: Shell can be launched by name

The workspace SHALL provide a repo-relative launch configuration so a prototype shell's dev server can be started by name without rediscovering its invocation, and that configuration MUST reference only shells that exist in the workspace — it MUST NOT reference any removed `client-web` or `consumer-web` shell.

#### Scenario: Launch config starts the shell

- **WHEN** tooling reads `.claude/launch.json`
- **THEN** it finds the `agent-web` configuration mapping to `npm --prefix agent-web run dev` on port `5173`
- **AND** the configuration is repo-relative project config that travels with a clone rather than machine-local setup

#### Scenario: No removed shell's launch entry remains

- **WHEN** `.claude/launch.json` is inspected
- **THEN** it contains no `consumer-web` or `client-web` configuration and no reference to a removed shell's dev-server port
- **AND** no config comment or skill in the workspace names a removed shell or its dev-server port
