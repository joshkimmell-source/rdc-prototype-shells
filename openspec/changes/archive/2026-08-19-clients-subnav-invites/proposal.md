## Why

The Clients subnav previously exposed only two ad-hoc tabs (Active / Requests) built on a custom `Tab` primitive, and its counts and list did not consistently reflect the true per-category totals — the list rendered the whole roster regardless of the selected tab. At the same time, when an agent invited a lead to become a connected client there was nowhere in the Clients surface for that new "Invited" relationship to land, so the invite had no visible home. The Clients surface needs a proper set of subnav tabs that segment clients by relationship status, and inviting a lead needs to produce an "Invited" client that surfaces in that segmentation.

## What Changes

- Replace the custom `Tab` primitive in the Clients subnav with Haven's `Tabs` component, presenting three tabs that segment the Clients surface by relationship status: **Active**, **Invited**, and **Requests**. Each tab shows its true per-category count in parentheses.
- Filter the client list to the selected tab: only clients whose status matches the active tab are shown, still honoring the search query. Empty states distinguish "No clients match your search." (with a query) from "No clients in this list." (empty category).
- Size the tabs compactly to match the Tours subnav, and style resting (inactive) tab text at `text.alternate` while the active tab darkens to `text.base`.
- Pin the agent's own feed row above the search input, separate from the tabbed client list below it.
- Add a lead-invite affordance (agent-vision): inviting a lead creates an "Invited" client from the lead's info and persists it to `sessionStorage`, so it survives a reload within the session and surfaces in the Clients subnav's **Invited** tab as well as the Home/Clients data.
- Apply the same subnav to **both** shells — `agent-vision` and `agent-web`. Because `agent-web` has no leads feature, its subnav simply receives the full client roster; the invite-to-Invited-client flow is agent-vision only.
- Accompanying copy/UI polish carried in the same commits: rename user-facing "RDC+" to "Realtor.com+", set Priyanka Raman's client status to Active, restyle the Leads table header to match the Clients table header, soften the Lead Detail promote-to-client copy, surface "Qualified leads (N)" with a "View all" link on Home, hide the client count in the main header, and convert remaining raw buttons to Haven v4 `Button` components.

## Capabilities

### New Capabilities
- `clients-subnav`: The Clients subnav shared by `agent-web` and `agent-vision` — its relationship-status tabs (Active / Invited / Requests), the per-tab filtering and counts, the pinned agent feed row, and the lead-invite affordance that produces an Invited client.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **Affected code (agent-vision):** `agent-vision/src/components/Subnav.tsx` (Haven `Tabs`, `CLIENT_TAB_STATUS` map, per-tab filtering, `BuyerRow`, pinned agent feed row); `agent-vision/src/Shell.tsx` (three-value `clientTab` state, `sessionStorage`-backed invited-lead ids, `allBuyers` roster including session-invited clients, `sendInvite` persistence); `agent-vision/src/data.ts` (`Buyer.status`); `agent-vision/src/data/sample/adapters.ts` (status mapping, "Realtor.com+" copy); `agent-vision/src/components/InviteModal.tsx`, `LeadDetailScreen.tsx`, `LeadsScreen.tsx`, `HomeScreen.tsx` (copy/UI polish); `agent-vision/src/components/primitives.tsx`, `icons.tsx`.
- **Affected code (agent-web):** `agent-web/src/components/Subnav.tsx` (identical subnav structure); `agent-web/src/Shell.tsx` (three-value `clientTab` state, full `BUYERS` roster passed through); `agent-web/src/data.ts`, `data/sample/adapters.ts`, `components/primitives.tsx`, `icons.tsx` (mirrored).
- **Session state:** invited-lead ids are stored under `ra-invited-leads` in `sessionStorage` (agent-vision only) — a prototype mutation that survives reload within the tab and is cleared on a fresh session.
- **Styling:** inline `style` objects plus Haven `Tabs`/`Button` components and theme tokens (`C.sub`/`C.dark` for resting/active tab text); no new stylesheet or styling paradigm introduced.
- **Not affected:** the navigation rail, the Tours subnav rows (only their raw `<button>` → `HoverButton` swap), and non-Clients surfaces beyond the listed copy/UI polish.
