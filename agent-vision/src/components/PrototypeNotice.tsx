/**
 * On-load disclaimer + access gate: this is a prototype seeded with sample data, and the
 * hosted copy sits behind a shared password so a public URL isn't open to anyone who finds it.
 *
 * Shown on every page load (open on first mount). Until the correct password is entered the
 * modal cannot be dismissed — its overlay/escape/close affordances are inert — so the app
 * behind it stays gated. A correct entry is remembered for the browser session, so a reload
 * shows the disclaimer again but doesn't re-prompt for the password.
 *
 * This is a SOFT gate, not real security: the password ships in the client bundle, so anyone
 * who reads the source can recover it. It only keeps casual visitors out of a demo link.
 *
 * The one escape hatch is the `SUPPRESS_KEY` localStorage flag, which the E2E suite seeds so
 * the overlay doesn't block every test; real visitors never set it, so they always see the gate.
 *
 * A shareable link can skip the gate entirely by carrying `?key=<ACCESS_TOKEN>`; a match closes
 * the modal on load — no disclaimer, no password. The token is kept distinct from the typed
 * password on purpose — it travels in URLs (and now in the mirrored/shared links from track.ts),
 * and we'd rather not put the human password there. Still a soft gate: the token ships in the
 * bundle too.
 */
import { useEffect, useState } from 'react'
import { Modal, Button } from '@rdc-npm/rdc-ui-v4'
import { C } from '../theme'

/** Set to `'1'` by the Playwright config so the notice never blocks the tests. */
const SUPPRESS_KEY = 'ra-suppress-prototype-notice'
/** Remembers a correct password for the browser session so reloads don't re-prompt. */
const UNLOCK_KEY = 'ra-prototype-unlocked'
/** Shared access password. Soft gate only — see the file header. */
const PASSWORD = 'B0bsYourUncle'
/** URL bypass: `?key=<ACCESS_TOKEN>` pre-unlocks the gate. Distinct from PASSWORD by design. */
const ACCESS_PARAM = 'key'
const ACCESS_TOKEN = 'rp-preview-2026'

/** Whether the current URL carries a valid bypass token. */
function hasAccessToken() {
  try {
    return new URLSearchParams(window.location.search).get(ACCESS_PARAM) === ACCESS_TOKEN
  } catch {
    return false
  }
}

export function PrototypeNotice() {
  const [open, setOpen] = useState(() => {
    // A valid bypass token skips the modal entirely — no disclaimer, no password.
    if (hasAccessToken()) return false
    try {
      return window.localStorage.getItem(SUPPRESS_KEY) !== '1'
    } catch {
      // Private-mode or blocked storage — default to showing the disclaimer.
      return true
    }
  })
  const [unlocked, setUnlocked] = useState(() => {
    try {
      if (window.sessionStorage.getItem(UNLOCK_KEY) === '1') return true
    } catch {
      // fall through to the token check
    }
    return hasAccessToken()
  })
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  // A token unlock earns the same session memory as a typed password, so removing `?key=` from
  // the URL (or a later reload) doesn't re-prompt within the session.
  useEffect(() => {
    if (unlocked) {
      try {
        window.sessionStorage.setItem(UNLOCK_KEY, '1')
      } catch {
        // Storage blocked — the gate just re-evaluates the URL/password next load.
      }
    }
  }, [unlocked])

  // "Okay" once unlocked; otherwise validate the password and only then dismiss.
  const proceed = () => {
    if (unlocked) {
      setOpen(false)
      return
    }
    if (password === PASSWORD) {
      setUnlocked(true)
      try {
        window.sessionStorage.setItem(UNLOCK_KEY, '1')
      } catch {
        // Storage blocked (e.g. sandboxed host) — the gate just re-prompts next load.
      }
      setOpen(false)
    } else {
      setError(true)
    }
  }

  return (
    <Modal
      open={open}
      // Ignore overlay/escape/close while locked, so the gate can't be dismissed unanswered.
      onClose={() => {
        if (unlocked) setOpen(false)
      }}
      size="sm"
    >
      <Modal.Header title="This is a prototype" />
      <Modal.Body>
        <p style={{ margin: 0, color: C.sub, fontSize: 15, lineHeight: 1.55 }}>
          Everything here is sample data for demonstration only. None of the people, listings,
          or addresses represent real individuals, properties, or locations.
        </p>

        {!unlocked && (
          <div style={{ marginTop: 20 }}>
            <label
              htmlFor="prototype-password"
              style={{
                display: 'block',
                fontSize: 13,
                fontWeight: 700,
                color: C.dark,
                marginBottom: 6,
              }}
            >
              Password
            </label>
            <input
              id="prototype-password"
              type="password"
              value={password}
              autoFocus
              autoComplete="off"
              placeholder="Enter the access password"
              aria-invalid={error}
              aria-describedby={error ? 'prototype-password-error' : undefined}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError(false)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') proceed()
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '10px 12px',
                fontSize: 15,
                color: C.dark,
                background: C.white,
                border: `1px solid ${error ? C.brand : C.border}`,
                borderRadius: 8,
                outline: 'none',
              }}
            />
            {error && (
              <div
                id="prototype-password-error"
                role="alert"
                style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: C.brand }}
              >
                Incorrect password. Try again.
              </div>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button styleType="Primary" onClick={proceed} disabled={!unlocked && password.length === 0}>
          {unlocked ? 'Okay' : 'Enter'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
