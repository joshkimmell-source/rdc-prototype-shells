## Context

See `proposal.md` — Why. The Clients subnav (`Subnav.tsx`, the `ClientsSubnav` renderer) previously used a custom `Tab` primitive to show two tabs — `Active (activeCount)` and `Requests (requestsCount)` — with the counts passed down from `Shell.tsx` as props, plus a decorative "More tabs" chevron button. The client list below the tabs mapped over the entire `buyers` roster regardless of the selected tab, so the tab selection did not actually filter the list, and the counts were computed in the shell rather than off the roster the list renders. `agent-web/src/components/Subnav.tsx` and `agent-vision/src/components/Subnav.tsx` are near-identical; the shells differ in that agent-vision has a Leads feature (leads can be invited to become clients) and agent-web does not. Styling is done with inline `style` objects plus theme tokens (`C.sub` = text.alternate, `C.dark` = text.base), matching the rest of the shell.

## Goals / Non-Goals

**Goals:**
- Segment the Clients surface into relationship-status tabs — Active, Invited, Requests — using Haven's `Tabs` component, and actually filter the client list to the selected tab.
- Derive both the tab counts and the shown list from the same roster so they always agree, and keep them stable while searching.
- Pin the agent's own feed row above the search input, out of the tabbed list.
- Give an invited lead a home: inviting a lead creates an "Invited" client that appears under the Invited tab, persisted for the session so it survives a reload.
- Present the same subnav in both shells; keep the two `Subnav.tsx` files structurally identical.

**Non-Goals:**
- No new styling mechanism (no CSS files, styled-components, or Panda recipes) for the subnav.
- No server or real persistence for invited leads — the promotion is a prototype mutation, session-scoped only.
- No leads feature added to `agent-web`; its subnav simply receives the full roster.
- The broader copy/UI polish carried in the same commits (Realtor.com+ rename, Home "Qualified leads", Leads header restyle, etc.) is incidental and not part of this capability's behavior.

## Decisions

**Decision: Replace the custom `Tab` primitive with Haven's `Tabs`, sized to match the Tours subnav.**
The Clients tabs are now `Tabs` / `Tabs.List` / `Tabs.Trigger`. Haven's triggers default to a tall 48px/20px-padded shape, so inline overrides (`CLIENT_TABS_LIST_STYLE`, `CLIENT_TAB_TRIGGER_STYLE`) shrink them to the compact text tabs used on the Tours subnav. Resting tabs use `C.sub` (text.alternate); the active tab darkens to `C.dark` (text.base) for contrast, applied via `clientTabStyle(tab, active)`.
- Why: standardizes on the design-system component while preserving the established compact visual, and drops the ad-hoc "More tabs" chevron.

**Decision: Introduce a fixed three-tab segmentation keyed by client status.**
A `CLIENT_TAB_STATUS` map (`active → Active`, `invited → Invited`, `requests → Requests`) defines the tabs and the client `status` each lists. The `clientTab` state in each shell widens from `'active' | 'requests'` to `'active' | 'invited' | 'requests'`.
- Why: the Invited tab is required to hold leads promoted to clients; keying tabs off a status map keeps counts and filtering derived from one source.

**Decision: Compute counts and the shown list off the roster inside the subnav.**
`ClientsSubnav` computes `countFor(status)` and `shownBuyers` (filtered by the selected tab's status and the search query) directly from the `buyers` prop, so the previous `activeCount` / `requestsCount` props are removed. The empty state reads "No clients match your search." when a query is present and "No clients in this list." otherwise.
- Why: counts and list can no longer disagree, and both stay stable while searching.

**Decision: Pin the agent's own feed row above the search input.**
The agent feed (`AGENT_FEED_ID`) is pulled out of the roster and rendered above the search field via a shared `BuyerRow` component; the tabbed list below holds only real clients matching the selected status and search.
- Why: the agent's own feed is not a client relationship, so it should not sit inside a status tab.

**Decision: Persist invited-lead promotions to `sessionStorage` (agent-vision).**
`sendInvite` records the lead id in a set persisted under `ra-invited-leads`; the "Invited" client records are rebuilt deterministically from those ids via `clientFromLead`. On load the shell rehydrates the set and prepends the rebuilt Invited clients (newest first) to both the Home/Clients state and the subnav roster (`allBuyers`), so an invited lead appears immediately under the Invited tab and survives a reload within the session.
- Why: `sessionStorage` (not `localStorage`) matches the shell's other prototype mutations — it persists across a reload but resets in a fresh session; storing only the ids keeps the derived client records single-sourced.

**Decision: Keep the two `Subnav.tsx` files identical; differ only in the roster the shell passes.**
Both shells render the same three-tab subnav. `agent-vision` passes `allBuyers` (roster plus any session-invited clients); `agent-web`, which has no leads feature, passes the full `BUYERS` roster.
- Why: one subnav behavior across shells, with the invite flow isolated to the shell that owns leads.

## Risks / Trade-offs

- **`sessionStorage` write failures** (private mode / quota) → wrapped in try/catch so the in-memory state still holds for the tab; the persisted-invite guarantee degrades to session-in-memory only. Acceptable for a prototype.
- **Counts vs. list drift** if computed in different places → mitigated by deriving both from the same `buyers` roster inside the subnav.
- **Two files must stay in sync** — `agent-web` and `agent-vision` `Subnav.tsx` are near-identical → applied the exact same edit to both; the only intended shell-level difference is the roster passed in.
- **Invited clients could double-add** on re-send → `sendInvite` guards on the existing id set before adding.

## Migration Plan

Front-end-only change with no backend or schema migration. The only persisted state is the `ra-invited-leads` key in `sessionStorage`, which is created lazily on first invite and self-clears with the session; no cleanup step is required. Deploy through the normal front-end build for both apps. Rollback is a straight revert of the two commits.
