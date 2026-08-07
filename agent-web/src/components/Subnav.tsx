/**
 * Collapsible second-level nav. Present on Clients and Tours only; animates its outer
 * width to 0 while the inner column stays at full width, so content slides rather than reflows.
 *
 * With `drawerMax` set (mobile, <=768px) it leaves the flow and slides in over `main`
 * instead, capped so a strip of scrim stays tappable beside it.
 */
import { C, EASE } from '../theme'
import { CircleButton, EmptyNote, Heading, HoverDiv, Initials, SearchField, Tab } from './primitives'
import { Menu } from './Menu'
import { IconChevronRight, IconClose, IconPlus } from '../icons'
import {
  CLIENT_LIST_MENU_ITEMS,
  CLIENT_ROW_MENU_ITEMS,
  TOUR_ROW_MENU_ITEMS,
  type Buyer,
  type TourListItem,
} from '../data'

interface SubnavProps {
  open: boolean
  width: number
  /** Present below the mobile breakpoint: renders as a left overlay drawer this wide. */
  drawerMax?: number
  variant: 'clients' | 'tours' | null
  onClose: () => void

  // Clients variant
  buyers: Buyer[]
  clientQ: string
  onClientQ: (v: string) => void
  selectedBuyer: string
  onSelectBuyer: (id: string) => void
  clientTab: 'active' | 'requests'
  onClientTab: (t: 'active' | 'requests') => void
  activeCount: number
  requestsCount: number

  // Tours variant
  tours: TourListItem[]
  tourQ: string
  onTourQ: (v: string) => void
  selectedTour: string
  onSelectTour: (id: string) => void
  toursTab: 'upcoming' | 'past' | 'all'
  onToursTab: (t: 'upcoming' | 'past' | 'all') => void
  upcomingCount: number
  pastCount: number
}

const HEADER_ROW = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '18px 12px 12px 20px',
} as const

const LIST_WRAP = {
  flex: 1,
  overflowY: 'auto',
  margin: '6px 12px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
} as const

const ROW = {
  display: 'flex',
  alignItems: 'center',
  flex: 'none',
  // Only the trailing inset lives here. The rest of the row's padding is on the select
  // button below, so that padding is clickable rather than dead space under a hover
  // highlight — the row lights up where it can be clicked and nowhere else.
  padding: '0 12px 0 0',
  borderRadius: 16,
  border: 'none',
  transition: 'background 120ms',
} as const

/**
 * The selectable part of a row. A row's trailing ⋯ opens a menu, and a button cannot
 * nest inside a button — so the row itself is a plain box and this fills all of it but
 * the ⋯, keeping one large hit target for selecting without swallowing the menu. It
 * carries the row's own padding for that reason: the inset is part of the target.
 */
const ROW_MAIN = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  flex: 1,
  minWidth: 0,
  padding: '10px 12px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  textAlign: 'left',
} as const

export function Subnav(props: SubnavProps) {
  const { open, width, drawerMax, variant, onClose } = props
  const shown = !!variant && open
  const outerW = shown ? width : 0

  // Drawer: full width up to the cap, sliding in over `main` rather than reserving a
  // column. `visibility` keeps it out of the tab order while off-canvas, flipping
  // immediately on the way in and only after the slide-out on the way back.
  const drawerStyle = drawerMax
    ? ({
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 45,
        width: `min(100%, ${drawerMax}px)`,
        transform: `translateX(${shown ? 0 : -100}%)`,
        visibility: shown ? 'visible' : 'hidden',
        transition: `transform 220ms ${EASE}, visibility 0s linear ${shown ? 0 : 220}ms`,
        boxShadow: shown ? '2px 0 16px rgba(26,24,22,0.18)' : 'none',
      } as const)
    : ({ width: outerW, transition: `width 220ms ${EASE}` } as const)

  return (
    <div
      style={{
        flex: 'none',
        overflow: 'hidden',
        background: C.alt,
        display: 'flex',
        ...drawerStyle,
      }}
    >
      <div
        style={{
          // In flow the inner column keeps its full width so the content slides out of a
          // shrinking frame; as a drawer the frame is already the target width.
          width: drawerMax ? '100%' : width,
          flex: 'none',
          display: 'flex',
          flexDirection: 'column',
          borderRight: `1px solid ${C.hair}`,
        }}
      >
        {variant === 'clients' && <ClientsSubnav {...props} onClose={onClose} />}
        {variant === 'tours' && <ToursSubnav {...props} onClose={onClose} />}
      </div>
    </div>
  )
}

function ClientsSubnav({
  buyers,
  clientQ,
  onClientQ,
  selectedBuyer,
  onSelectBuyer,
  clientTab,
  onClientTab,
  activeCount,
  requestsCount,
  onClose,
}: SubnavProps) {
  return (
    <>
      <div style={HEADER_ROW}>
        <Heading style={{ flex: 1 }}>Clients</Heading>
        <Menu aria-label="More" items={CLIENT_LIST_MENU_ITEMS} size={28} bare />
        <CircleButton aria-label="Add client" title="Add client">
          <IconPlus />
        </CircleButton>
        <CircleButton onClick={onClose} aria-label="Close subnav" title="Close subnav">
          <IconClose />
        </CircleButton>
      </div>

      <SearchField
        value={clientQ}
        onChange={onClientQ}
        placeholder="Search client..."
        style={{ margin: '0 12px' }}
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 12px 0 20px' }}>
        <Tab
          label={`Active (${activeCount})`}
          active={clientTab === 'active'}
          onClick={() => onClientTab('active')}
        />
        <Tab
          label={`Requests (${requestsCount})`}
          active={clientTab === 'requests'}
          onClick={() => onClientTab('requests')}
        />
        <div style={{ flex: 1 }} />
        <CircleButton
          bordered
          aria-label="More tabs"
          title="More tabs"
          style={{ boxShadow: '0 1px 3px rgba(26,24,22,0.12)' }}
        >
          <IconChevronRight />
        </CircleButton>
      </div>

      <div style={LIST_WRAP}>
        {buyers.map((b) => (
          <HoverDiv
            key={b.id}
            style={{ ...ROW, background: b.id === selectedBuyer ? C.hair : 'transparent' }}
            hoverStyle={{ background: C.hair }}
          >
            <button type="button" onClick={() => onSelectBuyer(b.id)} style={ROW_MAIN}>
              <div style={{ position: 'relative', width: 40, height: 40, flex: 'none' }}>
                <Initials initials={b.initials} />
                {b.online && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      bottom: 0,
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: C.online,
                      border: `2px solid ${C.alt}`,
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.dark, lineHeight: 1.35 }}>
                  {b.name}
                </div>
                <div style={{ fontSize: 11.5, color: C.muted }}>{b.sub}</div>
              </div>
            </button>
            <Menu
              aria-label={`More actions for ${b.name}`}
              items={CLIENT_ROW_MENU_ITEMS}
              size={28}
              bare
              // The row is already `C.hair` when hovered or selected, so the toggle needs a
              // darker step to register as its own target.
              hoverBg={C.border}
              color={C.muted}
            />
          </HoverDiv>
        ))}
        {buyers.length === 0 && <EmptyNote>No clients match your search.</EmptyNote>}
      </div>
    </>
  )
}

function ToursSubnav({
  tours,
  tourQ,
  onTourQ,
  selectedTour,
  onSelectTour,
  toursTab,
  onToursTab,
  upcomingCount,
  pastCount,
  onClose,
}: SubnavProps) {
  return (
    <>
      <div style={HEADER_ROW}>
        <Heading style={{ flex: 1 }}>Tours</Heading>
        <CircleButton aria-label="Schedule tour" title="Schedule tour">
          <IconPlus />
        </CircleButton>
        <CircleButton onClick={onClose} aria-label="Close subnav" title="Close subnav">
          <IconClose />
        </CircleButton>
      </div>

      <SearchField
        value={tourQ}
        onChange={onTourQ}
        placeholder="Search by client name"
        style={{ margin: '0 12px' }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '8px 12px 0 20px',
          borderBottom: `1px solid ${C.hair}`,
          margin: '0 0 6px',
        }}
      >
        <Tab
          label={`Upcoming (${upcomingCount})`}
          active={toursTab === 'upcoming'}
          onClick={() => onToursTab('upcoming')}
          negativeMargin
        />
        <Tab
          label={`Past (${pastCount})`}
          active={toursTab === 'past'}
          onClick={() => onToursTab('past')}
          negativeMargin
        />
        <Tab label="All" active={toursTab === 'all'} onClick={() => onToursTab('all')} negativeMargin />
      </div>

      <div style={LIST_WRAP}>
        {tours.map((t) => (
          <HoverDiv
            key={t.id}
            style={{ ...ROW, background: t.id === selectedTour ? C.hair : 'transparent' }}
            hoverStyle={{ background: C.hair }}
          >
            <button type="button" onClick={() => onSelectTour(t.id)} style={ROW_MAIN}>
              <Initials initials={t.initials} bg={C.dark} fg={C.white} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.dark, lineHeight: 1.35 }}>
                  {t.name}
                </div>
                <div style={{ fontSize: 11.5, color: C.muted }}>{t.meta}</div>
              </div>
            </button>
            <Menu
              aria-label={`More actions for ${t.name}`}
              items={TOUR_ROW_MENU_ITEMS}
              size={28}
              bare
              hoverBg={C.border}
              color={C.muted}
            />
          </HoverDiv>
        ))}
        {tours.length === 0 && <EmptyNote>No tours match your search.</EmptyNote>}
      </div>
    </>
  )
}
