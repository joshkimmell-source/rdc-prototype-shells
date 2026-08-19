/**
 * Root of the RealAssist+ content-orchestration shell.
 *
 * Holds every piece of state the DC original kept on `Component.state` and derives the
 * layout values its `renderVals()` computed. Layout is
 * [nav rail][subnav][main][absolutely-positioned push panel], all inside a 100vh column.
 *
 * Below 768px the rail is replaced by `NavBar`, a tab bar pinned under the content row, and
 * the subnav and push panel leave the flow to become overlays over `main` — so `main` keeps
 * the full viewport width either way.
 *
 * `?ab=` selects where the "Ask RealAssist+" trigger lives: the floating FAB (`a`, default)
 * or an `ActionBar` action inline in every page header (`b`). See `abParam.ts`.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { C, EASE } from './theme'
import { isMobileViewport, useIsMobile, useIsMedium } from './useMobile'
import { readLeadParam, readNavParam, writeLeadParam, writeNavParam } from './navParam'
import { readAbParam } from './abParam'
import { mirrorState, readParticipant } from './track'
import { IconBookmark, IconCalendar, IconExport } from './icons'
import { NavRail, RAIL_WIDTH, type NavId } from './components/NavRail'
import { NAV_BAR_HEIGHT, NavBar } from './components/NavBar'
import { Subnav } from './components/Subnav'
import { MainHeader, type ToggleId, type Toggles } from './components/MainHeader'
import { type ActionItem } from './components/ActionBar'
import { SearchHeaderLead } from './components/SearchHeaderLead'
import { FAB } from './components/FAB'
import { Button } from '@rdc-npm/rdc-ui-v4'
import { PrototypeNotice } from './components/PrototypeNotice'
import { RdcUiScanner } from '@rdc-npm/rdc-ui-scanner'
import { HomeScreen, type NeedItem, type StageItem } from './screens/HomeScreen'
import { SearchScreen } from './screens/SearchScreen'
import { ToursScreen } from './screens/ToursScreen'
import { ClientsScreen, type ClientsView } from './screens/ClientsScreen'
import { LeadsScreen } from './screens/LeadsScreen'
import { LeadDetailScreen } from './screens/LeadDetailScreen'
import { InviteModal } from './components/InviteModal'
import { AssistantPanel, type Msg } from './panels/AssistantPanel'
import {
  runAddClient,
  runAssistant,
  runCatchUp,
  runClientPulse,
  runSearchOpt,
  triggersAddClient,
  triggersCatchUp,
  triggersClientPulse,
  triggersSearchOpt,
  type AddClientFlow,
  type Card,
  type CatchUpFlow,
  type ClientPulseFlow,
  type SearchOptFlow,
} from './assistant'
import {
  AGENT_FEED_ID,
  BUYERS,
  CLIENTS,
  DEFAULT_BUYER_ID,
  DEFAULT_TOUR_ID,
  INITIAL_UPCOMING_TOURS,
  LEADS,
  STAGES,
  THREADS,
  TOURS,
  TOUR_MAP_DATA,
  rescheduleTourViews,
  WITHHELD_TOUR_IDS,
  activeClientCount,
  clientFromLead,
  clientNeeds,
  feedFor,
  type Buyer,
  type Client,
  type UpcomingTour,
} from './data'

/**
 * The DC file exposed these as authoring props (`subnavWidth`, `pushWidth`) with an editor
 * UI. There's no equivalent surface in a Vite app, so the defaults from its `data-props`
 * block are constants here. (`railMode` is gone: the rail is static and no longer expands.)
 */
const SUBNAV_WIDTH = 320
const PUSH_WIDTH = 420

/**
 * Drag bounds for the push panel (push mode is large-screen only — mobile renders the
 * panel full-width and non-resizable). The minimum matches the default width, so the
 * docked panel never drags below its 420px resting size; the maximum is 30% of the
 * viewport but never below `PUSH_MIN`, so the min always wins on narrower desktops.
 */
const PUSH_MIN = 420
const PUSH_MAX_FRACTION = 0.3
const PUSH_WIDTH_KEY = 'ra-push-width'
// Leads invited to become clients this session. Persisted to sessionStorage (not localStorage)
// so the promotion survives a reload but is gone in a fresh session — a prototype mutation, not
// real data. The set of lead ids is the source of truth; the "Invited" client records are
// rebuilt from it deterministically via `clientFromLead`.
const INVITED_LEADS_KEY = 'ra-invited-leads'

/**
 * Width of the mobile subnav drawer. It stops short of the viewport so a strip of scrim
 * stays tappable at 320px — the drawer is dismissible even when its own close control is
 * not the obvious target.
 */
const SUBNAV_DRAWER_MAX = 288

/**
 * Whether an assistant turn ends on the design's brand-coloured "Completed" ✓ marker — the
 * signal a task step finished. Mirrors the render conditions in AssistantPanel exactly: the
 * three report cards and the upcoming-tour deep-dive always carry it, and an add-client message
 * carries it when its own `completed` flag is set. The caller attributes it to whichever task
 * produced the turn, so `?done` names the AI task, not the card. Keep in sync with
 * `CompletedMarker` usage in AssistantPanel.tsx.
 */
function turnShowsCompleted(cards: Card[]): boolean {
  return cards.some(
    (c) =>
      c.kind === 'catchUpBriefing' ||
      c.kind === 'searchAnalysis' ||
      c.kind === 'clientPulseReport' ||
      c.kind === 'upcomingTour' ||
      (c.kind === 'addClientMessage' && c.completed === true),
  )
}

/** The widest the panel may be at this viewport — 30% of it, never below `PUSH_MIN`. */
function pushCeiling() {
  return Math.max(PUSH_MIN, Math.round(window.innerWidth * PUSH_MAX_FRACTION))
}

function clampPush(w: number) {
  return Math.min(pushCeiling(), Math.max(PUSH_MIN, Math.round(w)))
}

/** The dragged panel width survives a reload; nothing else in the shell is persisted. */
function readStoredPushWidth() {
  try {
    const raw = window.localStorage.getItem(PUSH_WIDTH_KEY)
    const parsed = raw == null ? PUSH_WIDTH : Number(raw)
    return clampPush(Number.isFinite(parsed) ? parsed : PUSH_WIDTH)
  } catch {
    return clampPush(PUSH_WIDTH)
  }
}

/** Lead ids invited this session, read back from sessionStorage and filtered to real leads. */
function readInvitedLeadIds(): string[] {
  try {
    const raw = window.sessionStorage.getItem(INVITED_LEADS_KEY)
    const ids: unknown = raw ? JSON.parse(raw) : []
    if (!Array.isArray(ids)) return []
    const valid = new Set(LEADS.map((l) => l.id))
    return ids.filter((id): id is string => typeof id === 'string' && valid.has(id))
  } catch {
    return []
  }
}

function writeInvitedLeadIds(ids: Iterable<string>) {
  try {
    window.sessionStorage.setItem(INVITED_LEADS_KEY, JSON.stringify([...ids]))
  } catch {
    // Private-mode / quota failures are non-fatal: the in-memory state still holds for the tab.
  }
}

export function Shell() {
  const isMobile = useIsMobile()
  // The medium band sits between mobile and the wide desktop layout. In it the docked
  // subnav and assistant panel are mutually exclusive, so the content column between them
  // is never squished (see `MEDIUM_QUERY`).
  const isMedium = useIsMedium()
  // Fixed for the life of the session: switching arms mid-test would defeat the point, and
  // a reload with a different `?ab=` gives a clean one.
  const [variant] = useState(readAbParam)
  const actionBar = variant === 'b'
  // Attribution tag from `?u=`, fixed for the session. Surfaced on the shell root (below) and
  // left in the URL so a shared link or observed session carries who the participant is.
  const [participant] = useState(readParticipant)

  // Seeded from `?view=` so a linked or reloaded URL lands on the screen it names.
  const [activeNav, setActiveNav] = useState<NavId>(readNavParam)
  // The open lead on the Leads page, mirrored as `?lead=`. Only meaningful under the leads
  // view; a lead id in the URL under any other view is ignored (and cleared on navigation).
  const [selectedLead, setSelectedLead] = useState<string | null>(() =>
    readNavParam() === 'leads' ? readLeadParam() : null
  )
  // Leads the agent has invited into RDC+ this session. A promoted lead becomes a connected
  // client, so it drops out of the active pipeline — same rule the "Connected" status already
  // uses. Session-only, matching the shell's other prototype mutations (e.g. created tours).
  const [promotedLeadIds, setPromotedLeadIds] = useState<Set<string>>(
    () => new Set(readInvitedLeadIds())
  )
  // The lead whose invite composer is open, if any.
  const [inviteLeadId, setInviteLeadId] = useState<string | null>(null)
  // Open beside the content on desktop, closed on a phone: as a full-height overlay it
  // would otherwise bury `main` before the first interaction.
  const [subnavOpen, setSubnavOpen] = useState(() => !isMobileViewport())

  // Subnav — clients
  const [clientQ, setClientQ] = useState('')
  const [selectedBuyer, setSelectedBuyer] = useState(DEFAULT_BUYER_ID)
  const [clientTab, setClientTab] = useState<'active' | 'invited' | 'requests'>('active')

  // Subnav — tours
  const [tourQ, setTourQ] = useState('')
  const [toursTab, setToursTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  // The subnav shows only "created" tours: everything but the assistant-coordinated ones,
  // which the flow reveals on booking. Past tours are always in. The default selection is
  // the first visible upcoming tour, since the coordinated tour it would otherwise open on
  // isn't there yet.
  const [createdTourIds, setCreatedTourIds] = useState<Set<string>>(
    () => new Set(TOURS.filter((t) => !WITHHELD_TOUR_IDS.includes(t.id)).map((t) => t.id))
  )
  const [selectedTour, setSelectedTour] = useState(
    () => TOURS.find((t) => t.upcoming && !WITHHELD_TOUR_IDS.includes(t.id))?.id ?? DEFAULT_TOUR_ID
  )
  // Date/time overrides for tours the assistant flow booked, keyed by tour id. The subnav row
  // and framed map read from the dataset by id, so without this they'd keep showing the tour's
  // dataset-default date/time even after the user picked another in the flow.
  const [reschedules, setReschedules] = useState<Record<string, { date: string; startTime: string }>>({})

  // Clients screen
  const [clientFilter, setClientFilter] = useState('active')
  // Grid, not map: the Clients screen renders a grid of listing cards, and the
  // segmented control has to agree with what is actually below it.
  const [viewMode, setViewMode] = useState<ClientsView>('grid')

  // Home screen
  const [clients, setClients] = useState<Client[]>(() => {
    // Rebuild any "Invited" clients created from leads earlier this session (newest first, to
    // match sendInvite's prepend), then the dataset's own clients.
    const invited = readInvitedLeadIds()
      .flatMap((id) => {
        const lead = LEADS.find((l) => l.id === id)
        return lead ? [clientFromLead(lead)] : []
      })
      .reverse()
    return [...invited, ...CLIENTS]
  })
  const [filter, setFilter] = useState('all')
  const [upcomingTours, setUpcomingTours] = useState<UpcomingTour[]>(INITIAL_UPCOMING_TOURS)

  // Header toggles
  const [toggles, setToggles] = useState<Toggles>({ bell: false, flame: true, chart: false, star: false })

  // Push panel — the RealAssist+ assistant. Closed by default everywhere; the agent opens it
  // deliberately (the FAB, an Ask action, or a deep link), rather than it occupying the
  // content on arrival.
  const [pushContent, setPushContent] = useState(false)
  const [pushExpanded, setPushExpanded] = useState(false)
  const [pushOver, setPushOver] = useState(false)
  const [fabHover, setFabHover] = useState(false)
  const [pushW, setPushW] = useState(readStoredPushWidth)
  const [pushMax, setPushMax] = useState(pushCeiling)
  const [resizing, setResizing] = useState(false)

  // Chat
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [threadQ, setThreadQ] = useState('')
  // The add-client onboarding flow carries state across turns (collected members, parsed
  // criteria, location) since the responder is otherwise stateless. Null when not onboarding.
  const [addFlow, setAddFlow] = useState<AddClientFlow | null>(null)
  // The Catch Up briefing flow: null except while its action picker is live and awaiting the
  // agent's choice (send a drafted message, skip, or a free-text instruction).
  const [catchUpFlow, setCatchUpFlow] = useState<CatchUpFlow | null>(null)
  const [searchOptFlow, setSearchOptFlow] = useState<SearchOptFlow | null>(null)
  // The Client Pulse deep-dive flow: null except while it's selecting a client or its action
  // picker is live (draft a message, view notes, update the search, analyze another, or done).
  const [clientPulseFlow, setClientPulseFlow] = useState<ClientPulseFlow | null>(null)
  // The active conversation's thread title — set by the add-client flow ("Add Client" →
  // "Onboarding {Full Name} as New Client") and the Catch Up flow ("Catch Up"). Null when
  // there's no titled conversation.
  const [threadTitle, setThreadTitle] = useState<string | null>(null)
  // The most recent AI task to reach a "Completed" step in this conversation, mirrored to
  // `?done` for attribution. Present state, not a log — one slot, reset on New chat.
  const [completedTask, setCompletedTask] = useState<string | null>(null)
  // True from a New-chat click until the next message is sent — mirrored to `?chat=new` so a
  // shared link shows the participant is sitting in a freshly-started conversation.
  const [newConversation, setNewConversation] = useState(false)

  const chatRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(-1)
  const wasMobile = useRef(isMobileViewport())

  // Collapse everything that overlays `main` on the way into the mobile layout: a panel
  // that was docked beside the content at desktop width now covers all of it.
  useEffect(() => {
    if (isMobile === wasMobile.current) return
    wasMobile.current = isMobile
    if (isMobile) {
      setSubnavOpen(false)
      setPushContent(false)
      setPushExpanded(false)
      setPushOver(false)
    }
  }, [isMobile])

  // Shrinking into the medium band with both side panels docked would squish the content
  // column between them. The deliberate opens already retract the other panel, so this only
  // catches the resize case — keep the assistant panel and retract the subnav.
  useEffect(() => {
    if (isMedium && subnavOpen && pushContent) setSubnavOpen(false)
  }, [isMedium, subnavOpen, pushContent])

  // Keep the panel inside a shrinking viewport. Only ever narrows it: a window that
  // grows again must not override a width the user chose deliberately.
  useEffect(() => {
    const onResize = () => {
      const ceiling = pushCeiling()
      setPushMax(ceiling)
      setPushW((w) => Math.min(w, ceiling))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(PUSH_WIDTH_KEY, String(pushW))
    } catch {
      // Private-mode or quota failure — the width just doesn't survive a reload.
    }
  }, [pushW])

  // Stable identities: ResizeHandle takes `onInteract` as an effect dependency.
  const onPushWidth = useCallback((w: number) => setPushW(clampPush(w)), [])
  const onResizeInteract = useCallback((active: boolean) => setResizing(active), [])

  // Pin the transcript to the bottom whenever a message (or the busy bubble) is added.
  useEffect(() => {
    const el = chatRef.current
    if (!el) return
    const n = msgs.length + (busy ? 1 : 0)
    if (n !== lastCount.current) {
      lastCount.current = n
      el.scrollTop = el.scrollHeight
    }
  }, [msgs, busy])

  const send = async (text: string) => {
    const t = String(text || '').trim()
    if (!t || busy) return

    setMsgs((prev) => [...prev, { role: 'user', text: t }])
    setInput('')
    setBusy(true)
    setPushContent(true)
    // The conversation is no longer freshly-started once a message goes in.
    setNewConversation(false)
    // Sending from the composer reveals the panel; in the medium band retract the subnav so
    // the two never dock side by side over a squished content column.
    if (isMedium) setSubnavOpen(false)

    // The add-client flow takes precedence while it's underway, or when a message triggers a
    // fresh onboarding ("Add a new client" / "Add another client"). Everything else — the tour
    // flow, client cards, market context — falls to the general responder.
    if (addFlow || triggersAddClient(t)) {
      const { result, flow } = await runAddClient(addFlow, t)
      setMsgs((prev) => [
        ...prev,
        ...(result.preReply ? [{ role: 'ai', text: result.preReply } as Msg] : []),
        ...result.cards.map((card): Msg => ({ role: 'ai', text: '', card })),
        ...(result.reply ? [{ role: 'ai', text: result.reply } as Msg] : []),
      ])
      setBusy(false)
      setAddFlow(flow)
      if (turnShowsCompleted(result.cards)) setCompletedTask('add-client')
      if (result.threadTitle !== undefined) setThreadTitle(result.threadTitle)
      return
    }

    // The Catch Up briefing flow — agent-initiated ("Catch me up"); while its action picker
    // is live, follow-up selections ("Send tour confirmation to …", "Skip") route back here.
    if (catchUpFlow || triggersCatchUp(t)) {
      const { result, flow } = await runCatchUp(catchUpFlow, t, clients)
      setMsgs((prev) => [
        ...prev,
        ...(result.preReply ? [{ role: 'ai', text: result.preReply } as Msg] : []),
        ...result.cards.map((card): Msg => ({ role: 'ai', text: '', card })),
        ...(result.reply ? [{ role: 'ai', text: result.reply } as Msg] : []),
      ])
      setBusy(false)
      setCatchUpFlow(flow)
      if (turnShowsCompleted(result.cards)) setCompletedTask('catch-up')
      if (result.threadTitle !== undefined) setThreadTitle(result.threadTitle)
      return
    }

    // The Search Optimization flow — agent-initiated ("Optimize a client search"); while its
    // client picker or final action picker is live, the follow-up selections route back here.
    if (searchOptFlow || triggersSearchOpt(t)) {
      const { result, flow } = await runSearchOpt(searchOptFlow, t, clients)
      setMsgs((prev) => [
        ...prev,
        ...(result.preReply ? [{ role: 'ai', text: result.preReply } as Msg] : []),
        ...result.cards.map((card): Msg => ({ role: 'ai', text: '', card })),
        ...(result.reply ? [{ role: 'ai', text: result.reply } as Msg] : []),
      ])
      setBusy(false)
      setSearchOptFlow(flow)
      if (turnShowsCompleted(result.cards)) setCompletedTask('search-opt')
      if (result.threadTitle !== undefined) setThreadTitle(result.threadTitle)
      return
    }

    // The Client Pulse flow — agent-initiated ("Show me a client pulse"); while its client
    // picker or final action picker is live, the follow-up selections route back here.
    if (clientPulseFlow || triggersClientPulse(t)) {
      const { result, flow } = await runClientPulse(clientPulseFlow, t, clients)
      setMsgs((prev) => [
        ...prev,
        ...(result.preReply ? [{ role: 'ai', text: result.preReply } as Msg] : []),
        ...result.cards.map((card): Msg => ({ role: 'ai', text: '', card })),
        ...(result.reply ? [{ role: 'ai', text: result.reply } as Msg] : []),
      ])
      setBusy(false)
      setClientPulseFlow(flow)
      // Pulse reuses the add-client message card for its opening prompt (also `completed`), so
      // key completion on the report card itself rather than the generic marker predicate.
      if (result.cards.some((c) => c.kind === 'clientPulseReport')) setCompletedTask('client-pulse')
      if (result.threadTitle !== undefined) setThreadTitle(result.threadTitle)
      return
    }

    const result = await runAssistant(t, clients)

    setMsgs((prev) => [
      ...prev,
      // The flow's acknowledgement ("Got it — 10:00 AM…") leads, before the cards it introduces.
      ...(result.preReply ? [{ role: 'ai', text: result.preReply } as Msg] : []),
      ...result.cards.map((card): Msg => ({ role: 'ai', text: '', card })),
      // A question card carries its prompt in its own heading, so the reply can be empty —
      // don't push an empty bubble in that case.
      ...(result.reply ? [{ role: 'ai', text: result.reply } as Msg] : []),
    ])
    setBusy(false)

    // The tour flow: a booked tour or an upcoming-tour deep-dive both close on a "Completed" step.
    if (result.scheduled || turnShowsCompleted(result.cards)) setCompletedTask('tour')

    if (result.scheduled) {
      const { client, address, when, type, tourId, at, date, startTime } = result.scheduled
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, nextTour: when } : c)))
      // Replace any existing row for this client so re-running the flow re-creates rather than
      // duplicates, then sort by date — appending would put a nearer tour below a later one.
      setUpcomingTours((prev) =>
        [...prev.filter((tt) => tt.client !== client.name), { when, address, client: client.name, type, at }].sort(
          (a, b) => a.at - b.at
        )
      )
      // Reveal the booked tour in the Tours subnav (and the map) and select it, so a jump to
      // the Tours tab lands on the tour that was just created.
      if (tourId) {
        setCreatedTourIds((prev) => (prev.has(tourId) ? prev : new Set(prev).add(tourId)))
        setSelectedTour(tourId)
        // Carry the picked date/time onto the subnav row and framed map for this tour.
        if (date && startTime) {
          setReschedules((prev) => ({ ...prev, [tourId]: { date, startTime } }))
        }
      }
    }
  }

  // ── Derived layout ────────────────────────────────────────────────────────────
  const isClients = activeNav === 'clients'
  const isSearch = activeNav === 'search'
  const isTours = activeNav === 'tours'
  const isLeads = activeNav === 'leads'
  const isHome = !isClients && !isSearch && !isTours && !isLeads

  const filtered = filter === 'all' ? clients : clients.filter((c) => c.stage === filter)
  // Home roster leads with Active clients — sort is stable, so order within a stage is preserved
  // and the single-stage filtered views are unaffected.
  const clientRows = [...filtered].sort(
    (a, b) => Number(b.stage === 'Active') - Number(a.stage === 'Active'),
  )
  // Reactive so an invite sent this session bumps the Home "Invites pending" stat.
  const invitedClientCount = clients.filter((c) => c.stage === 'Invited').length
  // Open leads worked past first contact — the "ready to work with" pool. Drops as invites
  // promote leads out of the list this session.
  const qualifiedLeadCount = LEADS.filter((l) => !promotedLeadIds.has(l.id) && l.readyToPromote).length

  const stageItems: StageItem[] = STAGES.map(([id, label]) => ({
    id,
    label,
    count: id === 'all' ? clients.length : clients.filter((c) => c.stage === id).length,
    active: filter === id,
    onClick: () => setFilter(id),
  }))

  // Derived from the dataset — open tour requests lead, dormant invites follow.
  const needs: NeedItem[] = clientNeeds.map((n) => ({
    client: n.client,
    text: n.text,
    dot: n.tone === 'brand' ? C.brand : C.amber,
    ask: () => send(n.prompt),
  }))

  // The open lead's full record, or null when showing the list. A `?lead=` that names no
  // real lead (an edited or stale URL) falls back to the list rather than a blank page.
  const selectedLeadRecord = selectedLead ? LEADS.find((l) => l.id === selectedLead) ?? null : null
  const inviteLeadRecord = inviteLeadId ? LEADS.find((l) => l.id === inviteLeadId) ?? null : null

  // Leads invited this session surface in the subnav as "Invited" clients too, derived from the
  // reactive clients state (which rehydrates from sessionStorage) so they appear as soon as the
  // invite is sent and persist across a reload. Prepended so the newest invite reads first.
  const sessionInvitedBuyers: Buyer[] = clients
    .filter((c) => c.stage === 'Invited' && !BUYERS.some((b) => b.id === c.id))
    .map((c) => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      sub: 'Invitation sent',
      status: 'Invited',
    }))
  const allBuyers: Buyer[] = [...sessionInvitedBuyers, ...BUYERS]

  const selectedBuyerRecord = allBuyers.find((b) => b.id === selectedBuyer) ?? BUYERS[1]
  // Each client is shown a different number of listings, so the Clients screen follows
  // the selected subnav row rather than rendering one feed for everybody.
  const clientFeed = feedFor(selectedBuyerRecord.id)

  // The framed map for the selected tour, re-dated to the flow's booking if it has one. Derived
  // here (ahead of the title) because the Tours header names whichever tour the map is drawing.
  const selectedReschedule = reschedules[selectedTour]
  const selectedMapTour = selectedReschedule
    ? rescheduleTourViews(selectedTour, selectedReschedule.date, selectedReschedule.startTime).mapTour ??
      TOUR_MAP_DATA[selectedTour]
    : TOUR_MAP_DATA[selectedTour]

  const pageTitle = isClients
    ? selectedBuyerRecord.id === AGENT_FEED_ID
      ? 'My feed'
      : selectedBuyerRecord.name
    : isTours
      ? selectedMapTour?.client ?? 'Tour'
      : isSearch
        ? 'Search'
        : isLeads
          ? 'Leads'
          : ''

  const countLabel = isClients
    ? `${clientFeed.listingCount} ${clientFeed.listingCount === 1 ? 'listing' : 'listings'}`
    : isTours
      ? selectedMapTour?.date ?? ''
      : // Home, Search and Leads carry no count in the header — Home is the dashboard, not the
        // client table, so the "N clients" label doesn't belong on it.
        ''

  const tourQuery = tourQ.trim().toLowerCase()
  // Only tours that have been created show in the subnav — the assistant-coordinated one
  // stays hidden until the flow books it (see `createdTourIds`).
  const visibleTours = TOURS.filter((t) => createdTourIds.has(t.id))
  const tourList = visibleTours
    .filter(
      (t) =>
        (toursTab === 'all' || (toursTab === 'upcoming' ? t.upcoming : !t.upcoming)) &&
        t.name.toLowerCase().includes(tourQuery)
    )
    // Re-label the row on the date/time the flow booked it for, if any.
    .map((t) => {
      const r = reschedules[t.id]
      const meta = r ? rescheduleTourViews(t.id, r.date, r.startTime).meta : undefined
      return meta ? { ...t, meta } : t
    })
  const upcomingTourCount = visibleTours.filter((t) => t.upcoming).length
  const pastTourCount = visibleTours.filter((t) => !t.upcoming).length

  const threadQuery = threadQ.trim().toLowerCase()
  const baseThreads = THREADS.filter((t) => t.title.toLowerCase().includes(threadQuery))
  // The active conversation leads the list once it's titled (the add-client flow sets this),
  // so its running title — "Add Client" → "Onboarding {Full Name} as New Client" — is visible.
  const threadItems =
    threadTitle && threadTitle.toLowerCase().includes(threadQuery)
      ? [{ title: threadTitle, when: 'Just now' }, ...baseThreads]
      : baseThreads

  const subnavVariant = isClients ? 'clients' : isTours ? 'tours' : null

  // Per-screen header controls. Clients uses its toggles (built inside MainHeader); Tours and
  // Search hand their own action pills and overflow-menu rows in — the same set the map pages
  // used to draw inside the iframe. These are prototype no-ops, matching the standalone pages.
  const headerActions: ActionItem[] | undefined = isTours
    ? [
        { id: 'export', label: 'Export', icon: <IconExport size={14} />, tone: 'light', onClick: () => {} },
        {
          id: 'add-to-calendar',
          label: 'Add to calendar',
          icon: <IconCalendar size={14} />,
          tone: 'dark',
          onClick: () => {},
        },
      ]
    : isSearch
      ? [{ id: 'save-search', label: 'Save search', icon: <IconBookmark size={14} />, tone: 'dark', onClick: () => {} }]
      : undefined

  const headerMenuItems = isTours
    ? ['Share with client', 'Print tour sheet', 'Duplicate tour', 'Cancel tour']
    : isSearch
      ? ['Save this search', 'Email results to client', 'Export results', 'Search settings']
      : undefined

  // Tours and Search always use the ActionBar (their labelled pills need it); Clients and Home
  // only do so in the inline-Ask arm. The inline Ask itself shows only in that arm.
  const headerUsesActionBar = actionBar || isTours || isSearch
  // On mobile the panel is a full-screen overlay, so the width bookkeeping collapses to
  // all-or-nothing and there is no gap beside it for `main` to give up.
  const pushWidth = !pushContent
    ? '0px'
    : isMobile
      ? '100%'
      : pushExpanded
        ? `calc(100% - ${RAIL_WIDTH}px)`
        : `${pushW}px`
  const mainMarginRight = !isMobile && pushContent && !pushExpanded ? pushW : 0
  // Only draggable while docked open — expanded width is the expand control's, a closed
  // panel has no edge to grab, and a full-screen overlay has no width to set.
  const pushResizable = !isMobile && pushContent && !pushExpanded
  const drawerOpen = isMobile && subnavOpen && !!subnavVariant
  // The FAB sits above the drawer, so it has to step aside while one is open. Variant B
  // moves the trigger into the header, so the corner is empty in that arm.
  const fabVisible = !actionBar && !pushContent && !drawerOpen
  const tipShown = fabVisible && fabHover && !isMobile

  const closeDrawers = () => setSubnavOpen(false)

  const closePush = () => {
    setPushContent(false)
    setPushExpanded(false)
    setPushOver(false)
  }

  /**
   * Variant B's action opens the panel rather than toggling it. A header button that
   * closed the panel would be a second control for something the panel's own ✕ already
   * does, and the two would disagree about state at a glance.
   */
  const openPush = () => {
    setPushContent(true)
    setPushExpanded(false)
    setPushOver(false)
    // In the medium band the two side panels can't share the row without squishing the
    // content between them, so opening one retracts the other.
    if (isMedium) setSubnavOpen(false)
  }

  const openSubnav = () => {
    setSubnavOpen(true)
    if (isMedium) closePush()
  }

  const navigate = (id: NavId) => {
    setActiveNav(id)
    writeNavParam(id)
    // The open-lead parameter only makes sense under the Leads view; drop it on the way out
    // so returning to Leads later lands on the list, not a stale detail.
    if (id !== 'leads' && selectedLead) {
      setSelectedLead(null)
      writeLeadParam(null)
    }
    setPushExpanded(false)
  }

  // Open a lead's detail page, and close it back to the list.
  const openLead = (id: string) => {
    setSelectedLead(id)
    writeLeadParam(id)
  }
  const closeLead = () => {
    setSelectedLead(null)
    writeLeadParam(null)
  }

  // Open/close the invite-to-RDC+ composer for a lead.
  const openInvite = (id: string) => setInviteLeadId(id)
  const closeInvite = () => setInviteLeadId(null)
  // Sending the invite promotes the lead to a connected client. It's recorded here; the modal
  // shows its own confirmation and closes on "Done", which also backs out of a detail page for
  // that lead so the agent doesn't land on a record that's left the pipeline.
  const sendInvite = (id: string) => {
    setPromotedLeadIds((prev) => {
      if (prev.has(id)) return prev
      const next = new Set(prev).add(id)
      writeInvitedLeadIds(next) // persist to sessionStorage so the invite survives a reload
      return next
    })
    // Promote the lead into the clients list as an "Invited" client — same relationship, new
    // state. Guarded so re-sending can't double-add. Prepended so it reads as the newest client.
    const lead = LEADS.find((l) => l.id === id)
    if (lead) {
      setClients((prev) => (prev.some((c) => c.id === id) ? prev : [clientFromLead(lead), ...prev]))
    }
    if (selectedLead === id) closeLead()
  }

  // Back and forward walk the destinations, since every navigation pushed an entry.
  useEffect(() => {
    const onPop = () => {
      const view = readNavParam()
      setActiveNav(view)
      setSelectedLead(view === 'leads' ? readLeadParam() : null)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // ── URL state mirroring (attribution only, no collection — see track.ts) ─────────
  // The assistant panel: `?panel=open` while it's showing, cleared when closed.
  useEffect(() => {
    mirrorState('panel', pushContent && 'open')
  }, [pushContent])

  // Whether the Clients/Tours subnav is showing, but only on the screens that have one.
  useEffect(() => {
    const onSubnavScreen = activeNav === 'clients' || activeNav === 'tours'
    mirrorState('subnav', onSubnavScreen ? (subnavOpen ? 'open' : 'closed') : null)
  }, [activeNav, subnavOpen])

  // The active RealAssist+ assistant flow, if any — the persistent "which prompt am I in"
  // state. One-off prompts aren't mirrored: they're events, not current state.
  useEffect(() => {
    const flow = addFlow
      ? 'add-client'
      : catchUpFlow
        ? 'catch-up'
        : searchOptFlow
          ? 'search-opt'
          : clientPulseFlow
            ? 'client-pulse'
            : null
    mirrorState('flow', flow)
  }, [addFlow, catchUpFlow, searchOptFlow, clientPulseFlow])

  // The last AI task that reached a "Completed" step this conversation — `?done=<task>`.
  useEffect(() => {
    mirrorState('done', completedTask)
  }, [completedTask])

  // The panel expanded to near-full-width — `?expanded=1`, only while the panel is open.
  useEffect(() => {
    mirrorState('expanded', pushContent && pushExpanded)
  }, [pushContent, pushExpanded])

  // The panel's own threads/conversation subnav — `?threads=open` while it's showing (docked or
  // overlaid), only meaningful when the panel itself is open.
  useEffect(() => {
    mirrorState('threads', pushContent && pushOver ? 'open' : null)
  }, [pushContent, pushOver])

  // Sitting in a freshly-started conversation from the New-chat button — `?chat=new`.
  useEffect(() => {
    mirrorState('chat', newConversation ? 'new' : null)
  }, [newConversation])

  // Escape backs out one overlay at a time, topmost first.
  useEffect(() => {
    if (!isMobile) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (subnavOpen && subnavVariant) setSubnavOpen(false)
      else if (pushContent) closePush()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobile, subnavOpen, subnavVariant, pushContent])

  return (
    <div
      data-screen-label="RealAssist+ agent workspace"
      data-participant={participant ?? undefined}
      className="ra-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: C.canvas,
        overflow: 'hidden',
      }}
    >
      {/* Sample-data disclaimer, shown on load and dismissed with its "Okay" button. */}
      <PrototypeNotice />

      {/*
        In-page RDC UI inspector — highlights v4/v3 components, assets, and non-DS text.
        `render="dev"` keeps it out of production bundles; default-off and localStorage-backed,
        so it stays invisible until toggled. Anchored bottom-left to clear the bottom-right FAB,
        then nudged 48px right in shell.css (see `[data-rdc-ui-scanner-ui]`).
      */}
      <RdcUiScanner render="dev" position="bottom-left" />

      {/* Invite-to-RDC+ composer, opened from a ready lead on the list or its detail page. */}
      {inviteLeadRecord && (
        <InviteModal lead={inviteLeadRecord} onClose={closeInvite} onSend={sendInvite} />
      )}

      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {!isMobile && <NavRail activeNav={activeNav} onNavigate={navigate} />}

        <Subnav
          open={subnavOpen}
          width={SUBNAV_WIDTH}
          drawerMax={isMobile ? SUBNAV_DRAWER_MAX : undefined}
          variant={subnavVariant}
          onClose={() => setSubnavOpen(false)}
          buyers={allBuyers}
          clientQ={clientQ}
          onClientQ={setClientQ}
          selectedBuyer={selectedBuyer}
          onSelectBuyer={setSelectedBuyer}
          clientTab={clientTab}
          onClientTab={setClientTab}
          tours={tourList}
          tourQ={tourQ}
          onTourQ={setTourQ}
          selectedTour={selectedTour}
          onSelectTour={setSelectedTour}
          toursTab={toursTab}
          onToursTab={setToursTab}
          upcomingCount={upcomingTourCount}
          pastCount={pastTourCount}
        />

        {/*
          Scrim behind the subnav drawer. Tapping it backs out, so the drawer is always
          dismissible — at 320px its own close control can be the least obvious target.
        */}
        <div
          onClick={closeDrawers}
          aria-hidden
          style={{
            display: isMobile ? 'block' : 'none',
            position: 'absolute',
            inset: 0,
            zIndex: 40,
            background: 'rgba(26,24,22,0.42)',
            opacity: drawerOpen ? 1 : 0,
            pointerEvents: drawerOpen ? 'auto' : 'none',
            transition: `opacity 220ms ${EASE}`,
          }}
        />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            background: C.white,
            marginRight: mainMarginRight,
            // Must match the panel: easing this mid-drag lags `main` behind the edge.
            transition: resizing ? 'none' : `margin-right 220ms ${EASE}`,
          }}
        >
          <MainHeader
            visible
            mobile={isMobile}
            useActionBar={headerUsesActionBar}
            showAsk={actionBar}
            onAsk={openPush}
            askOpen={pushContent}
            showSubnavButton={!!subnavVariant && !subnavOpen}
            onOpenSubnav={openSubnav}
            lead={isSearch ? <SearchHeaderLead mobile={isMobile} /> : undefined}
            title={pageTitle}
            countLabel={countLabel}
            showToggles={isClients}
            toggles={toggles}
            onToggle={(id: ToggleId) => setToggles((p) => ({ ...p, [id]: !p[id] }))}
            actions={headerActions}
            menuItems={headerMenuItems}
          />

          {/* The FAB trigger is a real Haven v4 Button — `Ghost`/`size="inline"` strips the
              recipe's chrome so the inline style below reproduces the floating pill exactly. */}
          <Button
            styleType="Ghost"
            size="inline"
            underline="never"
            onClick={(e) => {
              e.stopPropagation()
              setPushContent((p) => !p)
              setPushExpanded(false)
              setPushOver(false)
            }}
            aria-label="Ask RealAssist+"
            tabIndex={fabVisible ? 1 : -1}
            onMouseEnter={() => setFabHover(true)}
            onMouseLeave={() => setFabHover(false)}
            onFocus={(e) => {
              setFabHover(true)
              e.currentTarget.style.outline = `2px solid ${C.dark}`
              e.currentTarget.style.outlineOffset = '2px'
            }}
            onBlur={(e) => {
              setFabHover(false)
              e.currentTarget.style.outline = 'none'
            }}
            style={{
              display: fabVisible ? 'flex' : 'none',
              position: 'fixed',
              right: isMobile ? 16 : 24,
              // Clears the tab bar on mobile — the FAB is fixed to the viewport, so it
              // would otherwise land on top of it.
              bottom: isMobile ? NAV_BAR_HEIGHT + 16 : 36,
              zIndex: 60,
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              padding: 0,
              borderRadius: 9999,
              cursor: 'pointer',
              transition: 'transform 120ms',
              outline: 'none',
              transform: fabHover ? 'scale(1.05)' : 'none',
            }}
          >
            <FAB className="ra-fab" />
          </Button>

          <div
            style={{
              position: 'fixed',
              right: 78,
              bottom: 44,
              zIndex: 60,
              background: C.dark,
              color: C.white,
              fontSize: 12,
              fontWeight: 700,
              padding: '7px 12px',
              borderRadius: 8,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(26,24,22,0.24)',
              pointerEvents: 'none',
              opacity: tipShown ? 1 : 0,
              transform: `translateX(${tipShown ? 0 : 6}px)`,
              transition: `opacity 160ms ease-out, transform 160ms ${EASE}`,
            }}
          >
            Ask RealAssist+
          </div>

          {isHome && (
            <HomeScreen
              mobile={isMobile}
              stats={[
                { value: activeClientCount, label: 'Active clients' },
                { value: upcomingTours.length, label: 'Upcoming tours' },
                { value: qualifiedLeadCount, label: 'Qualified leads' },
                { value: invitedClientCount, label: 'Invites pending' },
              ]}
              allClients={clients}
              leads={LEADS.filter((l) => !promotedLeadIds.has(l.id))}
              tours={upcomingTours}
              needs={needs}
              needsCount={needs.length}
              stageItems={stageItems}
              rows={clientRows}
              onOpenTours={() => navigate('tours')}
              onOpenLead={(id) => {
                navigate('leads')
                openLead(id)
              }}
              onViewAllLeads={() => navigate('leads')}
              onAsk={send}
            />
          )}

          {isLeads &&
            (selectedLeadRecord ? (
              <LeadDetailScreen
                mobile={isMobile}
                lead={selectedLeadRecord}
                onBack={closeLead}
                onInvite={openInvite}
              />
            ) : (
              <LeadsScreen
                mobile={isMobile}
                onOpenLead={openLead}
                promotedLeadIds={promotedLeadIds}
                onInvite={openInvite}
              />
            ))}

          {isSearch && <SearchScreen />}

          {isTours && (
            // The embedded map follows the Tours subnav: it draws whichever tour is selected.
            <ToursScreen selectedTour={selectedMapTour} />
          )}

          {isClients && (
            <ClientsScreen
              mobile={isMobile}
              feed={clientFeed}
              pill={clientFilter}
              onPill={setClientFilter}
              view={viewMode}
              onView={setViewMode}
            />
          )}
        </main>

        <AssistantPanel
          width={pushWidth}
          open={pushContent}
          mobile={isMobile}
          expanded={pushExpanded}
          over={pushOver}
          resizing={resizing}
          resize={
            pushResizable
              ? {
                  width: pushW,
                  min: PUSH_MIN,
                  max: pushMax,
                  defaultWidth: PUSH_WIDTH,
                  onWidth: onPushWidth,
                  onInteract: onResizeInteract,
                }
              : undefined
          }
          msgs={msgs}
          busy={busy}
          input={input}
          chatRef={chatRef}
          threads={threadItems}
          threadQuery={threadQ}
          onInput={setInput}
          onSend={send}
          onThreadQuery={setThreadQ}
          onToggleOver={() => setPushOver((p) => !p)}
          onCloseOver={() => setPushOver(false)}
          onToggleExpand={() => {
            // Expanding reveals the threads dock; collapsing hides it again.
            setPushExpanded(!pushExpanded)
            setPushOver(!pushExpanded)
          }}
          onClose={closePush}
          onNewChat={() => {
            setMsgs([])
            setPushOver(false)
            setAddFlow(null)
            setCatchUpFlow(null)
            setSearchOptFlow(null)
            setClientPulseFlow(null)
            setThreadTitle(null)
            setCompletedTask(null)
            setNewConversation(true)
          }}
        />
      </div>

      {/*
        Outside the content row, so it takes height from `main` rather than overlaying it:
        nothing above needs bottom padding to stay clear of the bar.
      */}
      {isMobile && <NavBar activeNav={activeNav} onNavigate={navigate} />}
    </div>
  )
}
