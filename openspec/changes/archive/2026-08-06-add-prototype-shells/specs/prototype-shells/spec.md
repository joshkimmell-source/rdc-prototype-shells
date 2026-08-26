## Purpose

Defines the prototype-shell workspace used for end-to-end user testing — the `agent-web` Vite + React + TypeScript shell built on the Haven design system via Panda CSS, how it accesses Panda tokens, how it is published to GitHub Pages without leaking licensed assets, and how it is launched by name.

## ADDED Requirements

### Requirement: Prototype shell is a standalone Vite + React + Panda app on Haven

The prototype shell SHALL be a standalone Vite + React + TypeScript application built on the Haven design system (`@rdc-npm/rdc-ui-v4`) styled with Panda CSS, runnable on its own for end-to-end user testing, without depending on the Claude Design authoring runtime.

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

- **WHEN** `client-web` displays contact details
- **THEN** they use the `555-01xx` fictional-use block and an RFC 2606 reserved domain

#### Scenario: Machine-local settings are ignored

- **WHEN** `.claude/settings.local.json` exists locally
- **THEN** it is gitignored (scoped to that one file) so its local paths and granted permissions never ship
- **AND** `.claude/skills/` and a shared `settings.json` remain tracked

### Requirement: Shell can be launched by name

The workspace SHALL provide a repo-relative launch configuration so the shell's dev server can be started by name without rediscovering its invocation.

#### Scenario: Launch config starts the shell

- **WHEN** tooling reads `.claude/launch.json`
- **THEN** it finds the `agent-web` configuration mapping to `npm --prefix agent-web run dev` on port `5173`
- **AND** the configuration is repo-relative project config that travels with a clone rather than machine-local setup
