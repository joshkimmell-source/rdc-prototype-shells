/**
 * Tours: the Leaflet tour-route page from public/tours-map.html, with the subnav
 * re-open affordance that only appears once the subnav has been closed.
 */
import { useRef } from 'react'
import { C } from '../theme'
import { HoverButton } from '../components/primitives'
import { IconHamburger } from '../icons'
import { withAbParam, type AbVariant } from '../abParam'
import { useAskVisibility, useTourVisibility } from '../askBridge'

interface ToursScreenProps {
  showSubnavButton: boolean
  onOpenSubnav: () => void
  /** Forwarded into the iframe, which renders its own action bar under `?ab=b`. */
  variant: AbVariant
  /** Posted into the frame so its Ask button can hide while the panel is open. */
  askOpen: boolean
  /** Whether the coordinated tour has been booked — the map draws only when it has. */
  tourVisible: boolean
}

export function ToursScreen({ showSubnavButton, onOpenSubnav, variant, askOpen, tourVisible }: ToursScreenProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const postAskVisible = useAskVisibility(frameRef, !askOpen)
  const postTourVisible = useTourVisibility(frameRef, tourVisible)

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
        ref={frameRef}
        src={withAbParam('tours-map.html', variant)}
        title="Tour route"
        onLoad={() => {
          postAskVisible()
          postTourVisible()
        }}
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
      />
    </div>
  )
}
