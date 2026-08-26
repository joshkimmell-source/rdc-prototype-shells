## 1. Lead data model

- [x] 1.1 In `agent-vision/src/data/sample/adapters.ts`, add the `Lead` model (plus `LeadType`, `LeadStatus`, and the `detail` sub-types) and a 20-record `LEADS` seed of net-new Buyer/Seller prospects with status, market, budget, recency, and a derived `readyToPromote` flag (true only for Engaged / Met / Appointment set / Offer made). Verify the seed resolves and each record carries a status color.
- [x] 1.2 Add `clientFromLead` (build a connected "Invited" client from a promoted lead) and `listingMatchesForLead` (the starter-search listings, scored and ranked). Verify both are re-exported through `agent-vision/src/data.ts` alongside `LEADS` and the lead types.

## 2. Navigation

- [x] 2.1 In `agent-vision/src/components/NavRail.tsx`, add `leads` to `NavId` and add Home and Leads to `NAV_ITEMS`, ordered Home → Leads → Clients → Search → Tours so the funnel reads top-to-bottom. Verify all five items render in both the rail and the mobile bar.
- [x] 2.2 In `agent-vision/src/navParam.ts`, add `leads` to the view set and add `readLeadParam`/`writeLeadParam` for the `?lead=<id>` deep link. Verify `?view=leads` shows the list, `?lead=<id>` opens a detail, Back clears it, and an unknown view still falls back to Clients.

## 3. Leads list and detail

- [x] 3.1 Add `agent-vision/src/screens/LeadsScreen.tsx`: a bordered card with a header (count + provenance + Download), Buyer/Seller tabs, a search + Filters row, a "Showing…" line, a sortable table (name / budget / date, newest activity first), and a paginated footer. Verify search filters on name/email/phone and the tabs split Buyer from Seller.
- [x] 3.2 Give each ready lead an icon-only "Work with" action and a "Ready to work together" pill (with `IconCircleCheck`); hide leads promoted this session. Verify only ready leads expose the action and a promoted lead disappears from the list.
- [x] 3.3 Add `agent-vision/src/screens/LeadDetailScreen.tsx`: a breadcrumb back to the list, the lead's name/status/contact row, Overview / Activity / Notes tabs, a pipeline Status card, a Referral details card, and a promote-to-client CTA that opens the invite composer for a ready lead. Verify every value reads off the lead's `detail` block and Activity/Notes are honest placeholders.

## 4. Invite flow

- [x] 4.1 Add `agent-vision/src/components/InviteModal.tsx`: the "Work with {name}" composer showing captured qualifying-call data, an editable pre-filled message, a spotlight best-fit `PropertyCard`, and selectable starter-search mini-cards with an attach-search toggle (on by default). Verify the composition reads as live and the toggle/selection are real local state.
- [x] 4.2 On send, record the promotion (`onSend`), swap the composer for a confirmation, and add the lead to the shell's `promotedLeadIds` set so it drops from the active pipeline and leads list. Verify the "Invites pending" / "Qualified leads" stats react.
- [x] 4.3 Wire the flow in `agent-vision/src/Shell.tsx`: `selectedLead` (URL-mirrored), `inviteLeadId`, and `promotedLeadIds` state; render `LeadsScreen` / `LeadDetailScreen` / `InviteModal` under the leads view. Verify opening a lead, opening the composer, and promoting all update the URL and UI correctly.

## 5. Lead-aware dashboard

- [x] 5.1 In `agent-vision/src/screens/HomeScreen.tsx`, add a "New leads" list fed by open leads (ready-to-work first, then most recent, capped at four) with `onOpenLead` jump-to-detail, and a "Lead sources" chart tallied by Realtor.com product. Verify both draw only from the open (un-promoted) leads passed by the shell.
- [x] 5.2 Replace the accented stat cards with a floating black KPI stat bar (white stats, hairline dividers), and split the scroll gutter into margin + padding so the bar's drop shadow isn't clipped. Verify the bar renders and the shadow is visible.
- [x] 5.3 Swap the "Tour requests" stat for "Qualified leads" (the ready-to-work count), and prioritize ready leads and Active clients in their lists. Verify the count matches the ready, un-promoted leads.

## 6. Onboarding preview

- [x] 6.1 Add `agent-vision/public/rdc-plus-onboarding.html`: the personalized realtor.com+ email-triggered onboarding flow, rendering the invited lead's name/email and the selected homes into the email screen. Verify it opens standalone with sensible defaults.
- [x] 6.2 Refactor the page's personalize step into an idempotent `applyInvite(data)`, read `localStorage` on load, listen for a `rdc-plus-invite` message, and announce a `rdc-plus-onboard-ready` handshake once the listener is attached. Verify calling `applyInvite` twice is a no-op and the greeting + attached homes update.
- [x] 6.3 In `InviteModal`, show the preview in an in-app overlay iframe (not `window.open`), close the Radix `Modal` while the preview is up, reply to the readiness handshake with the payload from a `ref`, and keep an `onLoad` post + `localStorage` write as fallbacks. Verify the preview personalizes and its clicks aren't swallowed by the modal overlay.

## 7. Bundle and verification

- [x] 7.1 In `agent-vision/scripts/bundle-single-file.mjs`, inline `rdc-plus-onboarding.html` as a base64 blob URL, rewrite the `"rdc-plus-onboarding.html"` src literal to `__onboardUrl()`, and switch the `</head>`/`</body>` assembly to function `String.replace` arguments. Verify the bundle builds and the app JS's literal `$&`/`` $` `` are inserted verbatim (no "Unexpected token '<'" blank render).
- [x] 7.2 Add `agent-vision/scripts/verify-render.mjs` and `agent-vision/scripts/verify-invite.mjs`: headless harnesses that serve the actual bundle over HTTP; `verify-invite` disables `localStorage` in every frame to prove the `postMessage` path personalizes the preview (greeting + attached homes). Verify both pass against the built bundle.

## 8. Home rename and tests

- [x] 8.1 Rename the shell's "Dashboard" title and the rail's nav item to "Home". Verify the rail item and the screen title both read "Home".
- [x] 8.2 Update `agent-vision/tests/nav-rail.spec.ts` to expect the Home label present in the rail (Clients remains the landing screen). Verify the nav-rail test passes.
