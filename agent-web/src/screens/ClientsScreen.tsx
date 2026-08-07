/**
 * Clients: saved / tour-request / saved-search tiles, the filter pill row, the
 * map / grid / table segmented control, and the date-grouped feed of listing cards.
 */
import { C, DISPLAY_FONT } from '../theme'
import { HoverButton } from '../components/primitives'
import { ListingCard } from '../components/ListingCard'
import { IconGridView, IconMapView, IconSort, IconTableView } from '../icons'
import { CLIENT_TILE_IMAGES, type ClientFeed } from '../data'

export type ClientsView = 'map' | 'grid' | 'table'

interface ClientsScreenProps {
  /** Below the mobile breakpoint: tighter gutters, and the tiles share the row width. */
  mobile: boolean
  /** The selected subnav row's feed — tiles, pills and listings all come from it. */
  feed: ClientFeed
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

/**
 * Two 164px tiles plus their gap need 344px. On mobile they split the row instead and stay
 * square, so the pair fits at 320px without either being pushed off-screen.
 */
const TILE_MOBILE = {
  ...TILE,
  width: 'auto',
  height: 'auto',
  flex: '1 1 0',
  minWidth: 0,
  maxWidth: 164,
  aspectRatio: '1 / 1',
} as const

const SCRIM = {
  position: 'absolute',
  inset: 0,
  background: 'linear-gradient(180deg,rgba(26,24,22,0) 45%,rgba(26,24,22,0.6) 100%)',
  pointerEvents: 'none',
} as const

const GROUP = { display: 'flex', flexDirection: 'column', gap: 14 } as const

/** The tile photo. Decorative — the number and label over it carry the meaning. */
function TilePhoto({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

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

export function ClientsScreen({ mobile, feed, pill, onPill, view, onView }: ClientsScreenProps) {
  const tile = mobile ? TILE_MOBILE : TILE
  // Full-width groups on mobile: side by side, the tile pair and the saved search would
  // wrap to three cramped columns' worth of space rather than one readable one.
  const group = mobile ? { ...GROUP, flex: '1 1 100%', minWidth: 0 } : GROUP

  // The pill filters the feed. `null` means the pill has no listing filter behind it
  // ("Chat list"), so it leaves the feed alone rather than emptying it.
  const keep = feed.filters[pill]
  const groups = keep
    ? feed.groups
        .map((g) => ({
          ...g,
          listings: g.listings.filter((l) => keep.includes(l.id)),
        }))
        .filter((g) => g.listings.length > 0)
    : feed.groups

  return (
    <div
      data-screen-label="Clients"
      className="ra-scroll"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        padding: mobile ? '8px 16px 16px' : '8px 24px 24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      <div style={{ display: 'flex', gap: mobile ? 20 : 48, flexWrap: 'wrap' }}>
        <div style={group}>
          <GroupHeading>Saved &amp; Tour requests</GroupHeading>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ ...tile, background: C.hair }}>
              <TilePhoto src={CLIENT_TILE_IMAGES.savedListings.url} />
              <div style={SCRIM} />
              <div style={{ position: 'absolute', left: 14, bottom: 12, color: C.white, pointerEvents: 'none' }}>
                <div className="ty-numeric-body100" style={{ fontSize: 22, fontWeight: 700, lineHeight: '26px' }}>
                  {feed.savedCount}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Saved listings</div>
              </div>
            </div>

            <div style={{ ...tile, background: C.hair }}>
              <TilePhoto src={CLIENT_TILE_IMAGES.tourRequests.url} />
              <div style={SCRIM} />
              <div style={{ position: 'absolute', left: 14, bottom: 12, color: C.white, pointerEvents: 'none' }}>
                <div className="ty-numeric-body100" style={{ fontSize: 22, fontWeight: 700, lineHeight: '26px' }}>
                  {feed.tourRequestCount}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Tour requests</div>
              </div>
            </div>
          </div>
        </div>

        <div style={group}>
          <GroupHeading>Saved Searches</GroupHeading>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ ...tile, background: C.action }}>
              <TilePhoto src={CLIENT_TILE_IMAGES.savedSearch.url} />
              <div
                style={{
                  ...SCRIM,
                  // Darker and higher than the number tiles' scrim: this tile's copy is two
                  // or three lines ("No saved search yet" over "Nothing saved for Erik and
                  // Nina yet"), so it reaches up into the photo's sky rather than sitting in
                  // the bottom band.
                  background:
                    'linear-gradient(180deg,rgba(26,24,22,0.2) 0%,rgba(26,24,22,0.45) 45%,rgba(26,24,22,0.75) 100%)',
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
                <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.3 }}>
                  {feed.savedSearchTile.name}
                </div>
                <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.85, marginTop: 2 }}>
                  {feed.savedSearchTile.sub}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {feed.pills.map(([id, label]) => {
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

      {groups.length === 0 ? (
        <div style={{ padding: '32px 0', fontSize: 13, color: C.muted }}>
          No listings match this filter.
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.heading} style={{ ...GROUP, gap: 16 }}>
            <GroupHeading>{group.heading}</GroupHeading>
            <div
              style={{
                display: 'grid',
                // 288px is the narrowest card that fits the widest price row the dataset
                // produces — a seven-figure price beside "PRICE CHANGE | 198 DOM".
                // Narrower and the status ellipsizes (`ListingCard` handles that), which
                // is a fallback for a cramped container rather than a normal render — which
                // is exactly what `min(…, 100%)` hands it below 288px, instead of letting
                // the minimum track overflow the screen.
                gridTemplateColumns: 'repeat(auto-fill, minmax(min(288px, 100%), 1fr))',
                gap: 20,
              }}
            >
              {group.listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          </section>
        ))
      )}

      <div style={{ flex: 1 }} />
    </div>
  )
}
