/**
 * The shell's data surface.
 *
 * The types here are the shapes the screens and panels consume — they were ported
 * from ContentOrchestrationShell.dc.html and the components still expect them
 * unchanged. The *values* now come from the shared fictional sample dataset in
 * `data/sample/`, mapped across in `data/sample/adapters.ts`.
 *
 * The logged-in agent is Georgia Booth of Brightwater Realty Group — the name is
 * hardcoded in `adapters.ts`; the brokerage and her book still come from the dataset's
 * `agt_01`. Every person,
 * property, phone number and email is invented: phones are in the 555 block, emails
 * are on example.com, MLS ids are prefixed `SAMPLE:`, and `ST` is not a real state.
 */
import * as sample from './data/sample/adapters'
import type { ClientFeed } from './data/sample/adapters'

export type TagColor =
  | 'blueSubtle'
  | 'greenSubtle'
  | 'orangeSubtle'
  | 'graySubtle'
  | 'purpleSubtle'

export interface Client {
  id: string
  /** The row label. May be a household ("The Nakamura Family"), not a person's name. */
  name: string
  /** How to address them in a sentence — "Ken and Yuki", never "The". */
  greetingName: string
  initials: string
  stage: string
  budget: string
  looking: string
  financing: string
  lastActivity: string
  saved: number
  nextTour: string
}

export interface Listing {
  address: string
  meta: string
  hood: string
}

export interface Buyer {
  id: string
  name: string
  initials: string
  sub: string
  online?: boolean
}

export interface TourListItem {
  id: string
  name: string
  initials: string
  meta: string
  upcoming: boolean
}

export interface UpcomingTour {
  when: string
  address: string
  client: string
  type: string
  /**
   * Epoch ms for the tour's start, so a tour scheduled through the assistant sorts into
   * the list instead of appending after a later date. `when` is a display string and is
   * not reliably parseable back to a date.
   */
  at: number
}

export interface Thread {
  title: string
  when: string
}

export const CLIENTS: Client[] = sample.clients

export const LISTINGS: Listing[] = sample.listings

/**
 * Stage → Tag colour. The DC file used the legacy `styleType: '<color>-subtle'` API;
 * Haven v4 takes a camelCase `dataColor`. Keyed by the dataset's client status, which
 * is what `Client.stage` now carries — every value the data can produce has an entry,
 * so no tag falls through to an undefined `dataColor`.
 */
export const TAGC: Record<string, TagColor> = sample.STAGE_TAG_COLORS

export const THREADS: Thread[] = sample.threads

export const BUYERS: Buyer[] = sample.buyers

export const TOURS: TourListItem[] = sample.tours

export const INITIAL_UPCOMING_TOURS: UpcomingTour[] = sample.initialUpcomingTours

export const STAGES: Array<[string, string]> = sample.stages

/**
 * Everything the Clients screen shows for one subnav row: the listing feed (Haven
 * `PropertyCard` records, already grouped into the day sections the screen renders as
 * headings), the pill row above it, and its three tiles. Each client sees a different
 * number of listings, so the screen reads whichever feed is selected.
 */
export const feedFor: (id: string) => ClientFeed = sample.feedFor

/** The photos behind the Clients screen's three tiles. */
export const CLIENT_TILE_IMAGES = sample.CLIENT_TILE_IMAGES

export const CHIPS: string[] = sample.chips

export const MENU_ITEMS: string[] = [
  'Export client list',
  'Import contacts',
  'Manage stages',
  'Settings',
]

/** Identity of the logged-in agent, and the ids the subnavs open on. */
export const {
  AGENT_FIRST_NAME,
  AGENT_FULL_NAME,
  AGENT_INITIALS,
  AGENT_BROKERAGE,
  AGENT_FEED_ID,
  PROTOTYPE_TODAY,
  DEFAULT_BUYER_ID,
  DEFAULT_TOUR_ID,
  agentSavedSearchTile,
  assistantNudges,
  attentionCount,
  clientNeeds,
  savedHomesTotal,
  tourRequestsTotal,
  activeClientCount,
  invitedClientCount,
  requestClientCount,
} = sample

export type {
  AssistantNudge,
  ClientFeed,
  ClientListing,
  ClientListingGroup,
  ClientNeed,
  ListingPill,
} from './data/sample/adapters'
