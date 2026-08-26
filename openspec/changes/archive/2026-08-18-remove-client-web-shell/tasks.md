## 1. Remove the client-web shell

- [x] 1.1 Delete the entire `client-web/` directory, including the scaffold (`.gitignore`, `README.md`, `index.html`, `package.json`, `package-lock.json`, `panda.config.ts`, `postcss.config.cjs`, `tailwind.config.ts`, `tsconfig.json`, `vite.config.ts`) and `src/` (`Shell.tsx`, `globals.css`, `index.css`, `main.tsx`). Verify no `client-web/` directory remains in the workspace.

## 2. Refresh references to the workspace shells

- [x] 2.1 In `.claude/skills/inject-dummy-data/SKILL.md`, update the "this repo has three" target-shell list from `agent-web`, `client-web`, `consumer-web` to `agent-vision`, `agent-web`, `consumer-web`. Verify the doc no longer names `client-web` as a target shell.
- [x] 2.2 In the same doc, remove the bullet pointing at `client-web/src/Shell.tsx` constants (`CONTACT` and the `AgentDetailScreen` identity block). Verify the per-shell constants list references only shells that exist.

## 3. Verification

- [x] 3.1 Grep the repo for `client-web` and verify no references remain outside git history.
- [x] 3.2 Confirm out-of-scope surfaces are untouched: the `agent-web`, `agent-vision`, and `consumer-web` shells, the deploy script, and `.claude/launch.json` are unchanged.
