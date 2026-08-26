## Context

See `proposal.md` — Why. Before this change each shell invented its own placeholder content, so nothing was comparable across shells and `agent-web`'s Clients screen had no real listing feed. The dataset the skill ships is a single JSON file (`sample-data.json`) with ten records per collection plus a 15-entry image library, wrapped by `index.ts` — typed accessors (`getListing`, `clientsForAgent`, `upcomingTours`, …) and formatters (`formatPrice`, `formatBaths`, `formatAddress`, …) so a listing renders identically on a card, in a list, and on a detail page. Half baths fold into a decimal per MLS convention (`bathsFull + bathsHalf * 0.5`). The dataset carries deliberate degenerate records — `lst_09` (`sqft: null`, `bathsFull: 0`, a `units` field the others lack), `lst_08` (`photoCount: 1`), `tour_06` (`stops: []`), `cli_04` (`savedCount: 0`), `cli_08` (Archived with 15 saves) — which the formatters and accessors tolerate. The shells' existing component types disagree with the dataset (`agent-web`'s `Client` wants `stage`/`budget`/`financing`; the dataset has `status`/`savedCount`/`tourRequestCount`), which forces the central design question below.

## Goals / Non-Goals

**Goals:**
- Ship one fixed, fully fictional dataset and a repeatable procedure for injecting it, so populated shells are comparable and stable across runs.
- Make the data safe for a live testing session (555 phones, `example.com` emails, `SAMPLE:` MLS ids, invented places) and keep the degenerate records so shells exercise their empty states.
- Build `agent-web`'s Clients listing feed on Haven `PropertyCard`, populated entirely from the dataset via an adapter, with feed timing and saved-state derived rather than invented.
- Scope the Clients screen to five clients whose feeds differ in size (5 / 4 / 3 / 2 / 1) and overlap by construction, so the screen shows a real book of varying sizes.
- Use fixed home imagery so a screenshot shows a home, not a random photo.

**Non-Goals:**
- No reshaping of shell components to match the dataset's types (the adapter absorbs the mismatch instead).
- No new records beyond ten per collection, and no dropping of the degenerate records to fill a grid.
- No offline bundling of imagery (URLs stay remote) and no change to person avatars (they stay on `picsum`).
- `client-web` is out of scope for the image swap — it has no listing surface.

## Decisions

**Decision: Adapt per shell in a hand-written `adapters.ts`; do not reshape components.**
The dataset's shape does not match any shell's component types, so each shell maps the sample data onto the types its components already consume in `<shell>/src/data/sample/adapters.ts`, then points the shell's existing exported constants (`CLIENTS`, `LISTINGS`, `TOURS`, …) at the adapter output.
- Why: components keep working unchanged, and re-running the skill can overwrite the generated `index.ts` and `sample-data.json` without touching the mapping. Editing components to take the dataset's shape would couple them to the generator and break on regeneration.
- Alternative considered — reshape components to the dataset's types, or widen the shell's types to `any`: rejected. Reshaping spreads the dataset's vocabulary through the UI and is undone by the next regeneration; `any` hides the mismatch the adapter exists to resolve.

**Decision: Keep the fictional-safety invariants in the dataset itself, and forbid edits inside the skill directory.**
Phones use the `555` block, emails `example.com`, MLS ids a `SAMPLE:` prefix, and cities/states are invented; these are documented as invariants any edit must preserve. The skill's `sample-data.json`/`index.ts` are the shared source and must not be edited to fit one prototype — per-shell divergence goes in that shell's `adapters.ts`.
- Why: a single safe source keeps every populated shell safe for a live session, and confining edits to `adapters.ts` keeps the source regenerable.
- Alternative considered — let each shell tweak its own copy of the data: rejected; it reintroduces the ad-hoc, inconsistent placeholder problem this change exists to remove.

**Decision: Keep the degenerate records and render them, rather than trimming to make grids look full.**
Ten records per type is the contract; a screen that needs a different count slices or repeats within itself. `SKILL.md` forbids dropping `lst_09`, `lst_08`, `tour_06`, or `cli_04` to make a grid fuller.
- Why: a shell that renders all ten exercises its own empty/degenerate states for free; an awkward render is a finding to report, not noise to hide.
- Alternative considered — a larger, uniformly "nice" dataset: rejected; it would hide exactly the empty and edge states the prototype needs to prove out.

**Decision: Derive feed timing and saved-state instead of adding fields to the dataset.**
The cards need a feed timestamp (for the "New 3 hrs ago" pill and the Today / Yesterday headings) and which listings a client saved, neither of which the dataset carries. Timestamps come from feed position times a fixed step, measured back from a fixed prototype clock (deterministic, so screenshots don't churn). Saved-state is derived: `savedCount` is a bare number with no listing ids behind it, so a listing on an upcoming tour stop is treated as saved.
- Why: keeps the shared dataset minimal and generic while the card-specific derivations live in the shell adapter; determinism keeps screenshots stable.
- Alternative considered — add `feedTime`/`savedListingIds` fields to the dataset: rejected; they are `agent-web`-card concerns, not shared data, and would bloat every shell's copy.

**Decision: A `ClientFeed` per subnav row; feed size is authored, membership is derived.**
The screen-wide pill/group/filter exports are replaced by a `feedFor(id)` returning one `ClientFeed` per roster client (plus the agent's own feed). Each feed is the client's tour-stop listings topped up from the front of the global feed order to an authored size (`FEED_SIZES` gives 5 / 4 / 3 / 2 / 1), so the five overlap by construction rather than by a hand-written table. Pill counts, tile numbers, and the header count all read the selected feed; day headings and card ages stay on their global feed positions so a shared listing reads the same age on every client's screen.
- Why: shows a real book of varying sizes, keeps overlap honest (the freshest listing is shown to most clients), and keeps a shared listing's age consistent across feeds.
- Alternative considered — one screen-wide feed shown to everyone (the prior behavior): rejected; it cannot demonstrate per-client book sizes, which is what the screen is for.

**Decision: Fixed Unsplash home photos for property; keep `picsum` for people.**
The 15 library entries and all 10 `primaryPhoto`s point at fixed `images.unsplash.com` URLs, each a home matching its `label`, with crop/quality in the query string so the URL is stable. Agent/client `avatar` fields stay on `picsum` seeds.
- Why: in a screenshot or testing session the property photo is the product and must look like a home; avatars stand in for people, where a random face is acceptable and a fixed identity is not needed.
- Alternative considered — keep everything on `picsum`: rejected; a listing card could show a non-home image, undermining the screen.

## Risks / Trade-offs

- **Remote imagery does not bundle or work offline** — all listing/library photos and avatars are remote URLs, and `npm run bundle` will not inline them. Mitigation: flag this to any user who bundles; imagery renders only with network access.
- **Reference card density is not reproducible from ten records** — the skill forbids adding more, so the ten are sliced across the day sections and per-client feeds. Mitigation: accept the lower density; slicing/topping-up keeps each feed coherent.
- **Orphaned `localStorage` keys** — deleting `ImageSlot.tsx` leaves any existing `ra-image-slot:*` keys in a browser unused. Mitigation: harmless (unread); the tiles now source images from `imageForKey`.
- **Adapter and shell types can drift** — the adapter must keep satisfying the shell's component types as either side changes. Mitigation: `tsc --noEmit` gates the adapter; the skill's verification step requires a browser pass on the touched screens, not just a clean typecheck.
- **Haven slot constraints surfaced only in the browser** — status text clipping (`priceRowStyles` lacks `min-width: 0`), the un-clickable select checkbox (`CardOverlay` is `pointer-events: none` except for `:is(a, button)`, and Haven's `Checkbox` is an input in a label), the unreachable single Closed listing (needed a Closed filter), and two-line addresses all needed screenshot-driven fixes. Mitigation: fixed in `ListingCard.tsx` / `ClientsScreen.tsx`; documented as findings the typecheck could not catch.

## Migration Plan

Front-end/data-only change with no runtime data or API migration. The skill is additive; populating a shell copies the generated files in and adds a hand-written `adapters.ts`, then re-points existing exports — no schema or storage migration. `ImageSlot.tsx` is removed with its `localStorage` flow; leftover `ra-image-slot:*` keys are inert. Deploy through the normal front-end build for `agent-web`. Rollback is a straight revert of the added files plus restoration of the prior `data.ts`/`ClientsScreen.tsx` and `ImageSlot.tsx`.
