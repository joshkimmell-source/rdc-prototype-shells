## 1. agent-vision Clients subnav tabs

- [x] 1.1 In `agent-vision/src/components/Subnav.tsx`, replace the custom `Tab` primitive (and the decorative "More tabs" chevron) with Haven's `Tabs` component, rendering three triggers — Active, Invited, Requests. Verify the three tabs render as compact text tabs matching the Tours subnav.
- [x] 1.2 Add the `CLIENT_TAB_STATUS` map and `ClientTab` type keying each tab to a client `status`; widen the `clientTab` state/props from `'active' | 'requests'` to `'active' | 'invited' | 'requests'`. Verify switching tabs updates the selection.
- [x] 1.3 Compute per-tab counts (`countFor`) and the shown list (`shownBuyers`) off the `buyers` roster, filtering to the selected tab's status and the search query; remove the `activeCount` / `requestsCount` props. Verify each tab's parenthesized count matches the number of clients in that category and the list shows only matching clients.
- [x] 1.4 Style resting tabs at `text.alternate` (`C.sub`) and the active tab at `text.base` (`C.dark`) via `clientTabStyle`. Verify the active tab is darker than the resting tabs.
- [x] 1.5 Extract a shared `BuyerRow` component and pin the agent's own feed row (`AGENT_FEED_ID`) above the search input, outside the tabbed list. Verify the agent feed row sits above the search field and no longer appears inside a status tab.
- [x] 1.6 Update the empty state to read "No clients match your search." when a query is present and "No clients in this list." otherwise. Verify both messages appear in the right conditions.

## 2. agent-vision lead-invite affordance

- [x] 2.1 Add `Buyer.status` in `agent-vision/src/data.ts` and map client status through in `agent-vision/src/data/sample/adapters.ts`. Verify clients carry Active / Invited / Requests status.
- [x] 2.2 In `agent-vision/src/Shell.tsx`, persist invited-lead ids to `sessionStorage` under `ra-invited-leads` (`readInvitedLeadIds` / `writeInvitedLeadIds`), and update `sendInvite` to record the id (guarded against double-add) and write it through. Verify inviting a lead persists its id for the session.
- [x] 2.3 Rehydrate invited leads on load: rebuild "Invited" clients from the stored ids via `clientFromLead` (newest first) and prepend them to the Home/Clients state and to the subnav roster (`allBuyers`). Verify an invited lead appears under the Clients subnav Invited tab immediately and again after a reload within the same session.
- [x] 2.4 Set Priyanka Raman's client status to Active so the Active tab count reflects it. Verify the Active count includes her.

## 3. agent-web parity

- [x] 3.1 Apply the identical subnav change from tasks 1.1–1.6 to `agent-web/src/components/Subnav.tsx`. Verify the three-tab subnav renders the same as agent-vision.
- [x] 3.2 In `agent-web/src/Shell.tsx`, widen the `clientTab` state to `'active' | 'invited' | 'requests'` and pass the full `BUYERS` roster to the subnav (agent-web has no leads feature, so no session-invited clients). Verify the tabs filter the roster correctly.
- [x] 3.3 Confirm parity: diff `agent-web/src/components/Subnav.tsx` and `agent-vision/src/components/Subnav.tsx` and verify the subnav structure is identical, the only shell-level difference being the roster each `Shell.tsx` passes in.

## 4. Accompanying copy/UI polish

- [x] 4.1 Rename user-facing "RDC+" to "Realtor.com+" across `InviteModal.tsx`, the invite push copy in `adapters.ts`, and the onboarding preview. Verify no user-facing "RDC+" string remains.
- [x] 4.2 Restyle the Leads table header (`LeadsScreen.tsx`) to match the Clients table header, soften the Lead Detail promote-to-client copy (`LeadDetailScreen.tsx`), surface "Qualified leads (N)" with a "View all" link and hide the header client count on Home (`HomeScreen.tsx`), and convert remaining raw buttons to Haven v4 `Button`. Verify the surfaces render with the updated copy/UI.

## 5. Verification

- [x] 5.1 Build/lint both apps and verify no type or lint errors are introduced.
- [x] 5.2 Manually verify in both shells: the three tabs segment the client list, counts match, resting/active tab styling is correct, the agent feed is pinned above search, and empty states read correctly.
- [x] 5.3 In agent-vision, verify the full invite flow: inviting a lead surfaces it as an Invited client under the Invited tab and in Home/Clients, and the promotion survives a reload within the session but is gone in a fresh session.
