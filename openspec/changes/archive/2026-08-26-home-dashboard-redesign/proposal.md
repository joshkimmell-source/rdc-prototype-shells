## Why

The agent-vision Home dashboard was colour-forward and chart-heavy — a floating KPI bar, boxed charts, stage filters, and a client table — competing with the rest of the book of business for attention rather than surfacing the one thing that actually needs a decision each morning: which leads are ready to become clients. This change replaces it with one focal point (a hero built from the ready-to-promote lead count) plus the rest of the book of business as plain, borderless lists. Two smaller, unrelated cleanups shipped in the same commit and are captured here too: the Clients/Tours header subtitle was redundant with information now shown elsewhere, and the navigation rail's collapsed logo and item spacing read as cramped.

## What Changes

- Redesign the agent-vision Home dashboard (replacing the earlier KPI-bar/chart/table dashboard — only the "Lead sources" chart and the client table are dropped for good; everything else is restructured):
  - A borderless hero: a greeting eyebrow, a headline built from the ready-to-promote lead count (or "You're all caught up"), beside a dark stat box carrying the other three headline stats (Active clients, Upcoming tours, Invites pending).
  - The hero switches to a compact, stacked treatment at its own 1040px breakpoint — narrower than the shell's 768px mobile breakpoint, because the headline beside the fixed-width stat box starts wrapping well above 768px.
  - "Qualified leads" (up to 4, ready-to-work first, with a "View all" link to the full Leads list) and "Client needs" (with a per-row Ask RealAssist action) render as boxed cards side by side.
  - The rest of the book of business — "Client pipeline", "Saved homes by client", "Upcoming tours" — renders borderless, sharing one grid: pipeline and saved-homes side by side, upcoming tours spanning beneath (one column on mobile).
  - Home's (and Leads') page background changes from white to the canvas color, header included.
- Remove the Clients and Tours header subtitle in both `agent-web` and `agent-vision`; move the Tours date to render beside the framed map's own Vertical/Horizontal layout switcher instead (visible even when the switcher itself is hidden on narrow widths). `agent-vision` drops its header subtitle everywhere (Home, Leads, Clients, Search, and Tours never show one now); `agent-web` keeps Home's "N clients" subtitle and drops it everywhere else.
- Widen the navigation rail's item spacing and enlarge its collapsed logo, in both `agent-web` and `agent-vision`.

## Capabilities

### Added Capabilities
- `home-dashboard`: the agent-vision Home dashboard's hero, boxed Qualified-leads/Client-needs cards, and borderless book-of-business grid.

### Modified Capabilities
- `main-header`: the header's count-label behavior changes — agent-web shows one only on Home; agent-vision shows none.
- `navigation-rail`: adds an explicit requirement for rail item spacing and collapsed-logo size, previously ungoverned.

## Impact

- **Affected code (agent-vision):** `agent-vision/src/screens/HomeScreen.tsx` (full redesign), `agent-vision/src/Shell.tsx` (`countLabel`, canvas background for Home/Leads), `agent-vision/src/components/NavRail.tsx` (spacing/logo), `agent-vision/public/tours-map.html` (tour date beside the layout switcher).
- **Affected code (agent-web):** `agent-web/src/Shell.tsx` (`countLabel`), `agent-web/src/components/NavRail.tsx` (spacing/logo), `agent-web/public/tours-map.html` (tour date beside the layout switcher). agent-web has no Home-dashboard redesign — its Home screen is unaffected.
- **Not affected:** the Leads workspace's own content (only its page background changes); Search's header (already had no subtitle); the assistant panel, routing, and any data/API surface.
