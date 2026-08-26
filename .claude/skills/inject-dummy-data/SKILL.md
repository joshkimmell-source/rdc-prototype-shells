---
name: inject-dummy-data
description: Inject the fictional RDC sample dataset (agents, clients, saved searches, listings, tours, home images) into a prototype shell and wire it to the screens that currently use placeholder content. Use when asked to add dummy/sample/fake/seed data to a prototype, populate a shell with realistic content, replace placeholder listings or clients, or prepare a prototype for user testing.
---

# Inject dummy data into a prototype

Copies a fixed, fully fictional dataset into a prototype shell and rewires that
shell's placeholder content to read from it. Ten records per type, plus a
15-image library. The data never changes between runs — two prototypes populated
by this skill show the same people and properties, which is what makes screenshots
and user-testing sessions comparable.

## What's in the dataset

`assets/sample-data.json` — the data. `assets/index.ts` — typed accessors,
lookups, and formatters over it.

| Collection | Count | Notes |
| --- | --- | --- |
| `agents` | 10 | Paired into 5 brokerages, 2 agents each |
| `clients` | 10 | Singles and couples; `agentId` points at an agent |
| `savedSearches` | 10 | 9 owned by clients, 1 by `'agent'` |
| `listings` | 10 | Covers New / Active / Price Change / Coming Soon / Closed |
| `tours` | 10 | 4 Upcoming, 6 Past; one has zero stops |
| `homeImageLibrary` | 15 | Fixed Unsplash home photos, full + thumb |

Deliberate edge cases — keep them, they are the point. A prototype that renders
all ten records renders its own empty and degenerate states for free:

- `lst_09` (Duplex) has `sqft: null`, `bathsFull: 0`, `parking: "—"`, and a
  `units` field the other listings lack.
- `lst_08` has `photoCount: 1` — a gallery with nothing to page through.
- `tour_06` has `stops: []` and `startTime: null`.
- Several tour stops have `time: null` and `tourStatus: "No status"`.
- `cli_04` has `savedCount: 0`; `cli_08` is `Archived` with 15 saves.
- `priceHistory` is `[]` for listings that never repriced.

Safety properties, which any edit must preserve: phone numbers are in the
fictional `555` block, emails are on `example.com` (RFC 2606), MLS ids are
prefixed `SAMPLE:`, and cities/states are invented (`ST` is not a real state
code). A user-testing participant who taps a phone number or email cannot reach
a real person.

## Procedure

### 1. Identify the target shell

This repo has two: `agent-vision/`, `agent-web/`. If the user
named one, use it. If not, and more than one could plausibly be meant, ask which
— don't populate both on a guess.

### 2. Copy the assets in

```bash
mkdir -p <shell>/src/data/sample
cp .claude/skills/inject-dummy-data/assets/sample-data.json <shell>/src/data/sample/
cp .claude/skills/inject-dummy-data/assets/index.ts        <shell>/src/data/sample/
```

`resolveJsonModule` is already on in both shells' `tsconfig.json`, so the
JSON import in `index.ts` type-checks with no config change.

**If `src/data/sample/` already exists**, the skill has run before. Overwrite
both files (they are generated), but read any *other* file in that directory
first and leave it alone — that's hand-written mapping, see step 4.

### 3. Find what currently holds placeholder content

Grep the shell for the constants the screens read. As of this writing:

- `agent-web/src/data.ts` — `CLIENTS`, `LISTINGS`, `TOURS`, `BUYERS`,
  `INITIAL_UPCOMING_TOURS`, `THREADS`, plus `TAGC` / `STAGES` / `CLIENT_PILLS`
  and the chip and menu label arrays.

Verify by grepping rather than trusting that list; the shells change.

### 4. Adapt, don't reshape

The shells' existing types are **not** the dataset's shape. `agent-web`'s
`Client` has `stage` / `budget` / `looking` / `financing`; this dataset has
`status` / `savedCount` / `tourRequestCount`. `agent-web`'s `Listing` is three
pre-formatted strings (`address`, `meta`, `hood`); this dataset is structured
fields.

Write an adapter, in `<shell>/src/data/sample/adapters.ts`. Map from the sample
data to whatever shape the shell's components already consume, then point the
shell's existing exported constants at the adapter output. Two reasons this
beats editing components to take the new shape: the components keep working
unchanged, and re-running this skill can overwrite `index.ts` and
`sample-data.json` without touching your mapping.

```ts
// <shell>/src/data/sample/adapters.ts
import {
  CLIENTS as SAMPLE_CLIENTS,
  LISTINGS as SAMPLE_LISTINGS,
  formatPrice,
  formatListingMeta,
  clientInitials,
  type Client as ShellClientSource,
} from './index'
import type { Client, Listing } from '../../data'

export const clients: Client[] = SAMPLE_CLIENTS.map(c => ({
  id: c.id,
  name: c.displayName,
  initials: clientInitials(c),
  stage: STAGE_BY_STATUS[c.status],   // map the vocabularies explicitly
  saved: c.savedCount,
  // ...fill the rest from the sample record or a sensible constant
}))

export const listings: Listing[] = SAMPLE_LISTINGS.map(l => ({
  address: l.address.line1,
  meta: `${formatPrice(l.price)} · ${formatListingMeta(l)}`,
  hood: l.address.city,
}))
```

Where the shell's type needs a field the dataset has no equivalent for
(`financing`, `nextTour`), derive it if you can and otherwise use a plain
fictional constant — never invent a value that looks like real PII, and never
widen the shell's type to `any` to dodge the mismatch.

Preserve any status/stage vocabulary the shell's UI keys off. `agent-web`'s
`TAGC` maps stage strings to Haven tag colors; if you introduce this dataset's
`status` values (`Active`, `Requests`, `Invited`, `Shared`, `Archived`), either
map them onto the existing stage keys or add entries to `TAGC` so the tags still
resolve a color. A stage with no `TAGC` entry renders an undefined `dataColor`.

### 5. Use the formatters

`index.ts` ships these — use them instead of re-deriving formatting at each call
site, so a listing looks identical on a card, in a list, and on a detail page:

`formatPrice` · `formatPriceShort` · `formatBaths` · `formatAddress` ·
`formatCityLine` · `formatListingMeta` · `clientInitials` · `formatMinutes` ·
`formatTourDate` · `formatTourSummary`

And these lookups: `getAgent` · `getClient` · `getListing` · `getTour` ·
`CURRENT_AGENT` · `clientsForAgent` · `toursForClient` ·
`savedSearchesForClient` · `agentSavedSearches` · `upcomingTours` · `pastTours` ·
`listingsByStatus` · `openHouseListings` · `priceDropListings` ·
`tourStopsWithListings` · `imageForKey`

Note on halves: `formatBaths` returns a number (`2.5`), following MLS
convention — `bathsFull + bathsHalf * 0.5`. Don't display `bathsFull` alone; a
4-bed with a half bath will read as under-bathroomed.

### 6. Images

Use `listing.primaryPhoto` for a listing's own photo. For a surface that needs a
photo but has no listing behind it, call `imageForKey(someStableKey)` — same key
always returns the same image, so screenshots don't churn between runs.

Property photos are fixed `images.unsplash.com` URLs — one per library entry,
each depicting a home that matches its `label`, with the crop and quality baked
into the query string so the same URL always returns the same picture. Agent and
client `avatar` fields are still `picsum.photos` seeds. Either way the URLs are
remote, so **images need network access**. Two consequences worth flagging to
the user:

- `agent-web`'s `npm run bundle` inlines local assets into a single HTML file,
  but these are remote URLs — they stay remote and will not render offline.
- `ImageSlot.tsx` persists dropped images to `localStorage` independently. This
  dataset does not populate image slots; leave that flow alone.

### 7. Verify

```bash
cd <shell> && npx tsc --noEmit    # the shells have no separate typecheck script
npm run dev                       # then look at every screen you touched
```

Do not report done on a clean typecheck alone. Load the screens and confirm:
every collection you wired renders, the edge-case records (`lst_09`, `lst_08`,
`tour_06`, `cli_04`) don't blow up a layout, and no placeholder text you meant to
replace is still visible. `npm install` in these shells needs the internal
Artifactory registry for `@rdc-npm` — VPN required. If `node_modules` is absent
and install fails, say so rather than reporting a passing verification you
didn't run.

### 8. Report

Tell the user which shell you populated, which constants now read from the
dataset, which shell fields had no dataset equivalent and what you filled them
with, and anything you deliberately left on placeholder content.

## Don'ts

- Don't edit `assets/sample-data.json` or `assets/index.ts` inside the skill
  directory to fit one prototype. They are the shared source. Adapt per-shell in
  that shell's `adapters.ts`.
- Don't add records to make a grid look fuller. Ten per type is the contract;
  repeat or slice within a screen if you need a different count.
- Don't drop the edge-case records because they render awkwardly. An awkward
  render is a finding — report it.
- Don't swap in real addresses, real brokerage names, or photos of real homes.
  Everything here is fictional on purpose.
