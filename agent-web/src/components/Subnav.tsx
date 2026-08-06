/**
 * Collapsible second-level nav. Present on Clients and Tours only; animates its outer
 * width to 0 while the inner column stays at full width, so content slides rather than reflows.
 */
import { C, EASE } from '../theme'
import { CircleButton, EmptyNote, Heading, HoverButton, Initials, SearchField, Tab } from './primitives'
import { IconChevronRight, IconClose, IconMore, IconPlus } from '../icons'
import type { Buyer, TourListItem } from '../data'

interface SubnavProps {
  open: boolean
  width: number
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
  gap: 12,
  flex: 'none',
  padding: '10px 12px',
  borderRadius: 16,
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 120ms',
} as const

export function Subnav(props: SubnavProps) {
  const { open, width, variant, onClose } = props
  const outerW = variant && open ? width : 0

  return (
    <div
      style={{
        width: outerW,
        transition: `width 220ms ${EASE}`,
        flex: 'none',
        overflow: 'hidden',
        background: C.alt,
        display: 'flex',
      }}
    >
      <div
        style={{
          width,
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
  onClose,
}: SubnavProps) {
  return (
    <>
      <div style={HEADER_ROW}>
        <Heading style={{ flex: 1 }}>Clients</Heading>
        <CircleButton aria-label="More" title="More">
          <IconMore size={15} />
        </CircleButton>
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
        <Tab label="Active (18)" active={clientTab === 'active'} onClick={() => onClientTab('active')} />
        <Tab
          label="Requests (5)"
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
          <HoverButton
            key={b.id}
            onClick={() => onSelectBuyer(b.id)}
            style={{ ...ROW, background: b.id === selectedBuyer ? C.hair : 'transparent' }}
            hoverStyle={{ background: C.hair }}
          >
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
            <div style={{ color: C.muted, flex: 'none', display: 'flex', alignItems: 'center' }}>
              <IconMore />
            </div>
          </HoverButton>
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
          <HoverButton
            key={t.id}
            onClick={() => onSelectTour(t.id)}
            style={{ ...ROW, background: t.id === selectedTour ? C.hair : 'transparent' }}
            hoverStyle={{ background: C.hair }}
          >
            <Initials initials={t.initials} bg={C.dark} fg={C.white} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.dark, lineHeight: 1.35 }}>
                {t.name}
              </div>
              <div style={{ fontSize: 11.5, color: C.muted }}>{t.meta}</div>
            </div>
            <div style={{ color: C.muted, flex: 'none', display: 'flex', alignItems: 'center' }}>
              <IconMore />
            </div>
          </HoverButton>
        ))}
        {tours.length === 0 && <EmptyNote>No tours match your search.</EmptyNote>}
      </div>
    </>
  )
}
