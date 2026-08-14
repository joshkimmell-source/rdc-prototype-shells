/**
 * Lead detail — the page behind each row of the Leads list, modelled on RDCPro's
 * lead-detail layout.
 *
 * A breadcrumb back to the list, the lead's name and status, and a contact row, then two
 * columns: the left holds the pipeline Status card (with the current property inquiry) and
 * the Referral details card (Concierge note, financing, availability, the call recording,
 * and the co-marketing partner); the right leads with the promote-to-client CTA — which opens
 * the invite-to-RDC+ composer for a lead worked past first contact — over Realtor.com's
 * contact log. Overview is the built tab; Activity and Notes are honest placeholders.
 *
 * Everything here reads off the `detail` block the `Lead` adapter derives — no data is
 * invented in the view. The Update status / View dispatch / player controls are prototype
 * no-ops, matching the rest of the shell.
 */
import { useState, type CSSProperties, type ReactNode } from 'react'
import { Tag } from '@rdc-npm/rdc-ui-v4'
import { C, DISPLAY_FONT } from '../theme'
import { HoverButton, Heading } from '../components/primitives'
import {
  IconChevronRight,
  IconDownload,
  IconGlobe,
  IconHome,
  IconInfo,
  IconMail,
  IconPhone,
  IconPlay,
  IconChat,
  IconCircleCheck,
  IconUserPlus,
  IconVolume,
} from '../icons'
import type { Lead } from '../data'

interface LeadDetailScreenProps {
  mobile: boolean
  lead: Lead
  onBack: () => void
  /** Opens the invite-to-RDC+ composer for this lead. */
  onInvite: (id: string) => void
}

type DetailTab = 'overview' | 'activity' | 'notes'
const TABS: Array<{ id: DetailTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'notes', label: 'Notes' },
]

const cardStyle: CSSProperties = {
  border: `1px solid ${C.border}`,
  borderRadius: 16,
  background: C.white,
  padding: 20,
}

const hair: CSSProperties = { height: 1, background: C.hair, border: 'none', margin: '16px 0' }

/** A labelled value; `block` renders the value as body copy (the Concierge note) rather than a bold field. */
function Field({ label, value, block = false }: { label: string; value: ReactNode; block?: boolean }) {
  return (
    <div style={{ marginBottom: 14 }}>
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
      <div
        style={{
          marginTop: 3,
          fontSize: 14,
          color: C.dark,
          fontWeight: block ? 400 : 600,
          lineHeight: block ? '20px' : '18px',
        }}
      >
        {value}
      </div>
    </div>
  )
}

/** A text link that stands in for an inert action (Reassign, View dispatch history). */
function LinkButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <HoverButton
      onClick={onClick}
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        color: C.action,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
      hoverStyle={{ color: C.dark }}
    >
      {children}
    </HoverButton>
  )
}

export function LeadDetailScreen({ mobile, lead, onBack, onInvite }: LeadDetailScreenProps) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const d = lead.detail
  const budgetLabel = lead.type === 'Seller' ? 'Est. value' : 'Budget'
  const first = lead.name.split(/\s+/)[0]

  return (
    <div
      data-screen-label="Lead detail"
      className="ra-scroll"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        padding: mobile ? '8px 16px 24px' : '8px 24px 32px',
      }}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: C.sub, marginBottom: 12 }}>
          <HoverButton
            onClick={onBack}
            style={{
              border: 'none',
              background: 'transparent',
              padding: 0,
              color: C.action,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            hoverStyle={{ color: C.dark }}
          >
            Leads
          </HoverButton>
          <IconChevronRight size={12} />
          <span style={{ color: C.muted }}>{lead.name}</span>
        </div>

        {/* Name + status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Heading as="h1" size={30} lineHeight={36}>
            {lead.name}
          </Heading>
          <Tag dataColor={lead.statusColor}>{lead.status}</Tag>
        </div>
        <div style={{ marginTop: 4, fontSize: 13, color: C.sub }}>
          {lead.type} lead · {lead.marketCity} {lead.marketZip}
        </div>

        {/* Contact row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: mobile ? 12 : 22,
            flexWrap: 'wrap',
            marginTop: 12,
            fontSize: 13,
          }}
        >
          <a
            href={`tel:${lead.phone.replace(/[^\d+]/g, '')}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: C.action, textDecoration: 'none' }}
          >
            <IconPhone size={15} />
            {lead.phone}
          </a>
          <a
            href={`mailto:${lead.email}`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: C.action, textDecoration: 'none' }}
          >
            <IconMail size={15} />
            {lead.email}
          </a>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: C.sub }}>
            <IconGlobe size={15} />
            {lead.delivery.method} · {lead.delivery.product}
          </span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 20, marginTop: 16, borderBottom: `1px solid ${C.hair}` }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 2px',
                marginBottom: -1,
                border: 'none',
                borderBottom: `2px solid ${tab === t.id ? C.dark : 'transparent'}`,
                background: 'transparent',
                color: tab === t.id ? C.dark : C.sub,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' ? (
          <div
            style={{
              display: 'flex',
              gap: 20,
              alignItems: 'flex-start',
              flexDirection: mobile ? 'column' : 'row',
              marginTop: 20,
            }}
          >
            {/* Left column */}
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
              {/* Status card */}
              <section style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>Status</span>
                    <Tag dataColor={lead.statusColor}>{lead.status}</Tag>
                    <span
                      style={{
                        fontSize: 13,
                        color: lead.overdue ? C.brand : C.sub,
                        fontWeight: lead.overdue ? 700 : 500,
                      }}
                    >
                      {d.dueLabel}
                    </span>
                  </div>
                  <HoverButton
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      height: 34,
                      flex: 'none',
                      padding: '0 14px',
                      borderRadius: 40,
                      border: `1px solid ${C.border}`,
                      background: C.white,
                      color: C.dark,
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                    hoverStyle={{ borderColor: C.dark }}
                  >
                    Update status
                  </HoverButton>
                </div>
                <div style={{ marginTop: 8, fontSize: 12, color: C.muted }}>
                  Last edited on {d.lastEditedLabel} in {lead.updatedBy}
                </div>

                <hr style={hair} />

                <div
                  style={{
                    display: 'flex',
                    gap: 20,
                    alignItems: 'flex-start',
                    flexDirection: mobile ? 'column' : 'row',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Field label={budgetLabel} value={d.budgetLabel} />
                    <Field label="Property type" value={d.propertyType} />
                    <Field label="Timeframe" value={d.timeframe} />
                  </div>

                  {/* Current property inquiry */}
                  <div
                    style={{
                      flex: 'none',
                      width: mobile ? '100%' : 300,
                      border: `1px solid ${C.hair}`,
                      borderRadius: 12,
                      overflow: 'hidden',
                      background: C.canvas,
                    }}
                  >
                    <img
                      src={d.inquiry.photo}
                      alt={`${d.inquiry.line1}, ${d.inquiry.cityLine}`}
                      style={{ width: '100%', height: 132, objectFit: 'cover', display: 'block', background: C.hair }}
                    />
                    <div style={{ padding: 12 }}>
                      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.muted, fontWeight: 700 }}>
                        Current property inquiry
                      </div>
                      <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: C.dark }}>
                        {d.inquiry.line1}
                      </div>
                      <div style={{ fontSize: 12, color: C.sub }}>{d.inquiry.cityLine}</div>
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: DISPLAY_FONT, fontSize: 15, fontWeight: 700, color: C.dark }}>
                          {d.inquiry.priceLabel}
                        </span>
                        <span style={{ fontSize: 12, color: C.muted }}>MLS# {d.inquiry.mls}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Referral details card */}
              <section style={cardStyle}>
                <Heading as="h3" size={15} lineHeight={20}>
                  Referral details
                </Heading>
                <div style={{ marginTop: 4, marginBottom: 16, fontSize: 12, color: C.muted }}>
                  Information from the first inquiry received on {d.firstInquiryLabel}
                </div>

                <Field label="Concierge note" value={d.conciergeNote} block />

                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Field label={d.financingLabel} value={d.financingValue} />
                  </div>
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <Field label="Availability" value={d.availability} />
                  </div>
                </div>

                {d.recording && (
                  <>
                    <hr style={hair} />
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: C.dark }}>
                        Call recording on {d.recording.dateLabel}
                      </span>
                      <span style={{ fontSize: 12, color: C.muted }}>Expires {d.recording.expiresLabel}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        marginTop: 10,
                        padding: '8px 14px',
                        border: `1px solid ${C.border}`,
                        borderRadius: 40,
                      }}
                    >
                      <HoverButton
                        aria-label="Play recording"
                        style={{
                          width: 32,
                          height: 32,
                          flex: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          border: 'none',
                          background: C.dark,
                          color: C.white,
                          cursor: 'pointer',
                          paddingLeft: 2,
                        }}
                        hoverStyle={{ background: C.action }}
                      >
                        <IconPlay size={13} />
                      </HoverButton>
                      <span style={{ fontSize: 12, color: C.sub, fontVariantNumeric: 'tabular-nums' }}>
                        {d.recording.elapsed}
                      </span>
                      <div style={{ flex: 1, height: 4, borderRadius: 2, background: C.hair, position: 'relative' }}>
                        <div
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: `${d.recording.percent}%`,
                            background: C.dark,
                            borderRadius: 2,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: 12, color: C.sub, fontVariantNumeric: 'tabular-nums' }}>
                        {d.recording.total}
                      </span>
                      <span style={{ display: 'inline-flex', color: C.muted }}>
                        <IconVolume size={15} />
                      </span>
                      <HoverButton
                        aria-label="Download recording"
                        style={{
                          display: 'inline-flex',
                          border: 'none',
                          background: 'transparent',
                          padding: 0,
                          color: C.muted,
                          cursor: 'pointer',
                        }}
                        hoverStyle={{ color: C.dark }}
                      >
                        <IconDownload size={15} />
                      </HoverButton>
                    </div>
                  </>
                )}

                <hr style={hair} />
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: C.muted, fontWeight: 700 }}>
                  Co-marketing partner
                </div>
                <div style={{ marginTop: 4, fontSize: 14, fontWeight: 600, color: C.dark }}>
                  {d.partner.name}
                  <span style={{ fontWeight: 400, color: C.sub }}> · {d.partner.role}</span>
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 13 }}>
                  <a
                    href={`tel:${d.partner.phone.replace(/[^\d+]/g, '')}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.action, textDecoration: 'none' }}
                  >
                    <IconPhone size={14} />
                    {d.partner.phone}
                  </a>
                  <a
                    href={`mailto:${d.partner.email}`}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.action, textDecoration: 'none' }}
                  >
                    <IconMail size={14} />
                    {d.partner.email}
                  </a>
                </div>
              </section>
            </div>

            {/* Right column */}
            <div
              style={{
                flex: 'none',
                width: mobile ? '100%' : 300,
                display: 'flex',
                flexDirection: 'column',
                gap: 20,
              }}
            >
              {/* Promote to client — the invite-to-RDC+ CTA (FR1/FR2). */}
              {lead.readyToPromote ? (
                <section style={{ ...cardStyle, borderColor: C.dark, background: C.dark, color: C.white }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', textTransform: 'uppercase', opacity: 0.85 }}>
                    <IconCircleCheck size={13} />
                    Ready to become a client
                  </div>
                  <h3
                    style={{
                      margin: '10px 0 0',
                      fontFamily: DISPLAY_FONT,
                      fontWeight: 600,
                      fontSize: 18,
                      lineHeight: '24px',
                    }}
                  >
                    Work with {first}
                  </h3>
                  <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.5, color: 'rgba(255,255,255,0.82)' }}>
                    You&apos;ve worked {first} past first contact. Send a personal invite to keep the
                    search going in one shared space — and promote them to a connected client.
                  </p>
                  <HoverButton
                    onClick={() => onInvite(lead.id)}
                    style={{
                      marginTop: 16,
                      width: '100%',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      height: 40,
                      borderRadius: 40,
                      border: 'none',
                      background: C.white,
                      color: C.dark,
                      fontSize: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                    hoverStyle={{ background: C.alt }}
                  >
                    <IconUserPlus size={16} />
                    Work with {first}
                  </HoverButton>
                </section>
              ) : (
                <section style={cardStyle}>
                  <Heading as="h3" size={15} lineHeight={20}>
                    Promote to client
                  </Heading>
                  <p style={{ margin: '12px 0 0', fontSize: 13, lineHeight: 1.5, color: C.sub }}>
                    Once you&apos;ve connected with {first} and moved them past first contact, you can
                    invite them to RDC+ and promote them to a connected client.
                  </p>
                </section>
              )}

              {/* Realtor.com contact log */}
              <section style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Heading as="h3" size={15} lineHeight={20}>
                    Realtor.com contact log
                  </Heading>
                  <span style={{ display: 'inline-flex', color: C.muted }} title="Dispatch activity Realtor.com recorded for this lead">
                    <IconInfo size={15} />
                  </span>
                </div>
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <LogRow icon={<IconPhone size={15} />} label="Total calls" value={d.contactLog.calls} />
                  <LogRow icon={<IconChat size={15} />} label="Total texts" value={d.contactLog.texts} />
                  <LogRow icon={<IconHome size={15} />} label="Total inquiries" value={d.contactLog.inquiries} />
                </div>
                <hr style={hair} />
                <LinkButton>View dispatch history</LinkButton>
              </section>
            </div>
          </div>
        ) : (
          <div style={{ ...cardStyle, marginTop: 20, textAlign: 'center', color: C.muted, fontSize: 13, padding: '48px 20px' }}>
            {tab === 'activity'
              ? 'The activity timeline for this lead will appear here.'
              : 'Notes you log for this lead will appear here.'}
          </div>
        )}
      </div>
    </div>
  )
}

/** One row of the Realtor.com contact-log card: icon + label on the left, the tally on the right. */
function LogRow({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ display: 'inline-flex', color: C.sub }}>{icon}</span>
      <span style={{ flex: 1, fontSize: 13, color: C.dark }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.dark, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
    </div>
  )
}
