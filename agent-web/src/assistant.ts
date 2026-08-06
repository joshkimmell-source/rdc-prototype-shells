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
import { CLIENTS, LISTINGS, TAGC, type Client, type TagColor } from './data'

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

export type Card = ClientCard | TourCard

export interface ScheduledTour {
  client: Client
  address: string
  when: string
}

export interface AssistantResult {
  cards: Card[]
  reply: string
  /** Set when the responder scheduled a tour, so the shell can update client + tour state. */
  scheduled?: ScheduledTour
}

export const SYSTEM_PROMPT_INTRO =
  'You are RealAssist+, the AI assistant built into the realtor.com+ agent workspace. ' +
  'The user is Georgia Booth, a buyer’s agent in Austin, TX. Today is Tuesday, July 21, 2026.'

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

export function findClient(name: string, clients: Client[] = CLIENTS): Client | undefined {
  const n = String(name || '').toLowerCase()
  return (
    clients.find((c) => c.name.toLowerCase().includes(n)) ||
    clients.find((c) => n.includes(c.name.split(' ')[0].toLowerCase()))
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

/** "saturday morning" / "sat at 10am" / "tomorrow" → a concrete slot string. */
function parseWhen(text: string): string | null {
  const t = text.toLowerCase()
  const days: Array<[RegExp, string]> = [
    [/\bmon(day)?\b/, 'Mon Jul 27'],
    [/\btue(s|sday)?\b/, 'Tue Jul 28'],
    [/\bwed(nesday)?\b/, 'Wed Jul 29'],
    [/\bthu(r|rs|rsday)?\b/, 'Thu Jul 30'],
    [/\bfri(day)?\b/, 'Fri Jul 31'],
    [/\bsat(urday)?\b/, 'Sat Aug 1'],
    [/\bsun(day)?\b/, 'Sun Aug 2'],
    [/\btomorrow\b/, 'Wed Jul 22'],
  ]
  const day = days.find(([re]) => re.test(t))?.[1]
  if (!day) return null

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
  return `${day} · ${time}`
}

const FOLLOW_UP_REPLY =
  'Three need you this week. Sofia’s offer window on 2204 Vaughn St closes tomorrow, ' +
  'Devon Park still has no pre-approval, and the Nairs let theirs expire. ' +
  'Sofia is the time-sensitive one — I would nudge the listing agent first.'

const MUELLER_REPLY =
  'Her $749,000 offer on 2204 Vaughn St is roughly in line with recent Mueller closings, ' +
  'which have been landing near list after about three weeks on market. ' +
  'At $790K pre-approval she has some room if the seller counters, though I would confirm the comp set before going up.'

/**
 * Mock reasoning over the seeded book of business. Mirrors the DC system prompt's rules:
 * plain text, 1–4 short sentences, no markdown, prices like $612,000.
 */
function respondLocally(text: string, clients: Client[]): AssistantResult {
  const t = text.toLowerCase()
  const cards: Card[] = []

  // schedule_tour — needs a client, a property, and a day/time.
  if (/\b(tour|showing|show(ing)?s?|visit)\b/.test(t) && /\b(set up|schedule|book|arrange)\b/.test(t)) {
    const named = clients.find((c) => t.includes(c.name.split(' ')[0].toLowerCase()))
    const listing = LISTINGS.find((l) => t.includes(l.address.toLowerCase().split(' ')[0]))
    const when = parseWhen(t)

    if (!named) return { cards, reply: 'Which client is this tour for?' }
    if (!listing) return { cards, reply: `Which property should I put on ${named.name.split(' ')[0]}’s tour?` }
    if (!when) return { cards, reply: `What day works for ${named.name.split(' ')[0]}?` }

    cards.push({
      kind: 'tour',
      address: listing.address,
      meta: `${listing.meta} · ${listing.hood}`,
      client: named.name,
      when,
    })
    return {
      cards,
      reply: `Requested ${listing.address} for ${named.name} on ${when} — the invite is out to the listing agent. Want me to add a second stop nearby while you are in ${listing.hood}?`,
      scheduled: { client: named, address: listing.address, when },
    }
  }

  // Broad "who needs attention" question.
  if (/\bfollow[- ]?up|needs? (a )?(follow|attention)|who needs\b/.test(t)) {
    return { cards, reply: FOLLOW_UP_REPLY }
  }

  // show_client_card — any question naming a client.
  const named = clients.find(
    (c) => t.includes(c.name.split(' ')[0].toLowerCase()) || t.includes(c.name.toLowerCase())
  )
  if (named) {
    if (/\boffer\b/.test(t) && named.id === 'sofia') {
      cards.push(toClientCard(named))
      return { cards, reply: MUELLER_REPLY }
    }
    if (/\bdraft\b/.test(t)) {
      const first = named.name.split(' ')[0]
      return {
        cards,
        reply:
          `Here is a short one you can send as is: "Hi ${first} — quick check in. ` +
          `I have been watching ${named.looking.split(',')[0].toLowerCase()} in your range and a couple look worth a look this week. ` +
          `Want me to line up a tour?" Adjust the tone and it is ready to go.`,
      }
    }
    cards.push(toClientCard(named))
    const insight =
      named.id === 'maya'
        ? 'She has been back on 42 Birchwood Ln twice today, which is her heaviest activity in weeks. Worth offering a Saturday tour before someone else moves.'
        : named.id === 'devon'
          ? 'He signed up two days ago and has no pre-approval yet, so a lender intro is the highest-value next step.'
          : named.id === 'nair'
            ? 'Their pre-approval lapsed and they are still about six months out, so a renewal nudge now keeps the timeline honest.'
            : named.id === 'grace'
              ? 'She is cleared to close on Aug 14 and inspection passed Friday, so this one mostly needs scheduling coordination.'
              : 'The offer is the live thread here — everything else can wait a day.'
    return { cards, reply: insight }
  }

  if (/\bmueller\b/.test(t)) return { cards, reply: MUELLER_REPLY }

  return {
    cards,
    reply:
      'I can pull up any of your five active buyers, set up a tour, or give you context on the four listings you are working. ' +
      'Try asking about Maya, Sofia, Devon, the Nairs, or Grace.',
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
            description: 'Display a rich profile card for one of Georgia’s clients in the chat.',
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
              if (c) scheduled = { client: c, address: l ? l.address : address, when }
              return 'Tour requested. Card displayed to Georgia and the client record was updated.'
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
