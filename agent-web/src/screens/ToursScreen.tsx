/**
 * Tours: the Leaflet tour-route page from public/tours-map.html, with the subnav
 * re-open affordance that only appears once the subnav has been closed.
 */
import { C } from '../theme'
import { HoverButton } from '../components/primitives'
import { IconHamburger } from '../icons'

interface ToursScreenProps {
  showSubnavButton: boolean
  onOpenSubnav: () => void
}

export function ToursScreen({ showSubnavButton, onOpenSubnav }: ToursScreenProps) {
  return (
    <div
      data-screen-label="Tours"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'hidden',
        background: '#FFFFFF',
        display: 'flex',
        position: 'relative',
      }}
    >
      {showSubnavButton && (
        <div style={{ flex: 'none', padding: '16px 0 0 24px' }}>
          <HoverButton
            onClick={onOpenSubnav}
            aria-label="Open subnav"
            title="Open subnav"
            style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              border: 'none',
              background: 'transparent',
              color: C.dark,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              transition: 'background 120ms',
            }}
            hoverStyle={{ background: C.hair }}
          >
            <IconHamburger size={18} />
          </HoverButton>
        </div>
      )}
      <iframe
        src="tours-map.html"
        title="Tour route"
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
      />
    </div>
  )
}
