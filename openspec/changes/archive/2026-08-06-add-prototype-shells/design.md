## Context

See `proposal.md` — Why. The RealAssist+ content-orchestration flow existed only as `ContentOrchestrationShell.dc.html`, a single document that depends on the Claude Design authoring runtime (`window.claude.complete(...)`) and cannot be served standalone. To run end-to-end user testing it had to become a real web app on the same design system the product uses: Haven (`@rdc-npm/rdc-ui-v4`) styled with Panda CSS, built with Vite + React + TypeScript. Two facts constrain the delivery. First, the `@rdc-npm` scope resolves only from internal Artifactory, so `npm install` needs the VPN and GitHub Actions runners cannot build the app at all. Second, the repo is public, and the Galano Grotesque Alt faces Haven uses are licensed binaries that must never be committed or served from it. The same commit added two sibling surfaces, `client-web` and `consumer-web`, that share the Vite + React + Panda structure.

## Goals / Non-Goals

**Goals:**
- Stand up a runnable, shareable prototype shell (`agent-web`) faithful to the DC original but standalone, on Haven + Panda, so testers can use the real flow at a public URL.
- Make deployment work given that CI cannot build the app, without touching the working tree or the current branch, and without ever publishing licensed font binaries.
- Keep the repo safe to be public: no licensed binaries, no real contact details, correct base path for a subpath deploy.
- Access Panda tokens in a way that survives a consumer build's tree-shaking.

**Non-Goals:**
- No CI build/deploy workflow (impossible without Artifactory access from runners).
- No change to the Haven design system, its tokens, or the `@rdc-npm` packages themselves.
- No product or service code — these are prototypes for user testing, not shipped surfaces.
- Not committing or bundling the licensed font binaries under any path.

## Decisions

**Decision: Port the DC shell to a standalone Vite + React + TypeScript app on Haven via Panda CSS.**
Rebuild `ContentOrchestrationShell.dc.html` as `agent-web`, replacing `window.claude.complete(...)` with a local rule-based `src/assistant.ts` that reproduces the same contract (plain-text replies plus the `show_client_card` / `schedule_tour` cards), and add `npm run bundle` to inline the build into one `index.html` for RealPrototypes.
- Why: A standalone app on the product's own design system runs anywhere, is shareable for user testing, and keeps the prototype visually faithful to production.
- Alternative considered — keep serving the `.dc.html` document: rejected, it cannot run outside the Claude Design authoring runtime, so it is not testable or deployable on its own.

**Decision: Deploy `agent-web` with a local Node script that pushes only the compiled `dist/` to `gh-pages` from a detached worktree.**
`scripts/deploy-pages.mjs` runs the build locally (on the VPN), copies `dev.html` to `index.html`, writes `.nojekyll`, and force-pushes the output to the `gh-pages` branch from a temp-dir worktree; `vite.config.ts` uses `base: './'` for the Pages subpath.
- Why: Actions runners cannot reach internal Artifactory, so CI cannot build the app; building locally and publishing only the artifact is the only path to a public URL. The detached worktree keeps the working tree and current branch untouched, and a fresh orphan branch each deploy keeps repo history from growing with build artifacts.
- Alternative considered — a GitHub Actions Pages workflow: rejected, the `@rdc-npm` install fails on runners that cannot reach Artifactory.

**Decision: Never commit or publish the licensed font binaries; load the faces from the public CDN, and enforce it in the deploy script.**
Gitignore the `.otf` binaries and defend the public branch in `deploy-pages.mjs`: filter blocked extensions (`.otf`/`.ttf`/`.woff`/`.woff2`) when copying into the worktree, and abort the deploy if a blocked file would be staged anyway.
- Why: The repo is public and root `.gitignore` does not cover the `gh-pages` branch, so `dist/` (which Vite fills with any local font copies) was briefly served publicly. The stylesheet already loads the same faces from `static.rdc.moveaws.com`, so excluding them changes nothing visually while removing the licensing exposure; the abort guard is belt-and-braces against a future refactor breaking the filter.
- Alternative considered — rely on root `.gitignore` alone: rejected, it does not protect the `gh-pages` branch that `dist/` is copied to.

**Decision: Access Panda tokens via `token('…')`, not hand-written `var(--…)` strings.**
Replace `var(--colors-bg-base)`, `var(--colors-bg-alternate)`, `var(--shadows-lifted)` in `NavRail.tsx` (and `var(--colors-bg-inverse)`, `var(--colors-border-base)` in `FilterDrawer.tsx`) with `token('colors.bg.base')` etc.
- Why: Panda only emits a CSS variable for a token it can statically see being used, so a hand-written `var()` reference is tree-shaken out of a consumer build and the property silently falls back to nothing; these files rendered correctly only incidentally because the same tokens happened to be used elsewhere. `token()` resolves through the alias chain and registers the token as used, guaranteeing the variable is emitted.
- Alternative considered — keep the raw `var(--…)` strings: rejected, `lint:panda`'s `no-inline-panda-var` rule flags them and the correct rendering is not guaranteed.

**Decision: Stage the deploy under a scratch branch and clean it up on both ends.**
Build the orphan under `gh-pages-staging`, push it to `gh-pages` by refspec, and `git branch -D gh-pages-staging` both before the run and in the `finally` block.
- Why: `checkout --orphan gh-pages` fails on the second deploy once the branch exists locally, and a run that dies before cleanup leaves the scratch branch behind and blocks the next `checkout --orphan`; deleting it up front and in `finally` makes consecutive deploys reliable.

**Decision: Track the launch invocation in `.claude/launch.json`; ignore only `settings.local.json`.**
Record `agent-web` → `npm --prefix agent-web run dev` on port `5173` in `.claude/launch.json`, and gitignore `.claude/settings.local.json` scoped to that one file.
- Why: The launch config is repo-relative project config that travels with a clone, so it belongs in tracked `.claude/`; `settings.local.json` collects local absolute paths and granted tool permissions, which must not ship in a public repo. Scoping the ignore to the one file keeps `.claude/skills/` and a shared `settings.json` tracked.

## Risks / Trade-offs

- **A licensed font binary leaking to the public `gh-pages` branch** — the original exposure. Mitigation: gitignore the binaries, filter blocked extensions when copying into the worktree, and abort the deploy if one would be staged; the faces load from the public CDN so nothing regresses visually.
- **No CI build means no automated verification of the deploy** — the app can only be built on the VPN. Mitigation: the script guards its preconditions (fails if `dist/dev.html` is missing) and runs the build via `npm run deploy`.
- **A dead scratch branch blocking the next deploy** — a run that dies mid-flight leaves `gh-pages-staging` behind. Mitigation: delete it up front and in `finally`, and prune the worktree in `finally`.
- **Incidental token emission masking a real bug** — a raw `var()` renders only while some other usage happens to emit the variable. Mitigation: use `token()` everywhere and keep `lint:panda` clean across all three shells.
- **Wrong base path on Pages** — assets 404 under the `/<repo>/` subpath. Mitigation: `vite.config.ts` sets `base: './'`, which works at a subpath and at a domain root.

## Migration Plan

New workspace with no data or API migration. Consumers install with the internal `@rdc-npm` scope on the VPN (`.npmrc.example` documents the registry) and run `npm run dev`; `agent-web` is published with `npm run deploy` from the VPN. Rollback is deleting the workspace directories and reverting the repo-config additions; the `gh-pages` branch is a disposable build artifact that each deploy overwrites.
