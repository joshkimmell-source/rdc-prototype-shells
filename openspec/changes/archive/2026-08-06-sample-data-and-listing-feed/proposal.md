## Why

The three prototype shells (`agent-web`, `client-web`, `consumer-web`) each carried their own placeholder content — `agent-web`'s `data.ts`, `consumer-web`'s `SAMPLE_LISTINGS`, `client-web`'s `CONTACT` — invented ad hoc and inconsistent between them, so screenshots and user-testing sessions across shells were not comparable. There was no shared, fixed dataset, and `agent-web`'s Clients screen had no listing feed at all: it showed the same placeholder set to everyone, so it could not demonstrate what the screen is for — an agent's book being a different size for each client. Placeholder imagery came from random `picsum.photos` seeds, which return an arbitrary picture per seed (a plate of food, a stranger's face) — fine as a grey-box stand-in, wrong in a session where the photo is the product.

## What Changes

- Add an **`inject-dummy-data` skill** that ships a fixed, fully fictional RDC sample dataset — 10 agents, 10 clients, 10 saved searches, 10 listings, 10 tours, and a 15-entry home-image library — plus typed accessors/lookups/formatters (`assets/index.ts` over `assets/sample-data.json`) and the procedure for wiring it into a shell. The data never varies between runs, which is the point: two populated shells show the same people and properties.
- Make the dataset **fictional and safe by construction**: phone numbers in the fictional `555` block, emails on `example.com` (RFC 2606), MLS ids prefixed `SAMPLE:`, and invented cities/states (`ST` is not a real state code), so a testing participant who taps a number or email cannot reach a real person.
- Preserve **deliberate degenerate records** as load-bearing (a `null` sqft duplex, a one-photo gallery, a zero-stop tour, a client with zero saves, an archived client with 15 saves), so a shell that renders all ten exercises its own empty states for free; the skill forbids dropping them to make a grid look fuller.
- **Populate `agent-web`** from the shared dataset through a per-shell `adapters.ts`, mapping the dataset's shape onto the shell's existing component types so no component is reshaped and re-running the skill can overwrite the generated files without clobbering the mapping.
- **Build the Clients screen's listing feed**: a date-grouped grid of Haven `PropertyCard`s under the filter pill row, with recency / price-drop / open-house overlay pills, a select checkbox, a "Saved" flag, and an action row. Feed timestamps and "saved" state are *derived* from the dataset (a deterministic feed clock and tour-stop membership), not invented as fields.
- **Scope `agent-web` to five clients, each with their own feed**: a roster of five (`cli_02`–`cli_08`) backs every client-derived export; a `ClientFeed` per subnav row replaces the screen-wide exports so the five see 5 / 4 / 3 / 2 / 1 listings that overlap by construction. Pill counts, tile numbers, and the header count follow the selected row.
- **Swap the sample image library to fixed home photos**: the 15 `homeImageLibrary` entries and all 10 listings' `primaryPhoto` move from random `picsum.photos` seeds to fixed `images.unsplash.com` URLs, each a home matching its `label`, with crop/quality baked into the query string so a URL always returns the same picture. Person `avatar` fields stay on `picsum` seeds — they stand in for people, not property.
- Out of scope: `client-web` has no listing surface and is untouched by the image swap; component reshaping is explicitly avoided in favor of the adapter.

## Capabilities

### New Capabilities
- `listing-feed`: The `agent-web` Clients screen's listing feed built from the shared fictional sample dataset — the dataset's fictional/safe guarantees, the per-client scoping to five feeds, and the fixed home imagery that backs it.

### Modified Capabilities
<!-- None. No existing specs; this behavior is introduced as a new capability spec. -->

## Impact

- **New skill:** `.claude/skills/inject-dummy-data/` — `SKILL.md`, `assets/sample-data.json`, `assets/index.ts` (typed accessors, lookups, formatters; the JSON type-checks via `resolveJsonModule`, already on in all three shells).
- **Affected code (agent-web):** `src/data/sample/` (copied-in `sample-data.json` + `index.ts`, hand-written `adapters.ts`), `src/data.ts` (exported constants now read from the adapter; `feedFor` / `CLIENT_TILE_IMAGES` replace the screen-wide feed exports), `src/screens/ClientsScreen.tsx` (date-grouped `PropertyCard` grid, per-feed pills/tiles), `src/components/ListingCard.tsx` (new, built on Haven `PropertyCard`), `src/icons.tsx` (heart, paper plane, price-drop arrow — Haven ships no icon set), `src/Shell.tsx` (selects the feed for the active subnav row and drives the header count), plus `assistant.ts`, `NavRail.tsx`, `Subnav.tsx`, and the search/tours map HTML touched during population.
- **Removed:** `agent-web/src/components/ImageSlot.tsx` and its `localStorage` flow (the three tiles now carry library homes from `imageForKey`; it had no other consumer, so any `ra-image-slot:*` keys in a browser are now orphaned).
- **Imagery:** all listing/library photos are remote `images.unsplash.com` URLs; person avatars remain remote `picsum.photos` seeds — both need network access. `agent-web`'s `npm run bundle` inlines local assets but leaves these remote, so they will not render offline.
- **Not affected:** `client-web` (no listing surface); the dataset's edge-case records are preserved, not trimmed.
