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
  clientNeeds,
  type Client,
  type TagColor,
} from './data'
import {
  LISTINGS as SAMPLE_LISTINGS,
  TOURS as SAMPLE_TOURS,
  formatBaths,
  formatPrice,
  formatTourDate,
  getListing,
  type Listing as SampleListing,
  type ListingStatus,
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
  conflicts: LeadNote[]
  steps: LeadNote[]
  confidence: LeadNote
  nextOptions: string[]
}

/**
 * The calendar the plan hands off to when the agent chooses to lock a date. Renders the
 * tour month; picking a day sends a scheduling prompt the responder resolves.
 */
export interface DatePickerCard {
  kind: 'datePicker'
  client: string
  clientId: string
  greetingName: string
  /** The first stop — what the confirmation card names. */
  address: string
  /** Year and 0-indexed month the calendar opens on. */
  year: number
  month: number
  /** Day-of-month of the client's tour date, pre-highlighted. */
  suggestedDay: number
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

export type Card =
  | ClientCard
  | TourCard
  | ToolTraceCard
  | TourListingsCard
  | TourPlanCard
  | TimelineCard
  | OutreachCard
  | SummaryCard
  | DatePickerCard
  | UpcomingTourCard

export interface ScheduledTour {
  client: Client
  address: string
  when: string
  /** Epoch ms of the tour date, so the shell can sort it into the upcoming list. */
  at: number
}

export interface AssistantResult {
  cards: Card[]
  reply: string
  /** An AI line rendered *before* the cards — the flow's acknowledgements ("Got it — …"). */
  preReply?: string
  /** Set when the responder scheduled a tour, so the shell can update client + tour state. */
  scheduled?: ScheduledTour
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

function summaryCard(client: Client, tour: SampleTour, props: PlanProperty[]): SummaryCard {
  return {
    kind: 'tourSummary',
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
      'Pick a specific tour date so I can finalize the messages',
    ],
  }
}

/** The date-picker card for a client's tour — opens on the tour month, that day marked. */
function datePickerCard(client: Client, tour: SampleTour): DatePickerCard {
  const [y, m, d] = tour.date.split('-').map(Number)
  const first = tour.stops[0]
  const address = first ? getListing(first.listingId)?.address.line1 ?? first.address : ''
  return {
    kind: 'datePicker',
    client: client.name,
    clientId: client.id,
    greetingName: client.greetingName,
    address,
    year: y,
    month: m - 1,
    suggestedDay: d,
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

  // ── plan_tour ── "plan a tour for Jordan and Mia" / "coordinate a tour". Lays out the
  // client's saved listings, the plan table and the pre-flight notes, then asks for a time.
  if (
    /\b(plan|coordinate|put together|build|map out|organi[sz]e)\b/.test(t) &&
    /\btour\b/.test(t) &&
    !/\bstart\b/.test(t)
  ) {
    const named = clients.find((c) => mentions(t, c))
    if (!named) return { cards, reply: 'Which client should I plan a tour for?' }
    const tour = upcomingTourFor(named.id)
    if (!tour) {
      return {
        cards,
        reply: `${named.greetingName} has no upcoming tour on the books yet. Tell me a property and a day and I’ll set the first stop up.`,
      }
    }
    const props = planProperties(named, tour)
    cards.push(toolTraceCard(named), tourListingsCard(named, props), tourPlanCard(named, props))
    return {
      cards,
      reply:
        `What time would you like to start the tour? Once I have that, I’ll build out the full timeline with ` +
        `arrival/departure times, showing instructions, and draft outreach messages for each listing agent.`,
    }
  }

  // ── build_coordination ── the plan's "Start the tour" / time reply. Builds the timeline,
  // per-agent outreach, conflicts and ranked next steps.
  const bareTime = /^\s*\d{1,2}(:\d{2})?\s*(am|pm)\s*$/i.test(text.trim())
  if (bareTime || (/\bstart\b/.test(t) && /\btour\b/.test(t))) {
    const named = clients.find((c) => mentions(t, c)) ?? clients.find((c) => upcomingTourFor(c.id))
    const tour = named ? upcomingTourFor(named.id) : undefined
    if (named && tour) {
      const startClock = fmtClock(parseClock(text))
      const props = planProperties(named, { ...tour, startTime: startClock })
      cards.push(timelineCard(named, props), outreachCard(props), summaryCard(named, tour, props))
      return {
        cards,
        preReply: `Got it — ${startClock} start time. Let me build out the full coordination plan.`,
        reply: 'What would you like to do next?',
      }
    }
  }

  // ── pick a date ── surfaces the calendar for the planned client's tour.
  if (
    /\bpick (a )?(date|day)\b/.test(t) ||
    (/\b(choose|set|lock in|confirm)\b/.test(t) && /\b(date|day)\b/.test(t)) ||
    (/\bcalendar\b/.test(t) && /\btour\b/.test(t))
  ) {
    const named = clients.find((c) => mentions(t, c)) ?? clients.find((c) => upcomingTourFor(c.id))
    const tour = named ? upcomingTourFor(named.id) : undefined
    if (named && tour) {
      cards.push(datePickerCard(named, tour))
      return {
        cards,
        reply: `Pick the day for ${named.greetingName}’s tour and I’ll finalize the outreach and lock it in.`,
      }
    }
  }

  // ── schedule the tour ── the calendar's day pick. Shows the final upcoming-tour panel and
  // updates client + tour state.
  if (/\bschedule\b/.test(t) && /\btour\b/.test(t)) {
    const named = clients.find((c) => mentions(t, c)) ?? clients.find((c) => upcomingTourFor(c.id))
    const tour = named ? upcomingTourFor(named.id) : undefined
    if (named && tour) {
      const props = planProperties(named, tour)
      cards.push(upcomingTourCard(named, tour, props))
      const first = props[0]
      return {
        cards,
        reply: `Done — ${named.greetingName}’s ${formatTourDate(tour.date)} tour is on the calendar with all ${tour.stopCount} stops. I’ll send the drafts to the listing agents once you give the word.`,
        scheduled: {
          client: named,
          address: first.line1,
          when: `${formatTourDate(tour.date)} · ${tour.startTime ?? first.timeRange.split(' – ')[0]}`,
          at: isoToEpoch(tour.date),
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
      scheduled: { client: named, address: listing.address, when: when.label, at: when.at },
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

/** Simulated latency so the three-dot busy bubble is visible, as in the DC prototype. */
const THINKING_MS = 650

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
