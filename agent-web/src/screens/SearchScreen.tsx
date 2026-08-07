/** Search: the Leaflet map-search page, embedded as-is from public/search-map.html. */
import { useRef } from 'react'
import { withAbParam, type AbVariant } from '../abParam'
import { useAskVisibility } from '../askBridge'

interface SearchScreenProps {
  /** Forwarded into the iframe, which renders its own action bar under `?ab=b`. */
  variant: AbVariant
  /** Posted into the frame so its Ask button can hide while the panel is open. */
  askOpen: boolean
}

export function SearchScreen({ variant, askOpen }: SearchScreenProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const postAskVisible = useAskVisibility(frameRef, !askOpen)

  return (
    <div
      data-screen-label="Search"
      style={{ flex: 1, minHeight: 0, overflow: 'hidden', background: '#FFFFFF', display: 'flex' }}
    >
      <iframe
        ref={frameRef}
        src={withAbParam('search-map.html', variant)}
        title="Map search"
        onLoad={postAskVisible}
        style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
      />
    </div>
  )
}
