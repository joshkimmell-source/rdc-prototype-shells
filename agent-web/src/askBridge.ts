/**
 * The bridge between the shell and the two map pages it frames (Search and Tours).
 *
 * Those pages render their own action bar under `?ab=b`, so their Ask button is in a
 * different document from the assistant panel it opens. Two messages cross that boundary:
 * the click going up, and the panel's open state coming back down so the button can hide
 * itself while the panel it would open is already on screen.
 */
import { useCallback, useEffect } from 'react'
import type { RefObject } from 'react'

/** Sent up by a framed map when its Ask button is clicked. */
export const ASK_MESSAGE = 'ra:ask'

/** Sent down whenever the panel opens or closes, and again on each frame load. */
export const ASK_VISIBLE_MESSAGE = 'ra:ask-visible'

/**
 * Pushes the panel's state into a framed map. Returns the poster as well, for the frame's
 * `onLoad`: an effect that runs before the document has parsed its listener would post
 * into nothing, and the frame reloads whenever its `src` changes.
 */
export function useAskVisibility(ref: RefObject<HTMLIFrameElement | null>, visible: boolean) {
  const post = useCallback(() => {
    ref.current?.contentWindow?.postMessage(
      { type: ASK_VISIBLE_MESSAGE, visible },
      window.location.origin
    )
  }, [ref, visible])

  useEffect(post, [post])

  return post
}
