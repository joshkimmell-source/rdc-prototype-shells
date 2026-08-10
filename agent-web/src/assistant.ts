/**
 * RealAssist+ responder.
 *
 * The DC prototype called `window.claude.complete({ system, messages, max_tokens, tools })`,
 * which only exists inside the Claude Design runtime. A Vite app has no such global, so this
 * module provides a local rule-based stand-in that reproduces the same contract: it returns
 * plain-text replies and can emit the two tool results the chat renders — `show_client_card`
 * and `schedule_tour`.
 *
 * If a host ever does inject `window.claude.complete`, `runAssistant` defers to it and the
 * tool `run` handlers push cards exactly as the DC version did — so this stays a drop-in.
 */
import {
  AGENT_BROKERAGE,
  AGENT_FIRST_NAME,
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
  formatListingMeta,
  formatMinutes,
  formatPrice,
  formatTourDate,
  getListing,
  type Tour as SampleTour,
  type TourStop,
  type TourStopStatus,
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

/** One row of a tour plan's stop table. */
export interface TourStopRow {
  order: string
  address: string
  /** `"$1,125,000 · 3 bd · 2 ba · 2,008 sqft"`. */
  meta: string
  /** `"10:00 AM"`, or `"Time TBD"` for a stop with no confirmed slot. */
  time: string
  status: TourStopStatus
}

/** A recommended next step, ranked. `confidence` drives the marker the card shows. */
export interface TourStep {
  label: string
  confidence: 'high' | 'medium' | 'low'
}

/**
 * The multi-stop tour plan the assistant assembles for a client: the ordered stops, the
 * conflicts it found, and the ranked next steps. All derived from the client's real
 * upcoming tour, so the table, the conflicts and the steps agree with the Tours screen.
 */
export interface TourPlanCard {
  kind: 'tourPlan'
  client: string
  clientId: string
  greetingName: string
  /** `"Sat, Aug 15"`. */
  when: string
  /** ISO `YYYY-MM-DD` of the tour date — the picker opens on this month. */
  dateISO: string
  driveLabel: string
  stops: TourStopRow[]
  conflicts: string[]
  steps: TourStep[]
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
  /** Day-of-month of the client's current tour date, pre-highlighted. */
  suggestedDay: number
}

export type Card = ClientCard | TourCard | TourPlanCard | DatePickerCard

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

/** The client's soonest upcoming tour, if they have one — the plan is built from it. */
function upcomingTourFor(clientId: string): SampleTour | undefined {
  return SAMPLE_TOURS.filter((t) => t.clientId === clientId && t.state === 'Upcoming').sort((a, b) =>
    a.date.localeCompare(b.date)
  )[0]
}

/** A stop's address, meta and slot — joined to its listing where the id resolves. */
function toStopRow(stop: TourStop): TourStopRow {
  const listing = getListing(stop.listingId)
  const address = listing?.address.line1 ?? stop.address
  const meta = listing
    ? `${formatPrice(listing.price)} · ${formatListingMeta(listing)}`
    : stop.listingStatus
  return {
    order: stop.order,
    address,
    meta,
    time: stop.time ?? 'Time TBD',
    status: stop.tourStatus,
  }
}

/**
 * The conflicts a tour carries, read off its stops rather than authored: a stop with no
 * confirmed showing time is the scheduling risk the plan has to call out, and the drive
 * budget between three stops is the logistics one. Empty when every stop is confirmed.
 */
function conflictsFor(tour: SampleTour): string[] {
  const out: string[] = []
  const unconfirmed = tour.stops.filter((s) => s.tourStatus !== 'Confirmed')
  if (unconfirmed.length) {
    const labels = unconfirmed.map((s) => `${s.order} (${getListing(s.listingId)?.address.line1 ?? s.address})`)
    out.push(
      `${unconfirmed.length} of ${tour.stops.length} stops have no confirmed showing time yet — ${labels.join(', ')}.`
    )
  }
  const noSlot = tour.stops.filter((s) => !s.time)
  if (noSlot.length >= 2) {
    out.push(
      `Stops ${noSlot.map((s) => s.order).join(' and ')} both need a time, so the ${formatMinutes(tour.driveTimeMins)} of drive time between them isn’t locked.`
    )
  }
  const openHouse = tour.stops
    .map((s) => getListing(s.listingId))
    .filter((l) => l && l.openHouse.length > 0)
  if (openHouse.length) {
    out.push(
      `${openHouse[0]!.address.line1} only shows during its open house (${openHouse[0]!.openHouse[0]}), which may not line up with the other stops.`
    )
  }
  return out
}

/**
 * The ranked next steps, derived from the same conflicts so the priority order reflects
 * the tour's actual state. Confirming showing times leads when stops are unconfirmed;
 * routing and client sign-off follow.
 */
function stepsFor(tour: SampleTour, greetingName: string): TourStep[] {
  const steps: TourStep[] = []
  const unconfirmed = tour.stops.filter((s) => s.tourStatus !== 'Confirmed')
  if (unconfirmed.length) {
    steps.push({
      label: `Confirm showing times for ${unconfirmed.length === 1 ? 'the open stop' : `all ${unconfirmed.length} open stops`} with the listing agents`,
      confidence: 'high',
    })
  }
  steps.push({
    label: `Lock the route in stop order to keep drive time near ${formatMinutes(tour.driveTimeMins)}`,
    confidence: unconfirmed.length ? 'medium' : 'high',
  })
  steps.push({
    label: `Send ${greetingName} the plan to confirm the ${formatTourDate(tour.date)} date`,
    confidence: 'medium',
  })
  return steps
}

/** Assemble the full plan card for a client's upcoming tour. */
function toTourPlanCard(client: Client, tour: SampleTour): TourPlanCard {
  return {
    kind: 'tourPlan',
    client: client.name,
    clientId: client.id,
    greetingName: client.greetingName,
    when: formatTourDate(tour.date),
    dateISO: tour.date,
    driveLabel: `${formatMinutes(tour.driveTimeMins)} driving · ${tour.stopCount} stops`,
    stops: tour.stops.map(toStopRow),
    conflicts: conflictsFor(tour),
    steps: stepsFor(tour, client.greetingName),
  }
}

/** The date-picker card for a client's tour — opens on the tour month, that day marked. */
function toDatePickerCard(client: Client, tour: SampleTour): DatePickerCard {
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
 * `PROTOTYPE_TODAY` so the day names match the dataset's tour dates. Returns both the
 * display label and the resolved date, so the caller can sort by it.
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
 * The year is not in the string, so it is taken from `PROTOTYPE_TODAY`. Unparseable
 * strings sort last rather than jumping to the top of the list.
 */
function whenToEpoch(when: string): number {
  const day = when.split('·')[0].trim()
  const parsed = Date.parse(`${day} ${PROTOTYPE_TODAY.getFullYear()}`)
  return Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed
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
 * Mock reasoning over the seeded book of business. Mirrors the DC system prompt's rules:
 * plain text, 1–4 short sentences, no markdown, prices like $612,000.
 */
function respondLocally(text: string, clients: Client[]): AssistantResult {
  const t = text.toLowerCase()
  const cards: Card[] = []

  // plan_tour — "plan a tour for Jordan and Mia" / "build a tour plan". Distinct from
  // schedule_tour: no single property or time, it lays out the client's whole upcoming
  // tour as a table with the conflicts and ranked next steps the image walks through.
  if (/\b(plan|put together|build|map out|organi[sz]e)\b/.test(t) && /\btour\b/.test(t)) {
    const named = clients.find((c) => mentions(t, c))
    if (!named) return { cards, reply: 'Which client should I plan a tour for?' }
    const tour = upcomingTourFor(named.id)
    if (!tour) {
      return {
        cards,
        reply: `${named.greetingName} has no upcoming tour on the books yet. Tell me a property and a day and I’ll set the first stop up.`,
      }
    }
    cards.push(toTourPlanCard(named, tour))
    const conflicts = conflictsFor(tour)
    const lead = conflicts.length
      ? `${conflicts.length === 1 ? 'One thing needs' : `${conflicts.length} things need`} sorting before it’s locked`
      : 'Everything lines up'
    return {
      cards,
      reply:
        `Here’s the ${formatTourDate(tour.date)} tour for ${named.greetingName} — ${tour.stopCount} stops, ` +
        `${formatMinutes(tour.driveTimeMins)} of driving. ${lead}. When you’re ready, tell me to start the tour and I’ll pull up the calendar.`,
    }
  }

  // start_tour / pick a date — surfaces the calendar card for a planned client's tour.
  if (
    /\b(start|kick off|lock in|confirm|pick|choose|set) (the |a )?(tour|date|day)\b/.test(t) ||
    (/\bcalendar\b/.test(t) && /\btour\b/.test(t))
  ) {
    const named = clients.find((c) => mentions(t, c)) ?? clients.find((c) => upcomingTourFor(c.id))
    const tour = named ? upcomingTourFor(named.id) : undefined
    if (named && tour) {
      cards.push(toDatePickerCard(named, tour))
      return {
        cards,
        reply: `Pick the day for ${named.greetingName}’s tour and I’ll send the invites out to the listing agents.`,
      }
    }
  }

  // schedule_tour — needs a client, a property, and a day/time.
  if (/\b(tour|showing|show(ing)?s?|visit)\b/.test(t) && /\b(set up|schedule|book|arrange)\b/.test(t)) {
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
      reply: `Requested ${listing.address} for ${named.name} on ${when.label} — the invite is out to the listing agent. Want me to add a second stop nearby while you are in ${listing.hood}?`,
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
      // `looking` is the em dash for a client with no saved search — don't paste that
      // into a note. Fall back to a line that needs no search criteria.
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
      `I can pull up any of your ${clients.length} clients, set up a tour, or give you context on the ` +
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
