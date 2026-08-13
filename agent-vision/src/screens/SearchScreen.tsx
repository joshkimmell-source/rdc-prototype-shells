/**
 * Search: the Leaflet map-search page, embedded from public/search-map.html. The MLS selector,
 * search field, and actions now live in the shared `MainHeader` (see SearchHeaderLead); the frame
 * is just the map, chips, and view toggles.
 */
import { useRef } from 'react'

export function SearchScreen() {
  const frameRef = useRef<HTMLIFrameElement>(null)

  return (
    <div
      data-screen-label="Search"
      style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#FFFFFF', display: 'flex' }}
    >
      <iframe
        ref={frameRef}
        src="search-map.html"
        title="Map search"
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
      />
    </div>
  )
}
