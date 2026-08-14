/**
 * The active top-level destination, mirrored into the URL as `?view=clients`.
 *
 * Makes a screen linkable and lets it survive a reload, which the shell otherwise lost on
 * every refresh. Clients is the default and writes no parameter, so the bare URL stays clean;
 * `home` stays a valid value so `?view=home` still opens the dashboard even though the nav
 * no longer lists it.
 */
import type { NavId } from './components/NavRail'

const PARAM = 'view'
const LEAD_PARAM = 'lead'
const DEFAULT_VIEW: NavId = 'clients'
const VIEWS: string[] = ['home', 'leads', 'clients', 'search', 'tours']

/** Unknown and missing values both fall back to Clients rather than rendering nothing. */
export function readNavParam(): NavId {
  const value = new URLSearchParams(window.location.search).get(PARAM)
  return value && VIEWS.includes(value) ? (value as NavId) : DEFAULT_VIEW
}

/**
 * Pushes the destination, so Back walks the nav history one screen at a time.
 *
 * Wrapped because `pushState` throws on a `file://` document, which is how the single-file
 * artifact from `npm run bundle` gets opened. There the URL just stops tracking the screen.
 */
export function writeNavParam(id: NavId) {
  const url = new URL(window.location.href)
  if (id === DEFAULT_VIEW) url.searchParams.delete(PARAM)
  else url.searchParams.set(PARAM, id)
  if (url.href === window.location.href) return
  try {
    window.history.pushState(null, '', url)
  } catch {
    // file:// — no history entry, and no navigation either.
  }
}

/**
 * The open lead on the Leads page, mirrored as `?lead=lead_03` alongside `?view=leads`.
 * Only meaningful under the leads view; the shell drops it when leaving. Returns null when
 * no lead is open, so a bare `?view=leads` shows the list.
 */
export function readLeadParam(): string | null {
  return new URLSearchParams(window.location.search).get(LEAD_PARAM)
}

/** Pushes (or clears, with `null`) the open-lead parameter, so Back closes the detail. */
export function writeLeadParam(id: string | null) {
  const url = new URL(window.location.href)
  if (id) url.searchParams.set(LEAD_PARAM, id)
  else url.searchParams.delete(LEAD_PARAM)
  if (url.href === window.location.href) return
  try {
    window.history.pushState(null, '', url)
  } catch {
    // file:// — no history entry, and no navigation either.
  }
}
