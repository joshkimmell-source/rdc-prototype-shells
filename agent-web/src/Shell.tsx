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
import { isMobileViewport, useIsMobile } from './useMobile'
import { readNavParam, writeNavParam } from './navParam'
import { readAbParam } from './abParam'
import { ASK_MESSAGE } from './askBridge'
import { HoverButton } from './components/primitives'
import { IconHamburger } from './icons'
import { NavRail, RAIL_WIDTH, type NavId } from './components/NavRail'
import { NAV_BAR_HEIGHT, NavBar } from './components/NavBar'
import { Subnav } from './components/Subnav'
import { MainHeader, type ToggleId, type Toggles } from './components/MainHeader'
import { FAB } from './components/FAB'
import { HomeScreen, type NeedItem, type StageItem } from './screens/HomeScreen'
import { SearchScreen } from './screens/SearchScreen'
import { ToursScreen } from './screens/ToursScreen'
import { ClientsScreen, type ClientsView } from './screens/ClientsScreen'
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
  STAGES,
  THREADS,
  TOURS,
  TOUR_MAP_DATA,
  WITHHELD_TOUR_IDS,
  activeClientCount,
  clientNeeds,
  feedFor,
  invitedClientCount,
  requestClientCount,
  tourRequestsTotal,
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

/**
 * Width of the mobile subnav drawer. It stops short of the viewport so a strip of scrim
 * stays tappable at 320px — the drawer is dismissible even when its own close control is
 * not the obvious target.
 */
const SUBNAV_DRAWER_MAX = 288

/** The widest the panel may be at this viewport — 30% of it, never below `PUSH_MIN`. */
function pushCeiling() {
  return Math.max(PUSH_MIN, Math.round(window.innerWidth * PUSH_MAX_FRACTION))
}

function clampPush(w: number) {
  return Math.min(pushCeiling(), Math.max(PUSH_MIN, Math.round(w)))
}

/** Drawer trigger that has to read against an arbitrary map tile underneath it. */
function FloatingIconButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <HoverButton
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 36,
        height: 36,
        flex: 'none',
        borderRadius: '50%',
        border: `1px solid ${C.border}`,
        background: C.white,
        color: C.dark,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: '0 1px 6px rgba(26,24,22,0.2)',
        transition: 'background 120ms',
      }}
      hoverStyle={{ background: C.alt }}
    >
      <IconHamburger size={18} />
    </HoverButton>
  )
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

export function Shell() {
  const isMobile = useIsMobile()
  // Fixed for the life of the session: switching arms mid-test would defeat the point, and
  // a reload with a different `?ab=` gives a clean one.
  const [variant] = useState(readAbParam)
  const actionBar = variant === 'b'

  // Seeded from `?view=` so a linked or reloaded URL lands on the screen it names.
  const [activeNav, setActiveNav] = useState<NavId>(readNavParam)
  // Open beside the content on desktop, closed on a phone: as a full-height overlay it
  // would otherwise bury `main` before the first interaction.
  const [subnavOpen, setSubnavOpen] = useState(() => !isMobileViewport())

  // Subnav — clients
  const [clientQ, setClientQ] = useState('')
  const [selectedBuyer, setSelectedBuyer] = useState(DEFAULT_BUYER_ID)
  const [clientTab, setClientTab] = useState<'active' | 'requests'>('active')

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

  // Clients screen
  const [clientFilter, setClientFilter] = useState('active')
  // Grid, not map: the Clients screen renders a grid of listing cards, and the
  // segmented control has to agree with what is actually below it.
  const [viewMode, setViewMode] = useState<ClientsView>('grid')

  // Home screen
  const [clients, setClients] = useState<Client[]>(CLIENTS)
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

    if (result.scheduled) {
      const { client, address, when, type, tourId, at } = result.scheduled
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
      }
    }
  }

  // ── Derived layout ────────────────────────────────────────────────────────────
  const isClients = activeNav === 'clients'
  const isSearch = activeNav === 'search'
  const isTours = activeNav === 'tours'
  const isHome = !isClients && !isSearch && !isTours

  const filtered = filter === 'all' ? clients : clients.filter((c) => c.stage === filter)

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

  const selectedBuyerRecord = BUYERS.find((b) => b.id === selectedBuyer) ?? BUYERS[1]
  // Each client is shown a different number of listings, so the Clients screen follows
  // the selected subnav row rather than rendering one feed for everybody.
  const clientFeed = feedFor(selectedBuyerRecord.id)
  const pageTitle = isClients
    ? selectedBuyerRecord.id === AGENT_FEED_ID
      ? 'My feed'
      : selectedBuyerRecord.name
    : isSearch
      ? 'Search'
      : 'Home'

  const countLabel = isSearch
    ? ''
    : isClients
      ? `${clientFeed.listingCount} ${clientFeed.listingCount === 1 ? 'listing' : 'listings'}`
      : `${filtered.length}${filter === 'all' ? ' clients' : ` of ${clients.length} clients`}`

  const buyerQuery = clientQ.trim().toLowerCase()
  const buyers = BUYERS.filter((b) => b.name.toLowerCase().includes(buyerQuery))

  const tourQuery = tourQ.trim().toLowerCase()
  // Only tours that have been created show in the subnav — the assistant-coordinated one
  // stays hidden until the flow books it (see `createdTourIds`).
  const visibleTours = TOURS.filter((t) => createdTourIds.has(t.id))
  const tourList = visibleTours.filter(
    (t) =>
      (toursTab === 'all' || (toursTab === 'upcoming' ? t.upcoming : !t.upcoming)) &&
      t.name.toLowerCase().includes(tourQuery)
  )
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
  }

  const navigate = (id: NavId) => {
    setActiveNav(id)
    writeNavParam(id)
    setPushExpanded(false)
  }

  // Back and forward walk the destinations, since every navigation pushed an entry.
  useEffect(() => {
    const onPop = () => setActiveNav(readNavParam())
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  /**
   * The Search and Tours action bars live inside iframes, so their Ask button cannot reach
   * the panel directly — it posts up instead. Only bound in variant B, which is the only
   * arm where those buttons exist.
   */
  useEffect(() => {
    if (!actionBar) return
    const onMessage = (e: MessageEvent) => {
      // Same-origin only: the maps are served from this app, and nothing else should be
      // able to drive the panel.
      if (e.origin !== window.location.origin) return
      if (e.data?.type === ASK_MESSAGE) openPush()
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [actionBar])

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
      className="ra-shell"
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: C.canvas,
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        {!isMobile && <NavRail activeNav={activeNav} onNavigate={navigate} />}

        <Subnav
          open={subnavOpen}
          width={SUBNAV_WIDTH}
          drawerMax={isMobile ? SUBNAV_DRAWER_MAX : undefined}
          variant={subnavVariant}
          onClose={() => setSubnavOpen(false)}
          buyers={buyers}
          clientQ={clientQ}
          onClientQ={setClientQ}
          selectedBuyer={selectedBuyer}
          onSelectBuyer={setSelectedBuyer}
          clientTab={clientTab}
          onClientTab={setClientTab}
          activeCount={activeClientCount}
          requestsCount={requestClientCount}
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
            visible={!isSearch && !isTours}
            mobile={isMobile}
            actionBar={actionBar}
            onAsk={openPush}
            askOpen={pushContent}
            showSubnavButton={isClients && !subnavOpen}
            onOpenSubnav={() => setSubnavOpen(true)}
            title={pageTitle}
            countLabel={countLabel}
            showToggles={isClients}
            toggles={toggles}
            onToggle={(id: ToggleId) => setToggles((p) => ({ ...p, [id]: !p[id] }))}
          />

          {/*
            Tours hides `MainHeader` and hands its whole viewport to an embedded map, so on
            mobile the trigger for its subnav floats over that map rather than taking a
            column out of a 320px screen.
          */}
          {isMobile && isTours && !subnavOpen && (
            <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 15, display: 'flex' }}>
              <FloatingIconButton label="Open tours list" onClick={() => setSubnavOpen(true)} />
            </div>
          )}

          <button
            type="button"
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
          </button>

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
                { value: tourRequestsTotal, label: 'Tour requests' },
                { value: invitedClientCount, label: 'Invites pending' },
              ]}
              tours={upcomingTours}
              needs={needs}
              needsCount={needs.length}
              stageItems={stageItems}
              rows={filtered}
              onOpenTours={() => navigate('tours')}
              onAsk={send}
            />
          )}

          {isSearch && <SearchScreen variant={variant} askOpen={pushContent} />}

          {isTours && (
            <ToursScreen
              showSubnavButton={!isMobile && !subnavOpen}
              onOpenSubnav={() => setSubnavOpen(true)}
              variant={variant}
              askOpen={pushContent}
              // The embedded map follows the Tours subnav: it draws whichever tour is selected.
              selectedTour={TOUR_MAP_DATA[selectedTour]}
            />
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
