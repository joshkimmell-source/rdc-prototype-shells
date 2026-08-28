## Context

See `proposal.md` — Why. Before this change, agent-vision's Home screen was a white-background dashboard: a floating KPI bar, boxed charts (including a "Lead sources" chart), stage filters, and a client table — no spec governed its layout. The shared header (`main-header`) showed a count label under the title for Clients (a listing count) and Tours (the selected tour's date) in both apps, and for Home in agent-web only (agent-vision's Home never had one). The navigation rail (`navigation-rail` spec) already governed the icon/label treatment of each cell, but not the rail's item spacing or its collapsed-logo size — those were unspecified implementation details.

## Goals / Non-Goals

**Goals:**
- Document the redesigned agent-vision Home dashboard as a new capability, `home-dashboard`, grounded in what actually shipped (not just the commit message).
- Correct `main-header`'s count-label requirement to reflect the current, per-app truth.
- Add the previously-ungoverned rail spacing/logo-size behavior to `navigation-rail`.

**Non-Goals:**
- No re-litigation of the redesign itself (already shipped and live) — this is retroactive documentation.
- No spec for the standalone `tours-map.html` page's internal layout (where the relocated tour date now sits) — that remains an implementation detail of the framed map, not a governed capability.
- agent-web's Home screen is unaffected and stays out of scope for `home-dashboard` (agent-vision only, like `leads-workspace`).

## Decisions

**Decision: Give the Home dashboard its own capability, `home-dashboard`, rather than folding it into `leads-workspace`.**
- Why: `leads-workspace` defines the Leads list/detail surface and invite flow; the Home dashboard is a different screen with different content (leads, clients, tours, and pipeline all summarized together) that happens to link into Leads via "View all," not a part of the Leads workspace itself.
- Alternative considered — no spec at all, since it's "just a dashboard": rejected because the hero's non-obvious 1040px breakpoint and the mutual-exclusivity of "Qualified leads" between the hero headline and the stat box are exactly the kind of easy-to-regress behavior specs exist to pin down.

**Decision: Document the count-label removal as a per-app split, not a single shared rule.**
agent-web keeps a count label on Home only; agent-vision now shows none anywhere.
- Why: that is what the code actually does — agent-vision's `countLabel` is unconditionally `''`, while agent-web's is `''` for Search/Clients/Tours and a real count for Home. Documenting it as if both apps behaved identically would be inaccurate and would drift from the code the next time either changes.

**Decision: Add rail spacing/logo size to `navigation-rail` as a new requirement rather than treating it as a non-spec-worthy visual tweak.**
- Why: unlike a one-off color or size tweak on a single component, this is a small but concrete, testable piece of the shared rail's composition that the existing spec's Purpose already claims to define ("how each rail cell arranges its icon and text label") but didn't actually cover.

## Risks / Trade-offs

- **`home-dashboard` is agent-vision only** — a reader could assume parity with agent-web without checking; mitigated by stating the scope explicitly in the spec's Purpose, matching the `leads-workspace` precedent.
- **Retroactive documentation drift** — this change was authored after the code shipped, from the diff and current source rather than from the original design conversation, so the "Why" behind pixel-level choices (1040px, 4-lead cap, etc.) is reconstructed from code comments rather than firsthand. Mitigation: requirements are grounded in what's actually in the code today, verified by reading `HomeScreen.tsx` directly rather than trusting the commit message alone.

## Migration Plan

Front-end only, no data or API migration. Already deployed through the normal per-shell `npm run deploy` (gh-pages overlay) as part of commit `128a689`. This document is retroactive — there is nothing further to migrate.
