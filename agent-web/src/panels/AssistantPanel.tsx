/**
 * RealAssist+ push panel: threads dock, chat header, nudge cards, transcript, composer,
 * and the sliding threads overlay. Slides in from the right of `main` and can expand to
 * fill everything but the nav rail.
 */
import {
  ActionCard,
  Tag,
  IconUserAddToProfile,
  IconAgent,
  IconPerformance,
  IconCircleCheck as HavenCircleCheck,
  IconComment,
  IconAiSearch,
  IconCalendarTime,
} from '@rdc-npm/rdc-ui-v4'
import { Fragment, useEffect, useState } from 'react'
import type { RefObject } from 'react'
import { C, EASE } from '../theme'
import { CircleButton, HoverButton, Initials } from '../components/primitives'
import { ResizeHandle, type ResizeHandleProps } from '../components/ResizeHandle'
import { ThreadsList } from './ThreadsList'
import {
  IconCalendarClock,
  IconCircleCheck,
  IconClose,
  IconCollapsePanel,
  IconComposerSend,
  IconExpandPanel,
  IconHamburger,
  IconHomeFilled,
  IconSend,
  IconSpark,
} from '../icons'
import type { Thread } from '../data'
import type { ComponentType } from 'react'
import type {
  ActionPickerCard,
  AddClientMessageCard,
  Card,
  CatchUpBriefingCard,
  CatchUpItem,
  CatchUpToolsCard,
  CatchUpTourRef,
  ClientCard,
  ClientPickerCard,
  ClientPulseReportCard,
  DateTimeCard,
  OutreachCard,
  PlanProperty,
  SearchAnalysisCard,
  SearchOptClientCard,
  SearchOptPickerCard,
  SelectMethodCard,
  SummaryCard,
  TimelineCard,
  ToolGroupCard,
  ToolRunCard,
  ToolTraceCard,
  TourCard,
  TourListingsCard,
  TourPlanCard,
  UpcomingTourCard,
} from '../assistant'

export interface Msg {
  role: 'user' | 'ai'
  text: string
  card?: Card
}

/**
 * Cards that pose a choice the user answers to advance the flow. Once answered, the
 * prompt is consumed — it stops rendering as soon as it is no longer the last message,
 * so a stale picker can't be re-used to branch the flow a second time from history.
 */
const PICKER_KINDS = new Set<Card['kind']>(['clientPicker', 'selectMethod', 'searchOptPicker', 'actionPicker'])

interface AssistantPanelProps {
  /** 0 when closed; pushWidth when docked; calc(100% - 64px) when expanded. */
  width: string
  /**
   * Drives `visibility`, so the closed panel leaves the tab order and the a11y tree
   * instead of sitting there as a zero-width strip of focusable controls — which at mobile
   * width would be a whole hidden screen of them.
   */
  open: boolean
  /**
   * Below the mobile breakpoint the panel is a full-screen overlay: there is no room
   * beside it to expand into, and no docked width for the drag handle to set.
   */
  mobile?: boolean
  expanded: boolean
  /** Threads showing — as an inline dock when expanded, as an overlay when not. */
  over: boolean
  /**
   * Drag-to-resize wiring for the docked state. Omitted (or ignored while expanded and
   * closed, where the width is not the user's to set) means no handle is rendered.
   */
  resize?: ResizeHandleProps
  /** True while the handle is being dragged — drops the width transition. */
  resizing?: boolean

  msgs: Msg[]
  busy: boolean
  input: string
  chatRef: RefObject<HTMLDivElement>

  threads: Thread[]
  threadQuery: string

  onInput: (v: string) => void
  onSend: (text: string) => void
  onThreadQuery: (v: string) => void
  onToggleOver: () => void
  onCloseOver: () => void
  onToggleExpand: () => void
  onClose: () => void
  onNewChat: () => void
}

const PILL_BASE = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  borderRadius: 40,
  fontWeight: 600,
  cursor: 'pointer',
} as const

const CHAT_CARD = {
  // Fill the transcript column (capped at 720px by the scroll container) rather than sitting
  // as a narrow 340px strip — the assistant's rich cards read as full-width responses, like
  // the home-state capability cards above them.
  width: '100%',
  background: C.white,
  border: `1px solid ${C.hair}`,
  borderRadius: 16,
  boxShadow: '0 1px 2px rgba(26,24,22,0.06),0 4px 12px rgba(26,24,22,0.06)',
  overflow: 'hidden',
} as const

const CARD_SECTION = {
  borderTop: `1px solid ${C.alt}`,
  padding: '12px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  fontSize: 12.5,
} as const

const CARD_FOOTER = {
  borderTop: `1px solid ${C.alt}`,
  padding: '10px 16px',
  display: 'flex',
  gap: 8,
} as const

function DarkPill({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <HoverButton
      onClick={onClick}
      style={{
        ...PILL_BASE,
        background: C.action,
        color: C.white,
        border: `1px solid ${C.action}`,
        padding: '7px 14px',
        fontSize: 12.5,
        transition: 'background 120ms',
      }}
      hoverStyle={{ background: C.dark }}
    >
      {children}
    </HoverButton>
  )
}

function LightPill({
  children,
  onClick,
  padding = '7px 14px',
  fontSize = 12.5,
}: {
  children: React.ReactNode
  onClick?: () => void
  padding?: string
  fontSize?: number
}) {
  return (
    <HoverButton
      onClick={onClick}
      style={{
        ...PILL_BASE,
        background: C.white,
        color: C.dark,
        border: `1px solid ${C.border}`,
        padding,
        fontSize,
        transition: 'border-color 120ms',
      }}
      hoverStyle={{ borderColor: C.dark }}
    >
      {children}
    </HoverButton>
  )
}

function DetailRow({ label, width, children }: { label: string; width: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <span style={{ width, flex: 'none', color: C.muted }}>{label}</span>
      {children}
    </div>
  )
}

function ClientCardView({ card, onDraft }: { card: ClientCard; onDraft: () => void }) {
  return (
    <div style={CHAT_CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <Initials initials={card.initials} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{card.name}</div>
          <div style={{ fontSize: 11.5, color: C.muted }}>{card.lastActivity}</div>
        </div>
        <Tag dataColor={card.dataColor}>{card.stage}</Tag>
      </div>
      <div style={CARD_SECTION}>
        <DetailRow label="Budget" width={88}>
          <span className="ty-numeric-body100" style={{ fontWeight: 600 }}>
            {card.budget}
          </span>
        </DetailRow>
        <DetailRow label="Looking for" width={88}>
          <span>{card.looking}</span>
        </DetailRow>
        <DetailRow label="Financing" width={88}>
          <span>{card.financing}</span>
        </DetailRow>
        <DetailRow label="Saved homes" width={88}>
          <span className="ty-numeric-body100">{card.saved}</span>
        </DetailRow>
      </div>
      <div style={CARD_FOOTER}>
        <LightPill padding="6px 13px" fontSize={12}>
          Open profile
        </LightPill>
        <LightPill padding="6px 13px" fontSize={12} onClick={onDraft}>
          Draft a text
        </LightPill>
      </div>
    </div>
  )
}

function TourCardView({ card }: { card: TourCard }) {
  return (
    <div style={CHAT_CARD}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px' }}>
        <div
          style={{
            width: 52,
            height: 52,
            flex: 'none',
            borderRadius: 12,
            background: C.tourTile,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.muted,
          }}
        >
          <IconHomeFilled size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{card.address}</div>
          <div className="ty-numeric-caption100" style={{ fontSize: 12, color: C.sub }}>
            {card.meta}
          </div>
        </div>
      </div>
      <div style={CARD_SECTION}>
        <DetailRow label="Client" width={64}>
          <span style={{ fontWeight: 600 }}>{card.client}</span>
        </DetailRow>
        <DetailRow label="When" width={64}>
          <span className="ty-numeric-body100" style={{ fontWeight: 600 }}>
            {card.when}
          </span>
        </DetailRow>
        <DetailRow label="Status" width={64}>
          <Tag dataColor="greenSubtle">Invite sent</Tag>
        </DetailRow>
      </div>
      <div style={CARD_FOOTER}>
        <DarkPill>Add to calendar</DarkPill>
        <LightPill padding="6px 13px" fontSize={12}>
          Edit details
        </LightPill>
      </div>
    </div>
  )
}

/** A property status dot — green (for sale / new), amber (reduced / coming soon), gray. */
const STATUS_DOT: Record<PlanProperty['statusTone'], string> = {
  green: C.online,
  amber: C.amber,
  gray: C.muted,
}

function StatusDot({ tone }: { tone: PlanProperty['statusTone'] }) {
  return (
    <span
      style={{
        width: 9,
        height: 9,
        flex: 'none',
        borderRadius: '50%',
        background: STATUS_DOT[tone],
        display: 'inline-block',
      }}
    />
  )
}

/**
 * A lead note — its opening clause (a property or agent name) in bold, the rest in
 * regular weight, as a bulleted line. Renders the design's "A few things to note",
 * "Potential Conflicts", and "Recommended Next Steps" bullets verbatim.
 */
function NoteLine({ lead, text, marker }: { lead?: string; text: string; marker: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <span style={{ flex: 'none', marginTop: 1 }}>{marker}</span>
      <span style={{ flex: 1, color: C.sub, lineHeight: 1.55 }}>
        {lead && <strong style={{ color: C.dark }}>{lead}</strong>}
        {text}
      </span>
    </div>
  )
}

/** The bullet the note lists use — a small filled disc. */
function Bullet({ color = C.muted }: { color?: string }) {
  return <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, display: 'inline-block', marginTop: 6 }} />
}

/**
 * The narrator's tool trace — gray thinking lines with a thin left rule, exactly as the
 * design shows them ("Let me pull up…", "Used 2 tools", "Good, I have…", "Found listing
 * information"). Not a white card; it sits in the transcript flow.
 */
function ToolTraceView({ card }: { card: ToolTraceCard }) {
  const line = (content: React.ReactNode, key: React.Key) => (
    <div
      key={key}
      style={{
        borderLeft: `2px solid ${C.border}`,
        paddingLeft: 14,
        color: C.muted,
        fontSize: 13,
        lineHeight: 1.55,
      }}
    >
      {content}
    </div>
  )
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%' }}>
      {line(card.lines[0], 'l0')}
      {line(
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Used {card.toolCount} tools <span style={{ fontSize: 11 }}>⌄</span>
        </span>,
        'tools'
      )}
      {line(card.lines[1], 'l1')}
      {line(card.found, 'found')}
    </div>
  )
}

/** How long a tool "runs" before it resolves to its checkmarked line. */
const TOOL_RUN_MS = 750

/** The "Completed" turn marker — the brand-coloured ✓ line the design ends each turn with. */
function CompletedMarker() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: C.brand,
        fontWeight: 700,
        fontSize: 13,
      }}
    >
      <IconCircleCheck size={16} />
      Completed
    </div>
  )
}

/** A trio of pulsing dots, inline — the "still working" indicator for a running tool. */
function ProcessingDots() {
  return (
    <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
      {[0, 0.2, 0.4].map((delay) => (
        <span
          key={delay}
          style={{
            width: 5,
            height: 5,
            borderRadius: '50%',
            background: C.muted,
            animation: `raPulse 1s ease-in-out ${delay}s infinite`,
          }}
        />
      ))}
    </span>
  )
}

/** A tool-trace line — gray text with the design's thin left rule. */
function TraceLine({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderLeft: `2px solid ${C.border}`,
        paddingLeft: 14,
        color: C.muted,
        fontSize: 13,
        lineHeight: 1.55,
      }}
    >
      {children}
    </div>
  )
}

/**
 * A single tool call: opens on its processing label with pulsing dots, then resolves to the
 * checkmarked status line after a beat — the spec's "process → resolve".
 */
function ToolRunView({ card }: { card: ToolRunCard }) {
  const [done, setDone] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setDone(true), TOOL_RUN_MS)
    return () => clearTimeout(id)
  }, [])
  return (
    <div style={{ width: '100%' }}>
      <TraceLine>
        {done ? (
          <span style={{ color: C.dark }}>{card.resolved}</span>
        ) : (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {card.processing} <ProcessingDots />
          </span>
        )}
      </TraceLine>
    </div>
  )
}

/**
 * A sequence of tool calls: shows the processing label while running, then resolves to a
 * collapsible "Used N tools" summary that expands to reveal each checkmarked line.
 */
function ToolGroupView({ card }: { card: ToolGroupCard }) {
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setDone(true), TOOL_RUN_MS)
    return () => clearTimeout(id)
  }, [])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {!done ? (
        <TraceLine>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {card.processing} <ProcessingDots />
          </span>
        </TraceLine>
      ) : (
        <>
          <TraceLine>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                background: 'transparent',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                color: C.dark,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              Used {card.tools.length} tools
              <span style={{ fontSize: 11, transform: open ? 'rotate(180deg)' : 'none' }}>⌄</span>
            </button>
          </TraceLine>
          {open &&
            card.tools.map((line, i) => (
              <TraceLine key={i}>
                <span style={{ color: C.dark }}>{line}</span>
              </TraceLine>
            ))}
        </>
      )}
    </div>
  )
}

/**
 * One assistant turn's message in the add-client flow: the prose (verbatim, newlines
 * preserved), a "Completed" marker, and an optional footer — a confirm button (State 4) or
 * next-step suggestion chips (State 5).
 */
function AddClientMessageView({
  card,
  onSend,
}: {
  card: AddClientMessageCard
  onSend: (text: string) => void
}) {
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px' }}>
      <div style={{ fontSize: 13.5, color: C.dark, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
        {card.body}
      </div>

      {card.confirm && (
        <div style={{ ...CARD_FOOTER, paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: 14 }}>
          <DarkPill onClick={() => onSend(card.confirm!.prompt)}>
            <IconCircleCheck size={14} />
            <span>{card.confirm.label}</span>
          </DarkPill>
        </div>
      )}

      {card.options && card.options.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
          {card.options.map((opt) => (
            <ActionCard
              key={opt}
              bordered
              title={opt}
              media={
                <span style={{ display: 'flex', color: C.brand }}>
                  <IconSpark size={16} />
                </span>
              }
              mediaPosition="center"
              iconIndicator="arrow"
              linkProps={{ onClick: () => onSend(opt), 'aria-label': opt }}
            />
          ))}
        </div>
      )}

      {card.completed && (
        <div style={{ marginTop: 16 }}>
          <CompletedMarker />
        </div>
      )}
    </div>
  )
}

// ─── Catch Up daily-briefing flow ──────────────────────────────────────────────

/** How long each of the three processing states shows before the next takes over. */
const CATCH_UP_STREAM_MS = 600
/** When the briefing and picker reveal — after the processing stream has run. */
const CATCH_UP_REVEAL_MS = CATCH_UP_STREAM_MS * 3 + 150

/** Reveals its children after `ms`, so the briefing lands once the stream has finished. */
function Delayed({ ms, children }: { ms: number; children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const id = setTimeout(() => setShow(true), ms)
    return () => clearTimeout(id)
  }, [ms])
  return show ? <>{children}</> : null
}

/**
 * The Catch Up processing stream: the three sequential states, each showing with pulsing dots
 * before the next replaces it, then the collapsed "Used N tools" summary expanding to each
 * friendly-labelled step.
 */
function CatchUpToolsView({ card }: { card: CatchUpToolsCard }) {
  const [step, setStep] = useState(0)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (step >= card.stream.length) return
    const id = setTimeout(() => setStep((s) => s + 1), CATCH_UP_STREAM_MS)
    return () => clearTimeout(id)
  }, [step, card.stream.length])
  const streaming = step < card.stream.length
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
      {card.stream.slice(0, streaming ? step : card.stream.length).map((s, i) => (
        <TraceLine key={i}>
          <span style={{ color: C.dark }}>{s}</span>
        </TraceLine>
      ))}
      {streaming ? (
        <TraceLine>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {card.stream[step]} <ProcessingDots />
          </span>
        </TraceLine>
      ) : (
        <>
          <TraceLine>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                background: 'transparent',
                padding: 0,
                margin: 0,
                cursor: 'pointer',
                color: C.dark,
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              Used {card.tools.length} tools
              <span style={{ fontSize: 11, transform: open ? 'rotate(180deg)' : 'none' }}>⌄</span>
            </button>
          </TraceLine>
          {open &&
            card.tools.map((line, i) => (
              <TraceLine key={i}>
                <span style={{ color: C.dark }}>{line}</span>
              </TraceLine>
            ))}
        </>
      )}
    </div>
  )
}

/** A deep-link styled like a link but inert — the prototype has no /plus/app routes to reach. */
function DeepLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      onClick={(e) => e.preventDefault()}
      style={{ color: C.brand, fontWeight: 700, textDecoration: 'none', cursor: 'pointer' }}
    >
      {children}
    </a>
  )
}

/** The framed compact tour map — public/mini-tour-map.html, its stops passed on the URL. */
function MiniTourMap({ tour }: { tour: CatchUpTourRef }) {
  const stops = tour.stops.map((s) => ({
    o: s.order,
    lat: s.ll[0],
    lng: s.ll[1],
    addr: s.addr,
    city: s.city,
  }))
  const src = `mini-tour-map.html?stops=${encodeURIComponent(JSON.stringify(stops))}`
  return (
    <iframe
      src={src}
      title={`${tour.title} map`}
      loading="lazy"
      style={{ width: '100%', height: 180, border: 'none', display: 'block' }}
    />
  )
}

/** The embedded tour card inside a briefing item: header deep link + framed mini-map. */
function CatchUpTourCard({ tour }: { tour: CatchUpTourRef }) {
  return (
    <div
      style={{
        marginTop: 10,
        border: `1px solid ${C.hair}`,
        borderRadius: 12,
        overflow: 'hidden',
        background: C.white,
      }}
    >
      <a
        href={tour.href}
        onClick={(e) => e.preventDefault()}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          textDecoration: 'none',
          color: C.dark,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            flex: 'none',
            borderRadius: 10,
            background: C.tourTile,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: C.muted,
          }}
        >
          <IconHomeFilled size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>{tour.title}</div>
          <div style={{ fontSize: 12, color: C.muted }}>{tour.subtitle}</div>
        </div>
        <span style={{ fontSize: 12, color: C.muted, flex: 'none' }}>
          {tour.stopCount} {tour.stopCount === 1 ? 'stop' : 'stops'}
        </span>
      </a>
      <MiniTourMap tour={tour} />
    </div>
  )
}

/** One briefing item — the client deep link, its context, an optional draft and tour card. */
function BriefingItem({ item }: { item: CatchUpItem }) {
  const muted = { fontSize: 12.5, color: C.muted, lineHeight: 1.55 } as const
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
        <DeepLink href={item.href}>{item.name}</DeepLink> — {item.headline}
      </div>
      {item.detail && <div style={muted}>{item.detail}</div>}
      {item.background && (
        <div style={muted}>
          <span style={{ fontWeight: 600, color: C.dark }}>Background:</span> {item.background}
        </div>
      )}
      {item.draft && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.dark }}>Suggested message:</span>
          <div
            style={{
              fontSize: 12.5,
              color: C.dark,
              lineHeight: 1.55,
              background: C.alt,
              borderRadius: 10,
              padding: '10px 12px',
              whiteSpace: 'pre-wrap',
            }}
          >
            “{item.draft}”
          </div>
        </div>
      )}
      {item.confidence && (
        <div style={{ fontSize: 12.5, color: C.dark }}>
          <span style={{ fontWeight: 600 }}>Confidence:</span> {item.confidence.level} (
          {item.confidence.percent}%)
        </div>
      )}
      {item.tour && <CatchUpTourCard tour={item.tour} />}
      {item.fyiNote && <div style={muted}>{item.fyiNote}</div>}
    </div>
  )
}

/** A priority tier — its emoji-prefixed heading and the items within. */
function BriefingTier({
  heading,
  items,
}: {
  heading: string
  items: CatchUpItem[]
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 13 }}>{heading}</div>
      {items.map((item) => (
        <BriefingItem key={item.clientId} item={item} />
      ))}
    </div>
  )
}

/** The structured daily briefing: collapsible reasoning, summary header, tiers, and marker. */
function CatchUpBriefingView({ card }: { card: CatchUpBriefingCard }) {
  const [showReasoning, setShowReasoning] = useState(false)
  return (
    <div
      style={{
        ...CHAT_CARD,
        padding: '16px 16px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={() => setShowReasoning((o) => !o)}
          aria-expanded={showReasoning}
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            color: C.muted,
            fontSize: 12.5,
            fontFamily: 'inherit',
          }}
        >
          {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
          <span style={{ fontSize: 11, transform: showReasoning ? 'rotate(180deg)' : 'none' }}>
            ⌄
          </span>
        </button>
        {showReasoning &&
          card.preamble.map((line, i) => <TraceLine key={i}>{line}</TraceLine>)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Catch Up Summary</div>
        <div style={{ fontSize: 13, color: C.dark }}>
          📊 Analyzed {card.analyzed} clients — 🔥 {card.criticalCount} critical | ⚠️{' '}
          {card.importantCount} important | ℹ️ {card.fyiCount} FYI
        </div>
        <div style={{ fontSize: 13, color: C.dark, marginTop: 4 }}>Here's your action plan:</div>
      </div>

      {card.critical.length > 0 && (
        <BriefingTier heading="🔥 CRITICAL (Handle Now)" items={card.critical} />
      )}
      {card.important.length > 0 && <BriefingTier heading="⚠️ IMPORTANT" items={card.important} />}
      {card.fyi.length > 0 && (
        <BriefingTier heading="ℹ️ FYI (No action needed)" items={card.fyi} />
      )}
      {card.moreNote && (
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>{card.moreNote}</div>
      )}

      <CompletedMarker />
    </div>
  )
}

/**
 * The interactive action picker that ends the turn: a collapse chevron, one radio option per
 * suggested action, a free-text hint the composer answers, and a Skip button.
 */
function ActionPickerView({
  card,
  onSend,
}: {
  card: ActionPickerCard
  onSend: (text: string) => void
}) {
  const [open, setOpen] = useState(true)
  const skip = card.options.find((o) => /^skip/i.test(o.label))
  const picks = card.options.filter((o) => o !== skip)
  return (
    <div style={{ ...CHAT_CARD, padding: '14px 16px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 13.5 }}>{card.title}</div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={open ? 'Minimize' : 'Expand'}
          style={{
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: C.muted,
            fontSize: 14,
            padding: 4,
            transform: open ? 'none' : 'rotate(180deg)',
          }}
        >
          ⌄
        </button>
      </div>

      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
          {picks.map((opt) => (
            <button
              key={opt.prompt}
              type="button"
              onClick={() => onSend(opt.prompt)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                textAlign: 'left',
                background: C.white,
                border: `1px solid ${C.hair}`,
                borderRadius: 10,
                padding: '10px 12px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                color: C.dark,
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  flex: 'none',
                  borderRadius: '50%',
                  border: `2px solid ${C.border}`,
                }}
              />
              {opt.label}
            </button>
          ))}

          <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
            Or type your own instruction below.
          </div>

          {skip && (
            <div style={{ display: 'flex', marginTop: 4 }}>
              <LightPill padding="6px 14px" fontSize={12} onClick={() => onSend(skip.prompt)}>
                Skip
              </LightPill>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Search-optimization flow ───────────────────────────────────────────────────

/**
 * State 1 — the client-selection picker. One row per client (initials avatar, name, and a
 * "Last seen …" line), a "Search for a client" free-text field, and a Skip button. Picking a
 * row, submitting the field, or skipping all funnel through the same `onPick`.
 */
function SearchOptPickerView({
  card,
  onPick,
}: {
  card: SearchOptPickerCard
  onPick: (prompt: string) => void
}) {
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px' }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{card.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {card.clients.map((c) => (
          <HoverButton
            key={c.id}
            onClick={() => onPick(c.prompt)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              textAlign: 'left',
              background: C.white,
              border: `1px solid ${C.hair}`,
              borderRadius: 12,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'border-color 120ms, box-shadow 120ms',
            }}
            hoverStyle={{ borderColor: C.border, boxShadow: '0 2px 10px rgba(26,24,22,0.08)' }}
          >
            <Initials initials={c.initials} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, color: C.dark }}>{c.name}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: C.muted }}>{c.lastSeen}</span>
            </span>
          </HoverButton>
        ))}
      </div>

      <div style={{ display: 'flex', marginTop: 12 }}>
        <LightPill padding="6px 14px" fontSize={12} onClick={() => onPick('Skip')}>
          Skip
        </LightPill>
      </div>
    </div>
  )
}

/** State 2 — the chosen client, shown as a compact chip before the analysis streams. */
function SearchOptClientView({ card }: { card: SearchOptClientCard }) {
  return (
    <div
      style={{
        ...CHAT_CARD,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '12px 14px',
      }}
    >
      <Initials initials={card.initials} />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, color: C.dark }}>{card.name}</span>
        <span style={{ display: 'block', fontSize: 11.5, color: C.muted }}>{card.lastSeen}</span>
      </span>
      <Tag dataColor="blueSubtle">Analyzing</Tag>
    </div>
  )
}

/** A section heading inside the analysis report — the emoji-prefixed label. */
function ReportHeading({ children }: { children: React.ReactNode }) {
  return <div style={{ fontWeight: 700, fontSize: 13.5, color: C.dark }}>{children}</div>
}

/** One label-over-value metric in the analysis stat strip. */
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          color: C.muted,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: C.dark, lineHeight: 1.2 }}>{value}</div>
    </div>
  )
}

/** Subtle-tag colour for each confidence level. */
const CONFIDENCE_COLOR = { High: 'greenSubtle', Medium: 'yellowSubtle', Low: 'redSubtle' } as const

/** The "📊 RECOMMENDED CHANGES" table — a six-column grid, one row per recommendation. */
function RecommendationsTable({ rows }: { rows: SearchAnalysisCard['recommendations'] }) {
  const cols = '20px minmax(84px, 1fr) auto minmax(72px, 1fr) 16px minmax(72px, 1fr)'
  const head = { fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
  const cell = { fontSize: 12, color: C.dark, lineHeight: 1.4 }
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: cols, columnGap: 10, rowGap: 8, minWidth: 320, alignItems: 'center' }}>
        <div style={head}>#</div>
        <div style={head}>Filter</div>
        <div style={head}>Confidence</div>
        <div style={head}>Current</div>
        <div style={head} />
        <div style={head}>Suggested</div>
        {rows.map((r) => (
          <Fragment key={r.index}>
            <div style={{ ...cell, color: C.muted }}>{r.index}</div>
            <div style={{ ...cell, fontWeight: 700 }}>{r.filter}</div>
            <div style={{ ...cell, whiteSpace: 'nowrap' }}>{r.confidenceLabel}</div>
            <div style={{ ...cell, color: C.sub }}>{r.current}</div>
            <div style={{ ...cell, color: C.muted, textAlign: 'center' }}>→</div>
            <div style={{ ...cell, fontWeight: 600 }}>{r.suggested}</div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}

/**
 * State 5 — the structured "✅ Search Optimization Analysis" report: a collapsible reasoning
 * preamble, the activity header, the current search, the recommended-changes table and its
 * star legend, the evidence-cited rationale, additional observations, and the caveat.
 */
function SearchAnalysisView({ card }: { card: SearchAnalysisCard }) {
  const [showReasoning, setShowReasoning] = useState(false)
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          type="button"
          onClick={() => setShowReasoning((o) => !o)}
          aria-expanded={showReasoning}
          style={{
            alignSelf: 'flex-start',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            color: C.muted,
            fontSize: 12.5,
            fontFamily: 'inherit',
          }}
        >
          {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
          <span style={{ fontSize: 11, transform: showReasoning ? 'rotate(180deg)' : 'none' }}>⌄</span>
        </button>
        {showReasoning && card.reasoning.map((line, i) => <TraceLine key={i}>{line}</TraceLine>)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 15 }}>✅ Search Optimization Analysis</div>
          <Tag dataColor={CONFIDENCE_COLOR[card.confidenceLevel]}>
            Confidence: {card.confidenceLevel} ({card.confidencePercent}%)
          </Tag>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px 24px',
            padding: '12px 14px',
            background: C.alt,
            borderRadius: 10,
          }}
        >
          <Stat label="Analysis period" value={`${card.analysisPeriodDays} days`} />
          <Stat label="Views" value={card.views} />
          <Stat label="Saves" value={card.saves} />
          <Stat label="Past stops" value={card.pastStops} />
          <Stat label="Upcoming stops" value={card.upcomingStops} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: C.muted,
            }}
          >
            Current search
          </div>
          <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.55 }}>
            <strong>“{card.currentSearchName}”</strong> — {card.currentSearchCriteria}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ReportHeading>📊 RECOMMENDED CHANGES</ReportHeading>
        <RecommendationsTable rows={card.recommendations} />
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
          ⭐⭐⭐ = Very High (90%+) | ⭐⭐ = High (75-89%) | ⭐ = Medium (60-74%)
        </div>
      </div>

      {card.rationale.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ReportHeading>📋 RATIONALE</ReportHeading>
          {card.rationale.map((n, i) => (
            <NoteLine key={i} lead={n.lead} text={n.text} marker={<Bullet />} />
          ))}
        </div>
      )}

      {card.observations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ReportHeading>📌 ADDITIONAL OBSERVATIONS</ReportHeading>
          {card.observations.map((n, i) => (
            <NoteLine key={i} lead={n.lead} text={n.text} marker={<Bullet />} />
          ))}
        </div>
      )}

      <div
        style={{
          fontSize: 12.5,
          color: C.dark,
          lineHeight: 1.55,
          background: C.alt,
          borderRadius: 10,
          padding: '10px 12px',
        }}
      >
        {card.caveat}
      </div>

      <CompletedMarker />
    </div>
  )
}

/** The intent badge's subtle-tag colour — hot / warm / cold. */
const INTENT_COLOR = { High: 'greenSubtle', Medium: 'yellowSubtle', Low: 'blueSubtle' } as const

/** A priority chip on a suggested action — URGENT/High read hot, Medium warm, Low neutral. */
const PRIORITY_COLOR: Record<string, 'redSubtle' | 'yellowSubtle' | 'graySubtle'> = {
  URGENT: 'redSubtle',
  High: 'redSubtle',
  Medium: 'yellowSubtle',
  Low: 'graySubtle',
}

/** The "📊 ACTIVITY SUMMARY" table — metric × last-7 × last-30, one row per metric. */
function ActivityTable({ rows }: { rows: ClientPulseReportCard['activity'] }) {
  const head = { fontSize: 10.5, fontWeight: 700, color: C.muted, textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
  const cell = { fontSize: 12.5, color: C.dark, lineHeight: 1.4 }
  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 1fr) auto auto', columnGap: 18, rowGap: 8, minWidth: 260, alignItems: 'center' }}>
        <div style={head}>Metric</div>
        <div style={{ ...head, textAlign: 'right' }}>Last 7 Days</div>
        <div style={{ ...head, textAlign: 'right' }}>Last 30 Days</div>
        {rows.map((r) => (
          <Fragment key={r.metric}>
            <div style={{ ...cell, fontWeight: 600 }}>{r.metric}</div>
            <div style={{ ...cell, textAlign: 'right' }}>{r.last7}</div>
            <div style={{ ...cell, textAlign: 'right' }}>{r.last30}</div>
          </Fragment>
        ))}
      </div>
    </div>
  )
}

/** One property in "🔍 TOP INTERESTS" — a deep-linked heading, its facts, and a relevance note. */
function InterestRow({ item }: { item: ClientPulseReportCard['interests'][number] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>
        <DeepLink href={item.href}>{item.address}</DeepLink>
        <span style={{ color: C.muted }}> · {item.views === 1 ? '1 view' : `${item.views} views`}</span>
      </div>
      <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>
        {item.priceLabel} · {item.beds} bd / {item.bathsLabel} · {item.sqftLabel} · {item.features}
      </div>
      <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{item.relevance}</div>
    </div>
  )
}

/** One prioritized row of "💡 SUGGESTED ACTIONS" — a priority chip, the ask, and any draft. */
function SuggestedActionRow({ action }: { action: ClientPulseReportCard['suggestedActions'][number] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Tag dataColor={PRIORITY_COLOR[action.priority] ?? 'graySubtle'}>{action.priority}</Tag>
        <span style={{ fontSize: 13.5, fontWeight: 700, color: C.dark }}>{action.title}</span>
      </div>
      <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.55 }}>{action.rationale}</div>
      {action.draft && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: C.dark }}>Ready to send:</span>
          <div
            style={{
              fontSize: 12.5,
              color: C.dark,
              lineHeight: 1.55,
              background: C.alt,
              borderRadius: 10,
              padding: '10px 12px',
            }}
          >
            {action.draft}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * The structured Client Pulse report: the group header + confidence tag, the client profile,
 * the engagement/intent read and its headline insight, the activity table, members and saved
 * searches, top property interests with deep links, prioritized suggested actions (the top one
 * carrying a ready-to-send draft), the overall confidence, and — when present — the upcoming
 * tour card. Ends on the "Completed" marker.
 */
function ClientPulseReportView({ card }: { card: ClientPulseReportCard }) {
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>👥 {card.clientName}</div>
          <Tag dataColor={CONFIDENCE_COLOR[card.confidenceLevel]}>
            Confidence: {card.confidenceLevel} ({card.confidencePercent}%)
          </Tag>
        </div>
        <div style={{ fontSize: 12.5, color: C.muted }}>
          Client since: {card.clientSince} ({card.clientSinceDays} days)
        </div>
      </div>

      {card.profile.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ReportHeading>👤 CLIENT PROFILE</ReportHeading>
          {card.profile.map((b, i) => (
            <NoteLine key={i} text={b} marker={<Bullet />} />
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12.5, color: C.dark, lineHeight: 1.55, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span>📊 Last active: {card.lastActive} ({card.lastActiveAgo})</span>
          <Tag dataColor={INTENT_COLOR[card.intentLevel]}>
            {card.intentEmoji} {card.intentLevel} intent
          </Tag>
        </div>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.55 }}>{card.intentNote}</div>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: C.dark, lineHeight: 1.5 }}>{card.headline}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <ReportHeading>📊 ACTIVITY SUMMARY</ReportHeading>
        <ActivityTable rows={card.activity} />
        <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55 }}>{card.activityNote}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <ReportHeading>👤 MEMBERS &amp; SAVED SEARCHES</ReportHeading>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.55 }}>
          <strong style={{ color: C.dark }}>Members:</strong> {card.members.join(', ')} — {card.membersNote}
        </div>
        {card.savedSearches.map((s, i) => (
          <NoteLine key={i} lead={`“${s.name}” — `} text={s.criteria} marker={<Bullet />} />
        ))}
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>{card.searchNote}</div>
      </div>

      {card.interests.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <ReportHeading>🔍 TOP INTERESTS</ReportHeading>
          <div style={{ fontSize: 12.5, color: C.muted }}>{card.interestsIntro}</div>
          {card.interests.map((it, i) => (
            <InterestRow key={i} item={it} />
          ))}
          <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.55 }}>
            <strong style={{ color: C.dark }}>Pattern:</strong> {card.pattern}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <ReportHeading>💡 SUGGESTED ACTIONS</ReportHeading>
        {card.suggestedActions.map((a, i) => (
          <SuggestedActionRow key={i} action={a} />
        ))}
      </div>

      {card.tour && <CatchUpTourCard tour={card.tour} />}

      <CompletedMarker />
    </div>
  )
}

/** One saved-listing row in the "Here's what I'm working with" selection card. */
function ListingRow({ p, checked }: { p: PlanProperty; checked: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 12,
        background: C.white,
        border: `1px solid ${C.hair}`,
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 2px rgba(26,24,22,0.05)',
      }}
    >
      <div style={{ position: 'relative', width: 96, flex: 'none' }}>
        <img
          src={p.photo}
          alt={p.line1}
          style={{ width: 96, height: '100%', objectFit: 'cover', display: 'block' }}
        />
        <span
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 20,
            height: 20,
            borderRadius: 5,
            background: checked ? C.dark : 'rgba(255,255,255,0.9)',
            border: checked ? 'none' : `1px solid ${C.border}`,
            color: C.white,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
        >
          {checked ? '✓' : ''}
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0, padding: '10px 12px 12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: C.sub }}>
          <StatusDot tone={p.statusTone} />
          {p.statusLabel}
        </div>
        <div className="ty-numeric-body100" style={{ fontWeight: 700, fontSize: 16, margin: '2px 0' }}>
          {formatMoney(p.price)}
        </div>
        <div className="ty-numeric-caption100" style={{ fontSize: 12.5, color: C.dark }}>
          <strong>{p.beds}</strong> bed&nbsp;&nbsp;<strong>{p.bathsLabel.replace(' BA', '')}</strong> bath
          {p.sqft !== null && (
            <>
              &nbsp;&nbsp;<strong>{p.sqft.toLocaleString('en-US')}</strong> sqft
            </>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: C.sub, marginTop: 4 }}>
          {p.line1}
          <br />
          {p.city}
        </div>
      </div>
    </div>
  )
}

/** `1125000` → `"$1,125,000"`. */
const formatMoney = (n: number) => `$${n.toLocaleString('en-US')}`

/**
 * "Here's what I'm working with" — the intro line and the saved-listing selection rows,
 * the first checked (as in the design).
 */
function TourListingsCardView({ card }: { card: TourListingsCard }) {
  const first = card.greetingName.split(' and ')[0]
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px' }}>
      <div style={{ fontSize: 13.5, color: C.dark, lineHeight: 1.55, marginBottom: 14 }}>
        I've got the details on the first {card.properties.length} listings in {card.greetingName}'s
        feed. Here's what I'm working with:
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {card.properties.map((p, i) => (
          <ListingRow key={p.order} p={p} checked={i === 0} />
        ))}
      </div>
      {/* first is referenced to keep the greeting split meaningful for screen readers */}
      <span style={{ display: 'none' }}>{first}</span>
    </div>
  )
}

/**
 * "Tour plan for X" — the ordered property table and the "A few things to note" bullets.
 * Ends by asking for a start time, verbatim from the design.
 */
function TourPlanCardView({ card, onChooseDateTime }: { card: TourPlanCard; onChooseDateTime: () => void }) {
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px' }}>
      <div style={{ fontFamily: 'inherit', fontWeight: 700, fontSize: 18, marginBottom: 6 }}>
        Tour plan for {card.client}
      </div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 12 }}>
        Here are the {card.properties.length} properties I'll be coordinating:
      </div>

      {/* The ordered property table — #, Address, Price, Beds/Baths, Sqft. */}
      <div style={{ border: `1px solid ${C.hair}`, borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '22px 1fr auto',
            gap: 8,
            padding: '10px 12px',
            background: C.alt,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: C.sub,
          }}
        >
          <span>#</span>
          <span>Address</span>
          <span style={{ textAlign: 'right' }}>Price · Beds/Baths</span>
        </div>
        {card.properties.map((p, i) => (
          <div
            key={p.order}
            style={{
              display: 'grid',
              gridTemplateColumns: '22px 1fr auto',
              gap: 8,
              padding: '10px 12px',
              borderTop: i === 0 ? 'none' : `1px solid ${C.alt}`,
              alignItems: 'center',
              fontSize: 12.5,
            }}
          >
            <span style={{ color: C.muted, fontWeight: 700 }}>{p.index}</span>
            <span style={{ color: C.action, fontWeight: 600, textDecoration: 'underline', minWidth: 0 }}>
              {p.line1}
            </span>
            <span style={{ textAlign: 'right', color: C.sub }}>
              <span className="ty-numeric-caption100" style={{ fontWeight: 700, color: C.dark }}>
                {formatMoney(p.price)}
              </span>
              <br />
              <span className="ty-numeric-caption100">
                {p.beds} BD / {p.bathsLabel}
                {p.sqft !== null && ` · ${p.sqft.toLocaleString('en-US')}`}
              </span>
            </span>
          </div>
        ))}
      </div>

      {card.notes.length > 0 && (
        <>
          <div style={{ fontWeight: 700, fontSize: 15, margin: '16px 0 8px' }}>
            A few things to note before we proceed:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {card.notes.map((n, i) => (
              <NoteLine key={i} lead={n.lead} text={n.text} marker={<Bullet />} />
            ))}
          </div>
        </>
      )}

      <div style={{ ...CARD_FOOTER, paddingLeft: 0, paddingRight: 0, paddingBottom: 0, marginTop: 16 }}>
        <DarkPill onClick={onChooseDateTime}>
          <IconCalendarClock size={13} />
          <span>Choose a date &amp; start time</span>
        </DarkPill>
      </div>
    </div>
  )
}

/** One field row in a "Showing Requirements" table. */
function FieldRow({ label, children, alt }: { label: string; children: React.ReactNode; alt: boolean }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '116px 1fr',
        gap: 10,
        padding: '8px 12px',
        background: alt ? C.alt : C.white,
        fontSize: 12.5,
        lineHeight: 1.4,
      }}
    >
      <span style={{ fontWeight: 700, color: C.dark }}>{label}</span>
      <span style={{ color: C.dark, minWidth: 0, wordBreak: 'break-word' }}>{children}</span>
    </div>
  )
}

/** One property's field table + draft message, for the outreach card. */
function OutreachProperty({ p, index }: { p: PlanProperty; index: number }) {
  const rows: Array<[string, React.ReactNode]> = [
    ['Listing Agent', p.agentName],
    ['Phone', p.phone],
    ['Email', <span style={{ color: C.action, textDecoration: 'underline' }}>{p.email}</span>],
    ['Status', p.status],
    ['Notice Required', p.noticeRequired],
    ['Access', p.access],
    ['Open House', p.openHouse],
    ['Urgency', p.urgency],
  ]
  return (
    <div>
      <div style={{ fontWeight: 700, fontSize: 15, margin: '0 0 8px' }}>
        {index}. {p.line1}, {p.city} —
      </div>
      <div style={{ border: `1px solid ${C.hair}`, borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '116px 1fr',
            gap: 10,
            padding: '8px 12px',
            background: C.alt,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: C.sub,
          }}
        >
          <span>Field</span>
          <span>Details</span>
        </div>
        {rows.map(([label, value], i) => (
          <FieldRow key={label} label={label} alt={i % 2 === 1}>
            {value}
          </FieldRow>
        ))}
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, margin: '12px 0 4px' }}>Draft message (Text):</div>
      <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.55 }}>{p.draft}</div>
    </div>
  )
}

/** "📝 Tour Timeline — X" — the routing note and the proposed schedule table. */
function TourTimelineCardView({ card }: { card: TimelineCard }) {
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px' }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>📝 Tour Timeline — {card.members}</div>
      <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.55, marginBottom: 14 }}>
        <strong>Note on routing:</strong> {card.routingNote}
      </div>

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Proposed schedule</div>
      <div style={{ border: `1px solid ${C.hair}`, borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 8,
            padding: '10px 12px',
            background: C.alt,
            fontSize: 10.5,
            fontWeight: 700,
            letterSpacing: '0.04em',
            color: C.sub,
          }}
        >
          <span>Time · Property</span>
          <span>Duration</span>
        </div>
        {card.properties.map((p, i) => (
          <div key={p.order}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 8,
                padding: '10px 12px',
                borderTop: i === 0 ? 'none' : `1px solid ${C.alt}`,
                alignItems: 'flex-start',
                fontSize: 12.5,
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span className="ty-numeric-caption100" style={{ fontWeight: 700, color: C.dark }}>
                  {p.timeRange}
                </span>
                <br />
                <span style={{ color: C.action, fontWeight: 600, textDecoration: 'underline' }}>
                  {p.line1}, {p.city}
                </span>
              </span>
              <span style={{ color: C.sub, whiteSpace: 'nowrap' }}>{p.duration}</span>
            </div>
            {p.travelToNext && (
              <div
                style={{
                  padding: '6px 12px',
                  borderTop: `1px solid ${C.alt}`,
                  fontStyle: 'italic',
                  fontSize: 12,
                  color: C.muted,
                }}
              >
                {p.travelToNext}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ fontSize: 13, color: C.dark, marginTop: 14, lineHeight: 1.6 }}>
        <strong>Total duration: {card.totalDuration}</strong>
        <br />
        <strong>Estimated finish: {card.finish}</strong>
      </div>
    </div>
  )
}

/** "📝 Showing Requirements & Outreach" — the per-property field tables and drafts. */
function TourOutreachCardView({ card }: { card: OutreachCard }) {
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px' }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>📝 Showing Requirements &amp; Outreach</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        {card.properties.map((p, i) => (
          <OutreachProperty key={p.order} p={p} index={i + 1} />
        ))}
      </div>
    </div>
  )
}

/** "⚠️ Potential Conflicts" + "✅ Recommended Next Steps" + confidence + what-next. */
function TourSummaryCardView({ card, onConfirm }: { card: SummaryCard; onConfirm: () => void }) {
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px' }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>⚠️ Potential Conflicts</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {card.conflicts.map((n, i) => (
          <NoteLine key={i} lead={n.lead} text={n.text} marker={<Bullet />} />
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${C.alt}`, margin: '16px 0' }} />

      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 10 }}>
        ✅ Recommended Next Steps (Priority Order)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {card.steps.map((n, i) => (
          <NoteLine key={i} lead={n.lead} text={n.text} marker={<Bullet />} />
        ))}
      </div>

      <div style={{ borderTop: `1px solid ${C.alt}`, margin: '16px 0' }} />

      <div style={{ fontSize: 13, color: C.dark, lineHeight: 1.55 }}>
        <strong>{card.confidence.lead}</strong>
        {card.confidence.text}
      </div>

      <div style={{ borderTop: `1px solid ${C.alt}`, margin: '16px 0' }} />

      <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>What would you like to do next?</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {card.nextOptions.map((opt, i) => (
          <NoteLine key={i} text={opt} marker={<Bullet />} />
        ))}
      </div>

      <div style={{ ...CARD_FOOTER, paddingLeft: 0, paddingRight: 0, paddingBottom: 0 }}>
        <DarkPill onClick={onConfirm}>
          <IconCalendarClock size={13} />
          <span>Confirm &amp; schedule</span>
        </DarkPill>
      </div>
    </div>
  )
}

/**
 * The final "Upcoming Tour" panel: the scheduled tour, its stops with photos and status,
 * and the follow-on suggestion chips.
 */
function UpcomingTourCardView({ card, onSuggest }: { card: UpcomingTourCard; onSuggest: (s: string) => void }) {
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px' }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{card.title}</div>
      <div style={{ fontSize: 13, color: C.sub, marginBottom: 14 }}>
        {card.greetingName} have a tour scheduled with {card.stopCount} stops:
      </div>

      <div style={{ border: `1px solid ${C.hair}`, borderRadius: 12, padding: '14px 14px 4px', background: C.canvas }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>Tour: {card.members}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, color: C.sub, marginBottom: 12 }}>
          <span>{card.dateLabel}</span>
          <span>{card.stopCount} stops</span>
        </div>
        {card.stops.map((s) => (
          <div key={s.line1} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderTop: `1px solid ${C.alt}` }}>
            <img
              src={s.photo}
              alt={s.line1}
              style={{ width: 64, height: 64, flex: 'none', borderRadius: 10, objectFit: 'cover', display: 'block' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub }}>
                <StatusDot tone={s.statusTone} />
                {s.statusLabel}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, margin: '1px 0' }}>{s.line1}</div>
              <div className="ty-numeric-caption100" style={{ fontSize: 12.5, color: C.dark }}>
                <strong>{s.beds}</strong> bed&nbsp;&nbsp;<strong>{s.bathsLabel.replace(' BA', '')}</strong> bath
                {s.sqft !== null && (
                  <>
                    &nbsp;&nbsp;<strong>{s.sqft.toLocaleString('en-US')}</strong> sqft
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '16px 0 10px', color: C.brand, fontWeight: 700, fontSize: 13 }}>
        <IconCircleCheck size={16} />
        Completed
      </div>
      <div style={{ borderTop: `1px solid ${C.alt}`, paddingTop: 12 }}>
        <div style={{ fontSize: 12.5, color: C.sub, marginBottom: 8 }}>Suggestions:</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {card.suggestions.map((s) => (
            <ActionCard
              key={s}
              bordered
              title={s}
              media={
                <span style={{ display: 'flex', color: C.brand }}>
                  <IconSpark size={16} />
                </span>
              }
              mediaPosition="center"
              iconIndicator="arrow"
              linkProps={{ onClick: () => onSuggest(s), 'aria-label': s }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/** The seven weekday initials the calendar heads its columns with. */
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/**
 * Step 1 — "For whom do you wish to coordinate a tour?". A card of client chips; tapping one
 * sends its prompt (which names the client) to advance to the listing-selection step.
 */
function ClientPickerCardView({ card, onPick }: { card: ClientPickerCard; onPick: (prompt: string) => void }) {
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px' }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{card.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {card.clients.map((c) => (
          <HoverButton
            key={c.id}
            onClick={() => onPick(c.prompt)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              width: '100%',
              textAlign: 'left',
              background: C.white,
              border: `1px solid ${C.hair}`,
              borderRadius: 12,
              padding: '10px 12px',
              cursor: 'pointer',
              transition: 'border-color 120ms, box-shadow 120ms',
            }}
            hoverStyle={{ borderColor: C.border, boxShadow: '0 2px 10px rgba(26,24,22,0.08)' }}
          >
            <Initials initials={c.initials} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: 'block', fontWeight: 700, fontSize: 13.5, color: C.dark }}>{c.name}</span>
              <span style={{ display: 'block', fontSize: 11.5, color: C.muted }}>{c.meta}</span>
            </span>
            <Tag dataColor={c.dataColor}>{c.stage}</Tag>
          </HoverButton>
        ))}
      </div>
    </div>
  )
}

/**
 * Step 2 — "How would you like to select listings?". Three methods; only the wired one is
 * clickable, the others render as disabled "Coming soon" rows.
 */
function SelectMethodCardView({ card, onPick }: { card: SelectMethodCard; onPick: (prompt: string) => void }) {
  return (
    <div style={{ ...CHAT_CARD, padding: '16px 16px 18px' }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>{card.title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {card.methods.map((m) =>
          m.enabled ? (
            <ActionCard
              key={m.label}
              bordered
              title={m.label}
              media={
                <span style={{ display: 'flex', color: C.brand }}>
                  <IconSpark size={16} />
                </span>
              }
              mediaPosition="center"
              iconIndicator="arrow"
              linkProps={{ onClick: () => onPick(m.prompt), 'aria-label': m.label }}
            >
              {m.description}
            </ActionCard>
          ) : (
            // Disabled: no CardLink, so it renders as a non-interactive card, not a button.
            <ActionCard key={m.label} bordered title={m.label} style={{ opacity: 0.7 }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span>
                  <Tag>Coming soon</Tag>
                </span>
                {m.description}
              </span>
            </ActionCard>
          )
        )}
      </div>
    </div>
  )
}

/**
 * Step 4 — the calendar plus start-time chips. A day and a time are picked together; once
 * both are in hand the card sends the prompt that builds the full coordination plan.
 */
function DateTimeCardView({ card, onPick }: { card: DateTimeCard; onPick: (dayLabel: string, time: string) => void }) {
  // Local, so the day and time mark before the round-trip. A time defaults to the first chip
  // so tapping the suggested day alone is enough to proceed.
  const [picked, setPicked] = useState<number | null>(null)
  const [time, setTime] = useState<string>(card.times[1] ?? card.times[0])
  const daysInMonth = new Date(card.year, card.month + 1, 0).getDate()
  const firstWeekday = new Date(card.year, card.month, 1).getDay()
  // Leading blanks so the 1st lands under its weekday column.
  const cells: Array<number | null> = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const label = (day: number) =>
    `${new Date(card.year, card.month, day).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`

  return (
    <div style={CHAT_CARD}>
      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>Choose a date and start time</div>
        <div style={{ fontSize: 11.5, color: C.muted }}>
          {card.address ? `Starting at ${card.address}` : card.client}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${C.alt}`, padding: '12px 16px' }}>
        <div style={{ fontWeight: 600, fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
          {MONTH_NAMES[card.month]} {card.year}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
          {WEEKDAYS.map((d, i) => (
            <div key={i} style={{ textAlign: 'center', fontSize: 10.5, fontWeight: 700, color: C.muted, paddingBottom: 4 }}>
              {d}
            </div>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <div key={`b${i}`} />
            const isPicked = picked === day
            const isSuggested = picked === null && day === card.suggestedDay
            const marked = isPicked || isSuggested
            return (
              <HoverButton
                key={day}
                onClick={() => setPicked(day)}
                aria-label={label(day)}
                aria-pressed={isPicked}
                style={{
                  aspectRatio: '1 / 1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isSuggested ? `1px solid ${C.brand}` : '1px solid transparent',
                  borderRadius: '50%',
                  background: isPicked ? C.brand : 'transparent',
                  color: isPicked ? C.white : C.dark,
                  fontSize: 12.5,
                  fontWeight: marked ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'background 120ms, border-color 120ms',
                }}
                hoverStyle={{ background: isPicked ? C.brand : C.alt }}
              >
                {day}
              </HoverButton>
            )
          })}
        </div>
      </div>

      {/* Start-time chips — one stays selected, defaulting to the second slot. */}
      <div style={{ borderTop: `1px solid ${C.alt}`, padding: '12px 16px' }}>
        <div style={{ fontWeight: 700, fontSize: 12, color: C.sub, marginBottom: 8 }}>Start time</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {card.times.map((tOpt) => {
            const on = tOpt === time
            return (
              <HoverButton
                key={tOpt}
                onClick={() => setTime(tOpt)}
                aria-pressed={on}
                style={{
                  ...PILL_BASE,
                  background: on ? C.action : C.white,
                  color: on ? C.white : C.dark,
                  border: `1px solid ${on ? C.action : C.border}`,
                  padding: '6px 12px',
                  fontSize: 12,
                  transition: 'background 120ms, border-color 120ms',
                }}
                hoverStyle={on ? { background: C.dark } : { borderColor: C.dark }}
              >
                {tOpt}
              </HoverButton>
            )
          })}
        </div>
      </div>

      <div style={{ ...CARD_FOOTER, alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11.5, color: C.muted }}>
          Suggested: {MONTH_NAMES[card.month].slice(0, 3)} {card.suggestedDay}
        </span>
        <DarkPill onClick={() => onPick(label(picked ?? card.suggestedDay), time)}>
          <IconCalendarClock size={13} />
          <span>Build the plan</span>
        </DarkPill>
      </div>
    </div>
  )
}

/**
 * The assistant's home state is a menu of what RealAssist+ can do. Each card names a
 * capability and, when tapped, sends its `prompt` to kick that flow off in the transcript.
 */
interface Capability {
  icon: ComponentType<{ size?: number }>
  title: string
  body: string
  prompt: string
}

const CAPABILITIES: Capability[] = [
  {
    icon: IconUserAddToProfile,
    title: 'Add Client',
    body: 'Guide agent through client onboarding with members, search, and notes',
    prompt: 'Add a new client',
  },
  {
    icon: IconAgent,
    title: 'Catch Up',
    body: 'Daily briefing that analyzes unread messages, notifications, and recent activity to suggest prioritized actions',
    prompt: 'Catch me up',
  },
  {
    icon: IconPerformance,
    title: 'Client Pulse',
    body: 'Analyze a client to get deeper insights, engagement patterns, member activity, and actionable suggestions',
    prompt: 'Show me a client pulse',
  },
  {
    icon: HavenCircleCheck,
    title: 'Check Listing Status',
    body: 'Check if a client received a listing and analyze their interactions',
    prompt: 'Check listing status for a client',
  },
  {
    icon: IconComment,
    title: 'Manage Client Notes',
    body: 'Add, view, or modify persistent client notes (memory) for any client group',
    prompt: 'Manage client notes',
  },
  {
    icon: IconAiSearch,
    title: 'Search Optimization',
    body: 'Analyze client behavior to detect preferences and recommend search refinements',
    prompt: 'Optimize a client search',
  },
  {
    icon: IconCalendarTime,
    title: 'Coordinate Tour',
    body: 'Coordinate showings with timeline, instructions, and outreach messages',
    prompt: 'Create a tour',
  },
]

function CapabilityCard({ cap, onClick }: { cap: Capability; onClick: () => void }) {
  const Icon = cap.icon
  return (
    <ActionCard
      // `ra-cap-card` flips ActionCard's inner media/body row to a column (see shell.css),
      // so the icon stacks above the title.
      className="ra-cap-card"
      title={cap.title}
      media={
        <span style={{ display: 'flex', color: C.dark }}>
          {/* Haven icons size in multiples of 8px; 3 → 24px. */}
          <Icon size={3} />
        </span>
      }
      mediaPosition="start"
      linkProps={{ onClick, 'aria-label': cap.title }}
    >
      {cap.body}
    </ActionCard>
  )
}

function BusyBubble() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 5,
        alignItems: 'center',
        background: C.white,
        border: `1px solid ${C.hair}`,
        borderRadius: '16px 16px 16px 4px',
        padding: '14px 16px',
        width: 'fit-content',
      }}
    >
      {[0, 0.2, 0.4].map((delay) => (
        <span
          key={delay}
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: C.muted,
            animation: `raPulse 1s ease-in-out ${delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

/**
 * The message composer. `variant` switches between the home state — a pill with an
 * outline arrow and the placeholder the design specifies — and the conversation state,
 * which keeps the filled brand send button. Both submit on Enter and on the arrow.
 */
function Composer({
  input,
  onInput,
  onSend,
  variant,
}: {
  input: string
  onInput: (v: string) => void
  onSend: (text: string) => void
  variant: 'home' | 'chat'
}) {
  const disabled = !input.trim()
  const home = variant === 'home'
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        background: C.white,
        border: `1px solid ${C.border}`,
        borderRadius: 24,
        padding: '5px 5px 5px 18px',
      }}
    >
      <input
        value={input}
        onChange={(e) => onInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            onSend(input)
          }
        }}
        placeholder={home ? 'How can I help you today?' : 'Ask about clients, tours, or listings'}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: home ? 15 : 13.5,
          color: C.dark,
          padding: home ? '11px 0' : '9px 0',
        }}
      />
      <HoverButton
        onClick={() => onSend(input)}
        aria-label="Send"
        title="Send"
        style={
          home
            ? {
                width: 40,
                height: 40,
                flex: 'none',
                borderRadius: '50%',
                border: 'none',
                background: 'transparent',
                color: C.dark,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: disabled ? 0.45 : 1,
                transition: 'background 120ms',
              }
            : {
                width: 36,
                height: 36,
                flex: 'none',
                borderRadius: '50%',
                border: `1px solid ${C.brand}`,
                background: C.brand,
                color: C.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                opacity: disabled ? 0.4 : 1,
                transition: 'all 120ms',
              }
        }
        hoverStyle={home ? { background: C.alt } : { background: C.sendHover, borderColor: C.sendHover }}
      >
        {home ? <IconComposerSend /> : <IconSend />}
      </HoverButton>
    </div>
  )
}

export function AssistantPanel({
  width,
  open,
  mobile = false,
  expanded,
  over,
  resize,
  resizing = false,
  msgs,
  busy,
  input,
  chatRef,
  threads,
  threadQuery,
  onInput,
  onSend,
  onThreadQuery,
  onToggleOver,
  onCloseOver,
  onToggleExpand,
  onClose,
  onNewChat,
}: AssistantPanelProps) {
  const dockW = over && expanded ? 300 : 0
  const overX = over && !expanded ? 0 : 112

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 20,
        width,
        // Held visible until the close transition ends, so the panel animates out rather
        // than vanishing, then drops out of the tab order and the a11y tree.
        visibility: open ? 'visible' : 'hidden',
        // No easing mid-drag: the edge has to sit under the pointer, not chase it.
        transition: resizing
          ? 'none'
          : `width 220ms ${EASE}, visibility 0s linear ${open ? 0 : 220}ms`,
        overflow: 'hidden',
        background: C.canvas,
        display: 'flex',
      }}
    >
      {resize && <ResizeHandle {...resize} />}

      <div style={{ width: '100%', display: 'flex', borderLeft: `1px solid ${C.hair}`, overflow: 'hidden' }}>
        <div
          style={{
            width: dockW,
            transition: `width 220ms ${EASE}`,
            flex: 'none',
            overflow: 'hidden',
            background: C.hair,
            display: 'flex',
          }}
        >
          <div
            style={{
              width: 300,
              flex: 'none',
              display: 'flex',
              flexDirection: 'column',
              borderRight: `1px solid ${C.border}`,
            }}
          >
            <ThreadsList
              threads={threads}
              query={threadQuery}
              onQuery={onThreadQuery}
              onClose={onCloseOver}
              onNewChat={onNewChat}
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: mobile ? 4 : 10,
              padding: mobile ? '12px 8px 10px 12px' : '16px 16px 12px 20px',
            }}
          >
            <CircleButton
              onClick={onToggleOver}
              hoverBg={C.hair}
              aria-label="Open threads"
              title="Open threads"
              style={{ background: over ? C.hair : 'transparent' }}
            >
              <IconHamburger size={16} />
            </CircleButton>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <img
                src="assets/logo-realassist-ai.svg"
                alt="RealAssist AI+"
                style={{ height: 28.6, display: 'block', flex: 'none' }}
              />
            </div>
            {/* Nothing to expand into on mobile — the panel already fills the viewport. */}
            {!mobile && (
              <CircleButton
                onClick={onToggleExpand}
                hoverBg={C.hair}
                aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
                title={expanded ? 'Collapse panel' : 'Expand panel'}
              >
                {expanded ? <IconCollapsePanel /> : <IconExpandPanel />}
              </CircleButton>
            )}
            <CircleButton onClick={onClose} hoverBg={C.hair} aria-label="Close panel" title="Close panel">
              <IconClose />
            </CircleButton>
          </div>

          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              padding: mobile ? '0 12px 12px' : '0 16px 16px',
            }}
          >
            <div ref={chatRef} className="ra-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
              <div
                style={{
                  maxWidth: 720,
                  margin: '0 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  padding: '4px 4px 12px',
                }}
              >
                {/*
                  Home state: the composer leads, and below it a menu of what RealAssist+
                  can do. Once the first message lands it gives way to the transcript, and
                  the composer drops to its usual place at the foot of the panel.
                */}
                {msgs.length === 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <Composer input={input} onInput={onInput} onSend={onSend} variant="home" />
                      <div style={{ textAlign: 'center', fontSize: 12, color: C.sub }}>
                        By using our AI, you agree to our{' '}
                        <a href="#" style={{ color: C.dark, fontWeight: 600 }}>
                          Terms
                        </a>{' '}
                        &{' '}
                        <a href="#" style={{ color: C.dark, fontWeight: 600 }}>
                          Privacy Policy
                        </a>
                        .
                      </div>
                    </div>

                    {/*
                      A responsive grid of capability cards: columns that each hold at least
                      288px, so the docked panel shows one card per row and a wide (expanded or
                      fullscreen) panel fans out to two or more across. `auto-fit` collapses empty
                      tracks so a lone card stretches full width, and `min(100%, …)` keeps a single
                      column from overflowing a very narrow panel.
                    */}
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 288px), 1fr))',
                        gap: 12,
                        marginTop: 8,
                      }}
                    >
                      {CAPABILITIES.map((cap) => (
                        <CapabilityCard key={cap.title} cap={cap} onClick={() => onSend(cap.prompt)} />
                      ))}
                    </div>
                  </div>
                )}

                {msgs.map((m, i) => {
                  const user = m.role === 'user'
                  // A selection prompt is spent once it's no longer the last message: the
                  // user has answered it, so it drops out of history rather than inviting a
                  // second, flow-breaking choice.
                  const spentPicker =
                    m.card != null && PICKER_KINDS.has(m.card.kind) && i !== msgs.length - 1
                  if (spentPicker && !m.text) return null
                  return (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: user ? 'flex-end' : 'flex-start',
                        gap: 8,
                      }}
                    >
                      {!!m.text && (
                        <div
                          style={{
                            // The user bubble's 322px ceiling has to yield on a narrow
                            // panel, or its 24px side padding pushes the text out.
                            maxWidth: user ? 'min(322px, 88%)' : '88%',
                            background: user ? C.userBubble : C.white,
                            color: C.dark,
                            border: `1px solid ${user ? 'transparent' : C.hair}`,
                            borderRadius: user ? '16px 16px 0px 16px' : '16px 16px 16px 4px',
                            boxShadow: user ? '0 1px 4px rgba(43,43,43,0.16)' : 'none',
                            padding: user ? '12px 24px' : '10px 14px',
                            fontSize: user ? 16 : 13.5,
                            fontWeight: user ? 500 : 400,
                            lineHeight: user ? '24px' : 1.55,
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {m.text}
                        </div>
                      )}
                      {user && !!m.text && (
                        <span
                          style={{
                            fontSize: 14,
                            lineHeight: '20px',
                            fontWeight: 400,
                            color: C.timestamp,
                            textAlign: 'right',
                          }}
                        >
                          Just now
                        </span>
                      )}
                      {m.card?.kind === 'client' && (
                        <ClientCardView
                          card={m.card}
                          onDraft={() =>
                            onSend(`Draft a short check-in text I can send to ${(m.card as ClientCard).name}`)
                          }
                        />
                      )}
                      {m.card?.kind === 'tour' && <TourCardView card={m.card} />}
                      {m.card?.kind === 'clientPicker' && !spentPicker && (
                        <ClientPickerCardView card={m.card} onPick={(prompt) => onSend(prompt)} />
                      )}
                      {m.card?.kind === 'selectMethod' && !spentPicker && (
                        <SelectMethodCardView card={m.card} onPick={(prompt) => onSend(prompt)} />
                      )}
                      {m.card?.kind === 'toolTrace' && <ToolTraceView card={m.card} />}
                      {m.card?.kind === 'tourListings' && <TourListingsCardView card={m.card} />}
                      {m.card?.kind === 'tourPlan' && (
                        <TourPlanCardView
                          card={m.card}
                          onChooseDateTime={() =>
                            onSend(`Choose a date and start time for ${(m.card as TourPlanCard).greetingName}`)
                          }
                        />
                      )}
                      {m.card?.kind === 'tourTimeline' && <TourTimelineCardView card={m.card} />}
                      {m.card?.kind === 'tourOutreach' && <TourOutreachCardView card={m.card} />}
                      {m.card?.kind === 'tourSummary' && (
                        <TourSummaryCardView
                          card={m.card}
                          onConfirm={() => onSend(`Schedule the tour for ${(m.card as SummaryCard).greetingName}`)}
                        />
                      )}
                      {m.card?.kind === 'upcomingTour' && (
                        <UpcomingTourCardView card={m.card} onSuggest={(s) => onSend(s)} />
                      )}
                      {m.card?.kind === 'dateTime' && (
                        <DateTimeCardView
                          card={m.card}
                          onPick={(dayLabel, time) =>
                            onSend(
                              `Start the tour for ${(m.card as DateTimeCard).greetingName} on ${dayLabel} at ${time}`
                            )
                          }
                        />
                      )}
                      {m.card?.kind === 'toolRun' && <ToolRunView card={m.card} />}
                      {m.card?.kind === 'toolGroup' &&
                        (m.card.revealMs != null ? (
                          <Delayed ms={m.card.revealMs}>
                            <ToolGroupView card={m.card} />
                          </Delayed>
                        ) : (
                          <ToolGroupView card={m.card} />
                        ))}
                      {m.card?.kind === 'addClientMessage' &&
                        (m.card.revealMs != null ? (
                          <Delayed ms={m.card.revealMs}>
                            <AddClientMessageView card={m.card} onSend={onSend} />
                          </Delayed>
                        ) : (
                          <AddClientMessageView card={m.card} onSend={onSend} />
                        ))}
                      {m.card?.kind === 'catchUpTools' &&
                        (m.card.revealMs != null ? (
                          <Delayed ms={m.card.revealMs}>
                            <CatchUpToolsView card={m.card} />
                          </Delayed>
                        ) : (
                          <CatchUpToolsView card={m.card} />
                        ))}
                      {m.card?.kind === 'catchUpBriefing' && (
                        <Delayed ms={CATCH_UP_REVEAL_MS}>
                          <CatchUpBriefingView card={m.card} />
                        </Delayed>
                      )}
                      {m.card?.kind === 'searchOptPicker' && !spentPicker && (
                        <SearchOptPickerView card={m.card} onPick={(prompt) => onSend(prompt)} />
                      )}
                      {m.card?.kind === 'searchOptClient' && <SearchOptClientView card={m.card} />}
                      {m.card?.kind === 'searchAnalysis' && (
                        <Delayed ms={m.card.revealMs ?? 0}>
                          <SearchAnalysisView card={m.card} />
                        </Delayed>
                      )}
                      {m.card?.kind === 'clientPulseReport' && (
                        <Delayed ms={m.card.revealMs ?? 0}>
                          <ClientPulseReportView card={m.card} />
                        </Delayed>
                      )}
                      {m.card?.kind === 'actionPicker' && !spentPicker && (
                        <Delayed ms={m.card.revealMs ?? CATCH_UP_REVEAL_MS + 200}>
                          <ActionPickerView card={m.card} onSend={onSend} />
                        </Delayed>
                      )}
                    </div>
                  )
                })}

                {busy && <BusyBubble />}
              </div>
            </div>

            {/*
              Once a conversation is under way the composer lives at the foot of the panel.
              On the home state it leads the content above instead, so this is hidden.
            */}
            {msgs.length > 0 && (
              <div
                style={{
                  maxWidth: 720,
                  margin: '0 auto',
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                }}
              >
                <Composer input={input} onInput={onInput} onSend={onSend} variant="chat" />

                <div style={{ textAlign: 'center', fontSize: 10.5, color: C.muted }}>
                  RealAssist+ can make mistakes. Verify listing details before sharing.
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              background: C.hair,
              borderLeft: `1px solid ${C.border}`,
              boxShadow: '-4px 0 16px rgba(26,24,22,0.12)',
              display: 'flex',
              flexDirection: 'column',
              transform: `translateX(${overX}%)`,
              transition: `transform 220ms ${EASE}`,
            }}
          >
            <ThreadsList
              threads={threads}
              query={threadQuery}
              onQuery={onThreadQuery}
              onClose={onCloseOver}
              onNewChat={onNewChat}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
