/**
 * Viewport watcher for the shell's mobile layout.
 *
 * `Shell` already read `(max-width: 768px)` to switch the nav rail from hover to click.
 * The same query now also decides whether the rail, subnav, and assistant panel render
 * in flow or as overlay drawers, and several components below `Shell` need the answer —
 * so the listener lives here once instead of being duplicated per component.
 */
import { useEffect, useState } from 'react'

/** At or below this width the rail, subnav, and panel become overlay drawers. */
export const MOBILE_QUERY = '(max-width: 768px)'

/**
 * Read synchronously so the first paint is already correct. The drawers default to
 * closed on mobile, and deciding that a frame late would flash the assistant panel
 * across the whole viewport before it collapsed.
 */
export function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches
}

export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(isMobileViewport)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_QUERY)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

/**
 * The medium band: wide enough for the desktop layout (rail in flow, panels docked rather
 * than overlaid) but too narrow to hold the 64px rail, the 320px subnav, the 420px assistant
 * panel and a usable content column all at once. `769 + …` picks up right where the mobile
 * query lets go, so there is no width that is neither mobile nor medium nor wide.
 *
 * `1279` is the last width at which docking both side panels leaves the content column under
 * ~475px (1280 − 64 − 320 − 420); at or below it the two panels are made mutually exclusive
 * so the content is never squished between them.
 */
export const MEDIUM_QUERY = '(min-width: 769px) and (max-width: 1279px)'

export function isMediumViewport() {
  return typeof window !== 'undefined' && window.matchMedia(MEDIUM_QUERY).matches
}

export function useIsMedium() {
  const [isMedium, setIsMedium] = useState(isMediumViewport)

  useEffect(() => {
    const mq = window.matchMedia(MEDIUM_QUERY)
    const onChange = () => setIsMedium(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMedium
}

/**
 * A touch interface — one whose primary pointer can't hover. Hover-triggered affordances
 * (like the icon-only tooltip) can't be dismissed by "moving away" here, and a tap fires the
 * enter/focus handlers that would otherwise leave them stuck on screen.
 */
export const TOUCH_QUERY = '(hover: none)'

export function isTouchInterface() {
  return typeof window !== 'undefined' && window.matchMedia(TOUCH_QUERY).matches
}

export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(isTouchInterface)

  useEffect(() => {
    const mq = window.matchMedia(TOUCH_QUERY)
    const onChange = () => setIsTouch(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isTouch
}
