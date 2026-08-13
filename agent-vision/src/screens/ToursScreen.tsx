/**
 * Tours: the Leaflet tour-route page from public/tours-map.html. The title, actions, and subnav
 * re-open affordance all live in the shared `MainHeader` now, so this screen is just the map —
 * it draws whichever tour the Tours subnav has selected.
 */
import { useRef } from 'react'
import { useSelectedTour } from '../askBridge'
import type { MapTour } from '../data'

interface ToursScreenProps {
  /** The tour the map draws — whichever the Tours subnav has selected. */
  selectedTour?: MapTour
}

export function ToursScreen({ selectedTour }: ToursScreenProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const postSelectedTour = useSelectedTour(frameRef, selectedTour)

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
      <iframe
        ref={frameRef}
        src="tours-map.html"
        title="Tour route"
        onLoad={postSelectedTour}
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
      />
    </div>
  )
}
