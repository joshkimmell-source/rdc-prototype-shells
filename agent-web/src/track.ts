/**
 * Attribution-only URL state mirroring — no network, no collection.
 *
 * These helpers keep the URL reflecting the *current* session so a shared link, a screenshot,
 * or a screen you're watching annotates itself: who the participant is (`?u=`) and what's on
 * screen right now — the assistant panel (`?panel=open`), the active assistant flow
 * (`?flow=catch-up`), and whether the Clients/Tours subnav is showing (`?subnav=open`).
 *
 * This deliberately does NOT keep a history of what happened. A URL parameter holds the
 * present state, not a log: when the panel closes its `?panel` flag is removed, so you can't
 * later tell it was ever open. Recording that sequence is what a collector does — see the
 * note in the commit that added this; the shells intentionally ship without one.
 *
 * Writes use `history.replaceState` (not `pushState`) so mirrored UI state never adds
 * Back-button entries — only genuine navigation (`?view=`/`?lead=`, see navParam.ts) does.
 * Every write preserves all other params and is `file://`-guarded, because the single-file
 * artifact from `npm run bundle` opens from disk where `replaceState` throws.
 */

/** The participant tag, e.g. `?u=tester07`. Read once at boot; the app never writes it. */
export function readParticipant(): string | null {
  const u = new URLSearchParams(window.location.search).get('u')
  return u && u.trim() ? u.trim() : null
}

/**
 * Mirror one piece of UI state into the URL. `true` writes `1`; `false`/`null`/`''` removes
 * the key, so the URL only ever names what is currently true. All other params (including
 * `?u=`, `?view=`, `?lead=`) are preserved.
 */
export function mirrorState(key: string, value: string | boolean | null | undefined): void {
  const url = new URL(window.location.href)
  const next = value === true ? '1' : value === false || value == null || value === '' ? null : String(value)
  if (next === null) url.searchParams.delete(key)
  else url.searchParams.set(key, next)
  if (url.href === window.location.href) return
  try {
    window.history.replaceState(null, '', url)
  } catch {
    // file:// — no history to update; the mirror is simply inert there.
  }
}
