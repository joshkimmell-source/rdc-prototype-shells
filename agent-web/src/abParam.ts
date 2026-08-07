/**
 * Which placement of the "Ask RealAssist+" trigger is under test, read from `?ab=`.
 *
 *   a (default) — the floating FAB, fixed to the bottom-right corner.
 *   b           — an `ActionBar` primary action, inline at the right of every page header.
 *
 * Read-only on purpose: nothing in the UI writes it back, so whoever opens a link sees a
 * finished product rather than a switcher that would tell them they are in a test.
 */

export type AbVariant = 'a' | 'b'

const PARAM = 'ab'
const DEFAULT_VARIANT: AbVariant = 'a'
const VARIANTS: string[] = ['a', 'b']

/**
 * Unknown and missing values both fall back to A, the shipped behaviour — a typo in a
 * tester's URL must not put them on a third, undefined variant.
 */
export function readAbParam(): AbVariant {
  if (typeof window === 'undefined') return DEFAULT_VARIANT
  const value = new URLSearchParams(window.location.search).get(PARAM)?.toLowerCase()
  return value && VARIANTS.includes(value) ? (value as AbVariant) : DEFAULT_VARIANT
}

/**
 * Carries `?ab=` onto a URL that does not have it.
 *
 * The maps are iframes with their own URLs, so the variant has to be forwarded explicitly
 * or they would always render as A regardless of what the shell is showing.
 */
export function withAbParam(url: string, variant: AbVariant) {
  return variant === DEFAULT_VARIANT ? url : `${url}?${PARAM}=${variant}`
}
