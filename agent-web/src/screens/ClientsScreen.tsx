/**
 * Clients: saved / tour-request / saved-search tiles, the filter pill row, and the
 * map / grid / table segmented control.
 */
import { C, DISPLAY_FONT } from '../theme'
import { HoverButton } from '../components/primitives'
import { ImageSlot } from '../components/ImageSlot'
import { IconGridView, IconMapView, IconSort, IconTableView } from '../icons'
import { CLIENT_PILLS } from '../data'

export type ClientsView = 'map' | 'grid' | 'table'

interface ClientsScreenProps {
  pill: string
  onPill: (id: string) => void
  view: ClientsView
  onView: (v: ClientsView) => void
}

const TILE = {
  position: 'relative',
  width: 164,
  height: 164,
  flex: 'none',
  borderRadius: 16,
  overflow: 'hidden',
  boxShadow: '0 1px 2px rgba(26,24,22,0.08)',
} as const

const SCRIM = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(180deg,rgba(26,24,22,0) 45%,rgba(26,24,22,0.6) 100%)',
  pointerEvents: 'none',
} as const

const GROUP = { display: 'flex', flexDirection: 'column', gap: 14 } as const

function GroupHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: 0,
        fontFamily: DISPLAY_FONT,
        fontWeight: 600,
        fontSize: 16,
        lineHeight: '20px',
        letterSpacing: '-0.01em',
      }}
    >
      {children}
    </h3>
  )
}

const VIEWS: Array<{ id: ClientsView; label: string; icon: React.ReactNode }> = [
  { id: 'map', label: 'Map view', icon: <IconMapView /> },
  { id: 'grid', label: 'Grid view', icon: <IconGridView /> },
  { id: 'table', label: 'Table view', icon: <IconTableView /> },
]

export function ClientsScreen({ pill, onPill, view, onView }: ClientsScreenProps) {
  return (
    <div
      data-screen-label="Clients"
      className="ra-scroll"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        padding: '8px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
        <div style={GROUP}>
          <GroupHeading>Saved &amp; Tour requests</GroupHeading>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ ...TILE, background: C.hair }}>
              <ImageSlot
                id="clients-saved-listings"
                placeholder="Drop a listing photo"
                style={{ position: 'absolute', inset: 0 }}
              />
              <div style={SCRIM} />
              <div style={{ position: 'absolute', left: 14, bottom: 12, color: C.white, pointerEvents: 'none' }}>
                <div className="ty-numeric-body100" style={{ fontSize: 22, fontWeight: 700, lineHeight: '26px' }}>
                  16
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Saved listings</div>
              </div>
            </div>

            <div style={{ ...TILE, background: C.hair }}>
              <ImageSlot
                id="clients-tour-requests"
                placeholder="Drop a home photo"
                style={{ position: 'absolute', inset: 0 }}
              />
              <div style={SCRIM} />
              <div style={{ position: 'absolute', left: 14, bottom: 12, color: C.white, pointerEvents: 'none' }}>
                <div className="ty-numeric-body100" style={{ fontSize: 22, fontWeight: 700, lineHeight: '26px' }}>
                  4
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Tour requests</div>
              </div>
            </div>
          </div>
        </div>

        <div style={GROUP}>
          <GroupHeading>Saved Searches</GroupHeading>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ ...TILE, background: C.action }}>
              <ImageSlot
                id="clients-saved-search"
                placeholder="Drop a search photo"
                style={{ position: 'absolute', inset: 0 }}
              />
              <div
                style={{
                  ...SCRIM,
                  background: 'linear-gradient(180deg,rgba(26,24,22,0.1) 30%,rgba(26,24,22,0.65) 100%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: 14,
                  right: 14,
                  bottom: 12,
                  color: C.white,
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>East Austin under $650K</div>
                <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.85, marginTop: 2 }}>Saved by you</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {CLIENT_PILLS.map(([id, label]) => {
          const on = pill === id
          return (
            <HoverButton
              key={id}
              onClick={() => onPill(id)}
              style={{
                height: 40,
                flex: 'none',
                padding: '0 16px',
                borderRadius: 40,
                border: `1px solid ${on ? C.dark : C.border}`,
                background: on ? C.dark : C.white,
                color: on ? C.white : C.dark,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 120ms',
              }}
              hoverStyle={{ borderColor: C.dark }}
            >
              {label}
            </HoverButton>
          )
        })}

        <div style={{ flex: 1 }} />

        <HoverButton
          aria-label="Sort"
          title="Sort"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 40,
            height: 40,
            flex: 'none',
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            color: C.dark,
            cursor: 'pointer',
            transition: 'background 120ms',
          }}
          hoverStyle={{ background: C.alt }}
        >
          <IconSort />
        </HoverButton>

        <div
          style={{
            display: 'inline-flex',
            background: `var(--colors-gray-100, ${C.alt})`,
            borderRadius: 9999,
            padding: 4,
          }}
        >
          {VIEWS.map(({ id, label, icon }) => {
            const on = view === id
            return (
              <HoverButton
                key={id}
                onClick={() => onView(id)}
                aria-selected={on}
                aria-label={label}
                title={label}
                style={{
                  appearance: 'none',
                  border: 0,
                  height: 32,
                  width: 44,
                  flex: 'none',
                  borderRadius: 9999,
                  background: on ? C.white : 'transparent',
                  boxShadow: on ? 'var(--shadows-raised, 0 1px 3px rgba(26,24,22,0.16))' : 'none',
                  color: C.dark,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background 120ms, box-shadow 120ms',
                }}
                hoverStyle={on ? undefined : { background: 'rgba(0,0,0,0.04)' }}
              >
                {icon}
              </HoverButton>
            )
          })}
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${C.hair}` }} />
      <div style={{ flex: 1 }} />
    </div>
  )
}
