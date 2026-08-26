## Context

See `proposal.md` — Why. Before this change the agent-vision shell had a Clients workspace, a Search workspace, a Tours workspace, and a dashboard, but no representation of leads — the net-new prospects a Realtor.com product (Market VIP, Local Expert, ReadyConnect Concierge) delivers before they become connected clients. The nav rail exposed Clients / Search / Tours; Home was reachable at `?view=home` but was not a rail item, and its title read "Dashboard". Screens are plain React with inline `style` objects and a small set of shared primitives (`HoverButton`, `Initials`, `SearchField`, `Tab`) plus Haven components from `@rdc-npm/rdc-ui-v4`; sample content lives in `agent-vision/src/data/sample/adapters.ts` and is re-exported through `agent-vision/src/data.ts`. Navigation state is URL-backed via `navParam.ts` (`?view=`). The prototype is also packaged as a single self-contained HTML file (`scripts/bundle-single-file.mjs`) and can be hosted on RealPrototypes, where it runs inside a **sandboxed iframe** — popups are blocked and storage is partitioned or unavailable.

## Goals / Non-Goals

**Goals:**
- Add a Leads workspace (list + detail) as a first-class, URL-addressable navigation destination, driven entirely by sample lead data — no data invented in the views.
- Provide an invite flow that promotes a worked ("ready") lead into a connected client and previews the personalized onboarding the lead would receive.
- Make the dashboard reflect lead state — surface new leads, their sources, and a qualified-leads count — and prioritize ready leads and Active clients.
- Ensure the onboarding preview renders and personalizes correctly both in local dev and inside the RealPrototypes sandboxed iframe.
- Keep the funnel legible in navigation: Home leads the rail, Leads sits directly above Clients.

**Non-Goals:**
- No changes to `agent-web`; this workspace is agent-vision only.
- No real dispatch, CRM write, or persistence — the invite send, status updates, and media controls are prototype no-ops, and the promotion is session-only.
- No new styling mechanism: the workspace stays on the existing inline-style + shared-primitive + Haven approach.

## Decisions

**Decision: Model leads as their own records, distinct from clients, and promote across on invite.**
A `Lead` type and a 20-record `LEADS` seed live in `adapters.ts` (Buyer/Seller, a status pipeline — New, Connected, Engaged, Met, Appointment set, Offer made, Nurture — market, budget, recency, and a derived `detail` block). A lead is `readyToPromote` only once worked past first contact (Engaged / Met / Appointment set / Offer made). Sending an invite promotes the lead to a connected client (via `clientFromLead`) and adds its id to a session `promotedLeadIds` set so it drops out of the active leads list and pipeline.
- Why: leads and clients are different stages of the same funnel; keeping them as separate record sets that convert on invite mirrors how a Realtor.com product hands prospects off, and the "ready" gate keeps the invite CTA off cold leads.

**Decision: Address the workspace and the open lead in the URL.**
Add `leads` to the `?view=` set and mirror the open lead as `?lead=<id>` via `readLeadParam`/`writeLeadParam`. The lead param is only meaningful under the leads view and is cleared on navigation; a bare `?view=leads` shows the list, and a stale/edited lead id falls back to the list rather than a blank page.
- Why: keeps navigation consistent with the rest of the shell (URL-backed views) and makes Back close the detail page naturally.

**Decision: Order the rail as a funnel and promote Home to a rail item.**
Place Home at the top of the rail (labelled "Home"), then Leads directly above Clients, then Search and Tours. Clients remains the default landing view.
- Why: a lead becomes a client, so the rail reads top-to-bottom as the funnel; surfacing Home as a first-class item makes the dashboard directly reachable rather than an unlinked `?view=home`.

**Decision: The invite composer previews the consumer experience, and drives the preview by an in-app iframe, not a popup.**
`InviteModal` shows the qualifying-call data, an editable message, a spotlight best-fit home, and selectable starter-search matches. On send it records the promotion, shows a confirmation, and opens the RDC+ onboarding page as an **in-app overlay iframe** — closing the Radix `Modal` while the preview is up so the modal's full-screen overlay does not swallow the clicks that drive the onboarding screens.
- Why: a hosted prototype runs in a sandboxed iframe where `window.open` to a new tab is blocked, so an in-app overlay is the only reliable way to render the preview.
- Alternative considered — `window.open('rdc-plus-onboarding.html')`: this was the initial approach; rejected once it broke in the sandbox (blocked popup).

**Decision: Hand the personalization payload over `postMessage`, with a readiness handshake and localStorage as a fallback.**
The onboarding page's personalize step is refactored into an idempotent `applyInvite(data)`. The page reads `localStorage` on load (local dev / non-sandboxed hosts), listens for a `rdc-plus-invite` message, and announces a `rdc-plus-onboard-ready` handshake once its listener is attached; the shell replies to that exact window with the payload read from a `ref` (race-free, no stale closure). An `onLoad` post and the `localStorage` write remain as belt-and-suspenders fallbacks.
- Why: in the sandbox `localStorage` is partitioned or unavailable, so only messaging crosses the boundary; posting only after the child announces readiness guarantees the reply is never missed.

**Decision: Package the onboarding page into the single-file bundle as an inlined blob URL, assembled with function replacements.**
`bundle-single-file.mjs` inlines `rdc-plus-onboarding.html` as a base64 blob URL (same technique as the map pages), rewrites the `"rdc-plus-onboarding.html"` src literal to `__onboardUrl()`, and switches the final `</head>`/`</body>` assembly to **function** `String.replace` arguments so the minified app JS's literal `$&` / `` $` `` sequences are inserted verbatim instead of being interpreted as replacement patterns (which had spliced stray `<` into the script and blanked the render with "Unexpected token '<'").
- Why: the bundle must serve the onboarding page with no separate document, and a string replacement corrupts the minified JS; the blob URL keeps it same-origin with the shell so the localStorage fallback still works where available.

## Risks / Trade-offs

- **Sandbox-only failure modes** — popups blocked, storage partitioned, and modal overlays swallowing clicks only surface inside the RealPrototypes iframe, not in local dev. Mitigation: the in-app overlay iframe, the `postMessage` handshake, and closing the modal during preview; plus `verify-render.mjs` and `verify-invite.mjs`, headless harnesses that serve the actual bundle over HTTP and disable `localStorage` in every frame to prove the `postMessage` path personalizes the preview.
- **Handoff race between shell and preview** — the iframe's `onLoad` can fire before the child's message listener exists. Mitigation: the child announces readiness after attaching its listener and the shell replies from a ref, so the payload is delivered once the child can receive it; `onLoad` and `localStorage` remain fallbacks.
- **Bundle string-replacement corruption** — literal `$&`/`` $` `` in minified JS break string-form `String.replace`. Mitigation: function replacements for the head/body assembly, insert verbatim.
- **Session-only promotion** — a promoted lead reappears on reload because the promotion isn't persisted. Accepted: matches the shell's other prototype mutations (created tours, added clients).
- **Two navigation surfaces (rail + mobile bar) share `NAV_ITEMS`** — adding Home/Leads must not drift them apart. Mitigation: both consume the same `NAV_ITEMS` source, and the nav-rail test asserts the Home label.

## Migration Plan

Additive front-end change confined to agent-vision, with no data or API migration and no persisted state. New screens, the invite component, the onboarding page, and the sample lead data ship together; navigation gains the `leads` view and `?lead=` param behind normal URL handling. Deploy through the normal front-end build; regenerate the single-file bundle for RealPrototypes and confirm with `verify-render.mjs` / `verify-invite.mjs`. Rollback is a straight revert of the added files and the nav/shell/dashboard edits.
