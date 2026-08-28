## 1. Home dashboard redesign (agent-vision)

- [x] 1.1 Replace the KPI-bar/chart/table Home dashboard with a borderless hero (greeting eyebrow, ready-to-promote-lead headline, dark stat box with the other three stats) in `agent-vision/src/screens/HomeScreen.tsx`. Drop the "Lead sources" chart and the client table for good.
- [x] 1.2 Give the hero its own compact breakpoint (1040px) via `useIsHeroCompact`, independent of the shell's 768px mobile breakpoint. Verify the headline/stat-box row stacks at 1040px and the rest of the page still uses the normal mobile breakpoint.
- [x] 1.3 Render "Qualified leads" (up to 4, ready-to-work first then most recent, with a "View all" link) and "Client needs" (with a per-row Ask RealAssist action) as boxed cards side by side.
- [x] 1.4 Render "Client pipeline", "Saved homes by client", and "Upcoming tours" borderless on one shared grid — pipeline and saved-homes side by side, upcoming tours spanning beneath; one column on mobile.
- [x] 1.5 In `agent-vision/src/Shell.tsx`, change Home's and Leads' page background from white to canvas-colored (header included).

## 2. Header subtitle cleanup (agent-web + agent-vision)

- [x] 2.1 In both `Shell.tsx` files, drop the Clients listing-count and Tours date subtitle from the shared header's `countLabel`. agent-web keeps Home's "N clients"/"N of M clients" label; agent-vision's `countLabel` is now always empty.
- [x] 2.2 In both `public/tours-map.html` files, render the selected tour's date as its own element beside the Vertical/Horizontal layout switcher, kept visible even when the switcher itself is hidden below 768px.

## 3. Navigation rail spacing (agent-web + agent-vision)

- [x] 3.1 Widen the rail's item gap from 4px to 1rem and enlarge the collapsed logo (fixed 34×34px to auto-width, 3rem tall) in both `NavRail.tsx` files.

## 4. Documentation (this change)

- [x] 4.1 Add a new `home-dashboard` capability spec (agent-vision only) grounded in the current `HomeScreen.tsx` source.
- [x] 4.2 Update `main-header`'s count-label requirement to reflect the per-app split (agent-web: Home only; agent-vision: none).
- [x] 4.3 Add a rail item-spacing/collapsed-logo-size requirement to `navigation-rail`, previously ungoverned.
