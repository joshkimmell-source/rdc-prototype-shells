/**
 * Invite-to-RDC+ composer — the flow that promotes a worked lead into a connected client.
 *
 * Opened from a ready lead (one worked past first contact) on the Leads list or its detail
 * page. The agent sees the qualifying-call data the invite is drafted from (product source,
 * market, budget, timeframe), an editable message pre-filled in her own voice, and a starter
 * saved search generated from the lead's market and budget — attached by default. Sending
 * promotes the lead to a client (the shell hides it from the active pipeline) and swaps the
 * composer for a short confirmation.
 *
 * Nothing actually dispatches — like the rest of the shell this is a prototype. The message
 * and toggle are real local state so the composition reads as live; "Send" only records the
 * promotion.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Modal, Button, TextArea, Toggle, PropertyCard, Tag, Checkbox } from '@rdc-npm/rdc-ui-v4'
import { C, DISPLAY_FONT } from '../theme'
import { IconCircleCheck } from '../icons'
import { listingMatchesForLead, type ClientListing, type ListingMatch, type Lead } from '../data'

/** `1130000` → `"$1,130,000"`, the same format `PropertyCard` renders the price in. */
const priceLabel = (n: number) => `$${n.toLocaleString('en-US')}`

/** A small "% match" pill. Greens the strong matches, ambers the middling, greys the rest. */
function MatchBadge({ score }: { score: number }) {
  const color = score >= 88 ? C.online : score >= 74 ? C.amber : C.muted
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flex: 'none',
        padding: '2px 8px',
        borderRadius: 999,
        background: C.white,
        border: `1px solid ${C.border}`,
        fontSize: 11,
        fontWeight: 700,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {score}% match
    </span>
  )
}

interface InviteModalProps {
  lead: Lead
  onClose: () => void
  /** Records the promotion — the shell adds the id to its promoted set and hides the lead. */
  onSend: (id: string) => void
}

/** One captured qualifying-call detail: an uppercase label over its value. */
function Captured({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ minWidth: 0 }}>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: C.muted,
          fontWeight: 700,
        }}
      >
        {label}
      </div>
      <div style={{ marginTop: 3, fontSize: 14, fontWeight: 600, color: C.dark }}>{value}</div>
    </div>
  )
}

/**
 * The single Spotlight home — the best-fitting listing, as a full Haven `PropertyCard` with a
 * "Spotlight" tag and its match score. No agent controls (select / hide / share): this is a
 * preview of what the consumer receives, not the agent's own working feed. It always goes with
 * the invite, so unlike the mini-cards below it isn't selectable.
 */
function SpotlightCard({ listing, score }: { listing: ClientListing; score: number }) {
  return (
    <PropertyCard
      media={<img src={listing.photo} alt={listing.photoAlt} loading="lazy" />}
      cardOverlayProps={{
        topLeftComponent: <Tag dataColor="orangeSubtle">Spotlight</Tag>,
        topRightComponent: <MatchBadge score={score} />,
      }}
      price={listing.price}
      priceAddon={
        <div
          style={{
            marginLeft: 'auto',
            minWidth: 0,
            display: 'flex',
            gap: 4,
            fontSize: 11,
            lineHeight: '14px',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {listing.status}
          </span>
          <span style={{ flex: 'none', color: C.sub }}>| {listing.dom} DOM</span>
        </div>
      }
      propertyMeta={listing.meta}
      address1={`${listing.address1} ${listing.address2}`}
      footer={
        <div style={{ display: 'flex', gap: 8, fontSize: 12, color: C.sub }}>
          <span>{listing.secondary}</span>
          <span style={{ marginLeft: 'auto', textAlign: 'right' }}>{listing.propertyType}</span>
        </div>
      }
    />
  )
}

/**
 * A non-spotlight match — a compact, selectable row (thumbnail, price, meta, its match score).
 * Wrapped in a `label` so the whole row toggles its `Checkbox`; the agent picks which of these
 * ride along with the invite.
 */
function MiniCard({
  match,
  selected,
  onToggle,
}: {
  match: ListingMatch
  selected: boolean
  onToggle: (id: string, next: boolean) => void
}) {
  const { listing, matchScore } = match
  const { beds, baths_full: baths, sqft } = listing.meta
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: 8,
        border: `1px solid ${selected ? C.dark : C.hair}`,
        borderRadius: 10,
        background: C.white,
        cursor: 'pointer',
        transition: 'border-color 120ms',
      }}
    >
      <img
        src={listing.photo}
        alt={listing.photoAlt}
        loading="lazy"
        style={{ width: 56, height: 56, flex: 'none', borderRadius: 8, objectFit: 'cover' }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          className="ty-numeric-body100"
          style={{ fontSize: 14, fontWeight: 700, color: C.dark, whiteSpace: 'nowrap' }}
        >
          {priceLabel(listing.price)}
        </div>
        <div
          style={{
            fontSize: 12,
            color: C.dark,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {listing.address1}
        </div>
        <div style={{ fontSize: 11.5, color: C.sub }}>
          {beds} bd · {baths} ba{sqft ? ` · ${sqft.toLocaleString('en-US')} sqft` : ''}
        </div>
      </div>
      <MatchBadge score={matchScore} />
      <Checkbox
        checked={selected}
        onChange={(_e, next) => onToggle(listing.id, next)}
        aria-label={`Include ${listing.address1}`}
      />
    </label>
  )
}

export function InviteModal({ lead, onClose, onSend }: InviteModalProps) {
  const first = lead.name.split(/\s+/)[0]
  const d = lead.detail
  const [message, setMessage] = useState(d.inviteMessage)
  const [pushOn, setPushOn] = useState(false)
  const [pushMessage, setPushMessage] = useState(d.invitePush)
  const [attachSearch, setAttachSearch] = useState(true)
  const [sent, setSent] = useState(false)
  const [preview, setPreview] = useState(false)
  // The lead + homes payload for the onboarding preview. Held in a ref (not state) so the
  // handshake responder below always reads the latest value with no stale-closure risk.
  const payloadRef = useRef<unknown>(null)

  // Answer the onboarding preview's readiness handshake. The preview iframe announces itself
  // once its own message listener is attached; we reply to that exact window with the payload.
  // This is the race-free path: unlike the iframe's onLoad (which can fire before the child's
  // listener exists), the child only asks after it's ready, so the reply is never missed. It
  // also crosses the sandbox boundary where localStorage can't — messaging always works.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e?.data?.type === 'rdc-plus-onboard-ready' && e.source) {
        try {
          ;(e.source as Window).postMessage({ type: 'rdc-plus-invite', payload: payloadRef.current }, '*')
        } catch {
          // Frame went away between the handshake and our reply — nothing to personalize.
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  const budgetLabel = lead.type === 'Seller' ? 'Est. value' : 'Budget'

  // One spotlight (best fit) plus four selectable extras.
  const matches = useMemo(() => listingMatchesForLead(lead, 5), [lead])
  const [spotlight, ...miniCards] = matches
  const [selectedMini, setSelectedMini] = useState<Set<string>>(
    () => new Set(matches.slice(1).map((m) => m.listing.id)),
  )
  const toggleMini = (id: string, next: boolean) =>
    setSelectedMini((prev) => {
      const s = new Set(prev)
      if (next) s.add(id)
      else s.delete(id)
      return s
    })

  // What rides along with the invite: the spotlight always, plus the ticked extras.
  const homesSent = attachSearch ? 1 + selectedMini.size : 0

  const send = () => {
    onSend(lead.id)
    setSent(true)
    // Hand the invited lead + the homes they'll see to the onboarding preview. Two paths,
    // because the preview iframe may not share storage with this shell: localStorage works
    // in local dev / non-sandboxed hosts, while postMessage (below, on the iframe's onLoad)
    // is the reliable handoff when the shell runs inside a sandboxed iframe (RealPrototypes),
    // where storage is partitioned or unavailable and only messaging crosses the boundary.
    const selected = miniCards.filter((m) => selectedMini.has(m.listing.id))
    const attached = attachSearch ? (spotlight ? [spotlight, ...selected] : selected) : []
    const parts = lead.name.split(/\s+/)
    const payload = {
      lead: { name: lead.name, first: parts[0], last: parts.slice(1).join(' '), email: lead.email },
      homes: attached.map((m) => ({
        photo: m.listing.photo,
        price: m.listing.price,
        address: m.listing.address1,
        beds: m.listing.meta.beds,
        baths: m.listing.meta.baths_full,
        sqft: m.listing.meta.sqft,
        match: m.matchScore,
      })),
    }
    payloadRef.current = payload
    try {
      localStorage.setItem('rdc-plus-invite', JSON.stringify(payload))
    } catch {
      // Private-mode / storage-disabled: the postMessage path still personalizes the preview.
    }
    // Preview what the lead receives, shown in-app rather than a popped tab. A hosted
    // prototype runs inside a sandboxed iframe where window.open to a new tab is blocked,
    // so the overlay iframe below is the reliable way to render it. Its src literal is what
    // the single-file bundle rewrites to the inlined onboarding blob URL.
    setPreview(true)
  }

  return (
    <>
    {/* Closed while the preview is up: the Modal's full-screen overlay would otherwise sit
        above the preview and swallow the clicks that drive the onboarding flow. Reopens on
        the confirmation screen when the preview is dismissed. */}
    <Modal open={!preview} onClose={onClose} size="lg">
      {sent ? (
        <>
          <Modal.Body>
            <div style={{ textAlign: 'center', padding: '12px 8px 8px' }}>
              <span style={{ display: 'inline-flex', color: C.online }}>
                <IconCircleCheck size={40} />
              </span>
              <h2
                style={{
                  margin: '14px 0 0',
                  fontFamily: DISPLAY_FONT,
                  fontWeight: 600,
                  fontSize: 20,
                  lineHeight: '26px',
                  color: C.dark,
                }}
              >
                Invite sent to {first}
              </h2>
              <p style={{ margin: '8px auto 0', maxWidth: 400, fontSize: 14, lineHeight: 1.55, color: C.sub }}>
                {first} now sits in your clients list, marked <strong style={{ color: C.dark }}>Invited</strong>.
                Once they accept, you&apos;ll pick up right where you left off
                {homesSent > 0 ? (
                  <>
                    {' '}— with{' '}
                    <strong style={{ color: C.dark }}>
                      {homesSent} {homesSent === 1 ? 'home' : 'homes'}
                    </strong>{' '}
                    waiting in their Realtor.com+ account.
                  </>
                ) : (
                  '.'
                )}
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button styleType="Tertiary" onClick={() => setPreview(true)}>
              Preview what {first} receives
            </Button>
            <Button styleType="Primary" onClick={onClose}>
              Done
            </Button>
          </Modal.Footer>
        </>
      ) : (
        <>
          <Modal.Header title={`Work with ${first}`} />
          <Modal.Body>
            <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: C.sub }}>
              Keep the relationship going in one shared space. The invite is drafted from your
              qualifying call — review it, make it yours, and send.
            </p>

            {/* Captured qualifying-call data (FR3) — read-only. */}
            <div
              style={{
                marginTop: 16,
                padding: 16,
                border: `1px solid ${C.hair}`,
                borderRadius: 12,
                background: C.canvas,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 14,
              }}
            >
              <Captured label="Product source" value={lead.delivery.product} />
              <Captured label="Market" value={`${lead.marketCity} ${lead.marketZip}`} />
              <Captured label={budgetLabel} value={d.budgetLabel} />
              <Captured label="Timeframe" value={d.timeframe} />
            </div>

            {/* Editable email message (FR4). */}
            <div style={{ marginTop: 20 }}>
              <TextArea
                label="Your email message"
                helperText={`Your edits are exactly what ${first} receives.`}
                value={message}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
                rows={7}
                resize="vertical"
              />
            </div>

            {/* Push notification — opt-in, with its own editable copy. */}
            <div
              style={{
                marginTop: 20,
                border: `1px solid ${C.hair}`,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.dark }}>
                    Also send a push notification
                  </span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: C.sub }}>
                    Nudge {first} in the Realtor.com+ app alongside the email.
                  </span>
                </span>
                <Toggle
                  checked={pushOn}
                  onChange={(_e, checked) => setPushOn(checked)}
                  aria-label="Also send a push notification"
                />
              </label>

              {pushOn && (
                <div style={{ padding: '4px 16px 16px', borderTop: `1px solid ${C.hair}` }}>
                  <div style={{ marginTop: 12 }}>
                    <TextArea
                      label="Push message"
                      helperText="Keep it short — this shows on the lock screen."
                      value={pushMessage}
                      onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setPushMessage(e.target.value)}
                      rows={3}
                      resize="vertical"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Starter saved search (FR5) — previewed as the Spotlight homes it surfaces. */}
            <div
              style={{
                marginTop: 20,
                border: `1px solid ${C.hair}`,
                borderRadius: 12,
                overflow: 'hidden',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  cursor: 'pointer',
                }}
              >
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.dark }}>
                    Attach a starter search
                  </span>
                  <span style={{ display: 'block', marginTop: 2, fontSize: 12, color: C.sub }}>
                    Generated from {first}&apos;s market and budget, ready in their account.
                  </span>
                </span>
                <Toggle
                  checked={attachSearch}
                  onChange={(_e, checked) => setAttachSearch(checked)}
                  aria-label="Attach a starter search"
                />
              </label>

              {attachSearch && (
                <div
                  style={{
                    padding: '14px 16px 16px',
                    borderTop: `1px solid ${C.hair}`,
                    background: C.canvas,
                  }}
                >
                  {spotlight && (
                    <>
                      <div
                        style={{
                          fontSize: 11,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: C.muted,
                          fontWeight: 700,
                          marginBottom: 12,
                        }}
                      >
                        Spotlight home {first} will see first
                      </div>
                      <SpotlightCard listing={spotlight.listing} score={spotlight.matchScore} />
                    </>
                  )}

                  {miniCards.length > 0 && (
                    <>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          justifyContent: 'space-between',
                          gap: 12,
                          margin: '18px 0 10px',
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            color: C.muted,
                            fontWeight: 700,
                          }}
                        >
                          More matches to include
                        </span>
                        <span style={{ fontSize: 11, color: C.sub, fontWeight: 600 }}>
                          {selectedMini.size} of {miniCards.length} selected
                        </span>
                      </div>
                      <div style={{ display: 'grid', gap: 8 }}>
                        {miniCards.map((m) => (
                          <MiniCard
                            key={m.listing.id}
                            match={m}
                            selected={selectedMini.has(m.listing.id)}
                            onToggle={toggleMini}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button styleType="Tertiary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              styleType="Primary"
              onClick={send}
              disabled={message.trim() === '' || (pushOn && pushMessage.trim() === '')}
            >
              Send invite
            </Button>
          </Modal.Footer>
        </>
      )}
    </Modal>

    {/* In-app preview of what the invited lead receives. An iframe rather than a popped tab,
        so it renders even where the host embeds this prototype in a sandboxed iframe. The
        src literal below is rewritten to the inlined onboarding blob URL by the single-file
        bundle; in dev it resolves to the page served from public/. */}
    {preview && (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Preview — what ${first} receives`}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 2000,
          background: 'rgba(0, 0, 0, 0.55)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 16px',
            background: C.white,
            borderBottom: `1px solid ${C.hair}`,
            flex: 'none',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
            Preview — what {first} receives
          </span>
          <Button styleType="Tertiary" onClick={() => setPreview(false)}>
            Close preview
          </Button>
        </div>
        <iframe
          title={`Realtor.com+ onboarding preview for ${first}`}
          src="rdc-plus-onboarding.html"
          onLoad={(e) => {
            // Belt-and-suspenders alongside the readiness handshake above: if the child's
            // listener is already attached by load, this personalizes it a beat sooner. Reads
            // the ref (not stale state) and targets '*' because the inlined onboarding runs
            // from an opaque-origin blob URL; the page guards on the message's own `type`.
            try {
              e.currentTarget.contentWindow?.postMessage(
                { type: 'rdc-plus-invite', payload: payloadRef.current },
                '*',
              )
            } catch {
              // Cross-origin frame with messaging blocked: the preview keeps its defaults.
            }
          }}
          style={{ flex: 1, width: '100%', border: 0, background: C.white }}
        />
      </div>
    )}
    </>
  )
}
