/**
 * Maps the shared sample dataset onto the shapes this shell's components already
 * consume. Hand-written — the `inject-dummy-data` skill overwrites `index.ts` and
 * `sample-data.json` in this directory but leaves this file alone.
 *
 * The two vocabularies do not line up. The dataset describes a client by their
 * *relationship to the agent* (`status`: Active / Requests / Invited / Shared /
 * Archived); this shell's table describes a *deal stage* with a budget, a search
 * brief and a financing note. Where the shell asks for something the dataset has no
 * column for, this file derives it — a client's budget and brief come from their
 * saved search, their next tour from their upcoming tours — and where nothing can be
 * derived it falls back to the em dash the shell already renders as "empty".
 */
import type { PropertyMetaData } from '@rdc-npm/rdc-ui-v4'
import {
  AGENTS,
  CLIENTS as SAMPLE_CLIENTS,
  CURRENT_AGENT,
  LISTINGS as SAMPLE_LISTINGS,
  TOURS as SAMPLE_TOURS,
  clientInitials,
  formatCityLine,
  formatListingMeta,
  formatPrice,
  formatPriceShort,
  formatTourDate,
  formatTourSummary,
  getClient,
  getListing,
  imageForKey,
  savedSearchesForClient,
  type Client as SampleClient,
  type ClientStatus,
  type HomeImage,
  type Listing as SampleListing,
  type ListingStatus,
  type SavedSearch,
  type Tour as SampleTour,
} from './index'
import type {
  Buyer,
  Client,
  Listing,
  TagColor,
  Thread,
  TourListItem,
  UpcomingTour,
} from '../../data'

/** The shell renders this as the muted "nothing here" value, so reuse it. */
const EMPTY = '—'

// ─── Roster ───────────────────────────────────────────────────────────────────

/**
 * The five clients this prototype shows.
 *
 * The dataset carries ten by contract and a shell may slice it. Five keeps the client
 * list readable without scrolling, and these five are the slice that keeps every
 * derived state on the Home screen alive: `cli_03` has open tour requests (the urgent
 * "needs attention" row), `cli_04` has `savedCount: 0` and no saved search at all (the
 * dormant-invite nudge, and the em-dash budget and brief), `cli_08` is Archived with 15
 * saves (the re-check nudge), `cli_05` is the only client recent enough to read as
 * online, and its one tour has no stops. `Shared` is the status that drops out; `stages`
 * filters itself to the statuses actually present, so no filter tab and no tag colour is
 * left pointing at nothing.
 */
const ROSTER_IDS = ['cli_02', 'cli_03', 'cli_04', 'cli_05', 'cli_08']

const ROSTER: SampleClient[] = SAMPLE_CLIENTS.filter(c => ROSTER_IDS.includes(c.id))

/**
 * Tours belonging to a roster client — scoped for the same reason the client list is.
 * A tour row is labelled with its client, so a tour left in for a client the list no
 * longer shows would name someone the agent cannot open.
 */
const ROSTER_TOURS: SampleTour[] = SAMPLE_TOURS.filter(t => ROSTER_IDS.includes(t.clientId))

/**
 * Clients whose upcoming tour is *coordinated through the assistant*, not pre-baked into the
 * displayed lists. Their tour data still exists (the RealAssist+ flow reads it to build the
 * plan), but the tour stays out of the Home "Upcoming tours" card and the Tours subnav until
 * the flow schedules it — the shell reveals it on "Confirm & schedule". Jordan & Mia
 * (`cli_02`) is the flow's subject; Priyanka (`cli_03`) and the rest read as already-created
 * and show from the start. Past tours are unaffected — they happened, so they always show.
 */
const ASSISTANT_COORDINATED_CLIENT_IDS = new Set(['cli_02'])

/** The dataset's `upcomingTours()`, narrowed to the roster. Soonest first. */
const upcomingRosterTours = (): SampleTour[] =>
  ROSTER_TOURS.filter(t => t.state === 'Upcoming').sort((a, b) => a.date.localeCompare(b.date))

/**
 * How many listings each client's feed carries.
 *
 * Distinct per client, so five clients read as five different-sized books of business
 * rather than five copies of the same ten cards. The dataset has no client→listing
 * relation to derive this from — `savedCount` is a bare number — so the sizes are
 * authored here. They are floors, not exact counts: a client's own tour stops always
 * sit inside their own feed, and `cli_02` has toured five distinct listings across its
 * three tours, which is why it is the one with five.
 */
const FEED_SIZES: Record<string, number> = {
  cli_02: 5,
  cli_08: 4,
  cli_05: 3,
  cli_03: 2,
  cli_04: 1,
}

/** Listings this client has a tour stop for, upcoming or past. */
const touredListingIds = (clientId: string): Set<string> =>
  new Set(
    ROSTER_TOURS.filter(t => t.clientId === clientId).flatMap(t => t.stops.map(s => s.listingId)),
  )

const listingCountFor = (clientId: string): number =>
  Math.max(FEED_SIZES[clientId] ?? 0, touredListingIds(clientId).size)

/**
 * "Today", for the assistant's relative-date parsing ("saturday", "tomorrow") and for
 * the Clients screen's date-grouped listing feed.
 *
 * Derived as five days before the soonest upcoming tour rather than hardcoded, so it
 * stays behind every tour the Home screen calls upcoming. A fixed literal would drift
 * the moment the dataset's dates changed and start rendering upcoming tours as past.
 */
export const PROTOTYPE_TODAY: Date = (() => {
  const soonest = upcomingRosterTours()[0]
  const [y, m, d] = (soonest?.date ?? '2026-08-09').split('-').map(Number)
  return new Date(y, m - 1, d - 5)
})()

/**
 * How to address a client in a sentence.
 *
 * `displayName` is a label, not a name — four of the ten records are households
 * ("The Halvorsen Household", "Jordan & Mia Castellanos"), so slicing the first word
 * off it yields "The" or drops a partner. The dataset's `members` array holds each
 * person's full name, so first names come from there: one member gives "Erik", two give
 * "Jordan and Mia".
 */
export function greetingName(c: SampleClient): string {
  const firsts = c.members.map(m => m.split(' ')[0]).filter(Boolean)
  if (firsts.length === 0) return c.displayName
  if (firsts.length === 1) return firsts[0]
  return `${firsts.slice(0, -1).join(', ')} and ${firsts[firsts.length - 1]}`
}

// ─── Client ───────────────────────────────────────────────────────────────────

/**
 * The dataset's `status` becomes the shell's `stage`. Kept verbatim rather than
 * squeezed into the old deal-stage words so the filter column, the tag colours and
 * the underlying data all say the same thing.
 */
export const STAGE_TAG_COLORS: Record<ClientStatus, TagColor> = {
  Active: 'greenSubtle',
  Requests: 'orangeSubtle',
  Invited: 'blueSubtle',
  Shared: 'purpleSubtle',
  Archived: 'graySubtle',
}

const STAGE_LABELS: Record<ClientStatus, string> = {
  Active: 'Active',
  Requests: 'Tour requests',
  Invited: 'Invited',
  Shared: 'Shared with agent',
  Archived: 'Archived',
}

/**
 * No financing column exists in the dataset. These are fixed fictional strings keyed
 * off status — enough to make the column read as populated without inventing a
 * number that looks like a real pre-approval for a real person.
 */
const FINANCING_BY_STATUS: Record<ClientStatus, string> = {
  Active: 'Pre-approved',
  Requests: 'Pre-approved',
  Invited: 'Not pre-approved yet',
  Shared: 'Pre-approved',
  Archived: 'Pre-approval expired',
}

/** `{ priceMin: 600000, priceMax: 950000 }` → `"$600K–$950K"`. */
function budgetFromSearch(search: SavedSearch | undefined): string {
  if (!search) return EMPTY
  const { priceMin, priceMax } = search.criteria
  const hasMin = typeof priceMin === 'number' && priceMin > 0
  const hasMax = typeof priceMax === 'number' && priceMax > 0
  if (hasMin && hasMax) return `${formatPriceShort(priceMin)}–${formatPriceShort(priceMax)}`
  if (hasMax) return `Up to ${formatPriceShort(priceMax)}`
  if (hasMin) return `${formatPriceShort(priceMin)}+`
  return EMPTY
}

/** `"Condominium · 1+ bd in Rivertown, ST"` — the search brief, from the criteria. */
function briefFromSearch(search: SavedSearch | undefined): string {
  if (!search) return EMPTY
  const { location, propertyType, bedsMin, keywords, features, openHouseOnly } = search.criteria
  const head: string[] = []
  if (propertyType) head.push(propertyType)
  if (bedsMin) head.push(`${bedsMin}+ bd`)
  if (openHouseOnly) head.push('Open houses')
  if (features?.length) head.push(features.join(', '))
  if (keywords) head.push(`“${keywords}”`)
  return head.length ? `${head.join(' · ')} in ${location}` : location
}

/** The client's soonest upcoming tour, as `"Sat, Aug 15 · 10:00 AM"`. */
function nextTourFor(clientId: string): string {
  const next = upcomingRosterTours().find(t => t.clientId === clientId)
  if (!next) return EMPTY
  const date = formatTourDate(next.date)
  return next.startTime ? `${date} · ${next.startTime}` : date
}

function toClient(c: SampleClient): Client {
  const search = savedSearchesForClient(c.id)[0]
  return {
    id: c.id,
    name: c.displayName,
    greetingName: greetingName(c),
    initials: clientInitials(c),
    stage: c.status,
    budget: budgetFromSearch(search),
    looking: briefFromSearch(search),
    financing: FINANCING_BY_STATUS[c.status],
    lastActivity: `Last seen ${c.lastSeen}`,
    saved: c.savedCount,
    nextTour: nextTourFor(c.id),
  }
}

export const clients: Client[] = ROSTER.map(toClient)

/** `all` first, then one entry per status that actually appears in the data. */
export const stages: Array<[string, string]> = [
  ['all', 'All clients'],
  ...(Object.keys(STAGE_LABELS) as ClientStatus[])
    .filter(status => ROSTER.some(c => c.status === status))
    .map((status): [string, string] => [status, STAGE_LABELS[status]]),
]

// ─── Listing ──────────────────────────────────────────────────────────────────

export const listings: Listing[] = SAMPLE_LISTINGS.map(l => ({
  address: l.address.line1,
  meta: `${formatPrice(l.price)} · ${formatListingMeta(l)}`,
  hood: l.address.city,
}))

// ─── Subnav: buyers ───────────────────────────────────────────────────────────

/** "Last seen 20 mins ago" reads as present; anything coarser does not. */
const isOnline = (lastSeen: string) => /\bmins?\b/.test(lastSeen)

/**
 * The logged-in agent's name — the subnav's feed row, the nav rail avatar, and the
 * assistant's greeting.
 *
 * Hardcoded rather than read from the dataset's `agt_01` (Dana Ellison), which is what
 * `CURRENT_AGENT` still supplies for everything else about her: the feed id, the
 * brokerage line, and the rest of the team. Fictional, like the dataset it sits beside.
 */
const AGENT_NAME = { first: 'Georgia', last: 'Booth' }

export const AGENT_FULL_NAME = `${AGENT_NAME.first} ${AGENT_NAME.last}`
export const AGENT_INITIALS = `${AGENT_NAME.first[0]}${AGENT_NAME.last[0]}`
/**
 * Headshot for the nav rail's Account item. A fixed seed keeps the same face between runs,
 * matching how the home-photo library is addressed; `initials` remain the fallback if it
 * fails to load.
 */
export const AGENT_AVATAR = 'https://i.pravatar.cc/120?img=47'

export const buyers: Buyer[] = [
  {
    id: CURRENT_AGENT.id,
    name: AGENT_FULL_NAME,
    initials: AGENT_INITIALS,
    sub: 'Your personal feed',
    online: true,
  },
  ...ROSTER.map((c): Buyer => {
    const n = listingCountFor(c.id)
    return {
      id: c.id,
      name: c.displayName,
      initials: clientInitials(c),
      // The row's second line carries the size of their feed as well as their recency —
      // it is the one place the five clients sit together, so it is where five different
      // listing counts are legible as five different counts.
      sub: `${n} ${n === 1 ? 'listing' : 'listings'} · ${c.lastSeen}`,
      online: isOnline(c.lastSeen),
    }
  }),
]

/** The agent's own feed row, which the header titles "My feed" rather than a name. */
export const AGENT_FEED_ID = CURRENT_AGENT.id

/** The row the Clients subnav starts on — the first real client, not the agent. */
export const DEFAULT_BUYER_ID = ROSTER[0].id

// ─── Subnav: tours ────────────────────────────────────────────────────────────

const clientName = (clientId: string) => getClient(clientId)?.displayName ?? 'Unknown client'

const clientInitialsFor = (clientId: string) => {
  const c = getClient(clientId)
  return c ? clientInitials(c) : '?'
}

/** Upcoming first (soonest first), then past (most recent first) — as the tabs read. */
const TOURS_ORDERED: SampleTour[] = [
  ...upcomingRosterTours(),
  ...ROSTER_TOURS.filter(t => t.state === 'Past').sort((a, b) => b.date.localeCompare(a.date)),
]

export const tours: TourListItem[] = TOURS_ORDERED.map(t => ({
  id: t.id,
  name: clientName(t.clientId),
  initials: clientInitialsFor(t.clientId),
  meta: formatTourSummary(t),
  upcoming: t.state === 'Upcoming',
}))

/**
 * Upcoming tours coordinated through the assistant rather than pre-created — held back from
 * the Tours subnav (and the Home card) until the flow schedules them. The shell seeds its
 * "created" set as every tour minus these, then adds one back when the flow books it.
 */
export const withheldTourIds: string[] = upcomingRosterTours()
  .filter(t => ASSISTANT_COORDINATED_CLIENT_IDS.has(t.clientId))
  .map(t => t.id)

/**
 * The tour the Tours subnav starts on. Deliberately the richest upcoming tour rather
 * than the soonest: `public/tours-map.html` is a static file that hardcodes one tour's
 * stops, and it mirrors this one. Picking the soonest instead would open the subnav on
 * a single-stop tour while the map still drew three, so the two would disagree.
 */
export const DEFAULT_TOUR_ID =
  upcomingRosterTours().reduce((best, t) => (t.stopCount > best.stopCount ? t : best))
    .id

// ─── Home: upcoming tours card ────────────────────────────────────────────────

/**
 * A stop's address.
 *
 * Prefers the joined listing's address over the stop's own. In the dataset the two
 * disagree for `tour_01` — its three stops carry addresses that belong to no listing,
 * while their `listingId`s point at real records. Trusting the listing keeps a tour
 * stop, the listing card for the same property, and the map pin all reading the same
 * street.
 */
const stopAddress = (stop: SampleTour['stops'][number]): string =>
  getListing(stop.listingId)?.address.line1 ?? stop.address

/** `"142 Larkspur Ave +2 stops"`, or a note for a tour with nothing on it. */
function tourAddressLine(t: SampleTour): string {
  const [first, ...rest] = t.stops
  if (!first) return 'No stops yet'
  if (!rest.length) return stopAddress(first)
  return `${stopAddress(first)} +${rest.length} ${rest.length === 1 ? 'stop' : 'stops'}`
}

function toUpcomingTour(t: SampleTour): UpcomingTour {
  const date = formatTourDate(t.date)
  const [y, m, d] = t.date.split('-').map(Number)
  return {
    when: t.startTime ? `${date} · ${t.startTime}` : date,
    address: tourAddressLine(t),
    client: clientName(t.clientId),
    type: `Buyer tour · ${t.stopCount} ${t.stopCount === 1 ? 'stop' : 'stops'}`,
    at: new Date(y, m - 1, d).getTime(),
  }
}

export const initialUpcomingTours: UpcomingTour[] = upcomingRosterTours()
  .filter(t => !ASSISTANT_COORDINATED_CLIENT_IDS.has(t.clientId))
  .map(toUpcomingTour)

// ─── Tours map (public/tours-map.html) ──────────────────────────────────────────

/** One pin/row on the tour map, in the shape the framed page renders. */
export interface MapTourStop {
  order: string
  /** Listing status, e.g. "Price Change" — the map's "Status" column. */
  status: string
  /** Street line, read off the joined listing (see `stopAddress`). */
  addr: string
  /** `"Summit Grove, ST"`. */
  city: string
  /** `null` where the stop has no time locked in yet. */
  time: string | null
  tourStatus: string
  /** Pseudo-coordinate — see `coordFor`; the dataset carries no real location. */
  ll: [number, number]
}

/** A whole tour, as `public/tours-map.html` draws it. Posted into the frame per selection. */
export interface MapTour {
  id: string
  client: string
  date: string
  /** `null` for a single-stop tour, which has no leg to drive or walk. */
  drive: string | null
  walk: string | null
  stops: MapTourStop[]
}

/** `"2026-08-15"` → `"Sat, Aug 15 '26"` — the tour-map header's own date format. */
function mapTourDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const weekday = dt.toLocaleDateString('en-US', { weekday: 'short' })
  const month = dt.toLocaleDateString('en-US', { month: 'short' })
  return `${weekday}, ${month} ${d} '${String(y).slice(2)}`
}

/** Minutes → `"36 min"`, `"4 hr"`, `"13 hr 5 min"`; 0 or less → `null` (nothing to show). */
function durationLabel(mins: number): string | null {
  if (!mins || mins <= 0) return null
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (!h) return `${m} min`
  return m ? `${h} hr ${m} min` : `${h} hr`
}

/**
 * A stable pseudo-coordinate per address. The dataset's cities are fictional and carry no
 * real location; the map only needs pins that are separated and don't jump between renders,
 * so a small hash of the street spreads them ~±0.03° (a few km) around one base point.
 */
function coordFor(addr: string): [number, number] {
  let h = 0
  for (let i = 0; i < addr.length; i++) h = (h * 31 + addr.charCodeAt(i)) >>> 0
  const lat = 37.54 + ((h % 1000) / 1000 - 0.5) * 0.06
  const lng = -122.05 + ((Math.floor(h / 1000) % 1000) / 1000 - 0.5) * 0.06
  return [Number(lat.toFixed(4)), Number(lng.toFixed(4))]
}

function toMapTour(t: SampleTour): MapTour {
  const multi = t.stops.length > 1
  return {
    id: t.id,
    client: clientName(t.clientId),
    date: mapTourDate(t.date),
    drive: multi ? durationLabel(t.driveTimeMins) : null,
    walk: multi ? durationLabel(t.walkTimeMins) : null,
    stops: t.stops.map(s => {
      const l = getListing(s.listingId)
      const addr = stopAddress(s)
      return {
        order: s.order,
        status: l?.status ?? s.listingStatus,
        addr,
        city: l ? `${l.address.city}, ${l.address.state}` : '',
        time: s.time ?? null,
        tourStatus: s.tourStatus,
        ll: coordFor(addr),
      }
    }),
  }
}

/**
 * Every roster tour keyed by id, in the shape `public/tours-map.html` renders. The shell
 * posts the selected tour's entry into the frame, so the map follows the Tours subnav.
 */
export const tourMapData: Record<string, MapTour> = Object.fromEntries(
  TOURS_ORDERED.map(t => [t.id, toMapTour(t)])
)

// ─── Home: client needs ───────────────────────────────────────────────────────

export interface ClientNeed {
  client: string
  text: string
  /** `brand` for time-sensitive, `amber` for a nudge — resolved to a colour in the shell. */
  tone: 'brand' | 'amber'
  /** The question to send RealAssist+ when the spark button is pressed. */
  prompt: string
}

/**
 * Derived rather than authored: an open tour request is the time-sensitive case, an
 * invite nobody has acted on is the nudge. Sorted so the urgent ones lead.
 */
export const clientNeeds: ClientNeed[] = ROSTER.flatMap((c): ClientNeed[] => {
  const first = greetingName(c)

  if (c.tourRequestCount > 0 && c.status === 'Requests') {
    return [
      {
        client: c.displayName,
        text: `${c.tourRequestCount} tour ${c.tourRequestCount === 1 ? 'request' : 'requests'} waiting on you`,
        tone: 'brand',
        prompt: `What should I do about ${first}’s open tour requests?`,
      },
    ]
  }

  if (c.status === 'Invited' && c.savedCount === 0) {
    return [
      {
        client: c.displayName,
        text: `Invited ${c.lastSeen} — no saved homes yet`,
        tone: 'amber',
        prompt: `Draft a short re-invite note for ${first}`,
      },
    ]
  }

  if (c.status === 'Archived' && c.savedCount > 0) {
    return [
      {
        client: c.displayName,
        text: `Archived with ${c.savedCount} saved homes — worth a re-check`,
        tone: 'amber',
        prompt: `Is it worth re-engaging ${first}?`,
      },
    ]
  }

  return []
})

// ─── Home: stat grid ──────────────────────────────────────────────────────────

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0)

export const savedHomesTotal = sum(ROSTER.map(c => c.savedCount))
export const tourRequestsTotal = sum(ROSTER.map(c => c.tourRequestCount))
export const activeClientCount = ROSTER.filter(c => c.status === 'Active').length
export const invitedClientCount = ROSTER.filter(c => c.status === 'Invited').length

/**
 * Clients with an open request — not `tourRequestsTotal`, which counts requests. The
 * subnav's two tabs sit side by side, so both have to count the same kind of thing.
 */
export const requestClientCount = ROSTER.filter(c => c.status === 'Requests').length

// ─── Clients screen ───────────────────────────────────────────────────────────

/**
 * The listing feed under the tiles — one card per listing the agent's clients are
 * seeing, grouped by the day it surfaced.
 *
 * Two things the dataset does not carry, derived here rather than invented as fields:
 *
 * 1. **A feed timestamp.** A listing has `daysOnMarket` but no "showed up in this feed
 *    at" time, and the cards need one for both the "New 3 hrs ago" pill and the
 *    Today / Yesterday headings. The feed is ordered freshest-listing-first and each
 *    position is one `FEED_STEP_MINUTES` older than the one before it, measured back
 *    from `PROTOTYPE_NOW`. Deterministic, so screenshots don't churn between runs.
 * 2. **Which listings a client saved.** `savedCount` is a number per client, with no
 *    listing ids behind it. A listing on an upcoming tour stop is treated as saved —
 *    somebody asked to see it, which is the same signal the heart carries.
 */

/**
 * The prototype's wall clock. `PROTOTYPE_TODAY` is midnight, which would put every
 * listing in the feed "yesterday"; the feed needs a time of day to measure back from.
 * Early afternoon, so a workday's worth of listings sits under "Today".
 */
const PROTOTYPE_NOW = new Date(PROTOTYPE_TODAY.getTime() + 14 * 60 * 60 * 1000)

/**
 * How much older each successive card in the feed is. Chosen so the ten listings span
 * today and yesterday — enough for the date headings to have something to separate.
 */
const FEED_STEP_MINUTES = 130

/** The age of the freshest card. Anything below an hour renders in minutes. */
const FEED_FIRST_MINUTES = 39

const MINUTE_MS = 60 * 1000
const DAY_MS = 24 * 60 * MINUTE_MS

/** The dataset's status vocabulary, in the words a listing card uses. */
const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  New: 'NEW',
  Active: 'FOR SALE',
  'Price Change': 'PRICE CHANGE',
  'Coming Soon': 'COMING SOON',
  Closed: 'SOLD',
}

/** True when a listing's history shows the price coming down. */
const hasPriceDrop = (l: SampleListing): boolean =>
  l.priceHistory.length > 1 && l.priceHistory[l.priceHistory.length - 1].price < l.priceHistory[0].price

/**
 * `"39 min ago"` / `"3 hrs ago"` / `"2 days ago"`. Coarser than `formatMinutes`, which
 * would put "13 hr 20 min" on a pill 60px wide.
 */
function formatAge(minutes: number): string {
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 36) return `${hours} ${hours === 1 ? 'hr' : 'hrs'} ago`
  const days = Math.round(hours / 24)
  return `${days} ${days === 1 ? 'day' : 'days'} ago`
}

/** `"08/05/26"` — the short date the group headings carry. */
const shortDate = (d: Date) =>
  d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })

/** `0` → `"Today"`, `1` → `"Yesterday, 08/05/26"`, else `"Mon, 08/04/26"`. */
function dayHeading(daysAgo: number, date: Date): string {
  if (daysAgo === 0) return 'Today'
  if (daysAgo === 1) return `Yesterday, ${shortDate(date)}`
  return `${date.toLocaleDateString('en-US', { weekday: 'short' })}, ${shortDate(date)}`
}

/**
 * `"2 garage"` → `"2 garage parking"`, `"1 total"` → `"1 parking space"`, `"—"` →
 * `"Parking not listed"`. The dataset's `parking` is free text, so it is normalised
 * here rather than concatenated at the call site.
 */
function parkingLine(parking: string): string {
  if (parking === EMPTY) return 'Parking not listed'
  const match = parking.match(/^(\d+)\s+(.+)$/)
  if (!match) return `${parking} parking`
  const [, count, kind] = match
  if (kind === 'total') return `${count} parking ${count === '1' ? 'space' : 'spaces'}`
  return `${count} ${kind} parking`
}

/**
 * A pill over the photo. `kind` decides both the Tag colour and, for `priceDrop`, that
 * the text is two prices needing the first struck through — so it names what the pill
 * *is* rather than how it looks.
 */
export interface ListingPill {
  text: string
  kind: 'new' | 'priceDrop' | 'openHouse'
}

export interface ClientListing {
  id: string
  photo: string
  /** Alt text for the photo — the street address, which is what the card links to. */
  photoAlt: string
  price: number
  /** `"NEW"`, `"PRICE CHANGE"` — the status in the card's own words. */
  status: string
  /** Days on market. Rendered beside the status. */
  dom: number
  address1: string
  address2: string
  propertyType: string
  /** `"2 garage parking"`, or the unit count for a multi-unit property. */
  secondary: string
  /** Haven's `PropertyMeta` shape — snake_case MLS fields, not the dataset's camelCase. */
  meta: PropertyMetaData
  /** The recency or price-drop pill, whichever this listing has earned. */
  headline: ListingPill
  /** The open-house pill, when there is one. */
  openHouse: ListingPill | null
  saved: boolean
}

export interface ClientListingGroup {
  /** `"Today"` / `"Yesterday, 08/05/26"`. */
  heading: string
  listings: ClientListing[]
}

/** Listings on an upcoming tour — see the note above on deriving "saved". */
const SAVED_LISTING_IDS = new Set(
  upcomingRosterTours().flatMap(t => t.stops.map(s => s.listingId)),
)

/**
 * Freshest first. `daysOnMarket` is the only recency the dataset has, so it decides
 * feed order; the id breaks ties so the order is stable across runs.
 */
const FEED_ORDER: SampleListing[] = [...SAMPLE_LISTINGS].sort(
  (a, b) => a.daysOnMarket - b.daysOnMarket || a.id.localeCompare(b.id),
)

function toClientListing(l: SampleListing, index: number): ClientListing {
  const minutesAgo = FEED_FIRST_MINUTES + index * FEED_STEP_MINUTES

  const drop = hasPriceDrop(l)
  const was = l.priceHistory[0]?.price

  const extraOpenHouses = l.openHouse.length - 1

  return {
    id: l.id,
    photo: l.primaryPhoto,
    photoAlt: `${l.address.line1}, ${formatCityLine(l)}`,
    price: l.price,
    status: LISTING_STATUS_LABELS[l.status],
    dom: l.daysOnMarket,
    address1: l.address.line1,
    address2: formatCityLine(l),
    propertyType: l.propertyType,
    // A multi-unit property leads with its unit count; everything else with parking.
    secondary: l.units ? `${l.units} units · ${parkingLine(l.parking)}` : parkingLine(l.parking),
    meta: {
      beds: l.beds,
      baths_full: l.bathsFull,
      baths_half: l.bathsHalf,
      // `null` means "no square footage on file"; PropertyMeta wants it absent.
      sqft: l.sqft ?? undefined,
    },
    headline: drop
      ? { text: `${formatPriceShort(was)} ${formatPriceShort(l.price)}`, kind: 'priceDrop' }
      : { text: `New ${formatAge(minutesAgo)}`, kind: 'new' },
    openHouse: l.openHouse.length
      ? {
          text: `Open ${l.openHouse[0]}${extraOpenHouses > 0 ? ` +${extraOpenHouses}` : ''}`,
          kind: 'openHouse',
        }
      : null,
    saved: SAVED_LISTING_IDS.has(l.id),
  }
}

export const clientListings: ClientListing[] = FEED_ORDER.map(toClientListing)

/**
 * The feed, split into day sections. Grouped by calendar day rather than by elapsed
 * hours, so a card 14 hours old lands under "Yesterday" if it crossed midnight — which
 * is what the heading claims.
 */
export const clientListingGroups: ClientListingGroup[] = (() => {
  const groups: ClientListingGroup[] = []
  const byDaysAgo = new Map<number, ClientListing[]>()

  FEED_ORDER.forEach((l, index) => {
    const minutesAgo = FEED_FIRST_MINUTES + index * FEED_STEP_MINUTES
    const at = new Date(PROTOTYPE_NOW.getTime() - minutesAgo * MINUTE_MS)
    const midnight = new Date(at.getFullYear(), at.getMonth(), at.getDate())
    const daysAgo = Math.round((PROTOTYPE_TODAY.getTime() - midnight.getTime()) / DAY_MS)

    const bucket = byDaysAgo.get(daysAgo)
    if (bucket) {
      bucket.push(clientListings[index])
    } else {
      byDaysAgo.set(daysAgo, [clientListings[index]])
      groups.push({ heading: dayHeading(daysAgo, midnight), listings: byDaysAgo.get(daysAgo)! })
    }
  })

  return groups
})()

/**
 * The filter pills, and the predicate each one applies to the feed.
 *
 * Counts are listings, not clients — the row sits directly above a grid of listing
 * cards, so a client count in it would put two different units side by side.
 * `chat` has nothing in the dataset behind it and deliberately carries no count.
 */
const LISTING_FILTERS: Array<{ id: string; label: string; match: (l: SampleListing) => boolean }> = [
  { id: 'active', label: 'Active', match: l => l.status !== 'Closed' },
  { id: 'price', label: 'Price change', match: hasPriceDrop },
  { id: 'contingent', label: 'Coming soon', match: l => l.status === 'Coming Soon' },
  { id: 'open', label: 'Open houses', match: l => l.openHouse.length > 0 },
  // Without this the one Closed listing is unreachable — `active` is the default pill
  // and excludes it, so the card would never render on any filter.
  { id: 'closed', label: 'Closed', match: l => l.status === 'Closed' },
]

/**
 * The agent's own saved search, shown on the Clients screen tile.
 *
 * The dataset names it "Test saved search" with a $0–$5M range — a deliberate
 * degenerate record. Shown as its criteria rather than its name, because "Test saved
 * search" on a tile reads as an unfinished prototype rather than as sample data.
 */
const AGENT_SEARCH = savedSearchesForClient('agent')[0]

/**
 * `"Maple Heights, ST · $600K–$950K"`, or just the location when the search carries no
 * price bounds — `srch_03` has neither, and "Maple Heights, ST · —" reads on a tile as a
 * value that failed to load rather than as a search with an open budget.
 */
function searchTileName(search: SavedSearch): string {
  const budget = budgetFromSearch(search)
  return budget === EMPTY
    ? search.criteria.location
    : `${search.criteria.location} · ${budget}`
}

export const agentSavedSearchTile = {
  name: AGENT_SEARCH ? searchTileName(AGENT_SEARCH) : 'No saved search yet',
  sub: 'Saved by you',
}

/** A client's own saved search, or the note that they have none — `cli_04` has none. */
function savedSearchTileFor(c: SampleClient) {
  const search = savedSearchesForClient(c.id)[0]
  const first = greetingName(c)
  return search
    ? { name: searchTileName(search), sub: `Saved by ${first}` }
    // Phrased around the name rather than after it: `greetingName` can be a couple
    // ("Erik and Nina"), which would take a plural verb.
    : { name: 'No saved search yet', sub: `Nothing saved for ${first} yet` }
}

/**
 * Everything the Clients screen renders for one row of the subnav — the feed, the pill
 * row above it, and the three tiles.
 *
 * The screen is scoped to whoever is selected, so the numbers on it are too: a client's
 * own saves and open requests rather than the roster's totals, and pill counts over
 * their own listings rather than all ten. A pill counting ten above a feed of two would
 * be describing a different screen.
 */
export interface ClientFeed {
  /** A client id, or `AGENT_FEED_ID` for the agent's own feed. */
  id: string
  /** Listings on the feed before any pill filter — the count the header quotes. */
  listingCount: number
  groups: ClientListingGroup[]
  pills: Array<[string, string]>
  /** The ids a pill keeps, or `null` for a pill with no listing filter behind it. */
  filters: Record<string, string[] | null>
  savedCount: number
  tourRequestCount: number
  savedSearchTile: { name: string; sub: string }
}

/**
 * Which listings a client is seeing: everything they have a tour stop for, topped up
 * from the front of the feed order until the feed reaches `FEED_SIZES`. Clients overlap
 * by construction rather than by a hand-written table — `lst_01` is the freshest listing
 * in the set, so four of the five have been shown it.
 */
function feedIdsFor(clientId: string): string[] {
  const toured = touredListingIds(clientId)
  const topUp = FEED_ORDER.filter(l => !toured.has(l.id))
    .slice(0, listingCountFor(clientId) - toured.size)
    .map(l => l.id)
  const keep = new Set([...toured, ...topUp])
  return FEED_ORDER.filter(l => keep.has(l.id)).map(l => l.id)
}

function buildFeed(
  id: string,
  listingIds: string[],
  tiles: Pick<ClientFeed, 'savedCount' | 'tourRequestCount' | 'savedSearchTile'>,
): ClientFeed {
  const keep = new Set(listingIds)
  const own = FEED_ORDER.filter(l => keep.has(l.id))

  return {
    id,
    listingCount: own.length,
    // The day sections and the "New 3 hrs ago" pills stay on the positions the whole
    // feed gave them, so the same listing carries the same age on every client's screen.
    groups: clientListingGroups
      .map(g => ({ ...g, listings: g.listings.filter(l => keep.has(l.id)) }))
      .filter(g => g.listings.length > 0),
    pills: [
      ...LISTING_FILTERS.map(({ id: pillId, label, match }): [string, string] => [
        pillId,
        `${label} (${own.filter(match).length})`,
      ]),
      ['chat', 'Chat list'],
    ],
    filters: {
      ...Object.fromEntries(
        LISTING_FILTERS.map(({ id: pillId, match }) => [
          pillId,
          own.filter(match).map(l => l.id),
        ]),
      ),
      chat: null,
    },
    ...tiles,
  }
}

/** Keyed by subnav row: the agent's own feed carries everything, each client their own. */
const CLIENT_FEEDS: Record<string, ClientFeed> = {
  [AGENT_FEED_ID]: buildFeed(
    AGENT_FEED_ID,
    FEED_ORDER.map(l => l.id),
    {
      savedCount: savedHomesTotal,
      tourRequestCount: tourRequestsTotal,
      savedSearchTile: agentSavedSearchTile,
    },
  ),
  ...Object.fromEntries(
    ROSTER.map(c => [
      c.id,
      buildFeed(c.id, feedIdsFor(c.id), {
        savedCount: c.savedCount,
        tourRequestCount: c.tourRequestCount,
        savedSearchTile: savedSearchTileFor(c),
      }),
    ]),
  ),
}

/** Falls back to the agent's own feed, which is the row the header titles "My feed". */
export const feedFor = (id: string): ClientFeed => CLIENT_FEEDS[id] ?? CLIENT_FEEDS[AGENT_FEED_ID]

/**
 * The Clients screen's three tiles. They were drop-to-fill image slots; each now carries
 * a home from the library instead. `imageForKey` hashes the tile's own id, so the three
 * differ from each other and none of them changes between runs.
 */
export const CLIENT_TILE_IMAGES: Record<
  'savedListings' | 'tourRequests' | 'savedSearch',
  HomeImage
> = {
  savedListings: imageForKey('clients-saved-listings'),
  tourRequests: imageForKey('clients-tour-requests'),
  savedSearch: imageForKey('clients-saved-search'),
}

// ─── Assistant threads ────────────────────────────────────────────────────────

/** Looked up rather than named, so the thread list can't outlive a roster change. */
const INVITED_CLIENT = ROSTER.find(c => c.status === 'Invited') ?? ROSTER[0]

/** One thread per upcoming tour, newest-looking first — plausible recent chat history. */
export const threads: Thread[] = [
  ...upcomingRosterTours()
    .slice(0, 2)
    .map((t): Thread => ({
      title: `Tour plan for ${clientName(t.clientId)}`,
      when: formatTourDate(t.date),
    })),
  { title: `Comps for ${SAMPLE_LISTINGS[6].address.city}`, when: 'Last week' },
  // The invited client — a welcome note is the thread they would plausibly have.
  { title: `Welcome note for ${INVITED_CLIENT.displayName}`, when: 'Last week' },
]

// ─── Assistant suggestion chips ───────────────────────────────────────────────

export const chips: string[] = [
  `Plan a tour for ${greetingName(ROSTER[0])}`,
  `What is ${greetingName(ROSTER[0])} looking for?`,
  'Who needs a follow-up this week?',
  `How does the ${SAMPLE_LISTINGS[6].address.city} market look right now?`,
]

// ─── Assistant greeting + nudges ──────────────────────────────────────────────

export const AGENT_FIRST_NAME = AGENT_NAME.first

/** The brokerage line, for surfaces that identify the logged-in agent. */
export const AGENT_BROKERAGE = CURRENT_AGENT.brokerage

/** The agent's own book — every client assigned to them in the dataset. */
export const AGENT_CLIENT_COUNT = ROSTER.filter(c => c.agentId === CURRENT_AGENT.id).length

export const AGENT_TEAM = AGENTS.filter(
  a => a.brokerage === CURRENT_AGENT.brokerage && a.id !== CURRENT_AGENT.id,
)

export interface AssistantNudge {
  title: string
  body: string
  /** 1–2 buttons. The first renders dark (primary), the rest light. */
  actions: Array<{ label: string; prompt: string }>
}

/**
 * The empty-state cards above the transcript. Both are derived, so they always name a
 * client and a property that exist in the data and the prompts they send resolve.
 */
export const assistantNudges: AssistantNudge[] = (() => {
  const nudges: AssistantNudge[] = []

  // The busiest saved-search client, paired with the first listing they'd plausibly see.
  const busiest = [...ROSTER]
    .filter(c => c.status === 'Active')
    .sort((a, b) => b.savedCount - a.savedCount)[0]
  const featured = SAMPLE_LISTINGS[0]
  if (busiest) {
    const first = greetingName(busiest)
    nudges.push({
      title: `${busiest.displayName} has ${busiest.savedCount} saved homes`,
      body:
        `Last seen ${busiest.lastSeen}. ${featured.address.line1} in ${featured.address.city} ` +
        `just listed at ${formatPrice(featured.price)} and fits what they have been saving.`,
      actions: [
        {
          label: 'Plan a tour',
          prompt: `Plan a tour for ${first}`,
        },
        {
          label: 'See their activity',
          prompt: `What has ${first} been looking at lately, and what does it tell us?`,
        },
      ],
    })
  }

  // The soonest tour that still has unconfirmed stops.
  const pending = upcomingRosterTours().find(t =>
    t.stops.some(s => s.tourStatus !== 'Confirmed'),
  )
  if (pending) {
    const name = clientName(pending.clientId)
    const unconfirmed = pending.stops.filter(s => s.tourStatus !== 'Confirmed').length
    nudges.push({
      title: `${name}’s tour has ${unconfirmed} unconfirmed ${unconfirmed === 1 ? 'stop' : 'stops'}`,
      body:
        `${formatTourDate(pending.date)} at ${pending.startTime ?? 'a time to be set'}. ` +
        `Showing times are still open with the listing agents.`,
      actions: [
        {
          label: 'Draft a follow-up',
          prompt: `Draft a short follow-up to the listing agents about ${name}’s unconfirmed tour stops`,
        },
      ],
    })
  }

  return nudges
})()

/** The count the assistant greeting quotes — "N things need attention today." */
export const attentionCount = assistantNudges.length
