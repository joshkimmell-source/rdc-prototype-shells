## 1. agent-web prototype shell

- [x] 1.1 Scaffold `agent-web/` as a Vite + React + TypeScript app on Haven (`@rdc-npm/rdc-ui-v4`) styled with Panda CSS (`panda.config.ts`, `postcss.config.cjs`, `dev`/`build` run `panda codegen && panda cssgen` first). Verify `npm install` (on the VPN, via the `@rdc-npm` Artifactory scope) then `npm run dev` serves the shell at `http://localhost:5173`.
- [x] 1.2 Port the RealAssist+ content-orchestration flow from `ContentOrchestrationShell.dc.html`: `src/Shell.tsx` root, `src/screens/` (Home, Clients, Search, Tours), `src/panels/` (AssistantPanel, ThreadsList), `src/components/` (NavRail, Subnav, MainHeader, FAB, Menu, primitives, ImageSlot, ResizeHandle), `src/theme.ts`, `src/data.ts`, `src/icons.tsx`. Verify the shell renders the flow.
- [x] 1.3 Replace `window.claude.complete(...)` with `src/assistant.ts`, a local rule-based responder reproducing the same contract (plain-text replies plus `show_client_card` and `schedule_tour` cards) that defers to a host-injected `window.claude.complete` when present. Verify the assistant responds and renders both card types.
- [x] 1.4 Add `scripts/bundle-single-file.mjs` and `npm run bundle` to inline the built CSS/JS, referenced SVGs, and Haven stylesheet into one self-contained `upload/index.html` for RealPrototypes. Verify the single-file artifact renders standalone.

## 2. Sibling shells

- [x] 2.1 Add `client-web/` and `consumer-web/` as Vite + React + Panda surfaces sharing the same structure. Verify each builds.
- [x] 2.2 Use only fictional contact details in `client-web` — the `555-01xx` fictional-use block and an RFC 2606 reserved domain — so no placeholder can reach a real person. Verify no real phone number or domain appears.

## 3. Public-repo hardening

- [x] 3.1 Gitignore the licensed Galano Grotesque Alt `.otf` binaries and load the faces from the public `static.rdc.moveaws.com` CDN in the Haven stylesheet and `dev.html`. Verify rendering is unchanged and the single-file bundle drops from ~1.3MB to 659KB.
- [x] 3.2 Set `base: './'` in `agent-web/vite.config.ts` so the build works under the Pages `/<repo>/` subpath and at a domain root. Verify assets resolve under a subpath.
- [x] 3.3 Add `.npmrc.example` documenting the `@rdc-npm` Artifactory registry scope. Verify the scope resolves on the VPN.

## 4. Panda token access

- [x] 4.1 Import `token` from `styled-system/tokens` and replace the raw `var(--colors-bg-base)`, `var(--colors-bg-alternate, …)`, and `var(--shadows-lifted)` strings in `agent-web/src/components/NavRail.tsx` with `token('colors.bg.base')`, `token('colors.bg.alternate', C.alt)`, and `token('shadows.lifted')`. Verify the NavRail background, active background, and lifted shadow still render.
- [x] 4.2 Do the same for `var(--colors-bg-inverse)` and `var(--colors-border-base)` in `consumer-web/src/FilterDrawer.tsx`. Verify the drawer renders.
- [x] 4.3 Confirm `lint:panda` (`no-inline-panda-var`) is clean across all three shells, `tsc` is clean, and all three build.

## 5. GitHub Pages deploy script

- [x] 5.1 Add `agent-web/scripts/deploy-pages.mjs` and `npm run deploy`: build locally, copy `dist/dev.html` to `index.html`, write `.nojekyll`, and force-push `dist/` to the `gh-pages` branch from a detached worktree in a temp dir, leaving the working tree and current branch untouched. Verify a deploy publishes to the Pages URL.
- [x] 5.2 Never publish font binaries: filter blocked extensions (`.otf`/`.ttf`/`.woff`/`.woff2`) when copying `dist/` into the worktree, and abort the deploy (non-zero exit) if a blocked file would be staged anyway. Verify no font binary reaches the `gh-pages` branch and the guard fails loudly if the filter is bypassed.
- [x] 5.3 Stage the orphan under a `gh-pages-staging` scratch branch and push it to `gh-pages` by refspec, and `git branch -D gh-pages-staging` both before the run and in the `finally` block, so consecutive deploys work even after a run dies before cleanup. Verify two deploys in a row both succeed.

## 6. Repo config

- [x] 6.1 Gitignore `.claude/settings.local.json`, scoped to the one file so `.claude/skills/` and a shared `settings.json` stay tracked. Verify the local settings file is ignored and the skills directory is not.
- [x] 6.2 Add `.claude/launch.json` recording `agent-web` → `npm --prefix agent-web run dev` on port `5173` so the shell can be started by name. Verify tooling can launch `agent-web` from the config.

## 7. Verification

- [x] 7.1 Verify all three shells build and `lint:panda`/`tsc` are clean.
- [x] 7.2 Verify the repo is safe to be public: no licensed font binaries tracked or published, no real contact details, `settings.local.json` ignored.
