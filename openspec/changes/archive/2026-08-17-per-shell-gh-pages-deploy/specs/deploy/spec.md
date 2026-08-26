## Purpose

Defines how a prototype shell publishes its built output to GitHub Pages — a per-shell subdirectory overlay onto the shared `gh-pages` branch that lets multiple shells (`agent-web`, `agent-vision`, …) coexist under one repo without clobbering one another.

## ADDED Requirements

### Requirement: Each shell publishes to its own subdirectory

A shell's deploy SHALL publish its built output into a subdirectory of the `gh-pages` branch named for that shell, so the shell is served from `https://<owner>.github.io/<repo>/<shell>/`. The subdirectory name SHALL default to the shell's project folder name and MAY be overridden by a command argument, and it MUST be validated as a single safe path segment.

#### Scenario: Shell deploys into its own subdirectory

- **WHEN** a shell is deployed with `npm run deploy`
- **THEN** its built output is published under the `gh-pages/<shell>/` subdirectory
- **AND** the shell name defaults to the shell's project folder name
- **AND** the served URL is `https://<owner>.github.io/<repo>/<shell>/`

#### Scenario: Subdirectory name can be overridden

- **WHEN** a deploy is invoked with an explicit name (`npm run deploy -- <name>`)
- **THEN** the output is published under that named subdirectory instead of the default

#### Scenario: Unsafe subdirectory name is rejected

- **WHEN** the provided shell name is not a single safe path segment (for example, it contains a path separator or `..`)
- **THEN** the deploy fails without publishing
- **AND** no other shell's subdirectory is modified

### Requirement: Deploying one shell does not clobber another's output

Deploying one shell SHALL NOT remove or overwrite any other shell's published output, nor anything published at the branch root. A deploy SHALL replace only the deploying shell's own subdirectory.

#### Scenario: Sibling shell output survives a deploy

- **WHEN** one shell is deployed while another shell's output already exists on `gh-pages`
- **THEN** only the deploying shell's subdirectory is replaced
- **AND** the other shell's subdirectory remains published and unchanged

#### Scenario: Branch root content is preserved

- **WHEN** a shell is deployed and content already exists at the `gh-pages` branch root
- **THEN** the branch-root content is preserved after the deploy

#### Scenario: Push does not orphan the branch

- **WHEN** the deploy publishes to `gh-pages`
- **THEN** it pushes without force so the branch fast-forwards
- **AND** the branch is not orphaned or replaced wholesale

### Requirement: Deploy overlays onto existing branch content

The deploy SHALL build its commit on top of the existing `gh-pages` branch content rather than replacing the branch, and SHALL provide a fallback for the first deploy when the branch does not yet exist.

#### Scenario: Overlay onto the existing published tree

- **WHEN** the `gh-pages` branch already exists remotely
- **THEN** the deploy bases its commit on the current published tip
- **AND** replaces only the deploying shell's subdirectory
- **AND** leaves all other tracked content in place

#### Scenario: First-ever deploy with no existing branch

- **WHEN** the `gh-pages` branch does not yet exist remotely
- **THEN** the deploy starts from an empty tree
- **AND** publishes the shell's subdirectory as the branch's initial content

#### Scenario: No-op deploy when output is unchanged

- **WHEN** the freshly built output is identical to what is already published for that shell
- **THEN** the deploy makes no commit and no push
- **AND** reports that `gh-pages` is already up to date
