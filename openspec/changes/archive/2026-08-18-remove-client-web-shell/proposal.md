## Why

The prototype-shell workspace shipped with `agent-web` as the primary surface alongside two sibling surfaces, `client-web` and `consumer-web`. In practice `client-web` never moved past its initial scaffold — it is not deployed, not exercised in user testing, and its only cross-reference in the repo is the `inject-dummy-data` skill doc, which names it as an injection target and points at its `src/Shell.tsx` constants. Carrying it forward only adds a dead shell to install, maintain, and vet for a public repo, and it leaves tooling and docs pointing at a shell nobody runs. Removing it keeps the workspace to the shells that are actually used (`agent-web`, `agent-vision`, `consumer-web`).

## What Changes

- Delete the entire `client-web/` shell directory from the workspace, including its Vite + React + Panda scaffold, `src/Shell.tsx`, config files, and lockfile.
- Update the `inject-dummy-data` skill doc, which listed `client-web` as a target shell and pointed at its `client-web/src/Shell.tsx` constants (`CONTACT` and the `AgentDetailScreen` identity block): drop those references and refresh the "shells this repo has" list to the shells that actually exist — `agent-vision`, `agent-web`, `consumer-web`.
- Out of scope: no change to the remaining shells (`agent-web`, `agent-vision`, `consumer-web`), the deploy/launch tooling, or any product/service code.

## Capabilities

### Modified Capabilities
- `prototype-shells`: The prototype-shell workspace no longer includes the `client-web` surface. The set of shells is now `agent-web`, `agent-vision`, and `consumer-web`, and documentation that enumerates the shells lists only those.

## Impact

- **Removed shell (`client-web/`):** the full directory — `.gitignore`, `README.md`, `index.html`, `package.json`, `package-lock.json`, `panda.config.ts`, `postcss.config.cjs`, `src/Shell.tsx`, `src/globals.css`, `src/index.css`, `src/main.tsx`, `tailwind.config.ts`, `tsconfig.json`, `vite.config.ts`.
- **Doc update:** `.claude/skills/inject-dummy-data/SKILL.md` — the target-shell list refreshed to `agent-vision`, `agent-web`, `consumer-web`, and the `client-web/src/Shell.tsx` constants bullet removed.
- **Not affected:** the `agent-web`, `agent-vision`, and `consumer-web` shells; the GitHub Pages deploy script and `.claude/launch.json` (neither referenced `client-web`); any product or service code.
