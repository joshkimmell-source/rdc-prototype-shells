# Client Web Shell

Prototype environment for realtor.com PRO client web — desktop, light top bar + persistent left sidebar nav.

## What's in the shell

- **Top bar** — realtor.com PRO logo (left), account avatar (right)
- **Left sidebar** (240px, light) — `SideNavigation` with a top-level Dashboard item plus expandable Team / Leads / Listings groups (Team is expanded by default to Agents / Staff)
- **Agent detail screen** — breadcrumb, agent identity (avatar + name), contact row (phone / email / location), `Tabs` (Proposal templates / Lead routing / Performance), and a filter row (Market VIP, Last 30 days, More filters)
- **Footer** — About us / Media room, legal links, NAR copyright

The default screen mirrors an agent profile page under the Team → Agents view. It's a representative surface, not every PRO screen — swap the content for your prototype.

## Start prototyping

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`. Set your browser to at least 1024px wide for accurate layout.

> The `dev`/`build` scripts run `panda codegen && panda cssgen --outfile src/panda.css` before Vite. If the shell ever renders unstyled, the server was started before a config change — restart it so `src/panda.css` regenerates.

## How to add your prototype content

Edit `src/Shell.tsx`. The shell is organized into clear sections:

1. **`AgentDetailScreen`** — the default content surface; replace or extend it with your prototype screen(s)
2. **`CONTACT` / `TABS`** — replace the agent's contact rows and tab set
3. **Navigation model** — the `SideNavigationItem` / `SideNavigationGroup` tree inside `Shell`; adjust nav items and wire `activePage` to swap screens

Keep the top bar, `SideNavigation` sidebar, and `ShellFooter` in place. Build inside the content area.

## Stack

- React 18 + TypeScript
- **Panda CSS** for tokens and layout — `css()`, `cva()` from `styled-system/css`; `hstack()`, `vstack()` from `styled-system/patterns`
- `@rdc-npm/rdc-ui-v4` — `SideNavigation`, `SideNavigationItem`, `SideNavigationGroup`, `Breadcrumbs`, `Tabs`, `Avatar`, `Button`, `Link`, and icons/logos from `@rdc-npm/rdc-ui-v4/illustrations`

No `RdcUiThemeProvider` needed — tokens are generated at build time. Do NOT use `styled-components`, `rdcUiTheme`, or Tailwind color utilities; custom styling uses Panda semantic tokens (`bg.base`, `text.base`, `border.base`, etc.).

## Surface rules

- **Min-width**: 1024px — client web is desktop-first, no mobile breakpoints (use `client-mobile` for the mobile browser surface)
- **Sidebar**: always visible; `SideNavigation` handles active states, expand/collapse groups, and keyboard navigation
- **Primary action / filters**: page-level controls sit in the content area, top of the active tab panel
- **Color**: semantic Panda tokens only — no hardcoded hex, no Tailwind color classes
