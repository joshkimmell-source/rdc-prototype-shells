## 1. inject-dummy-data skill and dataset

- [x] 1.1 Add the fixed fictional dataset `assets/sample-data.json` — 10 agents (paired into 5 brokerages), 10 clients, 10 saved searches, 10 listings (New / Active / Price Change / Coming Soon / Closed), 10 tours (4 Upcoming, 6 Past), and a 15-entry home-image library. Verify referential integrity across all five id-bearing collections.
- [x] 1.2 Preserve the deliberate degenerate records — `lst_09` (`sqft: null`, `bathsFull: 0`, `parking: "—"`, extra `units`), `lst_08` (`photoCount: 1`), `tour_06` (`stops: []`, `startTime: null`), tour stops with `time: null` / `"No status"`, `cli_04` (`savedCount: 0`), `cli_08` (Archived, 15 saves), empty `priceHistory` — as load-bearing. Verify the accessors and formatters run against them without throwing.
- [x] 1.3 Keep the fictional-safety invariants: `555` phone block, `example.com` emails (RFC 2606), `SAMPLE:` MLS-id prefix, invented cities and the non-real `ST` state code. Verify no record resolves to a reachable real person or place.
- [x] 1.4 Add `assets/index.ts` — the typed wrapper over the JSON: accessors/lookups (`getListing`, `clientsForAgent`, `toursForClient`, `upcomingTours`, `imageForKey`, …) and formatters (`formatPrice`, `formatBaths` folding half baths to a decimal per MLS convention, `formatAddress`, `formatListingMeta`, …). Verify `index.ts` type-checks under a shell's strict `tsc` (`resolveJsonModule` already on).
- [x] 1.5 Write `SKILL.md` documenting the dataset, the edge cases, the safety invariants, and the injection procedure (copy assets, adapt per-shell in `adapters.ts`, use the formatters, verify in a browser), plus the don'ts — never edit the source data to fit one prototype, never add records to fill a grid, never drop the degenerate records, never swap in real people/homes.

## 2. Populate agent-web and build the listing feed

- [x] 2.1 Copy the generated `sample-data.json` and `index.ts` into `agent-web/src/data/sample/` and write the hand-written `adapters.ts` that maps the dataset onto the shell's existing component types; re-point `data.ts`'s exported constants (`CLIENTS`, `LISTINGS`, `TOURS`, …) at the adapter so no component is reshaped.
- [x] 2.2 Build `ListingCard.tsx` on Haven `PropertyCard` — media photo, recency / price-drop (struck-through old price) / open-house overlay pills, select checkbox, "Saved" flag, action row (delete / send / save), price row with status and days-on-market, and `PropertyMeta`. Draw the heart, paper-plane, and price-drop-arrow icons into `icons.tsx` (Haven ships no icon set).
- [x] 2.3 Render the Clients screen's date-grouped grid of listing cards under the filter pill row. Derive the feed timestamp from feed position times a fixed step measured back from a fixed prototype clock (deterministic), and treat a listing on an upcoming tour stop as saved (`savedCount` carries no listing ids). Verify Today / Yesterday headings and "New N hrs ago" pills are stable across runs.
- [x] 2.4 Fix the four screenshot-caught issues the typecheck could not: status text clipping (add `min-width: 0` so the price-row addon does not shrink; grid minimum set to 288px, the narrowest card that fits a seven-figure price beside "PRICE CHANGE | 198 DOM"); the un-clickable select checkbox (`CardOverlay` restores `pointer-events` only for `:is(a, button)`, but Haven's `Checkbox` is an input in a label); the unreachable single Closed listing (add a Closed filter pill); and two-line addresses (join `address1`/`address2` block spans into one line).

## 3. Scope agent-web to five clients, each with their own feed

- [x] 3.1 Introduce a five-client roster (`cli_02`, `cli_03`, `cli_04`, `cli_05`, `cli_08`) backing every client-derived export, keeping four of the five statuses and every degenerate-state record (cli_03's open requests, cli_04's zero saves and missing saved search, cli_08 archived with 15 saves, cli_05's zero-stop tour). Scope tours to the roster (10 → 5) so no tour row names a client the list cannot open.
- [x] 3.2 Replace the screen-wide pill/group/filter exports with a `ClientFeed` per subnav row via `feedFor(id)`. Build each feed as the client's tour-stop listings topped up from the front of the global feed order to an authored size (5 / 4 / 3 / 2 / 1) so the five overlap by construction. Verify pill counts, tile numbers, and the header count follow the selected row, and day headings / card ages stay on global feed positions.
- [x] 3.3 Replace the three drop-to-fill image slots with library homes from `imageForKey`, and delete `ImageSlot.tsx` with its `localStorage` flow (no other consumer; leftover `ra-image-slot:*` keys are orphaned and inert).
- [x] 3.4 Hardcode the logged-in agent's display name as Georgia Booth while `agt_01` still supplies her feed id, brokerage, and team. Verify the header titles the agent's own row "My feed".

## 4. Swap the sample image library to fixed home photos

- [x] 4.1 Repoint the 15 `homeImageLibrary` entries and all 10 listings' `primaryPhoto` from random `picsum.photos` seeds to fixed `images.unsplash.com` URLs, each depicting a home matching its `label`, with crop/quality in the query string so a URL always returns the same picture. Leave agent/client `avatar` fields on `picsum` seeds.
- [x] 4.2 Update `SKILL.md`'s image guidance and the `homeImageLibrary` row (Unsplash home photos, not picsum seeds), and re-inject the dataset into agent-web and consumer-web. Leave client-web untouched (no listing surface).

## 5. Verification

- [x] 5.1 Run `npx tsc --noEmit` in `agent-web` and confirm a clean typecheck (the shells have no separate typecheck script).
- [x] 5.2 Load the Clients screen in the browser and confirm every feed size (5 / 4 / 3 / 2 / 1), the empty-tile copy for cli_04, the zero-stop past tour, and no console errors.
- [x] 5.3 Confirm the degenerate records render without breaking a layout (`lst_09` null sqft, `lst_08` single photo) and that fixed home photos load on every listing card.
- [x] 5.4 Confirm out-of-scope surfaces are untouched: client-web has no listing surface and was not modified by the image swap.
