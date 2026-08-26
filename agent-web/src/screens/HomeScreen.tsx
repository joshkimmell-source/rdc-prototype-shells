/**
 * Home: a colour-forward dashboard — accented stat cards, a client-pipeline donut and a
 * "saved homes" bar chart (both drawn from the real book of business and sharing one
 * stage-colour language), then "Upcoming tours" + "Client needs", and finally the stage
 * filter column beside the client table.
 */
import type { ComponentType } from 'react'
import { Tag } from '@rdc-npm/rdc-ui-v4'
import { C, DISPLAY_FONT, CHART, TAG_CHART_COLOR } from '../theme'
import { HoverButton, HoverDiv, Initials, truncationTitle } from '../components/primitives'
import {
  IconChevronRight,
  IconSpark,
  IconClients,
  IconCalendar,
  IconChat,
  IconBell,
} from '../icons'
import { TAGC, type Client, type UpcomingTour } from '../data'

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

const CARD = {
  border: `1px solid ${C.hair}`,
  borderRadius: 16,
  background: C.white,
  boxShadow: '0 1px 2px rgba(26,24,22,0.04)',
  overflow: 'hidden',
} as const

const CARD_HEAD = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '14px 16px',
  borderBottom: `1px solid ${C.alt}`,
} as const

const CAPTION = { fontSize: 11.5, color: C.muted, fontWeight: 600 } as const

const GRID_COLS = 'minmax(190px,2fr) 1.4fr 1.1fr 1.8fr 1.5fr 48px'

/**
 * Icon + colour per stat card, in the fixed order the shell passes them (active clients,
 * upcoming tours, tour requests, invites pending). Keyed by index rather than label so the
 * accent survives a copy tweak upstream.
 */
const STAT_ACCENTS: Array<{ icon: ComponentType<{ size?: number }>; color: string; tint: string }> = [
  { icon: IconClients, color: CHART.green, tint: CHART.greenTint },
  { icon: IconCalendar, color: CHART.blue, tint: CHART.blueTint },
  { icon: IconChat, color: CHART.orange, tint: CHART.orangeTint },
  { icon: IconBell, color: CHART.purple, tint: CHART.purpleTint },
]

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

/** A colour-accented KPI tile: a tinted icon chip, the value, and its label. */
function StatCard({ stat, accent }: { stat: StatItem; accent: (typeof STAT_ACCENTS)[number] }) {
  const Icon = accent.icon
  return (
    <div style={{ ...CARD, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
      <span
        style={{
          width: 40,
          height: 40,
          flex: 'none',
          borderRadius: 12,
          background: accent.tint,
          color: accent.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={22} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div
          className="ty-numeric-body100"
          style={{ fontSize: 24, fontWeight: 700, lineHeight: '28px', color: accent.color }}
        >
          {stat.value}
        </div>
        <div style={{ fontSize: 12, color: C.muted, fontWeight: 600 }}>{stat.label}</div>
      </div>
    </div>
  )
}

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

interface HomeScreenProps {
  /** Below the mobile breakpoint: tighter gutters, and the stage filters become a row. */
  mobile: boolean
  stats: StatItem[]
  /** The full book (unfiltered), for the pipeline and saved-homes charts. */
  allClients: Client[]
  tours: UpcomingTour[]
  needs: NeedItem[]
  needsCount: number
  stageItems: StageItem[]
  rows: Client[]
  onOpenTours: () => void
  onAsk: (text: string) => void
}

export function HomeScreen({
  mobile,
  stats,
  allClients,
  tours,
  needs,
  needsCount,
  stageItems,
  rows,
  onOpenTours,
  onAsk,
}: HomeScreenProps) {
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

  return (
    <div
      data-screen-label="Home"
      className="ra-scroll"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        margin: mobile ? '4px 16px 16px' : '4px 24px 24px',
      }}
    >
      <div
        style={{
          display: 'grid',
          // `auto-fit` with a 150px floor: four across when they fit, dropping to two at
          // phone width. Wider than the old 120px floor to hold the icon chip + value row.
          gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))',
          gap: 12,
          marginBottom: 12,
        }}
      >
        {stats.map((k, i) => (
          <StatCard key={k.label} stat={k} accent={STAT_ACCENTS[i % STAT_ACCENTS.length]} />
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        {/* Client pipeline — donut + legend. */}
        <div style={CARD}>
          <div style={CARD_HEAD}>
            <CardHeading>Client pipeline</CardHeading>
            <span className="ty-numeric-caption100" style={CAPTION}>
              By stage
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 20,
              padding: '18px 16px',
            }}
          >
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

        {/* Saved homes by client — horizontal bars. */}
        <div style={CARD}>
          <div style={CARD_HEAD}>
            <CardHeading>Saved homes by client</CardHeading>
            <span className="ty-numeric-caption100" style={CAPTION}>
              Most engaged
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '18px 16px' }}>
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
      </div>

      <div
        style={{
          display: 'grid',
          // `min(320px, 100%)` rather than a bare 320px: below that the minimum track
          // would be wider than the container and the cards would overflow it.
          gridTemplateColumns: 'repeat(auto-fit,minmax(min(320px,100%),1fr))',
          gap: 12,
          marginBottom: 20,
        }}
      >
        <div style={CARD}>
          <div style={CARD_HEAD}>
            <CardHeading>Upcoming tours</CardHeading>
            <span className="ty-numeric-caption100" style={CAPTION}>
              Next 2 weeks
            </span>
          </div>
          {tours.map((t, i) => (
            <HoverDiv
              key={`${t.address}-${i}`}
              onClick={onOpenTours}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: mobile ? 10 : 14,
                padding: mobile ? '12px' : '12px 16px',
                borderBottom: `1px solid ${C.alt}`,
                cursor: 'pointer',
                transition: 'background 120ms',
              }}
              hoverStyle={{ background: C.rowHover }}
            >
              <div
                className="ty-numeric-caption100"
                style={{
                  width: mobile ? 76 : 104,
                  flex: 'none',
                  fontSize: mobile ? 11.5 : 12,
                  fontWeight: 600,
                  color: C.sub,
                  lineHeight: 1.4,
                }}
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
              <span
                style={{
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 12,
                  fontWeight: 700,
                  color: C.dark,
                  textDecoration: 'underline',
                  textUnderlineOffset: 3,
                }}
              >
                {/* The whole row is the target; on mobile the chevron carries it alone. */}
                {!mobile && 'View tour'}
                <IconChevronRight size={11} />
              </span>
            </HoverDiv>
          ))}
        </div>

        <div style={CARD}>
          <div style={CARD_HEAD}>
            <CardHeading>Client needs</CardHeading>
            <span className="ty-numeric-caption100" style={CAPTION}>
              {needsCount} open
            </span>
          </div>
          {needs.map((n) => (
            <div
              key={n.client}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '12px 16px',
                borderBottom: `1px solid ${C.alt}`,
              }}
            >
              <span
                style={{ width: 8, height: 8, flex: 'none', borderRadius: '50%', background: n.dot }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{n.client}</div>
                <div style={{ fontSize: 11.5, color: C.sub }}>{n.text}</div>
              </div>
              <AskButton onClick={n.ask} label="Ask RealAssist" />
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: mobile ? 'column' : 'row',
          gap: mobile ? 12 : 16,
          alignItems: 'flex-start',
        }}
      >
        {/*
          A 200px column beside a 720px table needs 936px. On mobile the filters become a
          horizontally scrolling pill row above the table instead of being dropped.
        */}
        <div
          className={mobile ? 'ra-scroll' : undefined}
          style={
            mobile
              ? {
                  width: '100%',
                  flex: 'none',
                  display: 'flex',
                  gap: 6,
                  overflowX: 'auto',
                  paddingBottom: 4,
                }
              : { width: 200, flex: 'none', display: 'flex', flexDirection: 'column', gap: 2 }
          }
        >
          {stageItems.map((st) => (
            <HoverButton
              key={st.id}
              onClick={st.onClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                height: 36,
                flex: 'none',
                padding: '0 12px',
                whiteSpace: 'nowrap',
                borderRadius: 40,
                border: `1px solid ${st.active ? C.border : 'transparent'}`,
                background: st.active ? C.alt : 'transparent',
                color: st.active ? C.dark : C.sub,
                fontSize: 13,
                fontWeight: 500,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'background 120ms, border-color 120ms',
              }}
              hoverStyle={{ background: C.alt }}
            >
              {/* A stage-coloured dot ties each filter to its slice of the pipeline donut. */}
              {st.id !== 'all' && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    flex: 'none',
                    borderRadius: '50%',
                    background: TAG_CHART_COLOR[TAGC[st.id]] ?? CHART.gray,
                  }}
                />
              )}
              <span style={{ flex: 1 }}>{st.label}</span>
              <span className="ty-numeric-caption100" style={CAPTION}>
                {st.count}
              </span>
            </HoverButton>
          ))}
        </div>

        {/*
          The table keeps its 720px floor and scrolls sideways — six columns of client
          data do not reflow into a phone, and `alignItems: flex-start` would otherwise let
          this wrapper size to that content and overflow the screen.
        */}
        <div
          className="ra-scroll"
          style={{ flex: 1, minWidth: 0, width: mobile ? '100%' : undefined, overflowX: 'auto' }}
        >
          <div style={{ ...CARD, minWidth: 720 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: GRID_COLS,
                gap: 12,
                alignItems: 'center',
                padding: '12px 20px',
                background: C.rowHover,
                borderBottom: `1px solid ${C.hair}`,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.07em',
                textTransform: 'uppercase',
                color: C.muted,
              }}
            >
              <span>Client</span>
              <span>Stage</span>
              <span>Budget</span>
              <span>Last activity</span>
              <span>Next tour</span>
              <span />
            </div>
            {rows.map((r) => (
              <HoverDiv
                key={r.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID_COLS,
                  gap: 12,
                  alignItems: 'center',
                  padding: '13px 20px',
                  borderBottom: `1px solid ${C.alt}`,
                  transition: 'background 120ms',
                }}
                hoverStyle={{ background: C.rowHoverFaint }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <Initials initials={r.initials} size={36} fontSize={12} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 13.5,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                      ref={truncationTitle(r.name)}
                    >
                      {r.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.muted }}>{r.saved} saved homes</div>
                  </div>
                </div>
                <div>
                  <Tag dataColor={TAGC[r.stage] ?? 'graySubtle'}>{r.stage}</Tag>
                </div>
                <div
                  className="ty-numeric-body100"
                  style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}
                >
                  {r.budget}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    color: C.sub,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  ref={truncationTitle(r.lastActivity)}
                >
                  {r.lastActivity}
                </div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    color: r.nextTour === '—' ? C.muted : C.online,
                  }}
                >
                  {r.nextTour}
                </div>
                <AskButton onClick={() => onAsk(`Tell me about ${r.name}`)} label="Ask RealAssist+" />
              </HoverDiv>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
