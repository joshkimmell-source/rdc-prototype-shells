## Why

The agent-vision shell modelled the agent's connected clients but had no home for the prospects ahead of them — the net-new leads a Realtor.com product delivers before they ever become a client. Without a leads surface, there was nowhere to work a prospect, no path to promote a warmed lead into a connected client, and no way for the dashboard to reflect the top of the funnel. This change adds a first-class Leads workspace, an invite flow that promotes a worked lead into an RDC+ client, and a lead-aware dashboard, plus a personalized onboarding preview of what the invited lead receives — one that renders correctly when the prototype is hosted inside the RealPrototypes sandbox.

## What Changes

- Add a **Leads workspace** as a first-class navigation destination (`?view=leads`) in agent-vision: a Leads list (Buyer / Seller tabs, search, a sortable, paginated table of net-new prospect records distinct from Clients) and a Lead detail page (Overview / Activity / Notes tabs, pipeline status, referral details, and a promote-to-client CTA). The open lead is mirrored in the URL as `?lead=<id>` so Back closes the detail.
- Place **Leads directly above Clients** in the navigation rail so the funnel reads top-to-bottom (a lead becomes a client), and surface **Home** as a first-class rail item labelled "Home".
- Add an **invite flow** (`InviteModal`) — the "Work with {name}" composer opened from a lead that has been worked past first contact. It shows the qualifying-call data the invite is drafted from, an editable pre-filled message, a spotlight best-fit home, and selectable starter-search matches attached by default. Sending promotes the lead to a connected client (dropping it from the active pipeline) and shows a confirmation.
- Make the dashboard **lead-aware**: a "New leads" list (ready-to-work leads first, then most recent) and a "Lead sources" chart tallied by Realtor.com product, a floating black KPI stat bar, and a "Qualified leads" stat (the ready-to-work count). Ready leads and Active clients are prioritized; `IconCircleCheck` marks all "Ready" indicators.
- Add an **onboarding preview**: on send, show the personalized RDC+ (realtor.com+) email-triggered onboarding flow — the invited lead's name/email and the selected homes rendered into the email — as a preview of what the lead receives. Make it render correctly inside the RealPrototypes sandbox by showing it in an in-app overlay iframe (popups are blocked), handing the personalization payload over `postMessage` (partitioned/unavailable storage), and packaging the onboarding page into the single-file bundle as an inlined blob URL.
- Rename the shell's "Dashboard" title and nav item to **"Home"**, and update the nav-rail test accordingly.
- Out of scope: `agent-web` is not changed; the invite send, status updates, and player controls remain prototype no-ops; the promotion is session-only.

## Capabilities

### New Capabilities
- `leads-workspace`: The agent-vision Leads workspace — the leads list and detail surface, the invite-to-RDC+ flow that promotes a worked lead into a connected client, the lead-aware dashboard, and the personalized onboarding preview that renders inside the RealPrototypes sandbox.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **New screens (agent-vision):** `agent-vision/src/screens/LeadsScreen.tsx` (leads list), `agent-vision/src/screens/LeadDetailScreen.tsx` (lead detail).
- **New component (agent-vision):** `agent-vision/src/components/InviteModal.tsx` (invite-to-RDC+ composer + onboarding preview overlay).
- **New onboarding page (agent-vision):** `agent-vision/public/rdc-plus-onboarding.html` (personalized realtor.com+ onboarding flow).
- **Sample data (agent-vision):** `agent-vision/src/data/sample/adapters.ts` (the `LEADS` seed, `Lead`/`LeadStatus`/`LeadType` types, `clientFromLead`, `listingMatchesForLead`) surfaced through `agent-vision/src/data.ts`.
- **Navigation (agent-vision):** `agent-vision/src/components/NavRail.tsx` (new `leads` nav id, Home/Leads items) and `agent-vision/src/navParam.ts` (the `leads` view plus `readLeadParam`/`writeLeadParam`).
- **Shell + dashboard (agent-vision):** `agent-vision/src/Shell.tsx` (leads/invite state, promoted-lead set, Home rename, KPI stats) and `agent-vision/src/screens/HomeScreen.tsx` (New leads list, Lead sources chart, floating KPI bar).
- **Bundle + verification (agent-vision):** `agent-vision/scripts/bundle-single-file.mjs` (inline onboarding blob URL, function replacements) and new `agent-vision/scripts/verify-render.mjs` / `agent-vision/scripts/verify-invite.mjs` headless harnesses; `agent-vision/tests/nav-rail.spec.ts` (Home label).
- **Not affected:** `agent-web` and any non-agent-vision surfaces.
