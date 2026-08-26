## Why

Each prototype shell (`agent-web`, `agent-vision`) publishes to GitHub Pages with a local `scripts/deploy-pages.mjs` that orphaned the `gh-pages` branch and force-pushed the whole `dist/` to the branch root. Because every deploy replaced the entire branch, the repo could only ever host **one** shell at a time — deploying a second shell wiped the first. To serve several shells side by side under one repo (`<owner>.github.io/<repo>/agent-vision/`, `<owner>.github.io/<repo>/agent-web/`, …), the deploy must stop clobbering the branch and instead publish each shell into its own subdirectory while leaving the others in place.

## What Changes

- Rework `deploy-pages.mjs` from an orphan-and-force-push into an **overlay** deploy: base the commit on the existing `gh-pages` tip and replace only the shell's own subdirectory, so sibling shells and anything at the branch root survive every deploy.
- Publish into a per-shell **subdirectory** named after the project folder (`agent-vision`, `agent-web`), overridable via `npm run deploy -- <name>`. The name is validated as a single safe path segment so it cannot escape into a sibling path or the branch root.
- Replace the force-push with a plain (non-force) push: the deploy worktree is checked out detached at the fetched `gh-pages` tip, so the new commit fast-forwards the branch and preserves the other shells' history instead of orphaning it.
- Add an **orphan-tree fallback** for the first-ever deploy (when `gh-pages` does not yet exist remotely) so the initial publish still works.
- Skip the push entirely when the freshly built output is byte-identical to what is already published (no-op deploy).
- Preserve the existing safeguards: the font-binary publish filter, the refuse-to-publish guard, the `.nojekyll` marker (now written at the branch root), and the detached temp worktree that never touches the working tree or current branch.
- Apply the identical script to **both** shells: `agent-vision` first, then `agent-web`.

## Capabilities

### New Capabilities
- `deploy`: How a prototype shell publishes its built output to GitHub Pages — a per-shell subdirectory overlay onto the shared `gh-pages` branch that lets multiple shells coexist without clobbering one another.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **Affected code (agent-vision):** `agent-vision/scripts/deploy-pages.mjs` — reworked to the per-shell overlay deploy (commit 1b12806).
- **Affected code (agent-web):** `agent-web/scripts/deploy-pages.mjs` — replaced its orphan-and-force-push deploy with the same shell-agnostic overlay script (commit 2f54eeb).
- **Deploy target:** `gh-pages` branch layout changes from a single app at the branch root to one subdirectory per shell (`gh-pages/<shell>/`), served from `https://<owner>.github.io/<repo>/<shell>/`. A `.nojekyll` marker sits at the branch root.
- **Publish command:** `npm run deploy` in each shell (builds first, then deploys that shell); `npm run deploy -- <name>` overrides the subdirectory name.
- **Not affected:** application source, build config (`vite.config.ts`), and any non-deploy tooling. The build still runs locally on the VPN because it needs `@rdc-npm/rdc-ui-v4` from internal Artifactory.
