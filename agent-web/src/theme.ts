/**
 * Colour + motion constants used across the shell.
 *
 * Most of these map onto Haven Panda tokens (noted below). A handful of values in the
 * source design have no token equivalent and are kept as literals so the port matches
 * the spec pixel-for-pixel rather than drifting to a nearest neighbour:
 *
 *   #2C8C44  online / scheduled-tour green   (nearest token: green.900 #2A7E3B)
 *   #E4A11B  amber attention dot             (nearest token: yellow.700 #B49700)
 *   #B41C21  send-button hover               (nearest token: red.700 #BA1B20)
 *   #E4D9C8  tour-card tile tan              (no token)
 *   #F8F6F3  table / tour row hover          (no token)
 *   #FCFBFA  client row hover                (no token)
 *   #BDB7B0  thread icon hover               (no token)
 *   #757575  message timestamp               (no token)
 */

export const C = {
  /** gray.1200 — text.base */
  dark: '#1A1816',
  white: '#FFFFFF',
  /** gray.50 — page canvas */
  canvas: '#F8F7F7',
  /** gray.100 — bg.alternate */
  alt: '#F2F0EF',
  /** gray.200 */
  hair: '#E9E7E4',
  /** gray.300 — border.base */
  border: '#D3CFCA',
  /** gray.400 */
  border400: '#BEB8B0',
  /** gray.600 */
  muted: '#958A7F',
  /** gray.700 — text.alternate */
  sub: '#726A60',
  /** gray.1000 — bg.action */
  action: '#3F3B36',
  /** red.600 — brand */
  brand: '#D92228',
  /** red.100 */
  brandSubtle: '#FEE2E3',
  /** blue.100 — user message bubble */
  userBubble: '#E9EFFB',

  // No-token literals (see note above).
  online: '#2C8C44',
  amber: '#E4A11B',
  sendHover: '#B41C21',
  tourTile: '#E4D9C8',
  rowHover: '#F8F6F3',
  rowHoverFaint: '#FCFBFA',
  threadIconHover: '#BDB7B0',
  timestamp: '#757575',
} as const

/**
 * The RealAssist+ brand gradient, shared by the floating FAB and the action bar's primary
 * action — the two placements the `?ab=` test compares. Defined once so the control reads
 * as the same thing in a different position rather than as two different buttons.
 */
export const BRAND_GRADIENT =
  'linear-gradient(-29.445deg, rgb(194,41,138) 8.38%, rgb(240,67,73) 49.20%, rgb(217,34,40) 101.69%)'

/**
 * The same stops turned along a wide pill's long axis. The FAB's steep angle is tuned for a
 * 56px circle and bands visibly across a 190px pill, so only the angle differs.
 */
export const BRAND_GRADIENT_PILL =
  'linear-gradient(95deg, rgb(240,67,73) 0%, rgb(217,34,40) 62%, rgb(194,41,138) 150%)'

/** The shell's single easing curve, used on every width/margin/transform transition. */
export const EASE = 'cubic-bezier(0.2,0.8,0.2,1)'
export const PANEL_TRANSITION = `220ms ${EASE}`

/**
 * The DC original used a bare `var(--font-display)`, which the authoring runtime defined.
 * Nothing defines it here, so the fallback names the face `index.html` actually loads.
 */
export const DISPLAY_FONT = "var(--font-display, 'Galano Grotesque Alt', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif)"
