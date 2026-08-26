## Context

See `proposal.md` — Why. The workspace held three prototype shells: `agent-web`, `agent-vision`, and `consumer-web`. `consumer-web` was added early (see the archived `2026-08-07-responsive-shell-and-consumer-web` change, which gave it its own `.claude/launch.json` entry on port `5176` with `--strictPort` and seeded it from the shared fictional sample dataset). Since then the active RealAssist+ work has consolidated into `agent-web` and `agent-vision`, and `consumer-web` fell out of use. Its continued presence still shaped the rest of the workspace: `.claude/launch.json` listed it, `.claude/skills/inject-dummy-data/SKILL.md` counted "three" shells and named `consumer-web/src/Shell.tsx`'s `SAMPLE_LISTINGS`, and the `agent-web`/`agent-vision` Vite and Playwright configs carried comments explaining that a `5173→5174` port walk would collide specifically with `consumer-web`.

## Goals / Non-Goals

**Goals:**
- Remove the `consumer-web` shell and every reference to it, so the workspace cleanly reflects the two shells in use (`agent-web`, `agent-vision`).
- Leave `agent-web` and `agent-vision` behaviorally unchanged — touch only the comments that named `consumer-web`, not the fixed-port mechanism itself.
- Keep the sample-data skill accurate: two shells, not three.

**Non-Goals:**
- No migration of `consumer-web` content into another shell — it is deleted, not merged.
- No change to the fixed-port / `PORT`-handoff behavior in the two remaining shells; only the explanatory comments change.
- No change to `agent-web` or `agent-vision` source, screens, or components.

## Decisions

**Decision: Delete the whole `consumer-web/` tree rather than archive or stub it.**
The shell is unused and its content (four-listing prototype, later seeded from the shared dataset) is fully superseded by `agent-web`/`agent-vision`. Removing it outright keeps the workspace honest about what exists.
- Why: A stubbed or commented-out shell would still need installing, launching, and syncing, and would keep leaking `consumer-web` references into config and docs. Git history preserves it if it is ever needed again.

**Decision: Reword the port-collision comments generically instead of deleting them.**
The comments in the two shells' `vite.config.ts` and `playwright.config.ts` explain a real, still-relevant hazard — that Vite silently walks `5173→5174` when `5173` is taken, so the port is pinned explicitly. Only the clause naming `consumer-web` as the specific colliding shell is now wrong.
- Why: The workaround still matters when two shells run side by side; the comment should survive, just without a dangling reference to a deleted shell. It now reads "…would collide with another shell's dev server."
- Alternative considered — delete the comments entirely: rejected, because the explanation of the `PORT` handoff is still useful to the next reader.

**Decision: Update the sample-data skill's counts and constants list.**
`SKILL.md` is edited so "three" shells becomes "two", "all three" becomes "both", and the `consumer-web/src/Shell.tsx` (`SAMPLE_LISTINGS`) bullet is dropped from the constants the skill grep-checks.
- Why: The skill instructs a reader to pick and populate a shell; an accurate shell count and constants list prevents it from offering or hunting for a shell that no longer exists.

**Decision: Remove the `consumer-web` launch entry, keep `agent-web`.**
`.claude/launch.json` drops the `consumer-web` block (port `5176`); `agent-web` remains with its `autoPort` behavior.
- Why: Launch config should list only shells that exist.

## Risks / Trade-offs

- **A lingering reference is missed** → a stale mention of `consumer-web` could remain in config, docs, or comments. Mitigation: grep the repo for `consumer-web` after the deletion and confirm only historical OpenSpec archive records (which intentionally describe past state) still mention it.
- **Loss of the shell's content** → deleting the tree removes the only working copy in the tree. Mitigation: the shell remains fully recoverable from git history; it is unused and superseded, so the trade-off is acceptable.
- **Comment reword drifts from behavior** → the generic wording must still describe the actual `5173→5174` hazard. Mitigation: the reworded comments keep the concrete port-walk detail and only generalize which shell would be on the other end.

## Migration Plan

Pure removal and documentation/comment cleanup with no data or API migration and no runtime change to the surviving shells. Apply the deletion and edits, reinstall/rebuild `agent-web` and `agent-vision` as normal, and confirm both still launch and pass their Playwright configs. Rollback is a straight revert restoring the `consumer-web/` tree, its launch entry, and the original comments/skill text.
