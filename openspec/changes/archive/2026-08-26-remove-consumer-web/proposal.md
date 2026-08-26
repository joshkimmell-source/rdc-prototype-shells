## Why

The workspace carried a third prototype shell, `consumer-web`, alongside `agent-web` and `agent-vision`. It was a thin, early prototype that had drifted out of active use: the RealAssist+ agent-facing work all happens in `agent-web` and `agent-vision`, and `consumer-web` was no longer being maintained or shared for user testing. Keeping it around cost more than it returned — it added a shell to install, launch, and keep in sync; it left `consumer-web`-specific wiring in the launch config and the sample-data skill; and it forced the two remaining shells to carry port-collision workarounds and comments written specifically to avoid stepping on `consumer-web`'s dev-server port. Removing it leaves the workspace with exactly the two shells that are actually in use.

## What Changes

- Delete the entire `consumer-web/` shell from the repo — its Vite/React app source, sample-data modules, config, and `package-lock.json`.
- Remove the `consumer-web` entry from `.claude/launch.json`, leaving `agent-web` as the only launch configuration.
- Update `.claude/skills/inject-dummy-data/SKILL.md` so it describes **two** shells (`agent-vision`, `agent-web`) instead of three, and drop the `consumer-web/src/Shell.tsx` (`SAMPLE_LISTINGS`) reference from the constants list.
- Update the now-stale port-collision comments in `agent-web/vite.config.ts`, `agent-vision/vite.config.ts`, `agent-web/playwright.config.ts`, and `agent-vision/playwright.config.ts` so they no longer name `consumer-web` as the shell whose port a Vite `5173→5174` walk would collide with; they now refer generically to "another shell's dev server".
- Out of scope: no behavioral change to `agent-web` or `agent-vision`; the fixed-port mechanism itself is unchanged, only the comments that referenced `consumer-web` by name.

## Capabilities

### Modified Capabilities

- `prototype-shells`: The `consumer-web` shell is removed from the workspace. The workspace's prototype shells are now `agent-web` and `agent-vision` only, and no launch config, config comment, or skill references a `consumer-web` shell or its port.

## Impact

- **Deleted shell:** the entire `consumer-web/` tree (19 files, ~8,453 lines) — `index.html`, `src/Shell.tsx`, `src/FilterDrawer.tsx`, `src/main.tsx`, `src/data/sample/` (`adapters.ts`, `index.ts`, `sample-data.json`), the CSS files, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `panda.config.ts`, `tailwind.config.ts`, `postcss.config.{js,cjs}`, `.gitignore`, and `README.md`.
- **Workspace config:** `.claude/launch.json` — the `consumer-web` configuration (port `5176`, `--strictPort`) is removed; `agent-web` remains.
- **Skill docs:** `.claude/skills/inject-dummy-data/SKILL.md` — "three" shells becomes "two", the `resolveJsonModule` note is reworded from "all three" to "both", and the `consumer-web/src/Shell.tsx` (`SAMPLE_LISTINGS`) constants entry is removed.
- **Stale comments:** `agent-web/vite.config.ts`, `agent-vision/vite.config.ts`, `agent-web/playwright.config.ts`, and `agent-vision/playwright.config.ts` — the port-collision comments no longer name `consumer-web`.
- **Not affected:** `agent-web` and `agent-vision` runtime behavior, their fixed-port setup, and any non-shell surfaces.
