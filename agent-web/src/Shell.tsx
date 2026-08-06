/**
 * Root of the RealAssist+ content-orchestration shell.
 *
 * Holds every piece of state the DC original kept on `Component.state` and derives the
 * layout values its `renderVals()` computed. Layout is
 * [nav rail][subnav][main][absolutely-positioned push panel], all inside a 100vh column.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { C, EASE } from './theme'
import { NavRail, type NavId } from './components/NavRail'
import { Subnav } from './components/Subnav'
import { MainHeader, type ToggleId, type Toggles } from './components/MainHeader'
import { FAB } from './components/FAB'
import { HomeScreen, type NeedItem, type StageItem } from './screens/HomeScreen'
import { SearchScreen } from './screens/SearchScreen'
import { ToursScreen } from './screens/ToursScreen'
import { ClientsScreen, type ClientsView } from './screens/ClientsScreen'
import { AssistantPanel, type Msg } from './panels/AssistantPanel'
import { runAssistant } from './assistant'
import {
  BUYERS,
  CLIENTS,
  INITIAL_UPCOMING_TOURS,
  STAGES,
  THREADS,
  TOURS,
  type Client,
  type UpcomingTour,
} from './data'

/**
 * The DC file exposed these three as authoring props (`railMode`, `subnavWidth`,
 * `pushWidth`) with an editor UI. There's no equivalent surface in a Vite app, so the
 * defaults from its `data-props` block are constants here.
 */
const RAIL_MODE: 'hover' | 'click' = 'hover'
const SUBNAV_WIDTH = 320
const PUSH_WIDTH = 420

/**
 * Drag bounds for the push panel. The minimum is the narrowest the composer and the
 * 340px-wide chat cards still read at; the maximum leaves room for `main` rather than
 * letting the drag reach the expanded state, which the expand control owns.
 */
const PUSH_MIN = 320
const PUSH_MAX_GAP = 360
const PUSH_WIDTH_KEY = 'ra-push-width'

/** The widest the panel may be at this viewport, never below `PUSH_MIN`. */
function pushCeiling() {
  return Math.max(PUSH_MIN, window.innerWidth - PUSH_MAX_GAP)
}

function clampPush(w: number) {
  return Math.min(pushCeiling(), Math.max(PUSH_MIN, Math.round(w)))
}

/** `ImageSlot` already persists to localStorage; the panel width follows suit. */
function readStoredPushWidth() {
  try {
    const raw = window.localStorage.getItem(PUSH_WIDTH_KEY)
    if (!raw) return PUSH_WIDTH
    const parsed = Number(raw)
    return Number.isFinite(parsed) ? clampPush(parsed) : PUSH_WIDTH
  } catch {
    return PUSH_WIDTH
  }
}

export function Shell() {
  // Nav rail
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [activeNav, setActiveNav] = useState<NavId>('home')
  const [subnavOpen, setSubnavOpen] = useState(true)

  // Subnav — clients
  const [clientQ, setClientQ] = useState('')
  const [selectedBuyer, setSelectedBuyer] = useState('jessica')
  const [clientTab, setClientTab] = useState<'active' | 'requests'>('active')

  // Subnav — tours
  const [tourQ, setTourQ] = useState('')
  const [toursTab, setToursTab] = useState<'upcoming' | 'past' | 'all'>('upcoming')
  const [selectedTour, setSelectedTour] = useState('josh')

  // Clients screen
  const [clientFilter, setClientFilter] = useState('active')
  const [viewMode, setViewMode] = useState<ClientsView>('map')

  // Home screen
  const [clients, setClients] = useState<Client[]>(CLIENTS)
  const [filter, setFilter] = useState('all')
  const [upcomingTours, setUpcomingTours] = useState<UpcomingTour[]>(INITIAL_UPCOMING_TOURS)

  // Header toggles
  const [toggles, setToggles] = useState<Toggles>({ bell: false, flame: true, chart: false, star: false })

  // Push panel
  const [pushContent, setPushContent] = useState(true)
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

  const chatRef = useRef<HTMLDivElement>(null)
  const lastCount = useRef(-1)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const onMq = () => setIsMobile(mq.matches)
    onMq()
    mq.addEventListener('change', onMq)
    return () => mq.removeEventListener('change', onMq)
  }, [])

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

    const result = await runAssistant(t, clients)

    setMsgs((prev) => [
      ...prev,
      ...result.cards.map((card): Msg => ({ role: 'ai', text: '', card })),
      { role: 'ai', text: result.reply },
    ])
    setBusy(false)

    if (result.scheduled) {
      const { client, address, when } = result.scheduled
      setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, nextTour: when } : c)))
      setUpcomingTours((prev) => [...prev, { when, address, client: client.name, type: 'Buyer tour' }])
    }
  }

  // ── Derived layout ────────────────────────────────────────────────────────────
  const clicky = RAIL_MODE === 'click' || isMobile
  const railExpanded = clicky ? pinned : hover

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

  const needs: NeedItem[] = [
    {
      client: 'Sofia Reyes',
      text: 'Offer window on 2204 Vaughn St closes tomorrow',
      dot: C.brand,
      ask: () => send('What should we do about Sofia’s offer on 2204 Vaughn St?'),
    },
    {
      client: 'Devon Park',
      text: 'Not pre-approved yet — needs a lender intro',
      dot: C.amber,
      ask: () => send('Draft a lender intro note for Devon Park'),
    },
    {
      client: 'James & Priya Nair',
      text: 'Pre-approval expired — renewal before touring',
      dot: C.amber,
      ask: () => send('How should I get James and Priya Nair re-approved and re-engaged?'),
    },
  ]

  const selectedBuyerRecord = BUYERS.find((b) => b.id === selectedBuyer) ?? BUYERS[1]
  const pageTitle = isClients
    ? selectedBuyerRecord.id === 'georgia'
      ? 'My feed'
      : selectedBuyerRecord.name
    : isSearch
      ? 'Search'
      : 'Home'

  const countLabel =
    isClients || isSearch
      ? ''
      : `${filtered.length}${filter === 'all' ? ' active buyers' : ` of ${clients.length} buyers`}`

  const buyerQuery = clientQ.trim().toLowerCase()
  const buyers = BUYERS.filter((b) => b.name.toLowerCase().includes(buyerQuery))

  const tourQuery = tourQ.trim().toLowerCase()
  const tourList = TOURS.filter(
    (t) =>
      (toursTab === 'all' || (toursTab === 'upcoming' ? t.upcoming : !t.upcoming)) &&
      t.name.toLowerCase().includes(tourQuery)
  )

  const threadQuery = threadQ.trim().toLowerCase()
  const threadItems = THREADS.filter((t) => t.title.toLowerCase().includes(threadQuery))

  const subnavVariant = isClients ? 'clients' : isTours ? 'tours' : null
  const pushWidth = pushContent ? (pushExpanded ? 'calc(100% - 64px)' : `${pushW}px`) : '0px'
  const mainMarginRight = pushContent && !pushExpanded ? pushW : 0
  // Only draggable while docked open — expanded width is the expand control's, and a
  // closed panel has no edge to grab.
  const pushResizable = pushContent && !pushExpanded
  const fabVisible = !pushContent
  const tipShown = fabVisible && fabHover

  const navigate = (id: NavId) => {
    setActiveNav(id)
    setPinned(false)
    setPushExpanded(false)
  }

  return (
    <div
      data-screen-label="RealAssist+ agent workspace"
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: C.canvas,
        overflow: 'hidden',
      }}
    >
      <div style={{ flex: 1, display: 'flex', minHeight: 0, position: 'relative' }}>
        <NavRail
          expanded={railExpanded}
          activeNav={activeNav}
          onNavigate={navigate}
          onEnter={() => {
            if (!clicky) setHover(true)
          }}
          onLeave={() => {
            if (!clicky) setHover(false)
          }}
          onClick={() => {
            if (clicky) setPinned((p) => !p)
          }}
        />

        <Subnav
          open={subnavOpen}
          width={SUBNAV_WIDTH}
          variant={subnavVariant}
          onClose={() => setSubnavOpen(false)}
          buyers={buyers}
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
          upcomingCount={TOURS.filter((t) => t.upcoming).length}
          pastCount={TOURS.filter((t) => !t.upcoming).length}
        />

        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            background: C.white,
            marginRight: mainMarginRight,
            // Must match the panel: easing this mid-drag lags `main` behind the edge.
            transition: resizing ? 'none' : `margin-right 220ms ${EASE}`,
          }}
        >
          <MainHeader
            visible={!isSearch && !isTours}
            showSubnavButton={isClients && !subnavOpen}
            onOpenSubnav={() => setSubnavOpen(true)}
            title={pageTitle}
            countLabel={countLabel}
            showToggles={isClients}
            toggles={toggles}
            onToggle={(id: ToggleId) => setToggles((p) => ({ ...p, [id]: !p[id] }))}
          />

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
              right: 24,
              bottom: 36,
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
              stats={[
                { value: clients.length, label: 'Active buyers' },
                { value: upcomingTours.length, label: 'Upcoming tours' },
                { value: 1, label: 'Offers out' },
                { value: 1, label: 'New leads' },
              ]}
              tours={upcomingTours}
              needs={needs}
              needsCount={needs.length}
              stageItems={stageItems}
              rows={filtered}
              onOpenTours={() => {
                setActiveNav('tours')
                setPushExpanded(false)
              }}
              onAsk={send}
            />
          )}

          {isSearch && <SearchScreen />}

          {isTours && (
            <ToursScreen showSubnavButton={!subnavOpen} onOpenSubnav={() => setSubnavOpen(true)} />
          )}

          {isClients && (
            <ClientsScreen
              pill={clientFilter}
              onPill={setClientFilter}
              view={viewMode}
              onView={setViewMode}
            />
          )}
        </main>

        <AssistantPanel
          width={pushWidth}
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
          onClose={() => {
            setPushContent(false)
            setPushExpanded(false)
            setPushOver(false)
          }}
          onNewChat={() => {
            setMsgs([])
            setPushOver(false)
          }}
        />
      </div>
    </div>
  )
}
