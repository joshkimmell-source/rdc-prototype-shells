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

/**
 * The Realtor.com product a client originally came in through. The dataset carries no
 * acquisition channel, so it's picked deterministically off the client id from the same
 * product vocabulary the Leads pipeline uses — stable across renders. A client promoted
 * from a lead keeps that lead's own product instead (see `clientFromLead`).
 */
const CLIENT_PRODUCT_SOURCES = ['Market VIP', 'Local Expert', 'ReadyConnect Concierge']

function productSourceFor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return CLIENT_PRODUCT_SOURCES[h % CLIENT_PRODUCT_SOURCES.length]
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
    productSource: productSourceFor(c.id),
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
      status: c.status,
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

/**
 * Re-derive a tour's subnav row label and framed-map view on the date and start time the
 * assistant flow booked it for. The Tours subnav and the Tour page read from the dataset by
 * id, so a tour coordinated through the flow would otherwise still show its dataset default
 * date/time on those surfaces even after the user picked another. Given the booked ISO date
 * and start time, this rebuilds both from the same adapters the static data uses — the first
 * stop takes the chosen start time, matching how the design leads the timeline off it.
 */
export function rescheduleTourViews(
  tourId: string,
  isoDate: string,
  startTime: string
): { meta?: string; mapTour?: MapTour } {
  const base = ROSTER_TOURS.find(t => t.id === tourId)
  if (!base) return {}
  const rescheduled: SampleTour = {
    ...base,
    date: isoDate,
    startTime,
    stops: base.stops.map((s, i) => (i === 0 ? { ...s, time: startTime } : s)),
  }
  return { meta: formatTourSummary(rescheduled), mapTour: toMapTour(rescheduled) }
}

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

// ─── Leads ──────────────────────────────────────────────────────────────────────
//
// The "Leads" page (RDCPro's lead-management list) is deliberately distinct from Clients:
// a lead is a *prospect* who has not yet become a client, so these are net-new contacts,
// not the ten client records. They follow the dataset's own fictional conventions — 555-
// block phones, `example.com` emails — and shop/sell in the dataset's real markets. Each
// carries a Buyer/Seller type (the page's two tabs), a pipeline status, and the lead-CRM
// columns (market, budget/est. value, date, delivery channel). The whole page is one agent's
// own pipeline — there's no team-lead "assigned agent" dimension.

export type LeadType = 'Buyer' | 'Seller'

export type LeadStatus =
  | 'New'
  | 'Connected'
  | 'Engaged'
  | 'Met'
  | 'Appointment set'
  | 'Offer made'
  | 'Nurture'

export interface LeadDelivery {
  /** How the lead reaches the agent — "Priority", "Live transfer", "Home value lead". */
  method: string
  /** The Realtor.com product the lead came through — Market VIP, Local Expert, RCC. */
  product: string
}

export interface Lead {
  id: string
  type: LeadType
  name: string
  initials: string
  email: string
  phone: string
  status: LeadStatus
  /** Tag colour for the status pill. */
  statusColor: TagColor
  /** Follow-up line under the status — "Follow up Aug 15", "Follow-up overdue", or new-lead prompt. */
  followUp: string
  overdue: boolean
  /** The CRM the design credits the last touch to — the "Updated by" caption. */
  updatedBy: string
  /**
   * The lead has been worked past first contact (Engaged, Met, Appointment set, or Offer made),
   * so it's warm enough to invite into RDC+ and promote to a client. New/Nurture leads aren't.
   */
  readyToPromote: boolean
  marketCity: string
  marketZip: string
  /** Buyer budget ceiling, or seller estimated value — a real dataset listing price. */
  budget: string
  budgetValue: number
  dateLabel: string
  /** Minutes since the lead last showed activity — the Date column sorts on this. */
  recencyMins: number
  delivery: LeadDelivery
  /** Everything the detail page shows that the table row doesn't. */
  detail: LeadDetail
}

/** The property the lead first inquired on — a real dataset listing, shown as a card. */
export interface LeadInquiry {
  photo: string
  line1: string
  cityLine: string
  mls: string
  priceLabel: string
}

/** The referral's call-recording metadata, powering the (inert) audio player. */
export interface LeadRecording {
  /** Short date the call was recorded — "6/11/25". */
  dateLabel: string
  /** How long until the recording is purged — "in 47 days" or "Expired". */
  expiresLabel: string
  /** Playhead position, e.g. "0:24". */
  elapsed: string
  /** Total length, e.g. "1:08". */
  total: string
  /** Playhead as a percentage of total, for the static progress track. */
  percent: number
}

/** The co-marketing partner attached to the referral (lender for buyers, title/escrow for sellers). */
export interface LeadPartner {
  role: string
  name: string
  phone: string
  email: string
}

/** Realtor.com's dispatch tallies for this lead. */
export interface LeadContactLog {
  calls: number
  texts: number
  inquiries: number
}

/**
 * The starter saved search the invite offers to set up, generated from the lead's market and
 * budget so the consumer lands in RDC+ already looking at the right homes.
 */
export interface LeadStarterSearch {
  /** "Homes in Austin up to $650K". */
  title: string
  /** "Austin, TX". */
  line: string
  /** "Single-family · Up to $650,000" — the criteria under the title. */
  detail: string
}

export interface LeadDetail {
  /** Buyer budget or seller estimated value, spelled in full — "$615,000". */
  budgetLabel: string
  propertyType: string
  timeframe: string
  inquiry: LeadInquiry
  /** Long date the first inquiry arrived — "February 18, 2025". */
  firstInquiryLabel: string
  /** Long date + time of the last CRM edit — "January 24, 2026 at 3:12PM". */
  lastEditedLabel: string
  /** The Status card's due line — "Due in 3 days", "Overdue", or the new-lead prompt. */
  dueLabel: string
  /** The Concierge's hand-off note, templated from the lead's attributes. */
  conciergeNote: string
  /** "Financing status" for buyers, "Reason for selling" for sellers. */
  financingLabel: string
  financingValue: string
  availability: string
  /** Null for new leads, which haven't been called yet. */
  recording: LeadRecording | null
  partner: LeadPartner
  contactLog: LeadContactLog
  /**
   * A pre-filled, agent-voiced invitation to continue the relationship on RDC+, drafted from
   * the qualifying-call data (market, budget, timeframe). The agent edits this before sending.
   */
  inviteMessage: string
  /** A short pre-filled push-notification version of the invite, sent only if the agent opts in. */
  invitePush: string
  /** The starter saved search the invite attaches, generated from market + budget. */
  starterSearch: LeadStarterSearch
}

/** Status → Tag colour. Every status the data can produce has an entry. */
const LEAD_STATUS_COLOR: Record<LeadStatus, TagColor> = {
  New: 'blueSubtle',
  Connected: 'greenSubtle',
  Engaged: 'graySubtle',
  Met: 'greenSubtle',
  'Appointment set': 'purpleSubtle',
  'Offer made': 'greenSubtle',
  Nurture: 'orangeSubtle',
}

/** Delivery channels, keyed by lead type and picked by hash. Sellers use the seller-side products. */
const LEAD_DELIVERIES: Record<LeadType, LeadDelivery[]> = {
  Buyer: [
    { method: 'Priority', product: 'Market VIP' },
    { method: 'Live transfer', product: 'Market VIP' },
    { method: 'Email pass', product: 'Market VIP' },
    { method: 'Live transfer', product: 'ReadyConnect Concierge' },
  ],
  Seller: [
    { method: 'Listing inquiry', product: 'Local Expert' },
    { method: 'Home value lead', product: 'Market VIP' },
    { method: 'Priority', product: 'Local Expert' },
    { method: 'Email pass', product: 'ReadyConnect Concierge' },
  ],
}

/** Stable per-id hash, so a lead's market/budget/delivery pick never shifts between renders. */
function leadHash(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

const LEAD_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const leadShortDate = (d: Date): string => `${LEAD_MONTHS[d.getMonth()]} ${d.getDate()}`

/** Recency units in minutes, for the seed table below. */
const MIN = 1
const HR = 60
const DAY = 1_440
const MONTH = 43_200

/**
 * The 20 leads, as a seed of the fields that can't be derived — name, contact, buyer/seller
 * type, pipeline status, and minutes since last activity. Everything else (market, budget,
 * delivery, dates, follow-up) is derived below so the columns stay internally consistent.
 * Names are fictional and distinct from the ten client records.
 */
const LEAD_SEED: Array<{
  name: string
  email: string
  phone: string
  type: LeadType
  status: LeadStatus
  recencyMins: number
}> = [
  { name: 'Delia Ashford', email: 'delia.ashford@example.com', phone: '(555) 720-8801', type: 'Buyer', status: 'Connected', recencyMins: 25 * MIN },
  { name: 'Marcus Trelane', email: 'marcus.trelane@example.com', phone: '(555) 720-8802', type: 'Buyer', status: 'Engaged', recencyMins: 2 * HR },
  { name: 'Yusuf Demir', email: 'yusuf.demir@example.com', phone: '(555) 720-8803', type: 'Buyer', status: 'Appointment set', recencyMins: 4 * HR },
  { name: 'Priya Venkatesh', email: 'priya.venkatesh@example.com', phone: '(555) 720-8804', type: 'Buyer', status: 'New', recencyMins: 15 * MIN },
  { name: 'Colton Reyes', email: 'colton.reyes@example.com', phone: '(555) 720-8805', type: 'Buyer', status: 'Met', recencyMins: 1 * DAY },
  { name: 'Ingrid Solheim', email: 'ingrid.solheim@example.com', phone: '(555) 720-8806', type: 'Buyer', status: 'Offer made', recencyMins: 3 * HR },
  { name: 'Devon Pryce', email: 'devon.pryce@example.com', phone: '(555) 720-8807', type: 'Buyer', status: 'Nurture', recencyMins: 3 * MONTH },
  { name: 'Rosalind Kwok', email: 'rosalind.kwok@example.com', phone: '(555) 720-8808', type: 'Buyer', status: 'Connected', recencyMins: 6 * HR },
  { name: 'Theo Amara', email: 'theo.amara@example.com', phone: '(555) 720-8809', type: 'Buyer', status: 'Engaged', recencyMins: 8 * DAY },
  { name: 'Naomi Fielder', email: 'naomi.fielder@example.com', phone: '(555) 720-8810', type: 'Buyer', status: 'New', recencyMins: 40 * MIN },
  { name: 'Everett Blackwood', email: 'everett.blackwood@example.com', phone: '(555) 720-8811', type: 'Buyer', status: 'Met', recencyMins: 5 * DAY },
  { name: 'Camille Fontaine', email: 'camille.fontaine@example.com', phone: '(555) 720-8812', type: 'Buyer', status: 'Appointment set', recencyMins: 1 * HR },
  { name: 'Harlan Voss', email: 'harlan.voss@example.com', phone: '(555) 720-8813', type: 'Seller', status: 'Connected', recencyMins: 2 * HR },
  { name: 'Beatrice Okonkwo', email: 'beatrice.okonkwo@example.com', phone: '(555) 720-8814', type: 'Seller', status: 'Appointment set', recencyMins: 5 * HR },
  { name: 'Soren Dahl', email: 'soren.dahl@example.com', phone: '(555) 720-8815', type: 'Seller', status: 'Nurture', recencyMins: 4 * MONTH },
  { name: 'Marisol Vega', email: 'marisol.vega@example.com', phone: '(555) 720-8816', type: 'Seller', status: 'Met', recencyMins: 7 * DAY },
  { name: 'Grant Whitlock', email: 'grant.whitlock@example.com', phone: '(555) 720-8817', type: 'Seller', status: 'New', recencyMins: 30 * MIN },
  { name: 'Anaïs Lemaire', email: 'anais.lemaire@example.com', phone: '(555) 720-8818', type: 'Seller', status: 'Engaged', recencyMins: 1 * DAY },
  { name: 'Tobias Crane', email: 'tobias.crane@example.com', phone: '(555) 720-8819', type: 'Seller', status: 'Connected', recencyMins: 10 * HR },
  { name: 'Fern Halloway', email: 'fern.halloway@example.com', phone: '(555) 720-8820', type: 'Seller', status: 'Offer made', recencyMins: 6 * HR },
]

// ── Detail-page derivations ───────────────────────────────────────────────────
// The detail page shows a handful of referral attributes the table row doesn't. None
// are in the seed; all are picked deterministically off the per-lead hash so a lead's
// timeframe, financing, availability and partner never shift between renders.

const LEAD_MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** "February 18, 2025" — the long form used for the first-inquiry line. */
const leadLongDate = (d: Date): string => `${LEAD_MONTHS_FULL[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`

/** "6/11/25" — the short numeric form used on the call-recording line. */
const leadNumericDate = (d: Date): string =>
  `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`

/** "January 24, 2026 at 3:12PM" — long date plus a 12-hour clock, for the last-edited caption. */
const leadLongDateTime = (d: Date): string => {
  const h = ((d.getHours() + 11) % 12) + 1
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ap = d.getHours() < 12 ? 'AM' : 'PM'
  return `${leadLongDate(d)} at ${h}:${mm}${ap}`
}

/** Seconds → "m:ss". */
const leadDuration = (sec: number): string => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`

const LEAD_TIMEFRAMES: Record<LeadType, string[]> = {
  Buyer: ['0–3 months', '3–6 months', '6–12 months', 'Just browsing'],
  Seller: ['Listing now', '30–60 days', '2–3 months', 'Exploring options'],
}
const BUYER_FINANCING = ['Pre-approved', 'Pre-qualified', 'Cash buyer', 'Financing not started']
const SELLER_REASON = ['Relocating for work', 'Upsizing', 'Downsizing', 'Settling an estate']
const LEAD_AVAILABILITY = ['Weekday evenings', 'Weekend mornings', 'Anytime by text', 'Contact to confirm']

/** Co-marketing partners: a lender for buyers, title/escrow for sellers. Picked by hash. */
const LEAD_PARTNERS: Record<LeadType, LeadPartner[]> = {
  Buyer: [
    { role: 'Loan officer', name: 'Justin Greenwood', phone: '(555) 281-5736', email: 'justin.greenwood@example.com' },
    { role: 'Loan officer', name: 'Renata Alvarez', phone: '(555) 281-5737', email: 'renata.alvarez@example.com' },
    { role: 'Loan officer', name: 'Desmond Clarke', phone: '(555) 281-5738', email: 'desmond.clarke@example.com' },
  ],
  Seller: [
    { role: 'Title & escrow', name: 'Priscilla Nomura', phone: '(555) 281-5741', email: 'priscilla.nomura@example.com' },
    { role: 'Title & escrow', name: 'Owen Bradshaw', phone: '(555) 281-5742', email: 'owen.bradshaw@example.com' },
    { role: 'Home stager', name: 'Camille Dubois', phone: '(555) 281-5743', email: 'camille.dubois@example.com' },
  ],
}

/** How the availability preference reads as a closing sentence in the Concierge note. */
const availabilitySentence = (availability: string): string => {
  switch (availability) {
    case 'Weekday evenings':
      return 'Best reached on weekday evenings.'
    case 'Weekend mornings':
      return 'Prefers weekend mornings for showings.'
    case 'Anytime by text':
      return 'Happy to be contacted anytime by text.'
    default:
      return 'Reach out to confirm the best time to connect.'
  }
}

/** How each buyer-financing value reads mid-sentence ("they're …"). */
const BUYER_FINANCING_PHRASE: Record<string, string> = {
  'Pre-approved': 'already pre-approved',
  'Pre-qualified': 'pre-qualified',
  'Cash buyer': 'a cash buyer',
  'Financing not started': 'still lining up financing',
}

/** The Concierge's hand-off paragraph, built from the lead's own attributes. */
function buildConciergeNote(
  s: { name: string; type: LeadType },
  city: string,
  propertyType: string,
  budgetFull: string,
  timeframe: string,
  financingValue: string,
  availability: string,
  deliveryProduct: string,
): string {
  const first = s.name.split(/\s+/)[0]
  const type = propertyType.toLowerCase()
  const tail = availabilitySentence(availability)
  if (s.type === 'Buyer') {
    const financing = BUYER_FINANCING_PHRASE[financingValue] ?? financingValue.toLowerCase()
    const timing =
      timeframe === 'Just browsing'
        ? "They're still early in the search — just browsing for now."
        : `Hoping to tour within ${timeframe}.`
    return (
      `${first} came in through ${deliveryProduct} looking for a ${type} in ${city}. ` +
      `Budget tops out around ${budgetFull}, and they're ${financing}. ${timing} ${tail}`
    )
  }
  const timing =
    timeframe === 'Exploring options'
      ? "They're still exploring their options."
      : timeframe === 'Listing now'
        ? 'Ready to list now.'
        : `Aiming to list within ${timeframe}.`
  return (
    `${first} came in through ${deliveryProduct} preparing to sell their ${type} in ${city}. ` +
    `Estimated value is around ${budgetFull}, motivated by ${financingValue.toLowerCase()}. ${timing} ${tail}`
  )
}

/**
 * The pre-filled RDC+ invitation. It reads as the agent (Georgia) personally continuing the
 * relationship — the qualifying-call details do the work, RDC+ is named once as the shared
 * space rather than the subject. The agent can edit every word before sending.
 */
function buildInviteMessage(
  s: { name: string; type: LeadType },
  city: string,
  propertyType: string,
  budgetFull: string,
): string {
  const first = s.name.split(/\s+/)[0]
  const me = AGENT_FULL_NAME.split(/\s+/)[0]
  const type = propertyType.toLowerCase()
  if (s.type === 'Buyer') {
    return (
      `Hi ${first}, it's ${me} with Brightwater Realty Group. It's been great helping you look ` +
      `for a ${type} in ${city} — I'd love to make the search easier from here. I've set up a ` +
      `shared space for us where you'll see new ${city} listings around ${budgetFull} as they ` +
      `come up, and we can compare homes and line up tours in one place. Accept below and I'll ` +
      `keep the right ones coming your way.`
    )
  }
  return (
    `Hi ${first}, it's ${me} with Brightwater Realty Group. Thanks for talking through selling ` +
    `your ${type} in ${city}. To keep the next steps simple, I've set up a shared space for us ` +
    `where you can follow your home's value, see comparable ${city} sales near ${budgetFull}, ` +
    `and reach me directly. Accept below and we'll get your listing moving.`
  )
}

/** A short push-notification version of the invite — one line, agent-named, RDC+ secondary. */
function buildInvitePush(s: { type: LeadType }, city: string): string {
  const me = AGENT_FULL_NAME.split(/\s+/)[0]
  return s.type === 'Buyer'
    ? `${me} at Brightwater invited you to keep your ${city} home search going on Realtor.com+.`
    : `${me} at Brightwater invited you to track your ${city} home sale on Realtor.com+.`
}

/** The starter saved search the invite attaches, built from the lead's market and budget. */
function buildStarterSearch(
  s: { type: LeadType },
  city: string,
  state: string,
  propertyType: string,
  budgetFull: string,
  budgetShort: string,
): LeadStarterSearch {
  if (s.type === 'Buyer') {
    return {
      title: `Homes in ${city} up to ${budgetShort}`,
      line: `${city}, ${state}`,
      detail: `${propertyType} · Up to ${budgetFull}`,
    }
  }
  return {
    title: `${city} sales near ${budgetShort}`,
    line: `${city}, ${state}`,
    detail: `Comparable ${propertyType.toLowerCase()} sales near ${budgetFull}`,
  }
}

/** First + last initial, e.g. "Delia Ashford" → "DA". */
const leadInitials = (name: string): string =>
  name
    .split(/\s+/)
    .map(w => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()

/**
 * The 20 leads, most-recent activity first (the Date column's default descending sort).
 * A lead stale by six days or more reads as overdue; a "New" lead has no agent yet and an
 * "awaiting first contact" prompt in place of a dated follow-up.
 */
export const LEADS: Lead[] = LEAD_SEED.map((s, i): Lead => {
  const id = `lead_${String(i + 1).padStart(2, '0')}`
  const hash = leadHash(id + s.name)

  // Market + $ figure both come from one real dataset listing, so they read as one place.
  const listing = SAMPLE_LISTINGS[hash % SAMPLE_LISTINGS.length]
  const budgetValue = listing.price

  const isNew = s.status === 'New'
  const overdue = !isNew && s.recencyMins >= 8_640
  const dueDays = 1 + (hash % 5)
  const followUp = isNew
    ? 'Awaiting first contact'
    : overdue
      ? 'Follow-up overdue'
      : `Follow up ${leadShortDate(new Date(PROTOTYPE_TODAY.getTime() + dueDays * DAY_MS))}`

  const delivery = LEAD_DELIVERIES[s.type][hash % LEAD_DELIVERIES[s.type].length]

  // ── Detail-only derivations ──────────────────────────────────────────────────
  const budgetFull = formatPrice(budgetValue)
  const timeframe = LEAD_TIMEFRAMES[s.type][hash % 4]
  const availability = LEAD_AVAILABILITY[hash % LEAD_AVAILABILITY.length]
  const financingLabel = s.type === 'Buyer' ? 'Financing status' : 'Reason for selling'
  const financingValue = (s.type === 'Buyer' ? BUYER_FINANCING : SELLER_REASON)[hash % 4]

  // The activity timeline: last touch, the first inquiry that predates it, and — for any
  // lead that's been called — a recorded call somewhere between the two.
  const lastActivity = new Date(PROTOTYPE_TODAY.getTime() - s.recencyMins * 60_000)
  const firstInquiry = new Date(lastActivity.getTime() - (20 + (hash % 70)) * DAY_MS)
  const recordDate = new Date(lastActivity.getTime() - (hash % 6) * DAY_MS)
  const expiryDays = Math.round((recordDate.getTime() + 90 * DAY_MS - PROTOTYPE_TODAY.getTime()) / DAY_MS)
  const totalSec = 40 + (hash % 80)
  const elapsedSec = Math.round(totalSec * 0.35)

  const dueLabel = isNew
    ? 'Awaiting first contact'
    : overdue
      ? 'Overdue'
      : `Due in ${dueDays} ${dueDays === 1 ? 'day' : 'days'}`

  const detail: LeadDetail = {
    budgetLabel: budgetFull,
    propertyType: listing.propertyType,
    timeframe,
    inquiry: {
      photo: listing.primaryPhoto,
      line1: listing.address.line1,
      cityLine: formatCityLine(listing),
      mls: listing.mlsId,
      priceLabel: formatPrice(listing.price),
    },
    firstInquiryLabel: leadLongDate(firstInquiry),
    lastEditedLabel: leadLongDateTime(lastActivity),
    dueLabel,
    conciergeNote: buildConciergeNote(
      s,
      listing.address.city,
      listing.propertyType,
      budgetFull,
      timeframe,
      financingValue,
      availability,
      delivery.product,
    ),
    financingLabel,
    financingValue,
    availability,
    recording: isNew
      ? null
      : {
          dateLabel: leadNumericDate(recordDate),
          expiresLabel: expiryDays > 0 ? `in ${expiryDays} days` : 'Expired',
          elapsed: leadDuration(elapsedSec),
          total: leadDuration(totalSec),
          percent: Math.round((elapsedSec / totalSec) * 100),
        },
    partner: LEAD_PARTNERS[s.type][hash % LEAD_PARTNERS[s.type].length],
    contactLog: {
      calls: isNew ? 0 : 1 + (hash % 7),
      texts: isNew ? 0 : hash % 22,
      inquiries: 1 + (hash % 3),
    },
    inviteMessage: buildInviteMessage(s, listing.address.city, listing.propertyType, budgetFull),
    invitePush: buildInvitePush(s, listing.address.city),
    starterSearch: buildStarterSearch(
      s,
      listing.address.city,
      listing.address.state,
      listing.propertyType,
      budgetFull,
      formatPriceShort(budgetValue),
    ),
  }

  return {
    id,
    type: s.type,
    name: s.name,
    initials: leadInitials(s.name),
    email: s.email,
    phone: s.phone,
    status: s.status,
    statusColor: LEAD_STATUS_COLOR[s.status],
    followUp,
    overdue,
    updatedBy: 'Follow Up Boss',
    readyToPromote:
      s.status === 'Engaged' ||
      s.status === 'Met' ||
      s.status === 'Appointment set' ||
      s.status === 'Offer made',
    marketCity: listing.address.city,
    marketZip: listing.address.zip,
    budget: formatPriceShort(budgetValue),
    budgetValue,
    dateLabel: leadShortDate(new Date(PROTOTYPE_TODAY.getTime() - s.recencyMins * 60_000)),
    recencyMins: s.recencyMins,
    delivery,
    detail,
  }
}).sort((a, b) => a.recencyMins - b.recencyMins)

/**
 * A freshly-invited lead, shaped as a Client row for the clients list. Its stage is "Invited"
 * — the relationship now exists, but the consumer hasn't accepted yet — so it carries no saved
 * homes and no next tour. Budget and search brief carry over from the lead's qualifying call.
 */
export function clientFromLead(lead: Lead): Client {
  const first = lead.name.split(/\s+/)[0]
  return {
    id: lead.id,
    name: lead.name,
    greetingName: first,
    initials: lead.initials,
    stage: 'Invited',
    productSource: lead.delivery.product,
    budget: lead.type === 'Seller' ? lead.budget : `Up to ${lead.budget}`,
    looking: `${lead.detail.propertyType} in ${lead.marketCity}`,
    financing: 'Invitation sent',
    lastActivity: 'Invited just now',
    saved: 0,
    nextTour: EMPTY,
  }
}

/** A listing paired with how well it fits a lead's qualifying call. */
export interface ListingMatch {
  listing: ClientListing
  /** 0–100 relevance to the lead's market, budget and property type. */
  matchScore: number
}

/**
 * How well a listing fits the lead: full marks minus a budget-gap penalty, a market-mismatch
 * penalty, and a property-type-mismatch penalty. Clamped to 55–99 so nothing reads as a perfect
 * or a hopeless match. Deterministic, and monotonic with relevance so the highest score is the
 * best fit — which is what makes it the spotlight below.
 */
function matchScoreFor(l: SampleListing, lead: Lead): number {
  const priceGapRatio = lead.budgetValue > 0 ? Math.abs(l.price - lead.budgetValue) / lead.budgetValue : 1
  let score = 99
  score -= Math.min(30, Math.round(priceGapRatio * 60))
  if (l.address.city !== lead.marketCity) score -= 15
  if (l.propertyType !== lead.detail.propertyType) score -= 6
  return Math.max(55, Math.min(99, score))
}

/**
 * The homes the invite previews — the listings the lead's starter search would surface,
 * best-fitting first (that one becomes the spotlight; the rest are selectable extras). Ranked
 * by `matchScore`, then freshness, stable by id. Sold homes are excluded — a starter search
 * surfaces available inventory. Returned as `ClientListing`s so the invite can render them with
 * the same Haven `PropertyCard` the Clients feed uses.
 */
export function listingMatchesForLead(lead: Lead, count = 5): ListingMatch[] {
  const byId = new Map(clientListings.map(l => [l.id, l]))
  return [...SAMPLE_LISTINGS]
    .filter(l => l.status !== 'Closed')
    .map(l => ({ l, score: matchScoreFor(l, lead) }))
    .sort(
      (a, b) => b.score - a.score || a.l.daysOnMarket - b.l.daysOnMarket || a.l.id.localeCompare(b.l.id),
    )
    .slice(0, count)
    .map(({ l, score }) => {
      const listing = byId.get(l.id)
      return listing ? { listing, matchScore: score } : null
    })
    .filter((m): m is ListingMatch => Boolean(m))
}
