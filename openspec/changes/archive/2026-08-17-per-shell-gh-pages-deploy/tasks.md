## 1. agent-vision overlay deploy

- [x] 1.1 In `agent-vision/scripts/deploy-pages.mjs`, add a `SHELL` target that defaults to the project folder name (`basename(root)`) and accepts a `npm run deploy -- <name>` override; validate it against a single-path-segment regex and exit on failure. Verify a bad name (e.g. `../x`) is rejected and a normal run resolves to `agent-vision`.
- [x] 1.2 Replace the orphan-and-force-push flow with an overlay: `fetch origin gh-pages`, add a detached worktree at `FETCH_HEAD`, then remove and re-copy only `gh-pages/<shell>/` from `dist/` (filtered by `publishable`). Verify other subdirectories present at the fetched tip are left untouched in the worktree.
- [x] 1.3 Add the orphan-tree fallback when the remote `gh-pages` branch does not exist yet (fetch fails): `checkout --orphan` + `rm -rf .`, then overlay the shell subdirectory. Verify the first-ever deploy still produces `gh-pages/<shell>/`.
- [x] 1.4 Write `.nojekyll` at the branch root of the worktree (not inside the shell subdirectory). Verify the marker sits at the root so Jekyll is bypassed for the whole site.
- [x] 1.5 Keep the font-binary `publishable` filter and the refuse-to-publish guard; skip the push (exit 0) when `git status --porcelain` is clean. Verify a rebuild with identical output logs "already up to date" and does not commit or push.
- [x] 1.6 Replace `push --force` with a plain `push origin HEAD:gh-pages` and update the success log to the per-shell URL (`…github.io/<repo>/<shell>/`). Verify the push fast-forwards and the logged URL includes the shell subpath.

## 2. agent-web overlay deploy

- [x] 2.1 Replace `agent-web/scripts/deploy-pages.mjs` with the same shell-agnostic overlay script from task 1, so `SHELL` defaults to `agent-web` and the deploy publishes to `gh-pages/agent-web/`. Verify deploying agent-web does not remove `gh-pages/agent-vision/`.
- [x] 2.2 Confirm parity between the two scripts: diff `agent-web/scripts/deploy-pages.mjs` and `agent-vision/scripts/deploy-pages.mjs` and verify they are byte-identical (the shell name is derived from the folder, not hardcoded).

## 3. Verification

- [x] 3.1 Deploy `agent-vision`, then deploy a second shell, and verify both coexist on `gh-pages` — each served from its own `/<shell>/` subpath with assets resolving from the subpath, and neither deploy removed the other's output.
- [x] 3.2 Verify anything at the `gh-pages` branch root is preserved across a deploy (the existing root app survives).
- [x] 3.3 Verify the non-force push preserves branch history (no orphaning) and that a no-change rebuild is a clean no-op.
- [x] 3.4 Confirm the font-binary guard still refuses to publish licensed binaries and that the working tree and current branch are untouched after a deploy.
