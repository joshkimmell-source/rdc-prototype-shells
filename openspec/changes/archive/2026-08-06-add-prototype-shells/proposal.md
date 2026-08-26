## Why

End-to-end user testing of the RealAssist+ content-orchestration flow needed a runnable app, but the flow only existed as `ContentOrchestrationShell.dc.html` — a single document tied to the Claude Design authoring runtime, which cannot be served on its own. To put the flow in front of testers it had to become a real, standalone, shareable web app built on the same design system the product uses. That means a Vite + React + TypeScript prototype shell on Haven (`@rdc-npm/rdc-ui-v4`) via Panda CSS, deployable to a public URL. Two constraints shaped everything: the `@rdc-npm` scope resolves only from internal Artifactory (so CI runners cannot build it), and the licensed Galano Grotesque font binaries must never be committed or served because the repo is public.

## What Changes

- Add a prototype-shell workspace built on Vite + React + TypeScript + Haven (`@rdc-npm/rdc-ui-v4`) via Panda CSS. `agent-web` is the primary shell — the agent-facing RealAssist+ content-orchestration surface — alongside `client-web` (client/PRO) and `consumer-web` (consumer) surfaces.
- Port `agent-web` from `ContentOrchestrationShell.dc.html`: `src/assistant.ts` is a local rule-based responder that reproduces the `window.claude.complete(...)` contract (plain-text replies plus `show_client_card` / `schedule_tour` cards), and `npm run bundle` produces a single self-contained `index.html` for RealPrototypes uploads.
- Make `agent-web` publishable to GitHub Pages via `npm run deploy`. Because Actions runners cannot reach internal Artifactory, `scripts/deploy-pages.mjs` builds locally (on the VPN) and force-pushes only the compiled `dist/` to the `gh-pages` branch from a detached worktree, leaving the working tree and current branch untouched. `vite.config.ts` sets `base: './'` so the build works under the Pages `/<repo>/` subpath as well as at a domain root.
- Prepare the repo to be public: gitignore the licensed Galano Grotesque Alt `.otf` binaries (the Haven stylesheet and `dev.html` load the same faces from the public `static.rdc.moveaws.com` CDN, so rendering is unchanged and the single-file bundle drops from ~1.3MB to 659KB); use the `555-01xx` fictional-use block and an RFC 2606 reserved domain for `client-web` contact details.
- Access Panda tokens through `token('…')` (imported from `styled-system/tokens`) instead of hand-written `var(--colors-…)` / `var(--shadows-…)` strings, so Panda registers the token as used and always emits the variable rather than tree-shaking it out of a consumer build.
- Harden the deploy script so it never publishes font binaries — filter blocked extensions (`.otf`/`.ttf`/`.woff`/`.woff2`) when copying into the worktree, and abort the deploy if one would be staged anyway — and so consecutive deploys work by staging the orphan under a `gh-pages-staging` scratch branch pushed by refspec, deleting that scratch branch both up front and in the `finally` block.
- Gitignore `.claude/settings.local.json` (scoped to the one file so `.claude/skills/` and a shared `settings.json` stay tracked), and add `.claude/launch.json` so the shells can be started by name (`agent-web` → `npm --prefix agent-web run dev` on Vite's default port `5173`).

## Capabilities

### New Capabilities
- `prototype-shells`: The runnable prototype-shell workspace used for end-to-end user testing — the `agent-web` Vite + React + Panda shell (with the `client-web` and `consumer-web` sibling surfaces), the GitHub Pages deploy script that publishes it without leaking font binaries, and the launch config that starts it by name.

### Modified Capabilities
<!-- None. New workspace; this behavior is introduced as a new capability spec. -->

## Impact

- **New shell (agent-web):** `agent-web/` — Vite + React + TS + Panda app (`src/Shell.tsx`, `src/screens/`, `src/panels/`, `src/components/`, `src/assistant.ts`, `src/theme.ts`, `src/data.ts`), `public/` assets (rail/FAB SVGs, Leaflet map pages, Haven CSS), `package.json`, `panda.config.ts`, `README.md`, `dev.html`.
- **Deploy / packaging:** `agent-web/scripts/deploy-pages.mjs` (local build → `gh-pages` from a detached worktree; font-binary filter + abort guard; `gh-pages-staging` scratch branch), `agent-web/scripts/bundle-single-file.mjs` (single-file `index.html`), `agent-web/vite.config.ts` (`base: './'`, `dev.html` template).
- **Sibling shells:** `client-web/` and `consumer-web/` (Vite + React + Panda surfaces added by the same commit).
- **Panda tokens:** `agent-web/src/components/NavRail.tsx` (`colors.bg.base`, `colors.bg.alternate`, `shadows.lifted`) and `consumer-web/src/FilterDrawer.tsx` (`colors.bg.inverse`, `border.base`) — raw `var(--…)` strings replaced with `token('…')` from `styled-system/tokens`.
- **Repo config:** root `.gitignore` (font binaries; `.claude/settings.local.json`), `.npmrc.example` (`@rdc-npm` Artifactory scope), `.claude/launch.json` (launch config).
- **Not affected:** no product/service code; this is a standalone prototype workspace and repo configuration.
