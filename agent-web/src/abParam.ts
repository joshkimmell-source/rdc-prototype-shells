/**
 * Which placement of the "Ask RealAssist+" trigger is under test, read from `?ab=`.
 *
 *   a           — the floating FAB, fixed to the bottom-right corner.
 *   b           — an `ActionBar` primary action, inline at the right of every page header.
 *   c (default) — a responsive blend: the floating FAB on mobile (as in A), the inline
 *                 `ActionBar` action at every other width (as in B).
 *
 * Read-only on purpose: nothing in the UI writes it back, so whoever opens a link sees a
 * finished product rather than a switcher that would tell them they are in a test.
 */

export type AbVariant = 'a' | 'b' | 'c'

const PARAM = 'ab'
const DEFAULT_VARIANT: AbVariant = 'c'
const VARIANTS: string[] = ['a', 'b', 'c']

/**
 * Unknown and missing values both fall back to C, the default behaviour — a typo in a
 * tester's URL must not put them on a fourth, undefined variant.
 */
export function readAbParam(): AbVariant {
  if (typeof window === 'undefined') return DEFAULT_VARIANT
  const value = new URLSearchParams(window.location.search).get(PARAM)?.toLowerCase()
  return value && VARIANTS.includes(value) ? (value as AbVariant) : DEFAULT_VARIANT
}
