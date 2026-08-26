## Context

See `proposal.md` — Why. The `prototype-shells` workspace was created (see the `add-prototype-shells` change) with `agent-web` as the primary RealAssist+ content-orchestration surface and two sibling surfaces, `client-web` and `consumer-web`, all sharing the same Vite + React + TypeScript + Haven (`@rdc-npm/rdc-ui-v4`) / Panda structure; `agent-vision` was added later. `client-web` never moved past its initial scaffold: it is not deployed, not exercised in user testing, and its only reference outside its own directory is the `inject-dummy-data` skill doc, which named it as an injection target and pointed at its `src/Shell.tsx` constants (`CONTACT` and the `AgentDetailScreen` identity block). Because the commit that removes it needed to touch only that one non-`client-web` file, the doc was the sole cross-reference to the shell.

## Goals / Non-Goals

**Goals:**
- Remove the `client-web` shell and every reference to it so the workspace reflects only the shells that are actually used.
- Keep the enumerations of shells accurate — specifically the `inject-dummy-data` skill doc's target-shell list and its per-shell constants list.

**Non-Goals:**
- No change to the remaining shells (`agent-web`, `agent-vision`, `consumer-web`), their code, or their runtime behavior.
- No change to the deploy script (`deploy-pages.mjs`) or launch config (`.claude/launch.json`) — neither referenced `client-web`.
- No product or service code changes.

## Decisions

**Decision: Delete the whole `client-web/` directory rather than deprecate or empty it.**
Remove every file under `client-web/` (scaffold, `src/`, config, and `package-lock.json`) in one commit.
- Why: The shell has no consumers and no deploy path, so there is nothing to preserve. Leaving an empty or deprecated directory would still require installing and vetting it for the public repo and would keep it in tooling and doc enumerations. A clean delete is the simplest end state and is trivially reversible from git history.
- Alternative considered — keep the directory but mark it deprecated: rejected, it retains the maintenance and public-repo surface for no benefit.

**Decision: Refresh the `inject-dummy-data` doc's shell list to the shells that actually exist.**
Change the doc's "this repo has three" list from `agent-web`, `client-web`, `consumer-web` to `agent-vision`, `agent-web`, `consumer-web`, and delete the bullet pointing at `client-web/src/Shell.tsx` constants.
- Why: The doc is the only place that named `client-web`; leaving it would send the skill to inject data into a shell that no longer exists. Refreshing the list to the real shells keeps the skill correct. The doc already tells readers to verify by grepping rather than trusting the list, so the constants bullet for a deleted shell is pure noise.
- Alternative considered — only remove the `client-web` entries and leave the remaining list as-is (`agent-web`, `consumer-web`): rejected, the list would then omit `agent-vision`, which is a real shell; refreshing it to all three existing shells is more accurate.

## Risks / Trade-offs

- **A dangling reference to `client-web` left elsewhere** — a script, launch config, or doc could still point at the removed shell. Mitigation: the removal commit needed to change only `.claude/skills/inject-dummy-data/SKILL.md` outside `client-web/` itself, confirming the doc was the sole cross-reference; a repo-wide grep for `client-web` after the change should return nothing.
- **Losing scaffold that might be wanted later** — a future client/PRO surface would have to be re-created. Mitigation: the deleted files remain in git history and can be restored by revert; the shell was only an unused scaffold, so there is little to lose.

## Migration Plan

Delete-only change with no data or API migration. Removing `client-web/` and refreshing the skill doc requires no build or deploy step for the remaining shells, which are untouched. Rollback is a straight `git revert` of the removal commit, which restores the `client-web/` directory and the prior doc text.
