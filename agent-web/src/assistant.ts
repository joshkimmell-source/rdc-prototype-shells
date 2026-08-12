/**
 * RealAssist+ responder.
 *
 * The DC prototype called `window.claude.complete({ system, messages, max_tokens, tools })`,
 * which only exists inside the Claude Design runtime. A Vite app has no such global, so this
 * module provides a local rule-based stand-in that reproduces the same contract: it returns
 * plain-text replies and can emit the cards the chat renders.
 *
 * The centrepiece is the multi-turn **tour-coordination flow**, a faithful reproduction of the
 * design walkthrough: the assistant pulls a client's saved listings, lays out a plan, asks for
 * a start time, then builds the full timeline, per-agent outreach drafts, conflicts and ranked
 * next steps, and finally schedules the tour onto a calendar. Every section, heading and label
 * matches the design; only the client, dates and properties are the workspace's real sample
 * data (Jordan & Mia Castellanos and their three saved listings), and the per-property facts —
 * status, notice, access, urgency — are read off those real listings rather than invented.
 *
 * If a host ever does inject `window.claude.complete`, `runAssistant` defers to it and the
 * tool `run` handlers push the client/tour cards exactly as the DC version did.
 */
import {
  AGENT_BROKERAGE,
  AGENT_FIRST_NAME,
  AGENT_FULL_NAME,
  CLIENTS,
  LISTINGS,
  PROTOTYPE_TODAY,
  TAGC,
  TOUR_MAP_DATA,
  clientNeeds,
  type Client,
  type TagColor,
} from './data'
import {
  LISTINGS as SAMPLE_LISTINGS,
  TOURS as SAMPLE_TOURS,
  formatBaths,
  formatPrice,
  formatPriceShort,
  formatTourDate,
  getClient,
  getListing,
  savedSearchesForClient,
  type Listing as SampleListing,
  type ListingStatus,
  type SavedSearch,
  type SearchCriteria,
  type Tour as SampleTour,
} from './data/sample'

export interface ClientCard {
  kind: 'client'
  name: string
  initials: string
  stage: string
  dataColor: TagColor
  budget: string
  looking: string
  financing: string
  lastActivity: string
  saved: string
}

export interface TourCard {
  kind: 'tour'
  address: string
  meta: string
  client: string
  when: string
}

// ─── Tour-coordination flow ─────────────────────────────────────────────────

/** A ranked step / conflict / note whose leading clause is emphasised, as in the design. */
export interface LeadNote {
  /** The bold lead — a property or agent name. Omit for an unemphasised line. */
  lead?: string
  /** The rest of the sentence, appended after the lead. */
  text: string
}

/** One property in the flow, with everything the cards downstream need. */
export interface PlanProperty {
  /** The tour-stop letter, `A`–`C`. */
  order: string
  /** 1-based position, for the plan table. */
  index: number
  line1: string
  city: string
  price: number
  beds: number
  /** `"2 BA"` or `"2.5 BA"`. */
  bathsLabel: string
  sqft: number | null
  photo: string
  /** The dataset status, and its display label + dot colour. */
  status: ListingStatus
  statusLabel: string
  /** One of the responder's status-dot colour keys. */
  statusTone: 'green' | 'amber' | 'gray'

  // Outreach — invented listing-agent contacts, real showing facts.
  agentName: string
  agentFirst: string
  brokerage: string
  phone: string
  email: string
  noticeRequired: string
  access: string
  openHouse: string
  urgency: string
  draft: string

  // Timeline
  timeRange: string
  duration: string
  /** `"Travel: ~18 min to Old Quarter"`, or null after the last stop. */
  travelToNext: string | null
}

/** The tool-call trace the design shows before the first card. */
export interface ToolTraceCard {
  kind: 'toolTrace'
  lines: string[]
  toolCount: number
  found: string
}

/** The listing-selection card: "Here's what I'm working with", with checkbox rows. */
export interface TourListingsCard {
  kind: 'tourListings'
  greetingName: string
  properties: PlanProperty[]
}

/** "Tour plan for X" — the property table and the pre-flight notes. */
export interface TourPlanCard {
  kind: 'tourPlan'
  client: string
  greetingName: string
  properties: PlanProperty[]
  notes: LeadNote[]
}

/** "📝 Tour Timeline — X" — the routing note and the proposed schedule. */
export interface TimelineCard {
  kind: 'tourTimeline'
  members: string
  routingNote: string
  properties: PlanProperty[]
  totalDuration: string
  finish: string
}

/** "📝 Showing Requirements & Outreach" — the per-property field tables and drafts. */
export interface OutreachCard {
  kind: 'tourOutreach'
  properties: PlanProperty[]
}

/** "⚠️ Potential Conflicts" + "✅ Recommended Next Steps" + confidence + what-next. */
export interface SummaryCard {
  kind: 'tourSummary'
  /** The client, so the confirm action can name them when it schedules the tour. */
  greetingName: string
  /**
   * The day and start time the user picked in step 4, carried on the card so the "Confirm &
   * schedule" action can echo them back — that's what lets booking keep the chosen date/time
   * instead of reverting to the tour's dataset defaults.
   */
  dayLabel: string
  startTime: string
  conflicts: LeadNote[]
  steps: LeadNote[]
  confidence: LeadNote
  nextOptions: string[]
}

/** The final "Upcoming Tour" panel: the scheduled tour, its stops and follow-on chips. */
export interface UpcomingTourCard {
  kind: 'upcomingTour'
  title: string
  client: string
  greetingName: string
  members: string
  dateLabel: string
  stopCount: number
  stops: Array<{
    line1: string
    statusLabel: string
    statusTone: 'green' | 'amber' | 'gray'
    beds: number
    bathsLabel: string
    sqft: number | null
    photo: string
  }>
  suggestions: string[]
}

/**
 * Step 1 of the stepwise flow — "For whom do you wish to coordinate a tour?". Chips for
 * each client who has a tour to coordinate; picking one sends the step-2 prompt.
 */
export interface ClientPickerCard {
  kind: 'clientPicker'
  title: string
  clients: Array<{
    id: string
    name: string
    greetingName: string
    initials: string
    stage: string
    dataColor: TagColor
    meta: string
    /** The prompt the chip sends — names the client so the responder can resolve them. */
    prompt: string
  }>
}

/**
 * Step 2 — "How would you like to select listings?". Three methods; only "Choose the top 3"
 * is wired for now, the others render as disabled "coming soon" chips.
 */
export interface SelectMethodCard {
  kind: 'selectMethod'
  greetingName: string
  title: string
  methods: Array<{ label: string; description: string; prompt: string; enabled: boolean }>
}

/**
 * Step 4 — a calendar plus start-time chips. Picking a day and a time together sends the
 * step-5 prompt that builds the full coordination plan.
 */
export interface DateTimeCard {
  kind: 'dateTime'
  client: string
  clientId: string
  greetingName: string
  /** The first stop — what the card names. */
  address: string
  /** Year and 0-indexed month the calendar opens on. */
  year: number
  month: number
  /** Day-of-month of the client's tour date, pre-highlighted. */
  suggestedDay: number
  /** The start-time options offered as chips. */
  times: string[]
}

// ─── Add-client onboarding flow ────────────────────────────────────────────────

/**
 * A single async tool call. The view opens on `processing` (with a loading indicator),
 * then resolves to the checkmarked `resolved` line — the spec's "process → resolve".
 */
export interface ToolRunCard {
  kind: 'toolRun'
  processing: string
  /** The resolved status line, already prefixed with its ✓. */
  resolved: string
}

/**
 * A sequence of tool calls, shown while running as a single processing label, then
 * resolving to a collapsible "Used N tools" summary that expands to each ✓ line.
 */
export interface ToolGroupCard {
  kind: 'toolGroup'
  processing: string
  /** Each line already prefixed with its ✓. */
  tools: string[]
  /** When several cards land in one turn, how long to hold this one before it reveals. */
  revealMs?: number
}

/**
 * One assistant turn's substantive message in the add-client flow: the prose (rendered
 * verbatim from the spec, newlines preserved), an optional "Completed" turn marker, and
 * optional interactive footer — a confirm button (State 4) or next-step chips (State 5).
 */
export interface AddClientMessageCard {
  kind: 'addClientMessage'
  body: string
  completed: boolean
  /** State 4 — the "Create this search" confirmation button and the prompt it sends. */
  confirm?: { label: string; prompt: string }
  /** State 5 — the "What next?" suggestion chips. */
  options?: string[]
  /** When several cards land in one turn, how long to hold this one before it reveals. */
  revealMs?: number
}

// ─── Catch Up daily-briefing flow ──────────────────────────────────────────────

/** One lettered stop on a briefing tour card — the pin the embedded mini-map draws. */
export interface CatchUpTourStop {
  /** `A`–`D`. */
  order: string
  addr: string
  city: string
  /** Pseudo-coordinate, taken from the same tour-map data the Tours screen uses. */
  ll: [number, number]
}

/** The embedded tour card inside a briefing item — a deep link plus a framed mini-map. */
export interface CatchUpTourRef {
  tourId: string
  /** `"Tour Priyanka Raman"`. */
  title: string
  /** `"Sun, Aug 9 | 2:30 PM"`. */
  subtitle: string
  stopCount: number
  /** `/plus/app/tours/{tour_id}`. */
  href: string
  stops: CatchUpTourStop[]
}

/** One item in a priority tier of the briefing. */
export interface CatchUpItem {
  clientId: string
  name: string
  /** `/plus/app/feed/{group_id}`. */
  href: string
  /** The one-line problem after the client name. */
  headline: string
  /** The detailed context paragraph (critical/important items). */
  detail?: string
  /** `"Background: …"` — the client's preferences. */
  background?: string
  /** A complete, ready-to-send outreach draft. */
  draft?: string
  /** Accompanies critical items. */
  confidence?: { level: 'High' | 'Medium' | 'Low'; percent: number }
  /** Embedded tour card, when the item concerns a scheduled tour. */
  tour?: CatchUpTourRef
  /** FYI items: the activity note rendered in place of detail. */
  fyiNote?: string
}

/**
 * The single-shot processing stream — three sequential states — then the collapsed
 * "Used N tools" summary that expands to each friendly-labelled step with a checkmark.
 */
export interface CatchUpToolsCard {
  kind: 'catchUpTools'
  /** `["On it…", "Loading your groups…", "Processing your request…"]`. */
  stream: string[]
  toolCount: number
  /** Friendly labels — not raw function names. */
  tools: string[]
  /** When several cards land in one turn, how long to hold the stream before it reveals. */
  revealMs?: number
}

/** The structured daily briefing: reasoning preamble, summary header, and the priority tiers. */
export interface CatchUpBriefingCard {
  kind: 'catchUpBriefing'
  /** Per-group analysis lines, shown as a collapsible reasoning block. */
  preamble: string[]
  analyzed: number
  criticalCount: number
  importantCount: number
  fyiCount: number
  critical: CatchUpItem[]
  important: CatchUpItem[]
  fyi: CatchUpItem[]
  /** `"…and X more pending/inactive groups with no action needed."` */
  moreNote?: string
}

/**
 * The interactive action picker that ends the turn: one radio option per suggested action,
 * a "Skip" option, and a free-text "Something else" the composer fills.
 */
export interface ActionPickerCard {
  kind: 'actionPicker'
  title: string
  options: Array<{ label: string; prompt: string }>
  /** When several cards land in one turn, how long to hold the picker before it reveals. */
  revealMs?: number
}

// ─── Search-optimization flow ──────────────────────────────────────────────────

/**
 * State 1 — the client-selection picker. Client cards (avatar initials, name, and a
 * "Last seen …" line) and a Skip button; free-text names are answered by the composer.
 */
export interface SearchOptPickerCard {
  kind: 'searchOptPicker'
  title: string
  clients: Array<{
    id: string
    name: string
    initials: string
    /** `"Last seen 1 day ago"` — read straight off the client's activity line. */
    lastSeen: string
    /** The prompt the card sends — names the client so the responder can resolve them. */
    prompt: string
  }>
}

/** State 2 — the chosen client, shown as a compact chip before the analysis streams. */
export interface SearchOptClientCard {
  kind: 'searchOptClient'
  name: string
  initials: string
  lastSeen: string
}

/** One row of the "📊 RECOMMENDED CHANGES" table. */
export interface SearchRecommendation {
  /** 1-based row number. */
  index: number
  /** The filter being tuned — "Property Type", "Location", "Max Price". */
  filter: string
  /** `"74% ⭐"` — the percentage plus its star tier. */
  confidenceLabel: string
  /** The search's current value. */
  current: string
  /** The recommended value. */
  suggested: string
}

/**
 * State 5 — the structured "✅ Search Optimization Analysis" report: the activity header,
 * the current search, the recommended-changes table with its star legend, the evidence-cited
 * rationale, additional observations, and the confirm-with-client caveat.
 */
export interface SearchAnalysisCard {
  kind: 'searchAnalysis'
  /** Collapsible reasoning preamble — the stated-vs-observed read. */
  reasoning: string[]
  analysisPeriodDays: number
  views: number
  saves: number
  pastStops: number
  upcomingStops: number
  confidenceLevel: 'High' | 'Medium' | 'Low'
  confidencePercent: number
  currentSearchName: string
  currentSearchCriteria: string
  recommendations: SearchRecommendation[]
  rationale: LeadNote[]
  observations: LeadNote[]
  /** `"⚠️ Important Note: …"` — the confirm-before-applying caveat. */
  caveat: string
  /** When several cards land in one turn, how long to hold the report before it reveals. */
  revealMs?: number
}

// ─── Client Pulse flow ───────────────────────────────────────────────────────

/** One row of the "📊 ACTIVITY SUMMARY" table — a metric across the two windows. */
export interface PulseActivityRow {
  metric: string
  /** The cell text — a count, or an annotated count like `"1 (Aug 15)"`. */
  last7: string
  last30: string
}

/** One property in "🔍 TOP INTERESTS" — a clickable deep link and its facts. */
export interface PulseInterest {
  /** `/plus/app/feed/{group_id}/listing/{listing_id}`. */
  href: string
  address: string
  /** How many of the client's tour stops landed on this listing — the interest signal. */
  views: number
  /** `"$1,125,000"`, with any sold flag appended. */
  priceLabel: string
  beds: number
  bathsLabel: string
  sqftLabel: string
  propertyType: string
  /** `"2-car garage · Price Change"` — the key features line. */
  features: string
  /** The relevance note tying the property back to the client's stated search. */
  relevance: string
}

/** One prioritized row of "💡 SUGGESTED ACTIONS". */
export interface PulseSuggestedAction {
  title: string
  /** `"URGENT"` / `"High"` / `"Medium"` / `"Low"`. */
  priority: string
  rationale: string
  /** A complete, ready-to-send draft — carried on the top action. */
  draft?: string
}

/**
 * State 4 — the structured Client Pulse report: profile, intent, the activity table, members
 * and saved searches, top interests with deep links, prioritized suggested actions, an overall
 * confidence, and — when the client has one — an embedded upcoming-tour card.
 */
export interface ClientPulseReportCard {
  kind: 'clientPulseReport'
  clientName: string
  /** `"Jun 5, 2026"` — the earliest recorded interaction, and the days since. */
  clientSince: string
  clientSinceDays: number
  /** Stated-preference bullets, read off the client's saved searches. */
  profile: string[]
  /** `"Aug 3"` and `"1 day ago"`. */
  lastActive: string
  lastActiveAgo: string
  intentLevel: 'Low' | 'Medium' | 'High'
  intentEmoji: string
  intentNote: string
  /** The single most important takeaway, rendered bold. */
  headline: string
  activity: PulseActivityRow[]
  activityNote: string
  members: string[]
  membersNote: string
  savedSearches: Array<{ name: string; criteria: string }>
  searchNote: string
  interestsIntro: string
  interests: PulseInterest[]
  /** The behavioural inference vs. the stated search. */
  pattern: string
  suggestedActions: PulseSuggestedAction[]
  confidenceLevel: 'High' | 'Medium' | 'Low'
  confidencePercent: number
  /** The embedded upcoming-tour card, when one exists. */
  tour?: CatchUpTourRef
  /** When several cards land in one turn, how long to hold the report before it reveals. */
  revealMs?: number
}

export type Card =
  | ClientCard
  | TourCard
  | ClientPickerCard
  | SelectMethodCard
  | ToolTraceCard
  | TourListingsCard
  | TourPlanCard
  | DateTimeCard
  | TimelineCard
  | OutreachCard
  | SummaryCard
  | UpcomingTourCard
  | ToolRunCard
  | ToolGroupCard
  | AddClientMessageCard
  | CatchUpToolsCard
  | CatchUpBriefingCard
  | ActionPickerCard
  | SearchOptPickerCard
  | SearchOptClientCard
  | SearchAnalysisCard
  | ClientPulseReportCard

export interface ScheduledTour {
  client: Client
  address: string
  when: string
  /** `"Buyer tour · 3 stops"` — the display line for the created upcoming-tour row. */
  type: string
  /**
   * The dataset tour id this booked, when it maps to one. Set by the coordination flow so
   * the shell can reveal the withheld tour in the Tours subnav; absent for ad-hoc,
   * single-property tours that don't correspond to a dataset record.
   */
  tourId?: string
  /** Epoch ms of the tour date, so the shell can sort it into the upcoming list. */
  at: number
  /**
   * The booked date (ISO `YYYY-MM-DD`) and start time the user picked, present only for the
   * multi-stop coordinated tour (which carries a `tourId`). Carried raw so the shell can
   * re-label the Tours subnav row and the framed Tour page to match the selection, not just
   * the Home card. Absent on the legacy single-property path, which has no tour to re-label.
   */
  date?: string
  startTime?: string
}

export interface AssistantResult {
  cards: Card[]
  reply: string
  /** An AI line rendered *before* the cards — the flow's acknowledgements ("Got it — …"). */
  preReply?: string
  /** Set when the responder scheduled a tour, so the shell can update client + tour state. */
  scheduled?: ScheduledTour
  /**
   * Set by the add-client flow to update the conversation's thread title — "Add Client" on
   * entry, then "Onboarding {Full Name} as New Client" once the group is created.
   */
  threadTitle?: string
}

export const SYSTEM_PROMPT_INTRO =
  'You are RealAssist+, the AI assistant built into the realtor.com+ agent workspace. ' +
  `The user is ${AGENT_FIRST_NAME}, a buyer’s agent at ${AGENT_BROKERAGE}. ` +
  'Every client and property in this workspace is fictional sample data.'

export const ERROR_REPLY =
  'RealAssist+ couldn’t reach the model just now. Give it a few seconds and try again.'

declare global {
  interface Window {
    claude?: {
      complete: (args: {
        system: string
        messages: Array<{ role: 'user' | 'assistant'; content: string }>
        max_tokens: number
        tools: unknown[]
      }) => Promise<string>
    }
  }
}

/**
 * Words that name a household rather than a person. Left out of a client's aliases so
 * "is this a family home?" doesn't resolve to The Nakamura Family.
 */
const GENERIC_NAME_WORDS = new Set(['the', 'and', 'family', 'household', 'residence'])

/**
 * The words a client can be called by: the display label, each member's first name, and
 * the surname. A household is "The Nakamura Family" but the agent types "Ken" or
 * "Nakamura", so matching the label alone would never resolve them.
 */
function aliases(c: Client): string[] {
  return [c.name, ...c.greetingName.split(/,?\s+and\s+|,\s*/), ...c.name.split(/[\s&]+/)]
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 3 && !GENERIC_NAME_WORDS.has(s))
}

/** True if `text` names this client. */
function mentions(text: string, c: Client): boolean {
  return aliases(c).some((a) => text.includes(a))
}

export function findClient(name: string, clients: Client[] = CLIENTS): Client | undefined {
  const n = String(name || '').toLowerCase()
  return (
    clients.find((c) => c.name.toLowerCase().includes(n)) || clients.find((c) => mentions(n, c))
  )
}

function toClientCard(c: Client): ClientCard {
  return {
    kind: 'client',
    name: c.name,
    initials: c.initials,
    stage: c.stage,
    dataColor: TAGC[c.stage] ?? 'graySubtle',
    budget: c.budget,
    looking: c.looking,
    financing: c.financing,
    lastActivity: c.lastActivity,
    saved: `${c.saved} saved`,
  }
}

function findListing(address: string) {
  const a = String(address || '').toLowerCase()
  const head = a.split(',')[0].trim()
  return LISTINGS.find(
    (l) => l.address.toLowerCase().includes(head) || a.includes(l.address.toLowerCase())
  )
}

// ─── Flow builders ────────────────────────────────────────────────────────────

/** The client's soonest upcoming tour, if they have one — the flow is built from it. */
function upcomingTourFor(clientId: string): SampleTour | undefined {
  return SAMPLE_TOURS.filter((t) => t.clientId === clientId && t.state === 'Upcoming').sort((a, b) =>
    a.date.localeCompare(b.date)
  )[0]
}

/** `"2 BA"` / `"2.5 BA"` — half baths count as `.5`, per MLS convention. */
const bathsLabel = (l: SampleListing): string => `${formatBaths(l)} BA`

/** Dataset status → the label and dot colour the cards show. */
function statusDisplay(status: ListingStatus): { label: string; tone: 'green' | 'amber' | 'gray' } {
  switch (status) {
    case 'New':
      return { label: 'New listing', tone: 'green' }
    case 'Active':
      return { label: 'For sale', tone: 'green' }
    case 'Price Change':
      return { label: 'Price reduced', tone: 'amber' }
    case 'Coming Soon':
      return { label: 'Coming soon', tone: 'amber' }
    case 'Closed':
      return { label: 'Closed', tone: 'gray' }
  }
}

/** `615` (minutes since midnight) → `"10:15 AM"`. */
function fmtClock(mins: number): string {
  const h24 = Math.floor(mins / 60) % 24
  const m = mins % 60
  const ampm = h24 < 12 ? 'AM' : 'PM'
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

/**
 * The acknowledgement label for the step-5 preReply, e.g. `"Sat, Aug 15 at 10:00 AM start
 * time"`. The step-4 picker sends `"…on <day> at <time>"`, so the day is lifted from the
 * message; failing that it falls back to the tour's own date.
 */
function whenLabelFrom(text: string, tour: SampleTour, startClock: string): string {
  return `${pickedDayFrom(text, tour)} at ${startClock} start time`
}

/**
 * The `"on <day>"` segment of a picker prompt — e.g. `"Sat, Aug 15"` out of `"…on Sat, Aug 15
 * at 10:00 AM"`. Falls back to the tour's own date when the message names no day.
 */
function pickedDayFrom(text: string, tour: SampleTour): string {
  const onMatch = text.match(/\bon\s+(.+?)(?:\s+at\b|$)/i)
  return onMatch ? onMatch[1].trim() : formatTourDate(tour.date)
}

/** Month abbreviations → 0-based index, for lifting the picked month out of the day label. */
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

/**
 * Rebuild an ISO `YYYY-MM-DD` from the month + day in a picker prompt's day label (`"Sat, Aug
 * 15"`). The picker opens on the tour's own year and only walks months, so the year is taken
 * from the tour it belongs to. Returns null when no month/day can be read, so callers keep the
 * tour's own date.
 */
function pickedIsoFrom(text: string, fallbackYear: number): string | null {
  const m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})\b/i)
  if (!m) return null
  const month = MONTH_ABBR.indexOf(m[1].slice(0, 3).toLowerCase())
  if (month < 0) return null
  const day = Number(m[2])
  return `${fallbackYear}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** `"10:00 AM"` → minutes since midnight, or 600 (10:00) if unparseable. */
function parseClock(text: string): number {
  const m = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
  if (!m) return 600
  let h = Number(m[1]) % 12
  if (/pm/i.test(m[3])) h += 12
  return h * 60 + Number(m[2] ?? '0')
}

/** A stable, invented listing-agent identity per address — the outreach contacts. */
const LISTING_AGENTS: Record<
  string,
  { name: string; brokerage: string; phone: string; email: string }
> = {
  '195 Stanton Way': {
    name: 'Elena Marsh',
    brokerage: 'Summit Grove Realty',
    phone: '(555) 204-0148',
    email: 'elena.marsh@example.com',
  },
  '1678 Wallace Ave': {
    name: 'Trevor Okafor',
    brokerage: 'Old Quarter Homes',
    phone: '(555) 331-0292',
    email: 'trevor.okafor@example.com',
  },
  '3975 Turnley Ct': {
    name: 'Bianca Reyes',
    brokerage: 'Cedar Vale Properties',
    phone: '(555) 418-0173',
    email: 'bianca.reyes@example.com',
  },
}

/**
 * Showing requirements, read off the real listing. A recently-reduced listing shows on a
 * lockbox with no special notice; a long-on-market one is treated as agent-present with
 * 24-hour notice; a brand-new listing needs notice and confirmed access. Open-house and
 * urgency come from the listing's own fields.
 */
function showingFacts(l: SampleListing): {
  notice: string
  access: string
  openHouse: string
  urgency: string
} {
  const openHouse = l.openHouse.length ? l.openHouse[0] : 'Not yet scheduled'
  switch (l.status) {
    case 'Price Change':
      // The flow carries two reduced listings: the fresh reduction shows easily; the
      // long-on-market one is the harder access. Split on days-on-market.
      return l.daysOnMarket > 60
        ? {
            notice: '24 hours — seller occupied',
            access: 'Agent must be present — no lockbox',
            openHouse,
            urgency: `Low — ${l.daysOnMarket} days on market, room to negotiate`,
          }
        : {
            notice: 'No special notice indicated',
            access: 'Electronic lockbox — SUPRA key required',
            openHouse,
            urgency: 'Medium — recently reduced, expect increased interest',
          }
    case 'New':
      return {
        notice: '24 hours required',
        access: 'Lockbox — code provided upon confirmed appointment',
        openHouse,
        urgency: 'High — new listing, expect strong early interest',
      }
    case 'Coming Soon':
      return {
        notice: '48 hours — seller occupied',
        access: 'Agent must be present — no lockbox',
        openHouse,
        urgency: 'Low — pre-market, showings not yet open',
      }
    default:
      return {
        notice: 'No special notice indicated',
        access: 'Electronic lockbox — SUPRA key required',
        openHouse,
        urgency: 'Medium',
      }
  }
}

/** The per-agent outreach draft, worded to the listing's access requirements. */
function draftFor(p: {
  agentFirst: string
  line1: string
  members: string
  time: string
  status: ListingStatus
  daysOnMarket: number
  first: boolean
}): string {
  const head =
    `Hi ${p.agentFirst}, this is ${AGENT_FULL_NAME}. I'd like to schedule a showing at ${p.line1} ` +
    `for my clients ${p.members}. `
  if (p.status === 'New') {
    return (
      head +
      `We're looking at [DAY] around ${p.time} for approximately 30 minutes. I understand 24-hour ` +
      `notice is required — please confirm access and whether this time works. Thanks! - ${AGENT_FIRST_NAME} (your phone #)`
    )
  }
  if (p.status === 'Price Change' && p.daysOnMarket > 60) {
    return (
      head +
      `We're looking at this coming [DAY] around ${p.time} for about 30 minutes. I understand 24-hour ` +
      `notice is required and the listing agent must be present — please confirm if this time works or ` +
      `suggest an alternative. Thanks! - ${AGENT_FIRST_NAME} (your phone #)`
    )
  }
  return (
    head +
    `We're looking at this coming [DAY] at ${p.time} for about 30 minutes.` +
    (p.first ? ' This is the first stop on a 3-property tour.' : '') +
    ` Can you confirm access and let me know if this time works? Thanks! - ${AGENT_FIRST_NAME} (your phone #)`
  )
}

/** Full member names joined for a sentence — `"Jordan and Mia Castellanos"`. */
function memberNames(client: Client): string {
  // The display name carries the shared surname. `"Jordan & Mia Castellanos"` → `"Jordan and
  // Mia Castellanos"`.
  return client.name.replace(/\s*&\s*/g, ' and ')
}

/** `["A","B","C"]` → `"A, B, and C"`. */
function listCities(cities: string[]): string {
  if (cities.length <= 1) return cities.join('')
  return `${cities.slice(0, -1).join(', ')}, and ${cities[cities.length - 1]}`
}

/**
 * Assemble every property in the tour, with its schedule slot, showing facts and outreach
 * draft. The stops keep the dataset's tour order; travel time is the tour's own drive budget
 * split evenly across the legs, and each showing is a 30-minute block.
 */
function planProperties(client: Client, tour: SampleTour): PlanProperty[] {
  const members = memberNames(client)
  const stops = tour.stops
  const legs = Math.max(stops.length - 1, 1)
  const perLeg = Math.round(tour.driveTimeMins / legs)
  const SHOWING = 30

  let cursor = parseClock(tour.startTime ?? '10:00 AM')

  return stops.map((stop, i) => {
    const listing = getListing(stop.listingId)!
    const disp = statusDisplay(listing.status)
    const facts = showingFacts(listing)
    const contact = LISTING_AGENTS[listing.address.line1] ?? {
      name: 'Listing Agent',
      brokerage: 'Listing Brokerage',
      phone: '(555) 000-0000',
      email: 'listing.agent@example.com',
    }
    const start = cursor
    const end = start + SHOWING
    const timeRange = `${fmtClock(start)} – ${fmtClock(end)}`
    const next = stops[i + 1]
    const travelToNext = next
      ? `Travel: ~${perLeg} min to ${getListing(next.listingId)!.address.city}`
      : null
    cursor = end + perLeg

    return {
      order: stop.order,
      index: i + 1,
      line1: listing.address.line1,
      city: listing.address.city,
      price: listing.price,
      beds: listing.beds,
      bathsLabel: bathsLabel(listing),
      sqft: listing.sqft,
      photo: listing.primaryPhoto,
      status: listing.status,
      statusLabel: disp.label,
      statusTone: disp.tone,
      agentName: `${contact.name} (${contact.brokerage})`,
      agentFirst: contact.name.split(' ')[0],
      brokerage: contact.brokerage,
      phone: contact.phone,
      email: contact.email,
      noticeRequired: facts.notice,
      access: facts.access,
      openHouse: facts.openHouse,
      urgency: facts.urgency,
      draft: draftFor({
        agentFirst: contact.name.split(' ')[0],
        line1: listing.address.line1,
        members,
        time: fmtClock(start),
        status: listing.status,
        daysOnMarket: listing.daysOnMarket,
        first: i === 0,
      }),
      timeRange,
      duration: `${SHOWING} min`,
      travelToNext,
    }
  })
}

/** The pre-flight notes — one line per real caveat, plus the spread-across-cities warning. */
function planNotes(props: PlanProperty[]): LeadNote[] {
  const notes: LeadNote[] = []
  for (const p of props) {
    if (p.status === 'New') {
      notes.push({
        lead: p.line1,
        text: ` just came on the market — showings need a confirmed appointment, so reach out early to lock a time.`,
      })
    } else if (p.status === 'Price Change' && p.urgency.startsWith('Low')) {
      notes.push({
        lead: p.line1,
        text: ` has a 24-hour notice requirement and the listing agent must be present — confirm access a full day ahead.`,
      })
    }
  }
  const cities = Array.from(new Set(props.map((p) => p.city)))
  if (cities.length > 1) {
    notes.push({
      text: `These properties are spread across ${listCities(cities)} — that's real driving distance between stops, so the order matters.`,
    })
  }
  return notes
}

/** The conflicts, read off the stops' real statuses and showing facts. */
function conflictNotes(tour: SampleTour, props: PlanProperty[]): LeadNote[] {
  const notes: LeadNote[] = []
  for (const p of props) {
    if (p.status === 'New') {
      notes.push({
        lead: p.line1,
        text: ` just listed and has no confirmed showing time yet — confirm access before locking the route.`,
      })
    } else if (p.status === 'Price Change' && p.urgency.startsWith('Low')) {
      notes.push({
        lead: p.line1,
        text: ` requires 24-hour notice and the listing agent must be present — reach out at least a full day before the tour date.`,
      })
    }
  }
  const cities = Array.from(new Set(props.map((p) => p.city)))
  notes.push({
    lead: 'Significant drive times',
    text: ` — the stops span ${listCities(cities)}, roughly ${tour.driveTimeMins} minutes of driving in total. If any property falls through, the remaining two are far apart.`,
  })
  return notes
}

/** The ranked next steps, unconfirmed access first, then confirming the date. */
function stepNotes(client: Client, props: PlanProperty[]): LeadNote[] {
  const steps: LeadNote[] = []
  for (const p of props) {
    if (p.status === 'Price Change' && p.urgency.startsWith('Low')) {
      steps.push({
        lead: `Contact ${p.agentFirst} now`,
        text: ` — satisfy the 24-hour notice for ${p.line1}`,
      })
    }
  }
  for (const p of props) {
    if (p.status === 'New') {
      steps.push({
        lead: `Contact ${p.agentFirst} now`,
        text: ` — confirm a showing time for the new ${p.line1} listing`,
      })
    }
  }
  const anchor = props[0]
  steps.push({
    lead: `Contact ${anchor.agentFirst}`,
    text: ` — confirm the ${anchor.timeRange.split(' – ')[0]} slot at ${anchor.line1}`,
  })
  steps.push({
    lead: `Confirm the tour date with ${client.name}`,
    text: ` once showings are locked in`,
  })
  return steps
}

/** The tool-trace card, worded to the client. */
function toolTraceCard(client: Client): ToolTraceCard {
  const first = client.greetingName
  return {
    kind: 'toolTrace',
    lines: [
      `Let me pull up ${first}’s group to see their saved listings.`,
      `Good, I have their group info. Now let me fetch the property details for the first 3 listings in their feed (most recently added).`,
    ],
    toolCount: 2,
    found: 'Found listing information',
  }
}

function tourListingsCard(client: Client, props: PlanProperty[]): TourListingsCard {
  return { kind: 'tourListings', greetingName: client.greetingName, properties: props }
}

function tourPlanCard(client: Client, props: PlanProperty[]): TourPlanCard {
  return {
    kind: 'tourPlan',
    client: client.greetingName,
    greetingName: client.greetingName,
    properties: props,
    notes: planNotes(props),
  }
}

function timelineCard(client: Client, props: PlanProperty[]): TimelineCard {
  const cities = Array.from(new Set(props.map((p) => p.city)))
  const route = cities.join(' → ')
  const last = props[props.length - 1]
  // Total from the first start to the last end.
  const startMins = parseClock(props[0].timeRange.split(' – ')[0])
  const endMins = parseClock(last.timeRange.split(' – ')[1])
  const total = endMins - startMins
  const hrs = Math.floor(total / 60)
  const mins = total % 60
  const totalDuration =
    hrs > 0
      ? `~${hrs} hour${hrs === 1 ? '' : 's'}${mins ? ` ${mins} minutes` : ''}`
      : `~${mins} minutes`
  return {
    kind: 'tourTimeline',
    members: memberNames(client),
    routingNote:
      `These properties are spread across ${listCities(cities)}. I've ordered them geographically to ` +
      `minimize backtracking (${route}), but you can adjust if preferred.`,
    properties: props,
    totalDuration: `${totalDuration} (including travel)`,
    finish: last.timeRange.split(' – ')[1],
  }
}

function outreachCard(props: PlanProperty[]): OutreachCard {
  return { kind: 'tourOutreach', properties: props }
}

function summaryCard(
  client: Client,
  tour: SampleTour,
  props: PlanProperty[],
  dayLabel: string,
  startTime: string,
): SummaryCard {
  return {
    kind: 'tourSummary',
    greetingName: client.greetingName,
    dayLabel,
    startTime,
    conflicts: conflictNotes(tour, props),
    steps: stepNotes(client, props),
    confidence: {
      lead: 'Confidence: Medium (60%)',
      text:
        ` — the timeline is solid and the anchor stop is confirmed, but access is unconfirmed for the other ` +
        `two properties, so the route isn't locked yet.`,
    },
    nextOptions: [
      "Send these draft messages (I'll let you review/edit each one first)",
      'Adjust the tour order or timing',
      'Confirm access for the two open stops',
      'Confirm and put the tour on the calendar',
    ],
  }
}

/** Step 1 — the roster of clients who have saved listings to tour. */
function clientPickerCard(clients: Client[]): ClientPickerCard {
  const withTours = clients.filter((c) => upcomingTourFor(c.id))
  return {
    kind: 'clientPicker',
    title: 'For whom do you wish to coordinate a tour?',
    clients: withTours.map((c) => {
      const tour = upcomingTourFor(c.id)!
      return {
        id: c.id,
        name: c.name,
        greetingName: c.greetingName,
        initials: c.initials,
        stage: c.stage,
        dataColor: TAGC[c.stage] ?? 'graySubtle',
        meta: `${c.saved} saved homes · ${tour.stopCount} ${tour.stopCount === 1 ? 'stop' : 'stops'} to plan`,
        prompt: `Coordinate a tour for ${c.greetingName}`,
      }
    }),
  }
}

/** Step 2 — the three listing-selection methods (only "top 3" is wired for now). */
function selectMethodCard(client: Client): SelectMethodCard {
  return {
    kind: 'selectMethod',
    greetingName: client.greetingName,
    title: 'How would you like to select listings?',
    methods: [
      {
        label: 'Choose from a list',
        description: 'Hand-pick from all of their saved homes',
        prompt: '',
        enabled: false,
      },
      {
        label: 'Search for listings to include',
        description: 'Search the MLS and add matches to the tour',
        prompt: '',
        enabled: false,
      },
      {
        label: 'Choose the top 3 listings for this client',
        description: 'I’ll pull the three most relevant saved homes',
        prompt: `Choose the top 3 listings for ${client.greetingName}`,
        enabled: true,
      },
    ],
  }
}

/** The start-time options the date/time picker offers. */
const START_TIMES = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM']

/** Step 4 — the calendar-plus-time-chips picker, opened on the client's tour month. */
function dateTimeCard(client: Client, tour: SampleTour): DateTimeCard {
  const [y, m, d] = tour.date.split('-').map(Number)
  const first = tour.stops[0]
  const address = first ? getListing(first.listingId)?.address.line1 ?? first.address : ''
  return {
    kind: 'dateTime',
    client: client.name,
    clientId: client.id,
    greetingName: client.greetingName,
    address,
    year: y,
    month: m - 1,
    suggestedDay: d,
    times: START_TIMES,
  }
}

/** The final scheduled-tour panel. */
function upcomingTourCard(client: Client, tour: SampleTour, props: PlanProperty[]): UpcomingTourCard {
  const [y, mo, d] = tour.date.split('-').map(Number)
  const dateLabel = new Date(y, mo - 1, d).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return {
    kind: 'upcomingTour',
    title: `Upcoming Tour – ${dateLabel}`,
    client: client.name,
    greetingName: client.greetingName,
    members: memberNames(client),
    dateLabel,
    stopCount: tour.stopCount,
    stops: props.map((p) => ({
      line1: p.line1,
      statusLabel: p.statusLabel,
      statusTone: p.statusTone,
      beds: p.beds,
      bathsLabel: p.bathsLabel,
      sqft: p.sqft,
      photo: p.photo,
    })),
    suggestions: [
      `Share the tour with ${client.greetingName}`,
      'Review drafts to listing agents',
      'Create a search',
      'Client pulse',
      'Tour coordinator',
    ],
  }
}

// ─── Broad, non-tour intents (client cards, follow-ups, market) ────────────────

/** `"Sat Aug 1"` — the label format the tour cards and Home screen already use. */
const dayLabel = (d: Date) =>
  d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

/** The next date after "today" falling on `weekday` (0 = Sunday). */
function nextWeekday(weekday: number): Date {
  const d = new Date(PROTOTYPE_TODAY)
  const delta = (weekday - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + delta)
  return d
}

function relativeDays(days: number): Date {
  const d = new Date(PROTOTYPE_TODAY)
  d.setDate(d.getDate() + days)
  return d
}

/**
 * "saturday morning" / "sat at 10am" / "tomorrow" → a concrete slot, resolved against
 * `PROTOTYPE_TODAY` so the day names match the dataset's tour dates.
 */
function parseWhen(text: string): { label: string; at: number } | null {
  const t = text.toLowerCase()
  const days: Array<[RegExp, () => Date]> = [
    [/\bsun(day)?\b/, () => nextWeekday(0)],
    [/\bmon(day)?\b/, () => nextWeekday(1)],
    [/\btue(s|sday)?\b/, () => nextWeekday(2)],
    [/\bwed(nesday)?\b/, () => nextWeekday(3)],
    [/\bthu(r|rs|rsday)?\b/, () => nextWeekday(4)],
    [/\bfri(day)?\b/, () => nextWeekday(5)],
    [/\bsat(urday)?\b/, () => nextWeekday(6)],
    [/\btomorrow\b/, () => relativeDays(1)],
  ]
  const resolve = days.find(([re]) => re.test(t))?.[1]
  if (!resolve) return null
  const date = resolve()
  const day = dayLabel(date)

  const explicit = t.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)
  let time = '10:00 AM'
  if (explicit) {
    const h = explicit[1]
    const m = explicit[2] ?? '00'
    time = `${h}:${m} ${explicit[3].toUpperCase()}`
  } else if (/\bafternoon\b/.test(t)) {
    time = '2:00 PM'
  } else if (/\bevening\b/.test(t)) {
    time = '5:30 PM'
  }
  return { label: `${day} · ${time}`, at: date.getTime() }
}

/**
 * Best-effort epoch ms for a `when` string a host model produced ("Sat Aug 8 · 10:00 AM").
 * The year is not in the string, so it is taken from `PROTOTYPE_TODAY`.
 */
function whenToEpoch(when: string): number {
  const day = when.split('·')[0].trim()
  const parsed = Date.parse(`${day} ${PROTOTYPE_TODAY.getFullYear()}`)
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
}

/** Local-time epoch ms for an ISO `YYYY-MM-DD`. */
function isoToEpoch(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/**
 * Built from the same derived needs the Home screen lists, so the two never disagree.
 * Clients here are fictional and have no stated pronouns, hence they/them throughout.
 */
const followUpReply = () => {
  if (clientNeeds.length === 0) return 'Nothing is waiting on you right now — your book is clear this week.'
  const lead = clientNeeds[0]
  const rest = clientNeeds.slice(1)
  const count =
    clientNeeds.length === 1 ? 'One client needs' : `${clientNeeds.length} clients need`
  const others = rest.length
    ? ` Then ${rest.map((n) => `${n.client} (${n.text.toLowerCase()})`).join(', and ')}.`
    : ''
  return (
    `${count} you this week. ${lead.client} is the time-sensitive one — ${lead.text.toLowerCase()}.` +
    `${others} I would start there.`
  )
}

/** A per-client next step, keyed off the client's stage rather than a hardcoded id. */
function insightFor(c: Client): string {
  const first = c.greetingName
  switch (c.stage) {
    case 'Requests':
      return `${first} has open tour requests sitting with you, so confirming showing times is the highest-value next step.`
    case 'Active':
      return `${c.saved} saved homes and ${c.lastActivity.toLowerCase()} — worth offering a tour while the interest is warm.`
    case 'Invited':
      return `The invite has not been taken up yet, so a short re-invite with two or three matches would give ${first} a reason to log in.`
    case 'Shared':
      return `Their search is shared with you, so you can send listings directly — ${first} does not need to go looking.`
    case 'Archived':
      return `Archived, but ${c.saved} saved homes are still on file. A light re-check costs nothing if the timeline has moved.`
    default:
      return `${first} is on your book with ${c.saved} saved homes. Ask me for tours, saved searches, or listing context.`
  }
}

/** Market context for a city, from the listings actually in that city. */
function marketReply(city: string): string | null {
  const inCity = SAMPLE_LISTINGS.filter(
    (l) => l.address.city.toLowerCase() === city.toLowerCase(),
  )
  if (inCity.length === 0) return null
  const prices = inCity.map((l) => l.price)
  const low = Math.min(...prices)
  const high = Math.max(...prices)
  const avgDom = Math.round(inCity.reduce((a, l) => a + l.daysOnMarket, 0) / inCity.length)
  const drops = inCity.filter((l) => l.status === 'Price Change').length
  const range = low === high ? formatPrice(low) : `${formatPrice(low)}–${formatPrice(high)}`
  return (
    `You have ${inCity.length} ${inCity.length === 1 ? 'listing' : 'listings'} in ${inCity[0].address.city}, ` +
    `${range}, averaging ${avgDom} days on market. ` +
    (drops > 0
      ? `${drops} of them have already repriced, so there is room to negotiate.`
      : 'None have repriced yet, so expect sellers to hold near list.')
  )
}

const CITIES = Array.from(new Set(SAMPLE_LISTINGS.map((l) => l.address.city)))

/**
 * Mock reasoning over the seeded book of business. The tour-coordination flow is the rich
 * multi-card path; everything else (client cards, follow-ups, market context) stays a short
 * plain-text reply, mirroring the DC system prompt's rules.
 */
function respondLocally(text: string, clients: Client[]): AssistantResult {
  const t = text.toLowerCase()
  const cards: Card[] = []

  // ── step 3 · choose the top 3 ── the wired listing-selection method. Pulls the client's
  // saved listings and lays out the coordinated tour *without any times or dates* — the plan
  // table and pre-flight notes only — then invites the agent to choose a date and start time.
  if (/\btop (3|three)\b/.test(t)) {
    const named = clients.find((c) => mentions(t, c)) ?? clients.find((c) => upcomingTourFor(c.id))
    const tour = named ? upcomingTourFor(named.id) : undefined
    if (named && tour) {
      const props = planProperties(named, tour)
      cards.push(toolTraceCard(named), tourListingsCard(named, props), tourPlanCard(named, props))
      return {
        cards,
        reply:
          `Here's the coordinated tour for ${named.greetingName} — three stops, no times locked in yet. ` +
          `When you're ready, choose a date and start time and I'll build out the full timeline, showing ` +
          `instructions, and draft outreach for each listing agent.`,
      }
    }
  }

  // ── step 1 & 2 · create / coordinate a tour ── with no client named, ask whom the tour is
  // for (step 1); with a client named, acknowledge and ask how to select listings (step 2).
  if (
    /\b(plan|coordinate|create|put together|build|map out|organi[sz]e|set up|start)\b/.test(t) &&
    /\btour\b/.test(t) &&
    !/\bstart the tour\b/.test(t)
  ) {
    const named = clients.find((c) => mentions(t, c))
    if (!named) {
      // Step 1 — "Create a tour". The picker card carries the question in its heading.
      cards.push(clientPickerCard(clients))
      return { cards, preReply: 'I can do that.', reply: '' }
    }
    const tour = upcomingTourFor(named.id)
    if (!tour) {
      return {
        cards,
        reply: `${named.greetingName} has no saved listings to tour yet. Add a few homes to their feed and I’ll coordinate a tour from there.`,
      }
    }
    // Step 2 — a client was chosen. The method card carries the question in its heading.
    cards.push(selectMethodCard(named))
    return { cards, preReply: `Okay, I'll coordinate a tour for ${named.greetingName}.`, reply: '' }
  }

  // ── step 4 · choose a date and start time ── surfaces the calendar-plus-time-chips picker.
  if (
    /\bchoose a date\b/.test(t) ||
    /\bdate and (a )?(start )?time\b/.test(t) ||
    /\bpick (a )?(date|day)\b/.test(t) ||
    (/\b(set|lock in|confirm)\b/.test(t) && /\b(date|day)\b/.test(t)) ||
    (/\bcalendar\b/.test(t) && /\btour\b/.test(t))
  ) {
    const named = clients.find((c) => mentions(t, c)) ?? clients.find((c) => upcomingTourFor(c.id))
    const tour = named ? upcomingTourFor(named.id) : undefined
    if (named && tour) {
      cards.push(dateTimeCard(named, tour))
      return {
        cards,
        reply: `Pick a day and a start time for ${named.greetingName}’s tour and I’ll build out the full coordination plan.`,
      }
    }
  }

  // ── step 5 · build the coordination plan ── the picker's day+time selection ("Start the
  // tour for X on <day> at <time>"). Builds the timeline, per-agent outreach, conflicts and
  // ranked next steps, then invites the agent to confirm and book.
  if (/\bstart the tour\b/.test(t)) {
    const named = clients.find((c) => mentions(t, c)) ?? clients.find((c) => upcomingTourFor(c.id))
    const tour = named ? upcomingTourFor(named.id) : undefined
    if (named && tour) {
      const startClock = fmtClock(parseClock(text))
      const pickedDay = pickedDayFrom(text, tour)
      const props = planProperties(named, { ...tour, startTime: startClock })
      const when = whenLabelFrom(text, tour, startClock)
      cards.push(
        timelineCard(named, props),
        outreachCard(props),
        summaryCard(named, tour, props, pickedDay, startClock),
      )
      return {
        cards,
        preReply: `Got it — ${when}. Let me build out the full coordination plan.`,
        reply: 'What would you like to do next?',
      }
    }
  }

  // ── step 6 · schedule the tour ── "Confirm & book". Shows the final upcoming-tour panel and
  // updates client + tour state.
  if (/\bschedule\b/.test(t) && /\btour\b/.test(t)) {
    const named = clients.find((c) => mentions(t, c)) ?? clients.find((c) => upcomingTourFor(c.id))
    const tour = named ? upcomingTourFor(named.id) : undefined
    if (named && tour) {
      // The confirm action echoes the step-4 selection ("…on <day> at <time>"), so book the
      // tour on the day and time the user picked, falling back to the tour's own values when a
      // path reaches this step without them.
      const [tourYear] = tour.date.split('-').map(Number)
      const hasTime = /\b\d{1,2}(?::\d{2})?\s*(am|pm)\b/i.test(text)
      const startClock = hasTime ? fmtClock(parseClock(text)) : tour.startTime ?? '10:00 AM'
      const booked: SampleTour = {
        ...tour,
        date: pickedIsoFrom(text, tourYear) ?? tour.date,
        startTime: startClock,
      }
      const props = planProperties(named, booked)
      cards.push(upcomingTourCard(named, booked, props))
      const first = props[0]
      return {
        cards,
        reply: `Done — ${named.greetingName}’s ${formatTourDate(booked.date)} tour is on the calendar with all ${booked.stopCount} stops. I’ll send the drafts to the listing agents once you give the word.`,
        scheduled: {
          client: named,
          address: first.line1,
          when: `${formatTourDate(booked.date)} · ${booked.startTime ?? first.timeRange.split(' – ')[0]}`,
          type: `Buyer tour · ${booked.stopCount} ${booked.stopCount === 1 ? 'stop' : 'stops'}`,
          tourId: tour.id,
          at: isoToEpoch(booked.date),
          date: booked.date,
          startTime: startClock,
        },
      }
    }
  }

  // ── single-property schedule ── the legacy "set up a tour for X at <address> on <day>".
  if (/\b(tour|showing|show(ing)?s?|visit)\b/.test(t) && /\b(set up|book|arrange)\b/.test(t)) {
    const named = clients.find((c) => mentions(t, c))
    const listing = LISTINGS.find((l) => t.includes(l.address.toLowerCase()))
    const when = parseWhen(t)

    if (!named) return { cards, reply: 'Which client is this tour for?' }
    if (!listing) return { cards, reply: `Which property should I put on ${named.greetingName}’s tour?` }
    if (!when) return { cards, reply: `What day works for ${named.greetingName}?` }

    cards.push({
      kind: 'tour',
      address: listing.address,
      meta: `${listing.meta} · ${listing.hood}`,
      client: named.name,
      when: when.label,
    })
    return {
      cards,
      reply: `Requested ${listing.address} for ${named.name} on ${when.label} — the invite is out to the listing agent.`,
      scheduled: {
        client: named,
        address: listing.address,
        when: when.label,
        type: 'Buyer tour · 1 stop',
        at: when.at,
      },
    }
  }

  // Broad "who needs attention" question.
  if (/\bfollow[- ]?up|needs? (a )?(follow|attention)|who needs\b/.test(t)) {
    return { cards, reply: followUpReply() }
  }

  // show_client_card — any question naming a client.
  const named = clients.find((c) => mentions(t, c))
  if (named) {
    if (/\bdraft\b/.test(t)) {
      const first = named.greetingName
      const brief = named.looking.startsWith('—')
        ? 'new listings coming up in your area'
        : `${named.looking.split(',')[0].toLowerCase()} in your range`
      return {
        cards,
        reply:
          `Here is a short one you can send as is: "Hi ${first} — quick check in. ` +
          `I have been watching ${brief} and a couple look worth a look this week. ` +
          `Want me to line up a tour?" Adjust the tone and it is ready to go.`,
      }
    }
    cards.push(toClientCard(named))
    return { cards, reply: insightFor(named) }
  }

  // Market context — any question naming a city that appears in the listings.
  const city = CITIES.find((c) => t.includes(c.toLowerCase()))
  if (city) {
    const reply = marketReply(city)
    if (reply) return { cards, reply }
  }

  const names = clients.slice(0, 3).map((c) => c.greetingName)
  return {
    cards,
    reply:
      `I can pull up any of your ${clients.length} clients, coordinate a tour, or give you context on the ` +
      `${LISTINGS.length} listings you are working. Try asking about ${names.join(', ')}, or a city like ${CITIES[0]}.`,
  }
}

// ─── Add-client onboarding flow ────────────────────────────────────────────────

export type AddClientState = 'people' | 'prefs' | 'location' | 'confirm'

export interface AddClientMember {
  first: string
  last: string
  email: string
  phone: string
}

/** Free-text preferences parsed into the structured filters the search is built from. */
export interface AddClientCriteria {
  beds?: number
  baths?: number
  /** Canonical property types, e.g. `['Duplex', 'Condo']`. */
  propertyTypes: string[]
  priceCeiling?: number
  /** e.g. `['Pool']`. */
  amenities: string[]
  /** Timeline and soft wants stored as context, not hard filters. */
  contextNotes: string[]
}

export interface AddClientData {
  members: AddClientMember[]
  groupId?: string
  criteria?: AddClientCriteria
  locations?: string[]
  transaction?: 'sale' | 'rental'
}

export interface AddClientFlow {
  state: AddClientState
  data: AddClientData
}

/** Matches the flow trigger — the "Add Client" capability, or "add another client". */
export function triggersAddClient(text: string): boolean {
  return /\badd\s+(a\s+|an\s+)?(new\s+|another\s+)?client\b/i.test(text)
}

const titleCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

/** Parse one "First Last, email, phone" entry into a member. Returns null with no name. */
function parseMember(entry: string): AddClientMember | null {
  const email = entry.match(/[^\s,;]+@[^\s,;]+\.[^\s,;]+/)?.[0] ?? ''
  const phone = entry.match(/\+?\d[\d\-().\s]{6,}\d/)?.[0]?.trim() ?? ''
  const name = entry
    .replace(email, '')
    .replace(phone, '')
    .replace(/[,;]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!name) return null
  const parts = name.split(' ')
  return {
    first: titleCase(parts[0]),
    last: parts.slice(1).map(titleCase).join(' '),
    email,
    phone,
  }
}

/** Split the people message into per-person entries, then parse each. */
function parseMembers(text: string): AddClientMember[] {
  return text
    .split(/\n|;/)
    .map((line) => parseMember(line))
    .filter((m): m is AddClientMember => m !== null)
}

const fullName = (m: AddClientMember) => [m.first, m.last].filter(Boolean).join(' ')

/** Free-text preferences → structured criteria. Timeline / soft wants become notes. */
function parseCriteria(text: string): AddClientCriteria {
  const t = text.toLowerCase()
  const beds = t.match(/(\d+)\s*(?:br\b|beds?\b|bedrooms?\b)/)?.[1]
  const baths = t.match(/(\d+(?:\.\d+)?)\s*(?:ba\b|baths?\b|b\b)/)?.[1]

  const propertyTypes: string[] = []
  const typeMap: Array<[RegExp, string]> = [
    [/\bcondo(minium)?s?\b/, 'Condo'],
    [/\bduplex(es)?\b/, 'Duplex'],
    [/\btown\s?(house|home)s?\b/, 'Townhouse'],
    [/\bsingle[- ]family\b|\bhouses?\b/, 'House'],
    [/\bapartments?\b/, 'Apartment'],
  ]
  for (const [re, label] of typeMap) if (re.test(t) && !propertyTypes.includes(label)) propertyTypes.push(label)

  const kMatch = t.match(/(\d[\d,.]*)\s*k\b/)
  const dollarMatch = t.match(/\$\s*([\d,]+)/)
  const priceCeiling = kMatch
    ? Math.round(parseFloat(kMatch[1].replace(/,/g, '')) * 1000)
    : dollarMatch
      ? parseInt(dollarMatch[1].replace(/,/g, ''), 10)
      : undefined

  const amenities: string[] = []
  if (/\bpool\b/.test(t)) amenities.push('Pool')
  if (/\bgarage\b/.test(t)) amenities.push('Garage')

  const contextNotes: string[] = []
  const timeline = text.match(/(?:move[- ]?in|close|ready)[^.,;]*?(?:within|in)\s+\d+\s+(?:months?|weeks?|days?)/i)
  if (timeline) contextNotes.push(`Move-in ${timeline[0].replace(/^move[- ]?in\s*/i, '').trim()}`)
  else {
    const within = text.match(/within\s+\d+\s+(?:months?|weeks?|days?)/i)
    if (within) contextNotes.push(`Move-in ${within[0]}`)
  }
  if (/\bwalk(ing)?\s+distance\b/.test(t) && /\bschool\b/.test(t))
    contextNotes.push('walking distance from school')

  return {
    beds: beds ? Number(beds) : undefined,
    baths: baths ? Number(baths) : undefined,
    propertyTypes,
    priceCeiling,
    amenities,
    contextNotes,
  }
}

/** Parse the location + sale/rental message. */
function parseLocation(text: string): { locations: string[]; transaction: 'sale' | 'rental' } {
  const transaction: 'sale' | 'rental' = /\brent(al|ing)?\b|\blease\b|\bfor rent\b/i.test(text)
    ? 'rental'
    : 'sale'
  const locations = text
    .replace(/\b(for\s+)?(sale|rent(al|ing)?|lease|buy|purchase)\b/gi, '')
    .split(/,|;|\band\b|\n|\//)
    .map((s) => s.replace(/[.]/g, '').trim())
    .filter((s) => s.length > 0)
  return { locations, transaction }
}

/** `600000` → `"$600,000"`; `600000` → `"$600K"` in the compact form. */
const priceFull = (n: number) => `$${n.toLocaleString('en-US')}`
const priceCompact = (n: number) => (n % 1000 === 0 ? `$${n / 1000}K` : priceFull(n))

const bedsBaths = (c: AddClientCriteria) => {
  const parts: string[] = []
  if (c.beds != null) parts.push(`${c.beds} bedroom${c.beds === 1 ? '' : 's'}`)
  if (c.baths != null) parts.push(`${c.baths} bathroom${c.baths === 1 ? '' : 's'}`)
  return parts.join(', ')
}

/** Property types joined for prose — `"Duplex or condo"`. */
const typesProse = (types: string[]) =>
  types.map((t, i) => (i === 0 ? t : t.toLowerCase())).join(' or ')

/** Property types formatted for the finalized search — `"Condominium, Duplex"`. */
const typesFormal = (types: string[]) =>
  types
    .map((t) => (t === 'Condo' ? 'Condominium' : t))
    .sort((a, b) => a.localeCompare(b))
    .join(', ')

const listLocations = (locs: string[]) => locs.join(' & ')

/**
 * The add-client state machine. Given the current flow (or null to start) and the user's
 * message, returns the assistant result and the next flow — `null` once the flow completes,
 * so a subsequent trigger starts a fresh onboarding.
 */
export function stepAddClient(
  flow: AddClientFlow | null,
  text: string,
): { result: AssistantResult; flow: AddClientFlow | null } {
  // Start (no active flow) — State 1, collect the people.
  if (!flow) {
    return {
      result: {
        cards: [],
        threadTitle: 'Add Client',
        reply:
          `Let's get your new client set up!\n` +
          `Single buyer or co-buyers (couple, family)?\n\n` +
          `Please provide for each person:\n` +
          `- First name, last name, email\n` +
          `- Phone (recommended)\n\n` +
          `List each person if co-buyers.`,
      },
      flow: { state: 'people', data: { members: [] } },
    }
  }

  const data = flow.data

  // State 2 — the people were provided: create the group, ask about the search.
  if (flow.state === 'people') {
    const members = parseMembers(text)
    if (members.length === 0) {
      return {
        result: {
          cards: [],
          reply:
            `I didn't catch a name in there. Give me at least a name and email — for example: ` +
            `"Dave Firenze, dave@email.com, 405-555-6594".`,
        },
        flow,
      }
    }
    const first = members[0].first
    const titleName = members.map(fullName).join(' & ')
    const roster = members
      .map((m) => `- ${fullName(m)} (${[m.email, m.phone].filter(Boolean).join(', ')})`)
      .join('\n')
    return {
      result: {
        preReply: `Got it! Let me create the group for ${first}.`,
        threadTitle: `Onboarding ${titleName} as New Client`,
        cards: [
          { kind: 'toolRun', processing: 'Churning the data…', resolved: '✓ Created a new group' },
          {
            kind: 'addClientMessage',
            completed: true,
            body:
              `Client group ready:\n${roster}\n\n` +
              `Tell me about them so I can help set up their search:\n` +
              `- What are they looking for?\n` +
              `- Timeline, budget, must-haves?\n` +
              `- Any context that would help?\n\n` +
              `(This is private to you — helps me suggest the right search criteria. You can also skip this.)`,
          },
        ],
        reply: '',
      },
      flow: {
        state: 'prefs',
        data: { ...data, members, groupId: `grp_${first.toLowerCase()}` },
      },
    }
  }

  // State 3 — the preferences were provided: save context, echo parsed criteria, ask location.
  if (flow.state === 'prefs') {
    const first = data.members[0]?.first ?? 'them'
    const criteria = parseCriteria(text)
    const bullets: string[] = []
    const bb = bedsBaths(criteria)
    if (bb) bullets.push(bb)
    if (criteria.propertyTypes.length) bullets.push(typesProse(criteria.propertyTypes))
    if (criteria.priceCeiling != null) bullets.push(`Up to ${priceFull(criteria.priceCeiling)}`)
    for (const a of criteria.amenities) bullets.push(a === 'Pool' ? 'Pool access' : a)
    bullets.push('Status: Active + Active Under Contract + Coming Soon (default)')
    if (criteria.propertyTypes.length)
      bullets.push(
        `Property type: ${criteria.propertyTypes.join(', ')} (default is all — I'll narrow to match)`,
      )
    return {
      result: {
        preReply: `Thanks! Let me save that context for ${first}.`,
        cards: [
          {
            kind: 'toolRun',
            processing: 'Saving group information…',
            resolved: '✓ Saved group information',
          },
          {
            kind: 'addClientMessage',
            completed: true,
            body:
              `Context saved. Based on what you told me, I can set up a search for:\n` +
              bullets.map((b) => `- ${b}`).join('\n') +
              `\n\nI'll need a location to create the search — what city, zip, or neighborhood is ${first} looking in?\n\n` +
              `Also, is this a sale or rental?`,
          },
        ],
        reply: '',
      },
      flow: { state: 'location', data: { ...data, criteria } },
    }
  }

  // State 4 — location + sale/rental: run the five tools, present the finalized search.
  if (flow.state === 'location') {
    const { locations, transaction } = parseLocation(text)
    const criteria = data.criteria ?? { propertyTypes: [], amenities: [], contextNotes: [] }
    const locLabel = listLocations(locations)
    const bullets: string[] = []
    const bb = bedsBaths(criteria)
    if (bb) bullets.push(bb)
    if (locations.length) bullets.push(`${locLabel}, CA`)
    if (criteria.priceCeiling != null) bullets.push(`Up to ${priceFull(criteria.priceCeiling)}`)
    if (criteria.propertyTypes.length) bullets.push(`Property type: ${typesFormal(criteria.propertyTypes)}`)
    for (const a of criteria.amenities) bullets.push(`Association amenity: ${a}`)
    bullets.push('Status: Active + Active Under Contract + Coming Soon (default)')
    return {
      result: {
        preReply: `Got it — ${transaction} in ${locLabel}. Let me set up that search now.`,
        cards: [
          {
            kind: 'toolGroup',
            processing: 'Crunching numbers…',
            tools: [
              '✓ Ran get_filter_details',
              '✓ Ran search_locations',
              '✓ Ran get_available_filters',
              '✓ Ran search_locations',
              '✓ Ran get_searchable_markets',
            ],
          },
          {
            kind: 'addClientMessage',
            completed: true,
            confirm: { label: 'Create this search', prompt: 'create the search' },
            body:
              `I have everything I need. Here's what I'll create:\n` +
              bullets.map((b) => `- ${b}`).join('\n') +
              `\n\nWant me to create this search, or any changes?`,
          },
        ],
        reply: '',
      },
      flow: { state: 'confirm', data: { ...data, locations, transaction } },
    }
  }

  // State 5 — confirm: create the saved search and summarise. Anything not clearly a
  // confirmation is treated as a change request, holding at the review step.
  if (flow.state === 'confirm') {
    if (/\b(no|don'?t|change|adjust|edit|wait|hold)\b/i.test(text) && !/\bcreate\b/i.test(text)) {
      return {
        result: { cards: [], reply: 'Sure — tell me what to change and I’ll update the search.' },
        flow,
      }
    }
    const members = data.members
    const criteria = data.criteria ?? { propertyTypes: [], amenities: [], contextNotes: [] }
    const locLabel = listLocations(data.locations ?? [])
    const titleName = members.map(fullName).join(' & ')
    const emails = members.map((m) => m.email).filter(Boolean).join(', ')

    const contextBits: string[] = [...criteria.contextNotes]
    if (criteria.priceCeiling != null) contextBits.splice(1, 0, `budget up to ${priceCompact(criteria.priceCeiling)}`)
    for (const a of criteria.amenities) contextBits.push(a === 'Pool' ? 'pool access' : a.toLowerCase())
    const contextLine = contextBits.join(', ')

    const searchBits: string[] = []
    if (criteria.beds != null || criteria.baths != null)
      searchBits.push(`${criteria.beds ?? '—'}BR/${criteria.baths ?? '—'}BA`)
    if (criteria.propertyTypes.length) searchBits.push(typesProse(criteria.propertyTypes))
    const searchDesc =
      `${searchBits.join(' ')} in ${locLabel}` +
      (criteria.priceCeiling != null ? `, under ${priceCompact(criteria.priceCeiling)}` : '') +
      (criteria.amenities.includes('Pool') ? ', pool amenity' : '')

    return {
      result: {
        cards: [
          {
            kind: 'toolRun',
            processing: 'Putting it together…',
            resolved: '✓ Ran create_saved_search',
          },
          {
            kind: 'addClientMessage',
            completed: true,
            options: ['Adjust the search criteria', 'Add another client', 'Something else'],
            body:
              `All set! Here's the summary:\n\n` +
              `✓ Client group created: ${titleName} (view group)\n` +
              `✓ Invitation sent: ${members.length} client${members.length === 1 ? '' : 's'} invited (${emails})\n` +
              `✓ Context saved: ${contextLine}\n` +
              `✓ Search created: ${searchDesc}\n\n` +
              `They're ready to receive property updates!\n\n` +
              `What would you like to do next?`,
          },
        ],
        reply: '',
      },
      flow: null,
    }
  }

  // Unreachable, but keeps the return type total.
  return { result: { cards: [], reply: '' }, flow }
}

/** Simulated latency so the three-dot busy bubble is visible, as in the DC prototype. */
const THINKING_MS = 650

/**
 * Run one add-client turn behind the same simulated latency the tour flow uses, so the
 * busy bubble shows before the assistant's cards land.
 */
export async function runAddClient(
  flow: AddClientFlow | null,
  text: string,
): Promise<{ result: AssistantResult; flow: AddClientFlow | null }> {
  await new Promise((r) => setTimeout(r, THINKING_MS))
  return stepAddClient(flow, text)
}

// ─── Catch Up daily-briefing flow ──────────────────────────────────────────────

/**
 * The Catch Up flow is agent-initiated: one message triggers a single-shot analysis of the
 * whole book, and the turn ends with an action picker. `actions` carries the drafts the
 * picker's options resolve to, so the follow-up turn can send them without re-deriving.
 */
export interface CatchUpAction {
  label: string
  /** The prompt the option sends, and what the picker turn matches on. */
  prompt: string
  /** The client the message goes to. */
  target?: string
  /** The draft to send — omitted for the "Skip" option. */
  draft?: string
  kind: 'send' | 'skip'
}

export interface CatchUpFlow {
  state: 'picker'
  actions: CatchUpAction[]
}

/** Matches the flow trigger — the "Catch Up" capability / a request for a daily briefing. */
export function triggersCatchUp(text: string): boolean {
  return /\bcatch\s+(me\s+)?up\b/i.test(text) || /\bdaily briefing\b/i.test(text)
}

/** `"Sun, Aug 9 | 2:30 PM"` — the briefing tour card's subtitle format. */
function tourSubtitle(tour: SampleTour): string {
  const [y, m, d] = tour.date.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  const wk = dt.toLocaleDateString('en-US', { weekday: 'short' })
  const mo = dt.toLocaleDateString('en-US', { month: 'short' })
  const time = tour.startTime ? ` | ${tour.startTime}` : ''
  return `${wk}, ${mo} ${d}${time}`
}

/** A client's soonest tour, whatever its state — the briefing analyses the calendar as-is. */
function soonestTour(clientId: string): SampleTour | undefined {
  return SAMPLE_TOURS.filter((t) => t.clientId === clientId).sort((a, b) =>
    a.date.localeCompare(b.date),
  )[0]
}

/** Build the embedded tour card from a tour, reusing the Tours screen's own map coordinates. */
function catchUpTourRef(client: Client, tour: SampleTour): CatchUpTourRef {
  const mapData = TOUR_MAP_DATA[tour.id]
  const stops: CatchUpTourStop[] = (mapData?.stops ?? []).map((s) => ({
    order: s.order,
    addr: s.addr,
    city: s.city,
    ll: s.ll,
  }))
  return {
    tourId: tour.id,
    title: `Tour ${client.name}`,
    subtitle: tourSubtitle(tour),
    stopCount: tour.stopCount ?? stops.length,
    href: `/plus/app/tours/${tour.id}`,
    stops,
  }
}

const feedHref = (clientId: string) => `/plus/app/feed/${clientId}`

/** The 19 data-gathering steps, shown collapsed as "Used 19 tools" and expanding to these. */
const CATCH_UP_TOOLS: string[] = [
  '✓ Grabbed conversation context',
  '✓ Loaded conversation context',
  '✓ Pulled up group info',
  '✓ Got info on this group',
  '✓ Checked view history',
  '✓ Pulled up view history for this group',
  '✓ Found listing view history for this group',
  '✓ Checked view history',
  '✓ Pulled up view history for this group',
  '✓ Grabbed the saved searches',
  '✓ Loaded the group feed',
  '✓ Fetched feed listings for this group',
  '✓ Found upcoming tours',
  '✓ Loaded saved searches',
  '✓ Pulled up view history for this group',
  '✓ Found upcoming tours',
  '✓ Loaded notifications',
  '✓ Loaded unread conversations',
  '✓ Got your groups',
]

/**
 * Assemble the daily briefing from the real book. The tiers are derived from each client's
 * real signals — an imminent, still-unconfirmed tour is critical; a cooling invite is
 * important; an engaged or archived client with nothing time-sensitive is FYI. The agent's
 * own personal feed is excluded from client recommendations and noted at the end.
 */
function buildCatchUp(clients: Client[]): {
  cards: Card[]
  actions: CatchUpAction[]
} {
  const byId = (id: string) => clients.find((c) => c.id === id)
  const critical: CatchUpItem[] = []
  const important: CatchUpItem[] = []
  const fyi: CatchUpItem[] = []
  const actions: CatchUpAction[] = []

  // 🔥 CRITICAL — Priyanka Raman: imminent tour, single stop still unconfirmed, open requests.
  const priyanka = byId('cli_03')
  if (priyanka) {
    const tour = soonestTour(priyanka.id)
    const draft =
      `Hi ${priyanka.greetingName} — quick update on Sunday's tour. I'm confirming your 2:30 PM ` +
      `showing at 1442 92nd Court and locking the time with the listing agent today. I also have ` +
      `your two other tour requests in hand and will send times by end of day. Anything you'd like ` +
      `to add before Sunday? — ${AGENT_FIRST_NAME}`
    critical.push({
      clientId: priyanka.id,
      name: priyanka.name,
      href: feedHref(priyanka.id),
      headline: 'tour is 5 days out and still unconfirmed.',
      detail:
        `Sunday's 2:30 PM showing at 1442 92nd Court is still marked Requested — the listing ` +
        `agent hasn't confirmed — and 2 more tour requests from ${priyanka.greetingName} are waiting on you.`,
      background: 'watching Rivertown price changes, last seen 5 hours ago, so they are engaged and waiting.',
      draft,
      confidence: { level: 'High', percent: 90 },
      tour: tour ? catchUpTourRef(priyanka, tour) : undefined,
    })
    actions.push({
      label: `Send tour confirmation to ${priyanka.name}`,
      prompt: `Send tour confirmation to ${priyanka.name}`,
      target: priyanka.name,
      draft,
      kind: 'send',
    })
  }

  // 🔥 CRITICAL — Jordan & Mia Castellanos: Saturday tour, 2 of 3 stops unconfirmed.
  const castellanos = byId('cli_02')
  if (castellanos) {
    const tour = soonestTour(castellanos.id)
    const draft =
      `Hi ${castellanos.greetingName} — your Saturday, Aug 15 tour is coming together: we start at ` +
      `195 Stanton Way at 10:00 AM. I'm confirming showing times for 1678 Wallace Ave and 3975 ` +
      `Turnley Ct now and will send the finalized route once all three are locked. Does a 10:00 AM ` +
      `start still work for you? — ${AGENT_FIRST_NAME}`
    critical.push({
      clientId: castellanos.id,
      name: castellanos.name,
      href: feedHref(castellanos.id),
      headline: 'Saturday tour has 2 of 3 stops unconfirmed.',
      detail:
        `The Aug 15 tour starts confirmed at 195 Stanton Way (10:00 AM), but 1678 Wallace Ave is ` +
        `still Requested and 3975 Turnley Ct has no time locked — the route isn't set.`,
      background: '12 saved homes across Summit Grove, Old Quarter, and Cedar Vale; last seen yesterday.',
      draft,
      confidence: { level: 'Medium', percent: 70 },
      tour: tour ? catchUpTourRef(castellanos, tour) : undefined,
    })
    actions.push({
      label: `Send tour confirmation to ${castellanos.greetingName}`,
      prompt: `Send tour confirmation to ${castellanos.greetingName}`,
      target: castellanos.name,
      draft,
      kind: 'send',
    })
  }

  // ⚠️ IMPORTANT — The Halvorsen Household: a two-week-old invite going cold.
  const halvorsen = byId('cli_04')
  if (halvorsen) {
    const draft =
      `Hi ${halvorsen.greetingName} — checking in since your invite a couple of weeks ago. Want me ` +
      `to pull a few homes that fit what you're looking for and set up a saved search so new listings ` +
      `come straight to you? Happy to help you get pre-approved too, so you're ready when the right ` +
      `place shows up. — ${AGENT_FIRST_NAME}`
    important.push({
      clientId: halvorsen.id,
      name: halvorsen.name,
      href: feedHref(halvorsen.id),
      headline: 'invited 2 weeks ago, still no activity.',
      detail:
        `${halvorsen.greetingName} were invited two weeks ago but haven't saved a single home or ` +
        `started a search — the invite is going cold.`,
      background: '0 saved homes, no saved search yet.',
      draft,
    })
    actions.push({
      label: `Send re-invite to ${halvorsen.greetingName}`,
      prompt: `Send re-invite to ${halvorsen.greetingName}`,
      target: halvorsen.name,
      draft,
      kind: 'send',
    })
  }

  // ℹ️ FYI — engaged or archived, nothing time-sensitive.
  const malik = byId('cli_05')
  if (malik) {
    fyi.push({
      clientId: malik.id,
      name: malik.name,
      href: feedHref(malik.id),
      headline: 'active and online 20 minutes ago.',
      fyiNote: `${malik.saved} saved homes and browsing on their own right now — no action needed.`,
    })
  }
  const grayson = byId('cli_08')
  if (grayson) {
    fyi.push({
      clientId: grayson.id,
      name: grayson.name,
      href: feedHref(grayson.id),
      headline: 'archived, last seen 4 months ago.',
      fyiNote: `${grayson.saved} saved homes still on file if the timeline ever moves — informational, no action needed.`,
    })
  }

  actions.push({ label: 'Skip — no actions right now', prompt: 'Skip — no actions right now', kind: 'skip' })

  const preamble = [
    'Now I have a comprehensive picture. Let me analyze each group:',
    'agt_01 (Georgia Booth — your personal feed): your own test group, 1 member, one placeholder saved search. Skipping it for client recommendations.',
    'cli_03 (Priyanka Raman): tour Sun, Aug 9 at 2:30 PM is 5 days out with its only stop still unconfirmed, and 2 tour requests are waiting. Time-sensitive.',
    'cli_02 (Jordan & Mia Castellanos): Sat, Aug 15 tour has 2 of 3 stops unconfirmed; 12 saved homes, last seen yesterday.',
    'cli_04 (The Halvorsen Household): invited 2 weeks ago, still 0 saved homes and no search — the invite is going cold.',
    'Remaining groups (Malik Osei, Grayson Boone): engaged or archived, but nothing time-sensitive — no action needed.',
  ]

  const briefing: CatchUpBriefingCard = {
    kind: 'catchUpBriefing',
    preamble,
    analyzed: critical.length + important.length + fyi.length,
    criticalCount: critical.length,
    importantCount: important.length,
    fyiCount: fyi.length,
    critical,
    important,
    fyi,
    moreNote:
      '…and your personal feed (1 member) was skipped — it is your own test group, not a client.',
  }

  const cards: Card[] = [
    { kind: 'catchUpTools', stream: ['On it…', 'Loading your groups…', 'Processing your request…'], toolCount: CATCH_UP_TOOLS.length, tools: CATCH_UP_TOOLS },
    briefing,
    { kind: 'actionPicker', title: 'Which actions would you like me to take?', options: actions.map((a) => ({ label: a.label, prompt: a.prompt })) },
  ]
  return { cards, actions }
}

/**
 * The Catch Up state machine. The first call (no flow) runs the single-shot analysis and
 * ends on the action picker; the picker turn resolves the chosen option — sending a drafted
 * message, skipping, or handing a free-text instruction back to the general responder.
 */
export function stepCatchUp(
  flow: CatchUpFlow | null,
  text: string,
  clients: Client[] = CLIENTS,
): { result: AssistantResult; flow: CatchUpFlow | null } {
  // Start — the trigger. Analyse the book and present the briefing + action picker.
  if (!flow) {
    const { cards, actions } = buildCatchUp(clients)
    return {
      result: { threadTitle: 'Catch Up', cards, reply: '' },
      flow: { state: 'picker', actions },
    }
  }

  const t = text.toLowerCase().trim()

  // Skip — nothing to do; end the flow.
  if (/\bskip\b/.test(t) || /\bno actions?\b/.test(t) || /\bnothing (right )?now\b/.test(t)) {
    return {
      result: {
        cards: [],
        reply:
          "No problem — I'll leave things as they are. Say “catch me up” anytime for a fresh briefing.",
      },
      flow: null,
    }
  }

  // A send action — match the chosen option (by its prompt, or the named client).
  const send =
    flow.actions.find((a) => a.kind === 'send' && a.prompt.toLowerCase() === t) ??
    flow.actions.find(
      (a) => a.kind === 'send' && a.target && text.toLowerCase().includes(a.target.toLowerCase()),
    ) ??
    (/\bsend\b/.test(t) ? flow.actions.find((a) => a.kind === 'send') : undefined)
  if (send && send.draft) {
    return {
      result: {
        preReply: 'On it — sending that message now.',
        cards: [
          { kind: 'toolRun', processing: 'Sending message…', resolved: '✓ Message sent' },
          {
            kind: 'addClientMessage',
            completed: true,
            body:
              `Sent to ${send.target}:\n\n` +
              `“${send.draft}”\n\n` +
              `Want me to handle anything else from your briefing? Say “catch me up” to see it again.`,
          },
        ],
        reply: '',
      },
      flow: null,
    }
  }

  // "Something else" — a free-text instruction. Close the flow and let the general responder answer.
  return { result: respondLocally(text, clients), flow: null }
}

/** Run one Catch Up turn behind the shared simulated latency. */
export async function runCatchUp(
  flow: CatchUpFlow | null,
  text: string,
  clients: Client[] = CLIENTS,
): Promise<{ result: AssistantResult; flow: CatchUpFlow | null }> {
  await new Promise((r) => setTimeout(r, THINKING_MS))
  return stepCatchUp(flow, text, clients)
}

// ─── Search-optimization flow ──────────────────────────────────────────────────

/**
 * The search-optimization flow is agent-initiated and client-scoped: pick a client, run two
 * rounds of streamed tool-gathering, then present a data-driven analysis that compares what the
 * client *says* they want (their saved searches) against what they're actually *doing* (the
 * homes they've viewed, saved, and toured), and recommends concrete search refinements. The
 * turn ends on an action picker. `actions` carries the branches the picker resolves to.
 */
export type SearchOptState = 'selecting' | 'action'

export interface SearchOptAction {
  label: string
  /** The prompt the option sends, and what the picker turn matches on. */
  prompt: string
  kind: 'apply' | 'review' | 'check' | 'dismiss' | 'else'
}

export interface SearchOptFlow {
  state: SearchOptState
  /** The client chosen in State 2, so the action turn can name them and their search. */
  clientId?: string
  actions?: SearchOptAction[]
}

/** Matches the flow trigger — the "Search Optimization" capability, or "optimize … search". */
export function triggersSearchOpt(text: string): boolean {
  const t = text.toLowerCase()
  return (
    /\bsearch optimization\b/.test(t) ||
    (/\boptimi[sz]e\b/.test(t) && /\bsearch\b/.test(t)) ||
    /\banalyze client behavior\b/.test(t)
  )
}

/** Local-time epoch ms for an ISO `YYYY-MM-DD` — used to size the analysis window. */
const DAY_MS = 86_400_000

/** The client's tours, joined to their stop listings, excluding stops that don't resolve. */
function toursFor(clientId: string): SampleTour[] {
  return SAMPLE_TOURS.filter((t) => t.clientId === clientId)
}

/** The distinct listings a client has engaged with — every stop across all their tours. */
function engagedListings(clientId: string): SampleListing[] {
  const seen = new Set<string>()
  const out: SampleListing[] = []
  for (const tour of toursFor(clientId)) {
    for (const stop of tour.stops) {
      if (seen.has(stop.listingId)) continue
      const listing = getListing(stop.listingId)
      if (!listing) continue
      seen.add(stop.listingId)
      out.push(listing)
    }
  }
  return out
}

/** `615000` → `"$615K"`, `1200000` → `"$1.2M"` — the compact price the report uses. */
const short = (n: number) => formatPriceShort(n)

/** A saved search's criteria as a single readable line. */
function criteriaLine(c: SearchCriteria): string {
  const parts: string[] = []
  if (c.propertyType) parts.push(c.propertyType)
  parts.push(c.location)
  if (c.priceMin != null && c.priceMax != null) parts.push(`${short(c.priceMin)}–${short(c.priceMax)}`)
  else if (c.priceMax != null) parts.push(`up to ${short(c.priceMax)}`)
  else if (c.priceMin != null) parts.push(`${short(c.priceMin)}+`)
  if (c.bedsMin != null) parts.push(`${c.bedsMin}+ bd`)
  if (c.bathsMin != null) parts.push(`${c.bathsMin}+ ba`)
  if (c.keywords) parts.push(`“${c.keywords}”`)
  return parts.join(' · ')
}

/** The city name at the head of a `"Maple Heights, ST"` location string. */
const cityOf = (location: string) => location.split(',')[0].trim()

/** `["A","B","C"]` → `"A, B, and C"` — Oxford-comma join for the observation prose. */
const listAnd = (xs: string[]) => listCities(xs)

/** A recommendation's star tier: ⭐⭐⭐ 90%+, ⭐⭐ 75–89%, ⭐ 60–74%. */
function tierStars(pct: number): string {
  if (pct >= 90) return '⭐⭐⭐'
  if (pct >= 75) return '⭐⭐'
  return '⭐'
}

/** Overall confidence level from a percentage — High 85%+, Medium 60–84%, else Low. */
function confidenceLevel(pct: number): 'High' | 'Medium' | 'Low' {
  if (pct >= 85) return 'High'
  if (pct >= 60) return 'Medium'
  return 'Low'
}

/**
 * The analysis itself — a data-driven read of one client's saved searches against their real
 * engagement. It picks the saved search that best fits the client's activity as the primary,
 * flags the others as experimental, then compares each engaged property's type / location /
 * price against the primary search and turns every mismatch into a confidence-scored
 * recommendation. Confidence is deliberately held in the Medium tier when the behavioural
 * sample is thin, which surfaces the "confirm with the client first" caveat.
 */
function buildSearchAnalysis(client: Client): SearchAnalysisCard | null {
  const searches = savedSearchesForClient(client.id)
  if (searches.length === 0) return null

  const tours = toursFor(client.id)
  const engagedAll = engagedListings(client.id)
  // Closed listings are homes the client already transacted on — exclude them from the
  // "actively engaging" set so a bought home doesn't read as an unmet preference.
  const engaged = engagedAll.filter((l) => l.status !== 'Closed')
  if (engaged.length === 0) return null

  // The primary search is the one the most engaged homes actually fit on price — the search
  // the client is really shopping. The rest are experimental / stale.
  const priceFit = (s: SavedSearch) =>
    engaged.filter(
      (l) =>
        (s.criteria.priceMax == null || l.price <= s.criteria.priceMax) &&
        (s.criteria.priceMin == null || l.price >= s.criteria.priceMin),
    ).length
  const ranked = [...searches].sort((a, b) => priceFit(b) - priceFit(a))
  const primary = ranked[0]
  const others = ranked.slice(1)
  const crit = primary.criteria

  const total = engaged.length
  const recommendations: SearchRecommendation[] = []
  const rationale: LeadNote[] = []

  // 1 · Property type — engaged homes of a type the search doesn't include.
  const offType = engaged.filter((l) => crit.propertyType && l.propertyType !== crit.propertyType)
  const offTypes = Array.from(new Set(offType.map((l) => l.propertyType)))
  if (crit.propertyType && offTypes.length) {
    const pct = 60 + Math.round((offType.length / total) * 14)
    recommendations.push({
      index: 0,
      filter: 'Property Type',
      confidenceLabel: `${pct}% ${tierStars(pct)}`,
      current: `${crit.propertyType} only`,
      suggested: `Add ${offTypes.join(', ')}`,
    })
    const ev = offType[0]
    rationale.push({
      lead: 'Property type — ',
      text: `they're touring ${ev.address.line1}, a ${formatPrice(ev.price)} ${ev.propertyType.toLowerCase()} (${ev.beds} bd / ${bathsLabel(ev)}, ${ev.sqft?.toLocaleString('en-US')} sqft), but the search is ${crit.propertyType} only.`,
    })
  }

  // 2 · Location — none of the actively-engaged homes are in the searched city.
  const primaryCity = cityOf(crit.location)
  const engagedCities = Array.from(new Set(engaged.map((l) => l.address.city)))
  const offCities = engagedCities.filter((c) => c !== primaryCity)
  const inPrimary = engaged.filter((l) => l.address.city === primaryCity).length
  if (offCities.length && inPrimary === 0) {
    const pct = 60 + Math.round((offCities.length / engagedCities.length) * 14)
    // Lead with the cities the client is touring soonest — the strongest signal.
    const upcomingCities = new Set(
      tours
        .filter((t) => t.state === 'Upcoming')
        .flatMap((t) => t.stops.map((s) => getListing(s.listingId)?.address.city))
        .filter((c): c is string => Boolean(c)),
    )
    const suggestCities = [...offCities].sort(
      (a, b) => Number(upcomingCities.has(b)) - Number(upcomingCities.has(a)),
    )
    recommendations.push({
      index: 0,
      filter: 'Location',
      confidenceLabel: `${pct}% ${tierStars(pct)}`,
      current: `${primaryCity} only`,
      suggested: `Add ${suggestCities.slice(0, 3).join(', ')}`,
    })
    rationale.push({
      lead: 'Location — ',
      text: `none of the ${total} homes they're actively touring are in ${primaryCity}; they span ${listAnd(engagedCities)}.`,
    })
  }

  // 3 · Max price — engaged homes above the search's ceiling.
  if (crit.priceMax != null) {
    const over = engaged.filter((l) => l.price > crit.priceMax!)
    // Ignore aspirational outliers (well above ceiling) when picking a new ceiling; base it on
    // the priciest home they're genuinely pursuing, rounded up to the next $100K.
    const relevant = over.filter((l) => l.price <= crit.priceMax! * 1.75)
    if (over.length && relevant.length) {
      const topPrice = Math.max(...relevant.map((l) => l.price))
      const suggested = Math.ceil(topPrice / 100_000) * 100_000
      const pct = 60 + Math.round((over.length / total) * 14)
      recommendations.push({
        index: 0,
        filter: 'Max Price',
        confidenceLabel: `${pct}% ${tierStars(pct)}`,
        current: `up to ${short(crit.priceMax)}`,
        suggested: `up to ${short(suggested)}`,
      })
      // Cite the priciest confirmed/relevant stop, and the aspirational outlier if there is one.
      const topListing = relevant.find((l) => l.price === topPrice)!
      const outlier = over.find((l) => l.price > crit.priceMax! * 1.75)
      const overBy = topListing.price - crit.priceMax!
      rationale.push({
        lead: 'Price — ',
        text:
          `${topListing.address.line1} is a stop at ${formatPrice(topListing.price)} — ${short(overBy)} over the ${short(crit.priceMax)} ceiling` +
          (outlier
            ? ` — and they toured ${outlier.address.line1} at ${formatPrice(outlier.price)}.`
            : '.'),
      })
    }
  }

  // Rank recommendations strongest-first and number them.
  recommendations.sort((a, b) => parseInt(b.confidenceLabel) - parseInt(a.confidenceLabel))
  recommendations.forEach((r, i) => (r.index = i + 1))

  // Additional observations — experimental searches with no matching engagement, and any
  // filter that's already well-calibrated.
  const observations: LeadNote[] = []
  for (const s of others) {
    const c = s.criteria
    const matches = engaged.filter(
      (l) =>
        (c.priceMax == null || l.price <= c.priceMax) &&
        (c.propertyType == null || l.propertyType === c.propertyType) &&
        l.address.city === cityOf(c.location),
    )
    if (matches.length === 0) {
      const ceil = c.priceMax != null ? `its ${short(c.priceMax)} ceiling` : `“${s.name}”`
      const kw = c.keywords ? ` or match “${c.keywords}”` : ''
      observations.push({
        lead: `“${s.name}” looks experimental — `,
        text: `none of the ${total} homes they're touring fall under ${ceil}${kw}; every engaged home is move-in-ready and priced well above it.`,
      })
    }
  }
  if (crit.bedsMin != null && crit.bathsMin != null) {
    const allMeet = engaged.every(
      (l) => l.beds >= crit.bedsMin! && formatBaths(l) >= crit.bathsMin!,
    )
    if (allMeet)
      observations.push({
        lead: 'Beds & baths are dialed in — ',
        text: `all ${total} toured homes meet the ${crit.bedsMin}+ bd / ${crit.bathsMin}+ ba filters, so no change needed there.`,
      })
  }

  // Activity counts and the analysis window (from the earliest tour to "today").
  const views = engagedAll.length
  const saves = client.saved
  const pastStops = tours
    .filter((t) => t.state === 'Past')
    .reduce((n, t) => n + t.stops.length, 0)
  const upcomingStops = tours
    .filter((t) => t.state === 'Upcoming')
    .reduce((n, t) => n + t.stops.length, 0)
  const tourEpochs = tours.map((t) => isoToEpoch(t.date))
  const earliest = tourEpochs.length ? Math.min(...tourEpochs) : PROTOTYPE_TODAY.getTime()
  const rawDays = Math.round((PROTOTYPE_TODAY.getTime() - earliest) / DAY_MS)
  const analysisPeriodDays = Math.max(30, Math.ceil(rawDays / 30) * 30)

  // Overall confidence — the mean of the recommendation confidences, held in the Medium tier
  // because the behavioural sample is thin and contradicts the stated search.
  const avg =
    recommendations.length > 0
      ? Math.round(
          recommendations.reduce((n, r) => n + parseInt(r.confidenceLabel), 0) /
            recommendations.length,
        )
      : 60
  const confidencePercent = Math.min(84, avg)

  // The reasoning preamble — the stated-vs-observed read, in the assistant's voice.
  const bought = engagedAll.find((l) => l.status === 'Closed')
  const reasoning = [
    `Comparing what ${client.greetingName} say they want against what they're actually doing.`,
    `Stated: ${searches.length} saved search${searches.length === 1 ? '' : 'es'} — ${searches
      .map((s) => `“${s.name}” (${criteriaLine(s.criteria)})`)
      .join('; ')}.`,
    `Observed: ${views} properties viewed, ${saves} homes saved, ${pastStops} past tour stops, ${upcomingStops} upcoming — across ${listAnd(engagedCities)}.`,
    `“${primary.name}” best fits their activity, so I'm treating it as the primary search${
      others.length ? ` and the other${others.length === 1 ? '' : 's'} as experimental` : ''
    }.`,
  ]
  if (bought)
    reasoning.push(
      `Note: ${bought.address.line1} shows Closed — they've already transacted there — so I've left it out of the active read.`,
    )

  const caveat =
    `⚠️ Important Note: Confidence is ${confidenceLevel(confidencePercent)} — this read is based on ${views} viewed ` +
    `properties over the last ${analysisPeriodDays} days` +
    (bought ? `, and their recent purchase at ${bought.address.line1} may have shifted what they're looking for` : '') +
    `. I'd confirm these changes with ${client.greetingName} before applying, especially the price ceiling.`

  return {
    kind: 'searchAnalysis',
    reasoning,
    analysisPeriodDays,
    views,
    saves,
    pastStops,
    upcomingStops,
    confidenceLevel: confidenceLevel(confidencePercent),
    confidencePercent,
    currentSearchName: primary.name,
    currentSearchCriteria: criteriaLine(crit),
    recommendations,
    rationale,
    observations,
    caveat,
  }
}

/** First names joined with an ampersand — `"Jordan and Mia"` → `"Jordan & Mia"`. */
const firstsAmp = (client: Client) => client.greetingName.replace(/\s+and\s+/g, ' & ')

/** State 1 — the client-selection picker card, one row per client on the roster. */
function searchOptPickerCard(clients: Client[]): SearchOptPickerCard {
  return {
    kind: 'searchOptPicker',
    title: 'Select group',
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      lastSeen: c.lastActivity,
      prompt: `Analyze ${c.greetingName}'s search for optimization`,
    })),
  }
}

/** The four concrete action-picker branches the analysis ends on. */
function searchOptActions(): SearchOptAction[] {
  return [
    { label: 'Apply all suggestions', prompt: 'Apply all suggestions', kind: 'apply' },
    {
      label: 'Review and modify before applying',
      prompt: 'Review and modify before applying',
      kind: 'review',
    },
    {
      label: 'Check with client first before changing searches',
      prompt: 'Check with client first before changing searches',
      kind: 'check',
    },
    { label: 'Dismiss (no changes)', prompt: 'Dismiss (no changes)', kind: 'dismiss' },
  ]
}

/**
 * The search-optimization state machine. The trigger greets and asks for a client (State 1);
 * picking one streams two rounds of tool-gathering and lands the analysis + action picker
 * (States 2–6); the picker turn resolves the chosen branch.
 */
export function stepSearchOpt(
  flow: SearchOptFlow | null,
  text: string,
  clients: Client[] = CLIENTS,
): { result: AssistantResult; flow: SearchOptFlow | null } {
  // Start — greet and ask which client to analyse.
  if (!flow) {
    return {
      result: {
        threadTitle: 'Search Optimization',
        cards: [
          {
            kind: 'addClientMessage',
            completed: true,
            body:
              `I'm ready to help optimize a client's saved search based on their behavior patterns.\n\n` +
              `Since you're already logged in, I can see you're ${AGENT_FULL_NAME}. Which client would you like me to analyze for search optimization?`,
          },
          searchOptPickerCard(clients),
        ],
        reply: '',
      },
      flow: { state: 'selecting' },
    }
  }

  const t = text.toLowerCase().trim()

  // State 2–6 — a client was chosen (or named in free text). Run the full analysis turn.
  if (flow.state === 'selecting') {
    if (/\bskip\b/.test(t)) {
      return {
        result: {
          cards: [],
          reply:
            'No problem — I’ll leave their searches as they are. Say “Search Optimization” whenever you’d like me to take a look.',
        },
        flow: null,
      }
    }
    const named = clients.find((c) => mentions(t, c))
    if (!named) {
      return {
        result: {
          cards: [],
          reply:
            'I didn’t catch which client that was — tell me a name, or pick one of the client cards above.',
        },
        flow,
      }
    }
    const analysis = buildSearchAnalysis(named)
    if (!analysis) {
      return {
        result: {
          cards: [],
          reply: `${named.greetingName} don’t have a saved search with enough activity behind it to optimize yet. Once they’ve saved a search and viewed a few homes, I can take another look.`,
        },
        flow: null,
      }
    }

    // Round 1 (State 3) — the seven data-gathering tools, verbatim.
    const round1 = [
      '✓ Got info on this group',
      '✓ Checked view history',
      '✓ Fetched notes',
      '✓ Grabbed listings in the feed for this group',
      '✓ Checked past tour history',
      '✓ Pulled up saved searches',
      '✓ Found upcoming tours',
    ]
    // Round 2 (State 4) — context, property details, and one get_search_details per saved search.
    const searchCount = savedSearchesForClient(named.id).length
    const round2 = [
      '✓ Grabbed conversation context',
      '✓ Fetched property details',
      ...Array.from({ length: searchCount }, () => '✓ Ran get_search_details'),
    ]

    const title = analysis.recommendations.length
      ? `${firstsAmp(named)}'s Search Needs Realignment`
      : `${firstsAmp(named)}'s Search Looks Aligned`

    // States 2–6 land in one turn, so the cards reveal on a stagger: the first tool round
    // streams, then the interstitial prose, the second round, the report, and the picker —
    // each held back until the one before it has run. (The panel's per-tool run is ~750ms.)
    const R1 = 250
    const MSG2 = 1150
    const R2 = 1500
    const ANALYSIS = 2400
    const PICKER = 2700

    return {
      result: {
        threadTitle: title,
        cards: [
          { kind: 'searchOptClient', name: named.name, initials: named.initials, lastSeen: named.lastActivity },
          {
            kind: 'addClientMessage',
            completed: false,
            body:
              'Great, let me analyze the search patterns for this client group. Let me gather all the data I need.',
          },
          { kind: 'toolGroup', processing: 'Crunching numbers…', tools: round1, revealMs: R1 },
          {
            kind: 'addClientMessage',
            completed: false,
            body: 'Now let me get the search details and fetch property details for the viewed and saved listings to detect patterns.',
            revealMs: MSG2,
          },
          { kind: 'toolGroup', processing: 'Detecting patterns…', tools: round2, revealMs: R2 },
          { ...analysis, revealMs: ANALYSIS },
          {
            kind: 'actionPicker',
            title: 'What would you like to do?',
            options: [
              ...searchOptActions().map((a) => ({ label: a.label, prompt: a.prompt })),
              { label: 'Skip', prompt: 'Skip' },
            ],
            revealMs: PICKER,
          },
        ],
        reply: '',
      },
      flow: { state: 'action', clientId: named.id, actions: searchOptActions() },
    }
  }

  // State 6 → the chosen branch.
  const client = clients.find((c) => c.id === flow.clientId)
  const who = client ? client.greetingName : 'the client'
  const analysis = client ? buildSearchAnalysis(client) : null
  const searchName = analysis?.currentSearchName ?? 'their saved search'
  const changes = (analysis?.recommendations ?? [])
    .map((r) => `${r.filter.toLowerCase()} (${r.suggested.replace(/^Add |^up to /, '')})`)
    .join(', ')

  if (/\bskip\b/.test(t) || /\bdismiss\b/.test(t) || /\bno changes?\b/.test(t)) {
    return {
      result: {
        cards: [],
        reply: `Understood — I’ve left “${searchName}” unchanged. Nothing sent to ${who}.`,
      },
      flow: null,
    }
  }

  if (/\bapply all\b/.test(t) || (/\bapply\b/.test(t) && !/\breview\b/.test(t))) {
    return {
      result: {
        preReply: 'On it — updating the saved search now.',
        cards: [
          { kind: 'toolRun', processing: 'Updating saved search…', resolved: '✓ Ran update_saved_search' },
          {
            kind: 'addClientMessage',
            completed: true,
            body:
              `Done — I've updated “${searchName}” for ${who}${changes ? `: ${changes}` : ''}. ` +
              `New matches will start flowing into their feed. Say “Search Optimization” anytime to re-check.`,
          },
        ],
        reply: '',
      },
      flow: null,
    }
  }

  if (/\breview\b/.test(t) || /\bmodify\b/.test(t)) {
    const lines = (analysis?.recommendations ?? [])
      .map((r) => `${r.index}. ${r.filter}: ${r.current} → ${r.suggested} (${r.confidenceLabel})`)
      .join('\n')
    return {
      result: {
        cards: [
          {
            kind: 'addClientMessage',
            completed: true,
            body:
              `Sure — here are the ${analysis?.recommendations.length ?? 0} suggested changes:\n\n${lines}\n\n` +
              `Tell me which to apply (e.g. “apply 1 and 3”), or reply “apply all” to take them all.`,
          },
        ],
        reply: '',
      },
      flow,
    }
  }

  if (/\bcheck\b/.test(t) || /\bclient first\b/.test(t)) {
    const draft =
      `Hi ${who} — I've been looking at the homes you're touring and a few sit outside your saved search “${searchName}”. ` +
      `Before I widen it${changes ? ` (${changes})` : ''}, I wanted to check it still reflects what you're after. Any changes on your end? — ${AGENT_FIRST_NAME}`
    return {
      result: {
        preReply: 'Good call — let me draft a note to confirm before I change anything.',
        cards: [
          {
            kind: 'addClientMessage',
            completed: true,
            body: `Here's a draft you can send ${who}:\n\n“${draft}”\n\nI'll hold the search changes until you hear back.`,
          },
        ],
        reply: '',
      },
      flow: null,
    }
  }

  // "Something else" — a free-text instruction. Close the flow and let the general responder answer.
  return { result: respondLocally(text, clients), flow: null }
}

/** Run one search-optimization turn behind the shared simulated latency. */
export async function runSearchOpt(
  flow: SearchOptFlow | null,
  text: string,
  clients: Client[] = CLIENTS,
): Promise<{ result: AssistantResult; flow: SearchOptFlow | null }> {
  await new Promise((r) => setTimeout(r, THINKING_MS))
  return stepSearchOpt(flow, text, clients)
}

// ─── Client Pulse flow ─────────────────────────────────────────────────────────

/**
 * Client Pulse is agent-initiated and single-group scoped: pick one client, stream a deep
 * data-gathering pass, then present a structured "pulse" — profile, engagement/intent read,
 * an activity table, saved searches, top property interests (deep-linked), prioritized
 * suggested actions with a ready-to-send draft, an overall confidence, and — when the client
 * has one — an embedded upcoming-tour card. The turn ends on an action picker.
 */
export type ClientPulseState = 'selecting' | 'action'

export interface ClientPulseAction {
  label: string
  /** The prompt the option sends, and what the picker turn matches on. */
  prompt: string
  kind: 'draft' | 'notes' | 'search' | 'another' | 'done' | 'skip'
  /** For the draft action — who the message goes to. */
  target?: string
  /** For the draft action — the complete, ready-to-send message. */
  draft?: string
}

export interface ClientPulseFlow {
  state: ClientPulseState
  /** The client chosen in State 1, so the action turn can name them and act on their data. */
  clientId?: string
  actions?: ClientPulseAction[]
}

/** Matches the flow trigger — the "Client Pulse" capability, or "pulse" + "client". */
export function triggersClientPulse(text: string): boolean {
  const t = text.toLowerCase()
  return /\bclient pulse\b/.test(t) || (/\bpulse\b/.test(t) && /\bclient\b/.test(t))
}

/** `"2026-06-05"` → `"Jun 5, 2026"` — the "client since" long date. */
function longDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/** A `Date` → `"Aug 3"` — the short "last active" label. */
function monthDay(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

/**
 * Turn a "Last seen …" recency phrase into an approximate calendar date, counting back from
 * the prototype's "today". Coarse by design — the dataset only records a fuzzy recency
 * ("1 day ago", "20 mins ago", "4 months ago"), so this recovers a plausible day, not a
 * timestamp. Also returns the recency in whole days, which the intent read uses.
 */
function lastSeenToDate(lastActivity: string): { date: Date; days: number } {
  const ago = lastActivity.replace(/^Last seen\s*/i, '')
  const m = ago.match(/(\d+)\s*(min|hour|day|week|month)/i)
  let days = 0
  if (m) {
    const n = Number(m[1])
    const unit = m[2].toLowerCase()
    if (unit === 'week') days = n * 7
    else if (unit === 'month') days = n * 30
    else if (unit === 'day') days = n
    // minutes / hours round to "today".
  }
  const date = new Date(PROTOTYPE_TODAY.getTime() - days * DAY_MS)
  return { date, days }
}

/** A listing's key features line — property type, parking, status, and any open house. */
function pulseFeatures(l: SampleListing): string {
  const parts: string[] = [l.propertyType]
  if (l.parking && l.parking !== 'None') parts.push(l.parking)
  if (l.status === 'Price Change' && l.priceHistory.length)
    parts.push(`price cut from ${formatPrice(l.priceHistory[0].price)}`)
  else if (l.status !== 'Active') parts.push(l.status)
  if (l.openHouse.length) parts.push(`open house ${l.openHouse[0]}`)
  return parts.join(' · ')
}

/**
 * Build the structured pulse for one client, deriving every value from the real dataset.
 *
 * The dataset carries no in-app view/message/notification telemetry, so the engagement read
 * is built from the signals that *do* exist — the client's tours (their stops are the homes
 * they've asked to see), their saved searches, and their all-time saved count. The activity
 * table's "properties viewed" is a proxy from past-tour stops within each window; saves,
 * repeat-views, and chat rows are surfaced as zero with the all-time saved count called out
 * in the narrative, rather than fabricated. Confidence is deliberately held in the Medium
 * tier because that proxy is thin and partly contradicts the stated search.
 */
function buildClientPulse(client: Client): ClientPulseReportCard | null {
  const searches = savedSearchesForClient(client.id)
  const tours = toursFor(client.id)
  if (searches.length === 0 && tours.length === 0) return null

  // Client since — the earliest recorded interaction (their first tour), and days since.
  const tourEpochs = tours.map((t) => isoToEpoch(t.date))
  const earliest = tourEpochs.length ? Math.min(...tourEpochs) : PROTOTYPE_TODAY.getTime()
  const clientSinceDays = Math.max(0, Math.round((PROTOTYPE_TODAY.getTime() - earliest) / DAY_MS))

  // Last active + intent — recency drives the intent tier, lifted by an upcoming tour.
  const { date: lastDate, days: recencyDays } = lastSeenToDate(client.lastActivity)
  const lastActiveAgo = client.lastActivity.replace(/^Last seen\s*/i, '')
  const upcoming = tours
    .filter((t) => t.state === 'Upcoming')
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  let intentLevel: 'Low' | 'Medium' | 'High'
  if (recencyDays <= 3 && upcoming) intentLevel = 'High'
  else if (recencyDays <= 14) intentLevel = 'Medium'
  else intentLevel = 'Low'
  const intentEmoji = intentLevel === 'High' ? '🔥' : intentLevel === 'Medium' ? '⚡' : '🧊'
  const intentNote =
    intentLevel === 'High'
      ? `last active ${lastActiveAgo}, with ${client.saved} saved homes and a tour on the calendar — actively shopping.`
      : intentLevel === 'Medium'
        ? `last active ${lastActiveAgo}; ${client.saved} saved homes on file — engaged but not urgent.`
        : `last active ${lastActiveAgo} — cooling off; a nudge may be needed to re-engage.`

  // Profile — the client's stated preferences, read off the roster fields (themselves derived
  // from the primary saved search) plus financing.
  const profile: string[] = []
  if (client.budget) profile.push(`Budget: ${client.budget}`)
  if (client.looking) profile.push(`Looking for: ${client.looking}`)
  if (client.financing) profile.push(`Financing: ${client.financing}`)

  // Engaged homes — every distinct tour-stop listing, closed ones set aside (already
  // transacted, not an open interest). Engagement count = how many stops landed on it.
  const engagementCount = new Map<string, number>()
  for (const tour of tours)
    for (const stop of tour.stops)
      engagementCount.set(stop.listingId, (engagementCount.get(stop.listingId) ?? 0) + 1)
  const engagedAll = engagedListings(client.id)
  const engaged = engagedAll.filter((l) => l.status !== 'Closed')

  // The primary saved search — the one the most engaged homes fit on price; the rest read as
  // experimental. Mirrors the Search Optimization heuristic so the two flows never disagree.
  const priceFit = (s: SavedSearch) =>
    engaged.filter(
      (l) =>
        (s.criteria.priceMax == null || l.price <= s.criteria.priceMax) &&
        (s.criteria.priceMin == null || l.price >= s.criteria.priceMin),
    ).length
  const rankedSearches = [...searches].sort((a, b) => priceFit(b) - priceFit(a))
  const primary = rankedSearches[0]
  const experimental = rankedSearches.slice(1)

  // Headline — the strongest real insight. An imminent tour with unconfirmed stops leads;
  // otherwise a search drift (engaged homes above the ceiling); otherwise steady engagement.
  const unconfirmed = upcoming
    ? upcoming.stops.filter((s) => s.tourStatus !== 'Confirmed').length
    : 0
  const overCeiling =
    primary?.criteria.priceMax != null
      ? engaged.filter((l) => l.price > primary.criteria.priceMax!)
      : []
  let headline: string
  if (upcoming && unconfirmed > 0) {
    headline = `Their ${formatTourDate(upcoming.date)} tour has ${unconfirmed} of ${upcoming.stops.length} stops unconfirmed — lock the route before the weekend.`
  } else if (overCeiling.length) {
    headline = `They're touring homes above their saved-search ceiling — their stated budget may be out of date.`
  } else {
    headline = `Steadily engaged — keep the momentum with timely, relevant listings.`
  }

  // Activity table — windows measured back from "today". "Properties viewed" is a proxy from
  // past-tour stops (the dataset has no view log); saves / repeat-views / chat have no dated
  // source, so they read zero and the all-time saved count is surfaced in the note below.
  const inWindow = (iso: string, days: number) =>
    PROTOTYPE_TODAY.getTime() - isoToEpoch(iso) <= days * DAY_MS &&
    isoToEpoch(iso) <= PROTOTYPE_TODAY.getTime()
  const viewedIn = (days: number) =>
    tours
      .filter((t) => t.state === 'Past' && inWindow(t.date, days))
      .reduce((n, t) => n + t.stops.length, 0)
  // A forward window for scheduled tours — a tour dated within the next N days.
  const scheduledIn = (days: number) =>
    tours.filter(
      (t) =>
        t.state === 'Upcoming' &&
        isoToEpoch(t.date) >= PROTOTYPE_TODAY.getTime() &&
        isoToEpoch(t.date) - PROTOTYPE_TODAY.getTime() <= days * DAY_MS,
    )
  const repeatViews = Array.from(engagementCount.values()).filter((n) => n >= 3).length
  const sched7 = scheduledIn(7)
  const sched30 = scheduledIn(30)
  const schedCell = (list: SampleTour[]) =>
    list.length ? `${list.length} (${list.map((t) => formatTourDate(t.date).replace(/^\w+,\s*/, '')).join(', ')})` : '0'
  const activity: PulseActivityRow[] = [
    { metric: 'Properties viewed', last7: String(viewedIn(7)), last30: String(viewedIn(30)) },
    { metric: 'Properties saved', last7: '0', last30: '0' },
    { metric: 'Repeat views (3+)', last7: String(repeatViews), last30: String(repeatViews) },
    { metric: 'Tours scheduled', last7: schedCell(sched7), last30: schedCell(sched30) },
    { metric: 'Chat messages', last7: '0', last30: '0' },
  ]
  const activityNote =
    `Engagement here is in-person touring: ${viewedIn(30)} tour stop${viewedIn(30) === 1 ? '' : 's'} in the last 30 days` +
    (upcoming ? `, plus a ${upcoming.stops.length}-stop tour booked for ${formatTourDate(upcoming.date).replace(/^\w+,\s*/, '')}` : '') +
    `. They've saved ${client.saved} homes all-time. (No in-app view or message log is available, so those rows read zero — the counts above reflect tour activity.)`

  // Members — the household, analyzed as one group.
  const members = getClient(client.id)?.members ?? [client.name]
  const membersNote = 'Analyzed together as one group.'

  const savedSearches = searches.map((s) => ({ name: s.name, criteria: criteriaLine(s.criteria) }))
  const searchNote = primary
    ? `"${primary.name}" best fits what they're actually touring` +
      (experimental.length
        ? `; ${experimental.map((s) => `"${s.name}"`).join(', ')} look${experimental.length === 1 ? 's' : ''} experimental — none of the homes they're touring match ${experimental.length === 1 ? 'it' : 'them'}.`
        : '.')
    : 'No saved search on file yet.'

  // Top interests — the most-engaged non-closed homes, most-revisited first, then homes on the
  // upcoming tour ahead of past-only ones. Each deep-links into the group's feed.
  const upcomingIds = new Set(upcoming?.stops.map((s) => s.listingId) ?? [])
  const interestsRanked = [...engaged].sort((a, b) => {
    const byViews = (engagementCount.get(b.id) ?? 0) - (engagementCount.get(a.id) ?? 0)
    if (byViews) return byViews
    return Number(upcomingIds.has(b.id)) - Number(upcomingIds.has(a.id))
  })
  const primaryCity = primary ? cityOf(primary.criteria.location) : ''
  const interests: PulseInterest[] = interestsRanked.slice(0, 3).map((l) => {
    const views = engagementCount.get(l.id) ?? 1
    const over = primary?.criteria.priceMax != null && l.price > primary.criteria.priceMax
    const offType = primary?.criteria.propertyType && l.propertyType !== primary.criteria.propertyType
    const onUpcoming = upcomingIds.has(l.id)
    let relevance: string
    if (views >= 2) relevance = `Their most-revisited home — a stop on ${views} separate tours`
    else if (onUpcoming) relevance = `A stop on the upcoming ${formatTourDate(upcoming!.date).replace(/^\w+,\s*/, '')} tour`
    else relevance = 'Toured previously'
    const flags: string[] = []
    if (over && primary?.criteria.priceMax != null)
      flags.push(`${short(l.price - primary.criteria.priceMax)} over the ${short(primary.criteria.priceMax)} ceiling`)
    if (offType && primary?.criteria.propertyType)
      flags.push(`a ${l.propertyType.toLowerCase()}, not the ${primary.criteria.propertyType.toLowerCase()} the search specifies`)
    if (!over && !offType && primaryCity && l.address.city === primaryCity) flags.push('squarely inside their search')
    relevance += flags.length ? ` — ${flags.join('; ')}.` : '.'
    return {
      href: `/plus/app/feed/${client.id}/listing/${l.id}`,
      address: l.address.line1,
      views,
      priceLabel: formatPrice(l.price),
      beds: l.beds,
      bathsLabel: bathsLabel(l),
      sqftLabel: l.sqft != null ? `${l.sqft.toLocaleString('en-US')} sqft` : '—',
      propertyType: l.propertyType,
      features: pulseFeatures(l),
      relevance,
    }
  })

  const interestsIntro = `The homes ${client.greetingName} keep coming back to:`

  // Pattern — the behavioural inference vs. the stated search.
  const engagedCities = Array.from(new Set(engaged.map((l) => l.address.city)))
  const offCities = primaryCity ? engagedCities.filter((c) => c !== primaryCity) : engagedCities
  const patternBits: string[] = []
  if (offCities.length) patternBits.push(`across ${listAnd(engagedCities)}, wider than the search's ${primaryCity || 'stated area'}`)
  if (overCeiling.length && primary?.criteria.priceMax != null)
    patternBits.push(`and pricier — up to ${formatPrice(Math.max(...engaged.map((l) => l.price)))}, past the ${short(primary.criteria.priceMax)} ceiling`)
  const pattern = patternBits.length
    ? `They're touring homes ${patternBits.join(' ')}. Their real search is broader than the one on file.`
    : `Their touring lines up with their saved search — no drift to flag.`

  // Suggested actions — prioritized, evidence-tied; the top one carries a ready-to-send draft.
  const suggestedActions: PulseSuggestedAction[] = []
  if (upcoming && unconfirmed > 0) {
    const stops = upcoming.stops
      .map((s) => getListing(s.listingId))
      .filter((l): l is SampleListing => Boolean(l))
    const confirmed = stops.find((l, i) => upcoming.stops[i].tourStatus === 'Confirmed')
    const pending = stops.filter((l, i) => upcoming.stops[i].tourStatus !== 'Confirmed')
    const startTime = upcoming.startTime ?? '10:00 AM'
    const draft =
      `Hi ${client.greetingName} — your ${formatTourDate(upcoming.date)} tour is coming together` +
      (confirmed ? `: we start at ${confirmed.address.line1} at ${startTime}` : '') +
      `. I'm confirming showing times for ${listAnd(pending.map((l) => l.address.line1))} now and will send the finalized route once ${pending.length === 1 ? 'it is' : 'all ' + stops.length + ' are'} locked. Does a ${startTime} start still work for you? — ${AGENT_FIRST_NAME}`
    suggestedActions.push({
      title: 'Confirm the upcoming tour',
      priority: 'URGENT',
      rationale: `${unconfirmed} of ${stops.length} stops on the ${formatTourDate(upcoming.date)} tour are still unconfirmed — the route isn't set with days to go.`,
      draft,
    })
  }
  if (overCeiling.length || offCities.length) {
    const suggestCities = offCities.slice(0, 3)
    const newCeil = engaged.length
      ? Math.ceil(Math.max(...engaged.map((l) => l.price)) / 100_000) * 100_000
      : undefined
    suggestedActions.push({
      title: 'Widen their saved search',
      priority: 'Medium',
      rationale:
        `Their touring runs past the current search` +
        (suggestCities.length ? ` — add ${listAnd(suggestCities)}` : '') +
        (newCeil != null && primary?.criteria.priceMax != null ? ` and lift the ceiling toward ${short(newCeil)}` : '') +
        `.`,
    })
  }
  for (const s of experimental) {
    const c = s.criteria
    const matches = engaged.some(
      (l) =>
        (c.priceMax == null || l.price <= c.priceMax) &&
        (c.propertyType == null || l.propertyType === c.propertyType) &&
        l.address.city === cityOf(c.location),
    )
    if (!matches) {
      suggestedActions.push({
        title: `Revisit the "${s.name}" search`,
        priority: 'Low',
        rationale: `Nothing they're touring matches "${s.name}" — worth confirming it still reflects what they want.`,
      })
      break
    }
  }
  if (suggestedActions.length === 0)
    suggestedActions.push({
      title: 'Keep sending timely listings',
      priority: 'Low',
      rationale: 'No urgent gaps — steady, relevant listings will keep them engaged.',
    })

  // Confidence — held in the Medium tier: the proxy is thin, and the touring partly
  // contradicts the stated search. Lifted a little by an upcoming tour and a real engaged set.
  let pct = 60
  if (upcoming) pct += 8
  if (engaged.length >= 3) pct += 4
  const confidencePercent = Math.min(84, pct)

  return {
    kind: 'clientPulseReport',
    clientName: client.name,
    clientSince: longDate(new Date(earliest).toISOString().slice(0, 10)),
    clientSinceDays,
    profile,
    lastActive: monthDay(lastDate),
    lastActiveAgo,
    intentLevel,
    intentEmoji,
    intentNote,
    headline,
    activity,
    activityNote,
    members,
    membersNote,
    savedSearches,
    searchNote,
    interestsIntro,
    interests,
    pattern,
    suggestedActions,
    confidenceLevel: confidenceLevel(confidencePercent),
    confidencePercent,
    tour: upcoming ? catchUpTourRef(client, upcoming) : undefined,
  }
}

/** State 1 — the client picker, reusing the Search Optimization "Select group" card kind. */
function clientPulsePickerCard(clients: Client[]): SearchOptPickerCard {
  return {
    kind: 'searchOptPicker',
    title: 'Select group',
    clients: clients.map((c) => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      lastSeen: c.lastActivity,
      prompt: `Get a Client Pulse on ${c.greetingName}`,
    })),
  }
}

/** The action-picker branches the pulse ends on. The draft option adapts to an upcoming tour. */
function clientPulseActions(client: Client, hasTour: boolean): ClientPulseAction[] {
  return [
    {
      label: hasTour ? 'Draft a follow-up message (confirm tour attendance)' : 'Draft a follow-up message',
      prompt: hasTour ? 'Draft a follow-up message to confirm tour attendance' : 'Draft a follow-up message',
      kind: 'draft',
      target: client.name,
    },
    { label: 'View or update client notes', prompt: 'View or update client notes', kind: 'notes' },
    { label: 'Update their saved search', prompt: 'Update their saved search', kind: 'search' },
    { label: 'Analyze another client', prompt: 'Analyze another client', kind: 'another' },
    { label: 'Done', prompt: 'Done', kind: 'done' },
  ]
}

/** The insight-driven thread title the pulse renames to, from the strongest real signal. */
function clientPulseTitle(client: Client, report: ClientPulseReportCard): string {
  const name = firstsAmp(client)
  if (/unconfirmed/.test(report.headline)) return `${name}'s Tour Needs Confirmation`
  if (/ceiling|budget/.test(report.headline)) return `${name}'s Search Is Drifting`
  return `${name}'s Pulse`
}

/**
 * The Client Pulse state machine. The trigger greets and asks for a client (State 1); picking
 * one streams the gathering pass and lands the report + action picker (States 2–5); the picker
 * turn resolves the chosen branch.
 */
export function stepClientPulse(
  flow: ClientPulseFlow | null,
  text: string,
  clients: Client[] = CLIENTS,
): { result: AssistantResult; flow: ClientPulseFlow | null } {
  // Start — greet and ask which client to analyse.
  if (!flow) {
    return {
      result: {
        threadTitle: 'Client Pulse',
        cards: [
          { kind: 'addClientMessage', completed: true, body: 'Which client would you like to analyze?' },
          clientPulsePickerCard(clients),
        ],
        reply: '',
      },
      flow: { state: 'selecting' },
    }
  }

  const t = text.toLowerCase().trim()

  // State 1 → a client was chosen (or named). Stream the gathering pass and land the report.
  if (flow.state === 'selecting') {
    if (/\bskip\b/.test(t)) {
      return {
        result: {
          cards: [],
          reply:
            'No problem — say “Client Pulse” whenever you’d like me to take a deeper look at a client.',
        },
        flow: null,
      }
    }
    const named = clients.find((c) => mentions(t, c))
    if (!named) {
      return {
        result: {
          cards: [],
          reply:
            'I didn’t catch which client that was — tell me a name, or pick one of the client cards above.',
        },
        flow,
      }
    }
    const report = buildClientPulse(named)
    if (!report) {
      return {
        result: {
          cards: [],
          reply: `${named.greetingName} don’t have enough activity yet for a pulse. Once they’ve saved a search or toured a home, I can take a deeper look.`,
        },
        flow: null,
      }
    }

    // The gathering tools: ten fixed steps plus one get_search_details per saved search,
    // inserted after the first two — exactly as the spec's list repeats that call per search.
    const searchCount = savedSearchesForClient(named.id).length
    const tools = [
      '✓ Found listing information',
      '✓ Loaded conversation context',
      ...Array.from({ length: searchCount }, () => '✓ Ran get_search_details'),
      '✓ Fetched your notifications',
      '✓ Got info on this group',
      '✓ Loaded group members',
      '✓ Pulled up view history for this group',
      '✓ Grabbed the saved searches',
      '✓ Loaded the group feed',
      '✓ Loaded upcoming tour schedule',
      '✓ Checked unread conversations',
    ]

    // States 2–5 land in one turn and reveal on a stagger: the chip and gather line show at
    // once, the tools stream and collapse, then the "compiling" line, the report, and picker.
    const GATHER = 250
    const REPORT_MSG = 1900
    const REPORT = 2600
    const PICKER = 3000

    const hasTour = Boolean(report.tour)
    const actions = clientPulseActions(named, hasTour)

    return {
      result: {
        threadTitle: clientPulseTitle(named, report),
        cards: [
          { kind: 'searchOptClient', name: named.name, initials: named.initials, lastSeen: named.lastActivity },
          {
            kind: 'addClientMessage',
            completed: false,
            body: 'Let me gather comprehensive data on this client. One moment...',
          },
          {
            kind: 'catchUpTools',
            stream: ['Looking for unread messages…', 'Processing your request…'],
            toolCount: tools.length,
            tools,
            revealMs: GATHER,
          },
          {
            kind: 'addClientMessage',
            completed: false,
            body: 'Now I have all the data I need. Let me compile the analysis.',
            revealMs: REPORT_MSG,
          },
          { ...report, revealMs: REPORT },
          {
            kind: 'actionPicker',
            title: 'What would you like to do?',
            options: [
              ...actions.map((a) => ({ label: a.label, prompt: a.prompt })),
              { label: 'Skip', prompt: 'Skip' },
            ],
            revealMs: PICKER,
          },
        ],
        reply: '',
      },
      flow: { state: 'action', clientId: named.id, actions },
    }
  }

  // State 5 → the chosen branch.
  const client = clients.find((c) => c.id === flow.clientId)
  const who = client ? client.greetingName : 'the client'
  const actions = flow.actions ?? []
  const match = (kind: ClientPulseAction['kind']) =>
    actions.find((a) => a.kind === kind && a.prompt.toLowerCase() === t)

  if (/\bskip\b/.test(t) || match('done') || /\bdone\b/.test(t)) {
    return {
      result: {
        cards: [],
        reply: `Sounds good — I'll leave it there. Say “Client Pulse” anytime for a fresh read.`,
      },
      flow: null,
    }
  }

  // Draft a follow-up — reuse the tour-confirmation draft the report already composed.
  const draftAction = match('draft') ?? (/\bdraft\b/.test(t) ? actions.find((a) => a.kind === 'draft') : undefined)
  if (draftAction) {
    const report = client ? buildClientPulse(client) : null
    const draft = report?.suggestedActions.find((a) => a.draft)?.draft
    if (draft) {
      return {
        result: {
          preReply: 'On it — here’s a draft you can send.',
          cards: [
            {
              kind: 'addClientMessage',
              completed: true,
              confirm: { label: 'Send this message', prompt: `Send tour confirmation to ${draftAction.target}` },
              body: `Here's a draft for ${who}:\n\n“${draft}”\n\nWant me to send it?`,
            },
          ],
          reply: '',
        },
        flow,
      }
    }
    return {
      result: {
        cards: [
          {
            kind: 'addClientMessage',
            completed: true,
            body: `Tell me the gist and I'll draft a note to ${who} for you.`,
          },
        ],
        reply: '',
      },
      flow,
    }
  }

  // Send the drafted message (the confirm button, or "send …").
  if (/\bsend\b/.test(t)) {
    const report = client ? buildClientPulse(client) : null
    const draft = report?.suggestedActions.find((a) => a.draft)?.draft
    return {
      result: {
        preReply: 'On it — sending that message now.',
        cards: [
          { kind: 'toolRun', processing: 'Sending message…', resolved: '✓ Message sent' },
          {
            kind: 'addClientMessage',
            completed: true,
            body:
              (draft ? `Sent to ${client?.name ?? who}:\n\n“${draft}”\n\n` : `Sent to ${who}.\n\n`) +
              `Anything else from ${who}'s pulse? Say “Client Pulse” to run another.`,
          },
        ],
        reply: '',
      },
      flow: null,
    }
  }

  // View or update notes — there's no notes store in the dataset, so summarise what's on file.
  if (match('notes') || /\bnotes?\b/.test(t)) {
    return {
      result: {
        cards: [
          {
            kind: 'addClientMessage',
            completed: true,
            options: ['Add a note', 'Something else'],
            body:
              `Here's what's on file for ${who}:\n\n` +
              (client ? `- Stage: ${client.stage}\n- ${client.looking}\n- Budget ${client.budget}, ${client.financing}\n\n` : '') +
              `Want to add a note?`,
          },
        ],
        reply: '',
      },
      flow,
    }
  }

  // Update their saved search — mirror the Search Optimization apply branch.
  if (match('search') || (/\bsearch\b/.test(t) && /\bupdate\b/.test(t))) {
    const report = client ? buildClientPulse(client) : null
    const primaryName = report?.savedSearches[0]?.name ?? 'their saved search'
    const changes = (report?.suggestedActions ?? []).find((a) => /widen/i.test(a.title))
    return {
      result: {
        preReply: 'On it — updating the saved search now.',
        cards: [
          { kind: 'toolRun', processing: 'Updating saved search…', resolved: '✓ Ran update_saved_search' },
          {
            kind: 'addClientMessage',
            completed: true,
            body:
              `Done — I've updated “${primaryName}” for ${who}${changes ? `: ${changes.rationale.replace(/\.$/, '')}` : ''}. ` +
              `New matches will start flowing into their feed.`,
          },
        ],
        reply: '',
      },
      flow: null,
    }
  }

  // Analyze another client — restart the picker.
  if (match('another') || /\banother\b/.test(t)) {
    return {
      result: {
        cards: [
          { kind: 'addClientMessage', completed: true, body: 'Which client would you like to analyze?' },
          clientPulsePickerCard(clients),
        ],
        reply: '',
      },
      flow: { state: 'selecting' },
    }
  }

  // "Something else" — a free-text instruction. Close the flow and let the general responder answer.
  return { result: respondLocally(text, clients), flow: null }
}

/** Run one Client Pulse turn behind the shared simulated latency. */
export async function runClientPulse(
  flow: ClientPulseFlow | null,
  text: string,
  clients: Client[] = CLIENTS,
): Promise<{ result: AssistantResult; flow: ClientPulseFlow | null }> {
  await new Promise((r) => setTimeout(r, THINKING_MS))
  return stepClientPulse(flow, text, clients)
}

export async function runAssistant(text: string, clients: Client[]): Promise<AssistantResult> {
  if (typeof window !== 'undefined' && window.claude?.complete) {
    const cards: Card[] = []
    let scheduled: ScheduledTour | undefined
    try {
      const reply = await window.claude.complete({
        system: SYSTEM_PROMPT_INTRO,
        messages: [{ role: 'user', content: text }],
        max_tokens: 800,
        tools: [
          {
            name: 'show_client_card',
            description: `Display a rich profile card for one of ${AGENT_FIRST_NAME}’s clients in the chat.`,
            input_schema: {
              type: 'object',
              properties: { clientName: { type: 'string', description: 'Client name, full or partial' } },
              required: ['clientName'],
            },
            run: async ({ clientName }: { clientName: string }) => {
              const c = findClient(clientName, clients)
              if (!c) return `No client found named ${clientName}.`
              cards.push(toClientCard(c))
              return `Card displayed. Full record: ${JSON.stringify(c)}`
            },
          },
          {
            name: 'schedule_tour',
            description:
              'Request a home tour for a client. Shows a tour confirmation card in chat and updates the client record.',
            input_schema: {
              type: 'object',
              properties: {
                clientName: { type: 'string' },
                address: { type: 'string' },
                when: { type: 'string', description: 'Day and time, e.g. "Sat Jul 25 · 10:00 AM"' },
              },
              required: ['clientName', 'address', 'when'],
            },
            run: async ({
              clientName,
              address,
              when,
            }: {
              clientName: string
              address: string
              when: string
            }) => {
              const c = findClient(clientName, clients)
              const l = findListing(address)
              cards.push({
                kind: 'tour',
                address: l ? l.address : address,
                meta: l ? `${l.meta} · ${l.hood}` : '',
                client: c ? c.name : clientName,
                when,
              })
              if (c)
                scheduled = {
                  client: c,
                  address: l ? l.address : address,
                  when,
                  type: 'Buyer tour · 1 stop',
                  at: whenToEpoch(when),
                }
              return `Tour requested. Card displayed to ${AGENT_FIRST_NAME} and the client record was updated.`
            },
          },
        ],
      })
      return { cards, reply: String(reply || '').trim(), scheduled }
    } catch {
      return { cards: [], reply: ERROR_REPLY }
    }
  }

  await new Promise((r) => setTimeout(r, THINKING_MS))
  return respondLocally(text, clients)
}
