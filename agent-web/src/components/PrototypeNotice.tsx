/**
 * On-load disclaimer: this is a prototype seeded with sample data, so nothing in it is real.
 *
 * Shown on every page load (open on first mount), dismissed by the "Okay" button — or the
 * modal's own overlay/escape/close affordances. The copy makes the fictional nature explicit
 * so a viewer never mistakes a sample client, listing, or address for a real one.
 *
 * Dismissal is not persisted, so a reload shows it again. The one escape hatch is the
 * `SUPPRESS_KEY` localStorage flag, which the E2E suite seeds so the overlay doesn't block
 * every test; real visitors never set it, so they always see the notice.
 */
import { useState } from 'react'
import { Modal, Button } from '@rdc-npm/rdc-ui-v4'
import { C } from '../theme'

/** Set to `'1'` by the Playwright config so the notice never blocks the tests. */
const SUPPRESS_KEY = 'ra-suppress-prototype-notice'

export function PrototypeNotice() {
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(SUPPRESS_KEY) !== '1'
    } catch {
      // Private-mode or blocked storage — default to showing the disclaimer.
      return true
    }
  })
  const close = () => setOpen(false)

  return (
    <Modal open={open} onClose={close} size="sm">
      <Modal.Header title="This is a prototype" />
      <Modal.Body>
        <p style={{ margin: 0, color: C.sub, fontSize: 15, lineHeight: 1.55 }}>
          Everything here is sample data for demonstration only. None of the people, listings,
          or addresses represent real individuals, properties, or locations.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button styleType="Primary" onClick={close}>
          Okay
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
