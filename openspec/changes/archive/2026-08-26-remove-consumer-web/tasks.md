## 1. Remove the consumer-web shell

- [x] 1.1 Delete the entire `consumer-web/` tree from the repo (app source, `src/data/sample/`, CSS, `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `panda.config.ts`, `tailwind.config.ts`, `postcss.config.{js,cjs}`, `index.html`, `.gitignore`, `README.md`). Verify no `consumer-web/` directory remains.

## 2. Clean up workspace config and skill docs

- [x] 2.1 Remove the `consumer-web` configuration (port `5176`, `--strictPort`) from `.claude/launch.json`, leaving `agent-web` as the only launch entry. Verify the file parses and lists exactly one configuration.
- [x] 2.2 Update `.claude/skills/inject-dummy-data/SKILL.md`: change "three" shells to "two" and list `agent-vision`, `agent-web`; reword the `resolveJsonModule` note from "all three shells" to "both shells"; and remove the `consumer-web/src/Shell.tsx` (`SAMPLE_LISTINGS`) entry from the constants list. Verify the skill no longer mentions `consumer-web`.

## 3. Fix stale port-collision comments

- [x] 3.1 In `agent-web/vite.config.ts` and `agent-vision/vite.config.ts`, reword the `PORT`/`server.port` comment so the `5173→5174` walk collides with "another shell's dev server" rather than "consumer-web's port". Verify no `consumer-web` reference remains and the port-handoff explanation is intact.
- [x] 3.2 In `agent-web/playwright.config.ts` and `agent-vision/playwright.config.ts`, reword the `webServer` comment so the `5173→5174` walk collides with "another dev server" rather than "consumer-web". Verify no `consumer-web` reference remains.

## 4. Verification

- [x] 4.1 Grep the repo for `consumer-web` and confirm the only remaining matches are in historical OpenSpec archive records (which intentionally describe past state), not in live source, config, comments, or skill docs.
- [x] 4.2 Confirm `agent-web` and `agent-vision` still install, build, and launch, and that their Playwright configs still resolve their fixed ports — the removal changed only comments, not behavior.
