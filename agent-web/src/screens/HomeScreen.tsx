/**
 * Home: 4-up stat grid, "Upcoming tours" + "Client needs" cards, then the stage filter
 * column beside the client table.
 */
import { Tag } from '@rdc-npm/rdc-ui-v4'
import { C, DISPLAY_FONT } from '../theme'
import { HoverButton, HoverDiv, Initials } from '../components/primitives'
import { IconChevronRight, IconSpark } from '../icons'
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
  stats: StatItem[]
  tours: UpcomingTour[]
  needs: NeedItem[]
  needsCount: number
  stageItems: StageItem[]
  rows: Client[]
  onOpenTours: () => void
  onAsk: (text: string) => void
}

export function HomeScreen({
  stats,
  tours,
  needs,
  needsCount,
  stageItems,
  rows,
  onOpenTours,
  onAsk,
}: HomeScreenProps) {
  return (
    <div
      data-screen-label="Home"
      className="ra-scroll"
      style={{ flex: 1, minHeight: 0, overflow: 'auto', margin: '4px 24px 24px' }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4,minmax(140px,1fr))',
          gap: 12,
          marginBottom: 16,
        }}
      >
        {stats.map((k) => (
          <div key={k.label} style={{ ...CARD, padding: '14px 16px' }}>
            <div className="ty-numeric-body100" style={{ fontSize: 24, fontWeight: 700, lineHeight: '30px' }}>
              {k.value}
            </div>
            <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))',
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
                gap: 14,
                padding: '12px 16px',
                borderBottom: `1px solid ${C.alt}`,
                cursor: 'pointer',
                transition: 'background 120ms',
              }}
              hoverStyle={{ background: C.rowHover }}
            >
              <div
                className="ty-numeric-caption100"
                style={{ width: 104, flex: 'none', fontSize: 12, fontWeight: 600, color: C.sub, lineHeight: 1.4 }}
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
                View tour
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

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ width: 200, flex: 'none', display: 'flex', flexDirection: 'column', gap: 2 }}>
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
              <span style={{ flex: 1 }}>{st.label}</span>
              <span className="ty-numeric-caption100" style={CAPTION}>
                {st.count}
              </span>
            </HoverButton>
          ))}
        </div>

        <div className="ra-scroll" style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
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
