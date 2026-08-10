/**
 * RealAssist+ push panel: threads dock, chat header, nudge cards, transcript, composer,
 * and the sliding threads overlay. Slides in from the right of `main` and can expand to
 * fill everything but the nav rail.
 */
import { Tag } from '@rdc-npm/rdc-ui-v4'
import { useState } from 'react'
import type { RefObject } from 'react'
import { C, DISPLAY_FONT, EASE } from '../theme'
import { CircleButton, HoverButton, Initials } from '../components/primitives'
import { ResizeHandle, type ResizeHandleProps } from '../components/ResizeHandle'
import { ThreadsList } from './ThreadsList'
import {
  IconClose,
  IconCollapsePanel,
  IconExpandPanel,
  IconHamburger,
  IconHomeFilled,
  IconSend,
  IconSpark,
} from '../icons'
import { AGENT_FIRST_NAME, CHIPS, assistantNudges, attentionCount, type Thread } from '../data'
import type {
  Card,
  ClientCard,
  DatePickerCard,
  TourCard,
  TourPlanCard,
  TourStopRow,
  TourStep,
} from '../assistant'

export interface Msg {
  role: 'user' | 'ai'
  text: string
  card?: Card
}

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

const NUDGE_CARD = {
  background: C.white,
  border: `1px solid ${C.hair}`,
  borderRadius: 16,
  padding: '14px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 10,
  boxShadow: '0 1px 2px rgba(26,24,22,0.05)',
} as const

const CHAT_CARD = {
  width: '100%',
  maxWidth: 340,
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

/** Stop-status → Tag colour, mirroring the client-stage mapping the shell already uses. */
const STOP_STATUS_COLOR: Record<TourStopRow['status'], 'greenSubtle' | 'orangeSubtle' | 'graySubtle'> = {
  Confirmed: 'greenSubtle',
  Requested: 'orangeSubtle',
  'No status': 'graySubtle',
}

/** Confidence → the dot colour before a ranked step. */
const CONFIDENCE_COLOR: Record<TourStep['confidence'], string> = {
  high: C.online,
  medium: C.amber,
  low: C.muted,
}

function TourPlanCardView({ card, onStart }: { card: TourPlanCard; onStart: () => void }) {
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
          <div style={{ fontWeight: 700, fontSize: 14 }}>Tour plan for {card.client}</div>
          <div className="ty-numeric-caption100" style={{ fontSize: 12, color: C.sub }}>
            {card.when} · {card.driveLabel}
          </div>
        </div>
      </div>

      {/* The stops, in tour order — the table the image leads with. */}
      <div style={CARD_SECTION}>
        {card.stops.map((stop) => (
          <div key={stop.order} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span
              style={{
                width: 20,
                height: 20,
                flex: 'none',
                borderRadius: '50%',
                background: C.alt,
                color: C.sub,
                fontSize: 11,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: 1,
              }}
            >
              {stop.order}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>{stop.address}</div>
              <div className="ty-numeric-caption100" style={{ fontSize: 11.5, color: C.muted }}>
                {stop.meta}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3, flex: 'none' }}>
              <Tag dataColor={STOP_STATUS_COLOR[stop.status]}>{stop.status}</Tag>
              <span style={{ fontSize: 11, color: C.sub }}>{stop.time}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Potential conflicts — only when the tour has any. */}
      {card.conflicts.length > 0 && (
        <div style={CARD_SECTION}>
          <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: C.brand }}>
            POTENTIAL CONFLICTS
          </div>
          {card.conflicts.map((conflict, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span
                style={{ width: 5, height: 5, flex: 'none', borderRadius: '50%', background: C.brand, marginTop: 6 }}
              />
              <span style={{ color: C.sub, lineHeight: 1.5 }}>{conflict}</span>
            </div>
          ))}
        </div>
      )}

      {/* Recommended next steps, in priority order, each with a confidence dot. */}
      <div style={CARD_SECTION}>
        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '0.08em', color: C.muted }}>
          RECOMMENDED NEXT STEPS
        </div>
        {card.steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: C.muted, fontWeight: 700, flex: 'none' }}>{i + 1}.</span>
            <span style={{ flex: 1, color: C.dark, lineHeight: 1.5 }}>{step.label}</span>
            <span
              title={`${step.confidence} confidence`}
              style={{
                width: 8,
                height: 8,
                flex: 'none',
                borderRadius: '50%',
                background: CONFIDENCE_COLOR[step.confidence],
                marginTop: 5,
              }}
            />
          </div>
        ))}
      </div>

      <div style={CARD_FOOTER}>
        <DarkPill onClick={onStart}>
          <IconSpark size={12} />
          <span>Start the tour</span>
        </DarkPill>
        <LightPill padding="6px 13px" fontSize={12}>
          Edit plan
        </LightPill>
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

function DatePickerCardView({ card, onPick }: { card: DatePickerCard; onPick: (day: number, label: string) => void }) {
  // Local, so tapping a day marks it before the scheduling round-trips.
  const [picked, setPicked] = useState<number | null>(null)
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
        <div style={{ fontWeight: 700, fontSize: 14 }}>Pick a day for the tour</div>
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
                onClick={() => {
                  setPicked(day)
                  onPick(day, label(day))
                }}
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

      <div style={{ ...CARD_FOOTER, alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11.5, color: C.muted }}>
          Suggested: {MONTH_NAMES[card.month].slice(0, 3)} {card.suggestedDay}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: C.sub }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', border: `1px solid ${C.brand}` }} />
          Best fit
        </span>
      </div>
    </div>
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
  const sendDisabled = busy || !input.trim()

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
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 0 2px' }}>
                  <div
                    style={{
                      fontFamily: DISPLAY_FONT,
                      fontWeight: 700,
                      fontSize: 17,
                      letterSpacing: '-0.01em',
                    }}
                  >
                    Good morning, {AGENT_FIRST_NAME}
                  </div>
                  <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>
                    Ask about your clients, set up tours, or pull listing context.
                    {attentionCount > 0 &&
                      ` ${attentionCount} ${attentionCount === 1 ? 'thing needs' : 'things need'} attention today.`}
                  </div>
                </div>

                {attentionCount > 0 && (
                  <div
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      letterSpacing: '0.09em',
                      color: C.brand,
                      marginTop: 4,
                    }}
                  >
                    NEEDS ATTENTION
                  </div>
                )}

                {assistantNudges.map((nudge) => (
                  <div key={nudge.title} style={NUDGE_CARD}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700 }}>{nudge.title}</div>
                      <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.5 }}>{nudge.body}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {nudge.actions.map((action, i) =>
                        i === 0 ? (
                          <DarkPill key={action.label} onClick={() => onSend(action.prompt)}>
                            <IconSpark size={12} />
                            <span>{action.label}</span>
                          </DarkPill>
                        ) : (
                          <LightPill key={action.label} onClick={() => onSend(action.prompt)}>
                            <IconSpark size={12} style={{ color: C.brand }} />
                            <span>{action.label}</span>
                          </LightPill>
                        )
                      )}
                    </div>
                  </div>
                ))}

                {msgs.map((m, i) => {
                  const user = m.role === 'user'
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
                      {m.card?.kind === 'tourPlan' && (
                        <TourPlanCardView
                          card={m.card}
                          onStart={() =>
                            onSend(`Start the tour for ${(m.card as TourPlanCard).greetingName}`)
                          }
                        />
                      )}
                      {m.card?.kind === 'datePicker' && (
                        <DatePickerCardView
                          card={m.card}
                          onPick={(_day, label) =>
                            onSend(
                              `Schedule the tour for ${(m.card as DatePickerCard).greetingName} at ${(m.card as DatePickerCard).address} on ${label}`
                            )
                          }
                        />
                      )}
                    </div>
                  )
                })}

                {busy && <BusyBubble />}
              </div>
            </div>

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
              <div style={{ display: msgs.length ? 'none' : 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CHIPS.map((label) => (
                  <HoverButton
                    key={label}
                    onClick={() => onSend(label)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      background: C.white,
                      color: C.dark,
                      border: `1px solid ${C.border}`,
                      borderRadius: 40,
                      padding: '7px 13px',
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 120ms',
                    }}
                    hoverStyle={{ borderColor: C.dark }}
                  >
                    <IconSpark size={12} style={{ color: C.brand, flex: 'none' }} />
                    <span>{label}</span>
                  </HoverButton>
                ))}
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 8,
                  background: C.white,
                  border: `1px solid ${C.border}`,
                  borderRadius: 24,
                  padding: '5px 5px 5px 16px',
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
                  placeholder="Ask about clients, tours, or listings"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    border: 'none',
                    outline: 'none',
                    background: 'transparent',
                    fontSize: 13.5,
                    color: C.dark,
                    padding: '9px 0',
                  }}
                />
                <HoverButton
                  onClick={() => onSend(input)}
                  aria-label="Send"
                  title="Send"
                  style={{
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
                    opacity: sendDisabled ? 0.4 : 1,
                    transition: 'all 120ms',
                  }}
                  hoverStyle={{ background: C.sendHover, borderColor: C.sendHover }}
                >
                  <IconSend />
                </HoverButton>
              </div>

              <div style={{ textAlign: 'center', fontSize: 10.5, color: C.muted }}>
                RealAssist+ can make mistakes. Verify listing details before sharing.
              </div>
            </div>
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
