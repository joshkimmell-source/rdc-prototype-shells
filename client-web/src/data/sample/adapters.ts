/**
 * Per-shell mapping from the shared sample dataset to what client-web's screens consume.
 *
 * client-web's default surface is an agent profile page: a breadcrumb, an identity block
 * (avatar + name), and a contact row (phone, email, location). The dataset's `Agent` covers
 * name, title, brokerage, email, phone, avatar, and license — everything but a location,
 * which it has no field for. See `location` below for how that gap is filled.
 *
 * Keeping the mapping here rather than editing `Shell.tsx` to take the dataset's shape means
 * re-running the inject-dummy-data skill can overwrite `index.ts` / `sample-data.json`
 * without touching this file.
 */
import { CURRENT_AGENT } from './index'

const agent = CURRENT_AGENT

/** The profile subject's full name — the identity heading and the breadcrumb leaf. */
export const agentName = `${agent.firstName} ${agent.lastName}`

/** Alt text for the avatar. */
export const agentAvatarAlt = agentName

/**
 * The agent's office location. The dataset gives an agent no location of its own, so this is
 * a fixed fictional value drawn from the dataset's invented place names — `ST` is not a real
 * state code, so a user-testing participant cannot map it to a real place. Chosen once and
 * left constant so screenshots do not churn between runs.
 */
const location = 'Rivertown, ST'

export interface ContactLine {
  /** One of 'phone' | 'email' | 'location', so the Shell can pick the matching icon. */
  kind: 'phone' | 'email' | 'location'
  label: string
}

/** The contact row, in display order. Phone is in the fictional 555 block, email on example.com. */
export const contact: ContactLine[] = [
  { kind: 'phone', label: agent.phone },
  { kind: 'email', label: agent.email },
  { kind: 'location', label: location },
]
