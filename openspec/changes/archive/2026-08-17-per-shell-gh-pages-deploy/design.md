## Context

See `proposal.md` — Why. Each shell publishes to GitHub Pages with a local `scripts/deploy-pages.mjs` rather than a GitHub Actions workflow, because the build needs `@rdc-npm/rdc-ui-v4` from internal Artifactory, which Actions runners cannot reach — so the build runs locally on the VPN and only the compiled `dist/` is pushed. The original script committed with a detached temp worktree (never touching the working tree or current branch), but it did so by `checkout --orphan` on a scratch branch, copying all of `dist/` to the branch root, and `push --force`-ing to `gh-pages`. That force-push replaced the whole branch on every deploy, so exactly one shell could live on Pages at a time; a second shell's deploy wiped the first. `agent-web` and `agent-vision` carried near-identical copies of this script.

## Goals / Non-Goals

**Goals:**
- Let one repo serve multiple prototype shells side by side on GitHub Pages by giving each shell its own subdirectory (`gh-pages/<shell>/`).
- Make each deploy an overlay: replace only the deploying shell's subdirectory and leave every other shell's folder and the branch root untouched.
- Stop force-pushing / orphaning the branch so published history and siblings survive each deploy.
- Keep the script shell-agnostic and identical across both shells, defaulting the subdirectory to the project folder name.
- Preserve the existing font-binary filter, refuse-to-publish guard, and detached-worktree isolation.

**Non-Goals:**
- Not moving the deploy into GitHub Actions or otherwise changing where/how the build runs (still local, on the VPN, via `npm run deploy`).
- Not changing application source, `vite.config.ts`, or the build output itself.
- Not preserving `gh-pages` commit history as meaningful — it remains a build-artifact branch; the change is about not destroying sibling output, not about history value.

## Decisions

**Decision: Publish into a per-shell subdirectory named after the project folder.**
The target subdirectory defaults to `basename(root)` (`agent-vision`, `agent-web`) and can be overridden with the first CLI arg (`npm run deploy -- <name>`). The name is validated against `^[a-z0-9][a-z0-9._-]*$` and the script exits if it fails.
- Why: A predictable per-shell path (`<owner>.github.io/<repo>/<shell>/`) is what lets shells coexist, and defaulting to the folder name keeps the two scripts byte-identical. Validating the name to a single path segment prevents an arg like `../` or `foo/bar` from escaping into a sibling path or the branch root and clobbering other shells.

**Decision: Overlay onto the existing published tree instead of orphaning.**
Fetch `origin gh-pages`, add a **detached** worktree at `FETCH_HEAD` (the published tip), then `rmSync` and re-copy only `gh-pages/<shell>/` from the fresh `dist/`. Everything else in the tree — other shells' folders and the branch root — is left exactly as fetched.
- Why: Basing the commit on the current tip and touching only one subdirectory is what makes deploying one shell non-destructive to the others. Using a detached worktree (rather than a named/orphan branch) advances a detached HEAD that is pushed by refspec, so no local branch is created or mutated and the working tree stays clean.
- Alternative considered — keep orphaning but copy all shells each time: rejected. It would require every deploy to know about and rebuild every other shell, and a stale local copy would silently overwrite a sibling's newer output.

**Decision: Plain (non-force) push.**
Replace `push --force origin HEAD:gh-pages` with a plain `push origin HEAD:gh-pages`.
- Why: Because HEAD descends from the fetched published tip, a normal push fast-forwards the branch and preserves siblings' history. A force-push would reintroduce the clobbering this change exists to remove, and would also mask the case where the remote moved under us.

**Decision: Orphan-tree fallback for the first-ever deploy.**
If `fetch origin gh-pages` fails (the branch does not exist remotely yet), fall back to the original `checkout --orphan` + `rm -rf .` path to start an empty tree, then overlay the shell subdirectory onto it.
- Why: The overlay needs a committish to branch from; the first publish has none, so it must seed one.

**Decision: Skip the push when nothing changed.**
After staging, if `git status --porcelain` is clean, log that `gh-pages` is already up to date for this shell and exit 0 without committing or pushing.
- Why: Rebuilds are often byte-identical; a no-op deploy avoids empty commits and needless pushes.

**Decision: Keep the existing safeguards, moving `.nojekyll` to the branch root.**
Retain the `publishable` font-binary filter and the belt-and-braces refuse-to-publish guard that fails loudly rather than publish a licensed binary. Write `.nojekyll` at the branch root (not inside the shell subdirectory) so Jekyll is bypassed for the whole Pages site.
- Why: The subpath layout still relies on files/dirs beginning with `_`; the marker must cover the root that serves all shells.

## Risks / Trade-offs

- **Stale local view of `gh-pages` → sibling overwrite** — the overlay is based on `FETCH_HEAD` from a fresh fetch each run, so the deploy sees the current published siblings. Mitigation: always fetch immediately before adding the worktree; the non-force push fails rather than clobbers if the remote advanced.
- **Malicious/typo shell arg escaping the subdirectory** — an arg like `../other` could target a sibling path or the root. Mitigation: strict single-segment regex validation with an early exit.
- **Concurrent deploys of different shells racing the branch tip** — two overlays pushed at once could reject on the second push. Mitigation: the non-force push simply fails (rather than clobbering); re-run the losing deploy to re-fetch and retry.
- **Two scripts must stay in sync** — `agent-web` and `agent-vision` carry the same script. Mitigation: the script is shell-agnostic (subdirectory defaults to the folder name), so the two files are byte-identical and can be diffed for parity.

## Migration Plan

The two shells were migrated in sequence: `agent-vision` first (commit 1b12806), then `agent-web` adopting the same shell-agnostic script (commit 2f54eeb). The first deploy after the change lands on an existing single-app `gh-pages` uses the overlay path and preserves whatever is at the branch root, publishing the shell alongside it under `/<shell>/`; a brand-new repo with no `gh-pages` yet takes the orphan-tree fallback. No data or API migration is involved. Rollback is a straight revert of the two `deploy-pages.mjs` files (after which deploys revert to single-shell force-push behavior).
