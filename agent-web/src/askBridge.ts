/**
 * The bridge between the shell and the Tours map it frames.
 *
 * The map is a pure renderer: the shell posts down the tour to draw, and the map draws it.
 * (The title and actions that used to sit inside the frame now live in the shell's shared
 * `MainHeader`, so the only message that still crosses the boundary is the tour selection.)
 */
import { useCallback, useEffect } from 'react'
import type { RefObject } from 'react'

/**
 * Sent down to the Tours map with the full payload of the tour to draw — whichever one the
 * Tours subnav has selected. The map is a pure renderer of this message: the subnav opens on
 * Priyanka's already-created tour, and booking the assistant-coordinated tour (Jordan & Mia's)
 * selects it, so a tour the agent hasn't created is never the one on screen. Posted on each
 * frame load and whenever the selection changes.
 */
export const TOUR_SELECT_MESSAGE = 'ra:tour-select'

/**
 * Pushes the selected tour's full payload into the Tours map. Posts on change, and returns the
 * poster for the frame's `onLoad` so a freshly (re)loaded frame is told which tour to draw —
 * an effect that runs before the document has parsed its listener would post into nothing.
 * `tour` is a `MapTour`, kept as an opaque payload here so the bridge stays free of a
 * data-layer import.
 */
export function useSelectedTour(ref: RefObject<HTMLIFrameElement | null>, tour: unknown) {
  const post = useCallback(() => {
    ref.current?.contentWindow?.postMessage(
      { type: TOUR_SELECT_MESSAGE, tour },
      window.location.origin
    )
  }, [ref, tour])

  useEffect(post, [post])

  return post
}
