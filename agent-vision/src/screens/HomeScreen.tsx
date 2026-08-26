/**
 * Home: a canvas-coloured page — a borderless hero built from the ready-to-promote lead
 * count, "Qualified leads" and "Client needs" boxed side by side, then "Client pipeline",
 * "Saved homes by client" and "Upcoming tours" all borderless beneath. Replaces the earlier
 * colour-forward dashboard (floating KPI bar, boxed charts, stage filters, and the client
 * table) with one focal point up top and the rest of the book of business as plain lists —
 * only the "Lead sources" chart and the client table are gone for good.
 */
import { useEffect, useState } from 'react'
import { C, DISPLAY_FONT, CHART, TAG_CHART_COLOR } from '../theme'
import { HoverButton, HoverDiv, Initials, truncationTitle } from '../components/primitives'
import { IconChevronRight, IconSpark, IconCircleCheck } from '../icons'
import { AGENT_FIRST_NAME, TAGC, type Client, type Lead, type UpcomingTour } from '../data'

/**
 * The hero headline sits beside a fixed-width stat box, so at desktop size (44px, no wrap) it
 * starts wrapping well above the shell's own 768px mobile threshold: 1050px is the narrowest
 * width still at 2 lines, 1040px is already 3 (and it only gets worse — 6 lines — right up
 * until 768px finally switches it to the compact, stacked treatment). So the hero (only)
 * switches to that compact treatment starting at 1040px instead of waiting for 768px.
 */
const HERO_COMPACT_QUERY = '(max-width: 1040px)'

function useIsHeroCompact() {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(HERO_COMPACT_QUERY).matches
  )
  useEffect(() => {
    const mq = window.matchMedia(HERO_COMPACT_QUERY)
    const onChange = () => setCompact(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return compact
}

export interface StatItem {
  value: number
  label: string
}

export interface NeedItem {
  client: string
  text: string
  dot: string
  ask: () => void
}

export interface StageItem {
  id: string
  label: string
  count: number
  active: boolean
  onClick: () => void
}

const PANEL_CARD = {
  background: C.white,
  border: `1px solid ${C.hair}`,
  borderRadius: 16,
  boxShadow: '0 2px 8px rgba(26,24,22,0.05)',
  overflow: 'hidden',
} as const

const CARD_HEAD = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '16px 20px',
  borderBottom: `1px solid ${C.alt}`,
} as const

/** The small right-aligned qualifier beside a card title, or a header's trailing count. */
const META = { fontSize: 11.5, color: C.muted, fontWeight: 500 } as const

/** The caps label above a borderless section — "Upcoming tours", "Client pipeline", etc. */
const SECTION_LABEL = {
  fontSize: 11.5,
  fontWeight: 700,
  letterSpacing: '0.07em',
  textTransform: 'uppercase',
  color: C.muted,
  marginBottom: 14,
} as const

interface Segment {
  label: string
  count: number
  color: string
}

/** An SVG ring of stroked arcs, with the total in the hole. Segments are contiguous. */
function Donut({ segments, size = 152, thickness = 22 }: { segments: Segment[]; size?: number; thickness?: number }) {
  const total = segments.reduce((s, x) => s + x.count, 0)
  const r = (size - thickness) / 2
  const c = size / 2
  const circ = 2 * Math.PI * r
  let acc = 0
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Client pipeline by stage">
        <circle cx={c} cy={c} r={r} fill="none" stroke={C.alt} strokeWidth={thickness} />
        {segments.map((s) => {
          const len = total ? (s.count / total) * circ : 0
          const el = (
            <circle
              key={s.label}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-acc}
              transform={`rotate(-90 ${c} ${c})`}
            />
          )
          acc += len
          return el
        })}
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span className="ty-numeric-body100" style={{ fontSize: 30, fontWeight: 700, lineHeight: 1 }}>
          {total}
        </span>
        <span style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>clients</span>
      </div>
    </div>
  )
}

function CardHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: 0,
        flex: 1,
        fontFamily: DISPLAY_FONT,
        fontWeight: 600,
        fontSize: 15,
        lineHeight: '20px',
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </h3>
  )
}

function AskButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <HoverButton
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 30,
        height: 30,
        flex: 'none',
        borderRadius: '50%',
        border: 'none',
        background: 'transparent',
        color: C.brand,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 120ms',
      }}
      hoverStyle={{ background: C.brandSubtle }}
    >
      <IconSpark />
    </HoverButton>
  )
}

interface HomeScreenProps {
  /** Below the mobile breakpoint: tighter gutters, and the stage filters become a row. */
  mobile: boolean
  stats: StatItem[]
  /** The full book (unfiltered), for the pipeline and saved-homes charts. */
  allClients: Client[]
  /** Open (un-promoted) leads, for the "New leads" list and the "Lead sources" chart. */
  leads: Lead[]
  tours: UpcomingTour[]
  needs: NeedItem[]
  needsCount: number
  stageItems: StageItem[]
  rows: Client[]
  onOpenTours: () => void
  /** Jump to a lead's detail page from the dashboard. */
  onOpenLead: (id: string) => void
  /** Open the full Leads list — the "View all" link on the Qualified leads card. */
  onViewAllLeads: () => void
  onAsk: (text: string) => void
}

export function HomeScreen({
  mobile,
  stats,
  allClients,
  leads,
  tours,
  needs,
  needsCount,
  stageItems,
  onOpenTours,
  onOpenLead,
  onViewAllLeads,
}: HomeScreenProps) {
  const heroCompact = useIsHeroCompact() || mobile

  // New leads feeding the pipeline. The shell passes only open (un-promoted) leads; surface the
  // ready-to-work ones first, then the most recent, and cap the card at four.
  const leadsToWork = [...leads]
    .sort((a, b) => Number(b.readyToPromote) - Number(a.readyToPromote) || a.recencyMins - b.recencyMins)
    .slice(0, 4)
  const readyCount = leads.filter((l) => l.readyToPromote).length

  // Pipeline segments come from the stage filters (full counts, filter-independent), coloured
  // to match each stage's Tag. `all` is the total, so it is dropped from the ring.
  const pipeline: Segment[] = stageItems
    .filter((s) => s.id !== 'all' && s.count > 0)
    .map((s) => ({
      label: s.label,
      count: s.count,
      color: TAG_CHART_COLOR[TAGC[s.id]] ?? CHART.gray,
    }))
  const pipelineTotal = pipeline.reduce((n, s) => n + s.count, 0)

  // Engagement bars: the clients with the most saved homes, coloured by their stage.
  const savedRows = [...allClients]
    .filter((c) => c.saved > 0)
    .sort((a, b) => b.saved - a.saved)
    .slice(0, 6)
  const savedMax = savedRows.reduce((m, c) => Math.max(m, c.saved), 0) || 1

  // The hero headline takes over "Qualified leads" from the stat box below, so it isn't shown
  // twice — the inverse stat box keeps the other three (Active clients, Upcoming tours, Invites
  // pending, as wired in Shell.tsx).
  const heroStats = stats.filter((s) => s.label !== 'Qualified leads')
  const heroHeadline =
    readyCount > 0
      ? `${readyCount} ${readyCount === 1 ? 'lead is' : 'leads are'} ready to become ${readyCount === 1 ? 'a client' : 'clients'}`
      : "You're all caught up"

  return (
    <div
      data-screen-label=""
      className="ra-scroll"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        // No background here — `Shell`'s `<main>` is canvas-coloured for Home, header included,
        // so this scroll container stays transparent rather than repainting the same colour.
        margin: mobile ? '0 2px 16px' : '0 10px 24px',
        padding: mobile ? '10px 14px 0' : '14px 14px 0',
      }}
    >
      <div
        style={{
          padding: mobile ? '24px 20px' : '40px 48px',
        }}
      >
        {/* Hero row: eyebrow + headline built from the ready-to-promote lead count, beside an
            inverse stat box carrying the rest of today's `stats`. Uses `heroCompact`, not
            `mobile` — see its definition above for why the hero needs its own, wider
            breakpoint. */}
        <div
          style={{
            display: 'flex',
            flexWrap: heroCompact ? 'wrap' : 'nowrap',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            gap: heroCompact ? 16 : 24,
            paddingBottom: 28,
            borderBottom: `1px solid ${C.hair}`,
            marginBottom: 28,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                color: C.muted,
                marginBottom: 6,
              }}
            >
              Good morning, {AGENT_FIRST_NAME}
            </div>
            <div
              style={{
                fontFamily: DISPLAY_FONT,
                fontSize: heroCompact ? 28 : 44,
                fontWeight: 600,
                letterSpacing: '-0.02em',
                color: C.dark,
                lineHeight: 1,
              }}
            >
              {heroHeadline}
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              // In compact mode the box spans the full row (the headline already wrapped above
              // it via the outer row's `flexWrap`) with each stat sharing that width equally —
              // its content-sized wide layout would overflow beside a wrapped headline.
              flex: heroCompact ? '1 1 100%' : 'none',
              gap: heroCompact ? 12 : 32,
              background: C.dark,
              borderRadius: 14,
              padding: heroCompact ? '14px 16px' : '14px 28px',
            }}
          >
            {heroStats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  flex: heroCompact ? 1 : 'initial',
                  minWidth: 0,
                  borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.14)' : 'none',
                  paddingLeft: i > 0 ? (heroCompact ? 12 : 32) : 0,
                }}
              >
                <div
                  className="ty-numeric-body100"
                  style={{ fontSize: heroCompact ? 18 : 22, fontWeight: 600, color: C.white }}
                >
                  {s.value}
                </div>
                <div style={{ fontSize: heroCompact ? 11 : 12, color: 'rgba(255,255,255,0.72)' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Qualified leads + Client needs, boxed side by side. */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : '1.3fr 1fr',
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div style={PANEL_CARD}>
            <div style={CARD_HEAD}>
              <CardHeading>
                Qualified leads <span style={META}>({readyCount})</span>
              </CardHeading>
              <HoverButton
                onClick={onViewAllLeads}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 2,
                  flex: 'none',
                  padding: 0,
                  border: 'none',
                  background: 'transparent',
                  color: C.action,
                  fontSize: 11.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
                hoverStyle={{ textDecoration: 'underline' }}
              >
                View all
                <IconChevronRight size={11} />
              </HoverButton>
            </div>
            {leadsToWork.length === 0 ? (
              <div style={{ padding: '16px 20px', fontSize: 12.5, color: C.muted }}>No open leads right now.</div>
            ) : (
              leadsToWork.map((l, i) => (
                <HoverDiv
                  key={l.id}
                  onClick={() => onOpenLead(l.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '14px 20px',
                    borderBottom: i < leadsToWork.length - 1 ? `1px solid ${C.alt}` : 'none',
                    cursor: 'pointer',
                    transition: 'background 120ms',
                  }}
                  hoverStyle={{ background: C.rowHover }}
                >
                  <Initials initials={l.initials} size={36} fontSize={12} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      ref={truncationTitle(l.name)}
                    >
                      {l.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: C.muted,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      ref={truncationTitle(`${l.marketCity} · ${l.budget} · ${l.delivery.product}`)}
                    >
                      {l.marketCity} · {l.budget} · {l.delivery.product}
                    </div>
                  </div>
                  {l.readyToPromote ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 3,
                        flex: 'none',
                        fontSize: 11,
                        fontWeight: 600,
                        color: C.online,
                      }}
                    >
                      <IconCircleCheck size={11} />
                      Ready
                    </span>
                  ) : (
                    <span style={{ flex: 'none', fontSize: 12, color: C.muted }}>New</span>
                  )}
                </HoverDiv>
              ))
            )}
          </div>

          <div style={PANEL_CARD}>
            <div style={CARD_HEAD}>
              <CardHeading>Client needs</CardHeading>
              <span style={META}>{needsCount} open</span>
            </div>
            {needs.map((n, i) => (
              <div
                key={n.client}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '14px 20px',
                  borderBottom: i < needs.length - 1 ? `1px solid ${C.alt}` : 'none',
                }}
              >
                <span style={{ width: 6, height: 6, flex: 'none', borderRadius: '50%', background: n.dot }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>{n.client}</div>
                  <div style={{ fontSize: 11.5, color: C.sub }}>{n.text}</div>
                </div>
                <AskButton onClick={n.ask} label="Ask RealAssist" />
              </div>
            ))}
          </div>
        </div>

        {/*
          The rest of the book of business, borderless — a caps label and plain content per
          widget, no card. One grid governs the space between all three (Client pipeline and
          Saved homes by client side by side, Upcoming tours spanning beneath), rather than
          each widget carrying its own ad hoc margin.
        */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: mobile ? '1fr' : '1fr 1fr',
            gap: 40,
          }}
        >
          <div>
            <div style={SECTION_LABEL}>Client pipeline</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
              <Donut segments={pipeline} />
              <div style={{ flex: 1, minWidth: 150, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pipeline.map((s) => {
                  const pct = pipelineTotal ? Math.round((s.count / pipelineTotal) * 100) : 0
                  return (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span
                        style={{ width: 10, height: 10, flex: 'none', borderRadius: 3, background: s.color }}
                      />
                      <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: C.dark }}>
                        {s.label}
                      </span>
                      <span className="ty-numeric-caption100" style={{ fontSize: 12.5, fontWeight: 700 }}>
                        {s.count}
                      </span>
                      <span
                        className="ty-numeric-caption100"
                        style={{ width: 34, textAlign: 'right', fontSize: 11.5, color: C.muted, fontWeight: 600 }}
                      >
                        {pct}%
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div>
            <div style={SECTION_LABEL}>Saved homes by client</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {savedRows.map((r) => {
                const color = TAG_CHART_COLOR[TAGC[r.stage]] ?? CHART.gray
                const pct = Math.round((r.saved / savedMax) * 100)
                return (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div
                      style={{
                        width: mobile ? 96 : 128,
                        flex: 'none',
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: C.dark,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      ref={truncationTitle(r.name)}
                    >
                      {r.name}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        height: 12,
                        borderRadius: 6,
                        background: C.alt,
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          borderRadius: 6,
                          background: color,
                          transition: 'width 200ms',
                        }}
                      />
                    </div>
                    <span
                      className="ty-numeric-caption100"
                      style={{ width: 22, flex: 'none', textAlign: 'right', fontSize: 12.5, fontWeight: 700 }}
                    >
                      {r.saved}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Spans both columns: a label and plain dividers, still governed by the grid above. */}
          <div style={{ gridColumn: mobile ? 'auto' : '1 / -1' }}>
            <div style={SECTION_LABEL}>Upcoming tours</div>
            <div>
              {tours.map((t, i) => (
                <HoverDiv
                  key={`${t.address}-${i}`}
                  onClick={onOpenTours}
                  style={{
                    display: 'flex',
                    gap: mobile ? 10 : 16,
                    padding: '12px 0',
                    borderBottom: i < tours.length - 1 ? `1px solid ${C.alt}` : 'none',
                    cursor: 'pointer',
                    transition: 'background 120ms',
                  }}
                  hoverStyle={{ background: C.alt }}
                >
                  <div
                    className="ty-numeric-caption100"
                    style={{ width: mobile ? 76 : 96, flex: 'none', fontSize: mobile ? 11.5 : 12, color: C.sub }}
                  >
                    {t.when}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      ref={truncationTitle(t.address)}
                    >
                      {t.address}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted }}>
                      {t.client} · {t.type}
                    </div>
                  </div>
                </HoverDiv>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
