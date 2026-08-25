/**
 * Leads — RDCPro's lead-management list, reproduced as a first-class page.
 *
 * A single bordered card: a header (count + provenance + Download), Buyer/Seller tabs, a
 * controls row (search + Filters), a "Showing…" line, the sortable table, and a paginated
 * footer. Rows are the 20 net-new prospect records (see `LEADS` in `adapters.ts`) —
 * distinct from Clients. The tabs split Buyer from Seller leads; search filters on
 * name/email/phone; the Lead name, Budget and Date columns sort; newest activity first.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Tag } from '@rdc-npm/rdc-ui-v4'
import { C, DISPLAY_FONT } from '../theme'
import { HoverButton, Initials, SearchField, Tab } from '../components/primitives'
import { Menu } from '../components/Menu'
import { IconArrowDown, IconCircleCheck, IconExport, IconFilters, IconUserPlus } from '../icons'
import { LEADS, type Lead, type LeadType } from '../data'

interface LeadsScreenProps {
  /** Below the mobile breakpoint the card gets tighter gutters. */
  mobile: boolean
  /** Opens the lead detail page for a row. */
  onOpenLead: (id: string) => void
  /** Leads already invited into RDC+ this session — promoted to clients, hidden from the list. */
  promotedLeadIds: Set<string>
  /** Opens the invite-to-RDC+ composer for a ready lead. */
  onInvite: (id: string) => void
}

type SortKey = 'name' | 'budget' | 'date'
type SortDir = 'asc' | 'desc'

const ROWS_PER_PAGE_OPTIONS = [10, 25, 50]

/** The value each sortable column orders on. Date sorts on recency so "desc" is newest-first. */
function sortValue(lead: Lead, key: SortKey): string | number {
  if (key === 'name') return lead.name.toLowerCase()
  if (key === 'budget') return lead.budgetValue
  // Larger = more recent, so ascending is oldest-first and the default `desc` is newest-first.
  return -lead.recencyMins
}

/** A column header. Sortable ones render a button with a direction caret. */
function HeadCell({
  label,
  sortKey,
  activeKey,
  dir,
  onSort,
  align = 'left',
  sticky = false,
  stickyShadow = false,
}: {
  label: string
  sortKey?: SortKey
  activeKey: SortKey
  dir: SortDir
  onSort: (k: SortKey) => void
  align?: 'left' | 'right'
  /** Freeze this header to the table's right edge so the other columns scroll behind it. */
  sticky?: boolean
  /** With `sticky`, cast the faint left-edge shadow (on only while columns are scrolled under). */
  stickyShadow?: boolean
}) {
  const active = sortKey !== undefined && sortKey === activeKey
  // Matches the "Clients" table header on the HomeScreen: 11px uppercase, wide tracking,
  // muted colour, over a faint row-hover fill — not the display font.
  const base = {
    padding: '12px 16px',
    textAlign: align,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '0.07em',
    textTransform: 'uppercase' as const,
    color: C.muted,
    whiteSpace: 'nowrap' as const,
    background: C.rowHover,
    borderBottom: `1px solid ${C.hair}`,
    ...(sticky ? { position: 'sticky' as const, right: 0, zIndex: 3 } : null),
  }
  if (!sortKey)
    return (
      <th style={base}>
        {sticky && stickyShadow && <PinnedShadow />}
        {label}
      </th>
    )
  return (
    <th style={{ ...base, padding: 0 }}>
      <HoverButton
        onClick={() => onSort(sortKey)}
        aria-label={`Sort by ${label}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: align === 'right' ? 'flex-end' : 'flex-start',
          gap: 5,
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          background: 'transparent',
          font: 'inherit',
          letterSpacing: 'inherit',
          textTransform: 'inherit',
          color: active ? C.dark : C.muted,
          cursor: 'pointer',
        }}
        hoverStyle={{ color: C.dark }}
      >
        {label}
        <span
          style={{
            display: 'inline-flex',
            opacity: active ? 1 : 0.35,
            transform: active && dir === 'asc' ? 'rotate(180deg)' : 'none',
            transition: 'transform 120ms',
          }}
        >
          <IconArrowDown size={10} />
        </span>
      </HoverButton>
    </th>
  )
}

const CELL = {
  padding: '14px 16px',
  fontSize: 13,
  color: C.dark,
  borderBottom: `1px solid ${C.hair}`,
  verticalAlign: 'top' as const,
} as const

/**
 * Faint left-edge shadow for the frozen Actions column: an overlay strip that sits just
 * outside the column and fades over the cells scrolling beneath it. Rendered as an element
 * rather than a `box-shadow` on the cell — Chromium drops cell shadows on a
 * `border-collapse: collapse` table, so the cell approach never painted. The cell must be
 * positioned (it is — `position: sticky`) so this absolute strip anchors to its left edge.
 */
function PinnedShadow() {
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: 16,
        // Shift fully left of the column so it lies over the scrolling cells, not the actions.
        transform: 'translateX(-100%)',
        pointerEvents: 'none',
        background: 'linear-gradient(to right, rgba(26,24,22,0), rgba(26,24,22,0.16))',
      }}
    />
  )
}

const TABS: LeadType[] = ['Buyer', 'Seller']

export function LeadsScreen({ mobile, onOpenLead, promotedLeadIds, onInvite }: LeadsScreenProps) {
  const [activeType, setActiveType] = useState<LeadType>('Buyer')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [rowsPerPage, setRowsPerPage] = useState(ROWS_PER_PAGE_OPTIONS[0])
  const [page, setPage] = useState(0)

  // The Actions column is frozen to the right edge. While the table is too narrow to show
  // every column, the rest scrolls behind it; `pinnedShadow` tracks whether any columns are
  // currently hidden under it, so the faint left-edge shadow appears only then.
  const tableScrollRef = useRef<HTMLDivElement>(null)
  const [pinnedShadow, setPinnedShadow] = useState(false)

  useEffect(() => {
    const el = tableScrollRef.current
    if (!el) return
    const update = () => {
      // True while content remains to the right of the viewport — i.e. columns are passing
      // under the frozen Actions column. At the far-right scroll end it goes false.
      setPinnedShadow(el.scrollWidth - el.clientWidth - el.scrollLeft > 1)
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    // Recompute when the container is resized (a wider container may remove the overflow).
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  // A new sort key starts on its natural direction (names A–Z, budget/date high-first);
  // clicking the active key flips it. Any of these resets to the first page.
  function onSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
    setPage(0)
  }

  // "Connected" leads and any invited into RDC+ this session are held out of the tables —
  // they've become clients, so the list focuses on the leads still needing a touch. Filtered
  // once here so both the tab counts and the rows agree.
  const visibleLeads = useMemo(
    () => LEADS.filter((l) => l.status !== 'Connected' && !promotedLeadIds.has(l.id)),
    [promotedLeadIds],
  )

  const countByType = useMemo(() => {
    const c: Record<LeadType, number> = { Buyer: 0, Seller: 0 }
    for (const l of visibleLeads) c[l.type]++
    return c
  }, [visibleLeads])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = visibleLeads.filter(
      (l) =>
        l.type === activeType &&
        (q === '' ||
          l.name.toLowerCase().includes(q) ||
          l.email.toLowerCase().includes(q) ||
          l.phone.toLowerCase().includes(q)),
    )
    rows.sort((a, b) => {
      const av = sortValue(a, sortKey)
      const bv = sortValue(b, sortKey)
      const cmp = av < bv ? -1 : av > bv ? 1 : 0
      return sortDir === 'asc' ? cmp : -cmp
    })
    return rows
  }, [visibleLeads, activeType, query, sortKey, sortDir])

  const total = filtered.length
  const pageCount = Math.max(1, Math.ceil(total / rowsPerPage))
  const clampedPage = Math.min(page, pageCount - 1)
  const start = clampedPage * rowsPerPage
  const visible = filtered.slice(start, start + rowsPerPage)
  const rangeStart = total === 0 ? 0 : start + 1
  const rangeEnd = Math.min(start + rowsPerPage, total)

  // Sellers are shopping a sale price, not a purchase budget — the column reads differently.
  const budgetLabel = activeType === 'Seller' ? 'Est. value' : 'Budget'

  return (
    <div
      data-screen-label="Leads"
      className="ra-scroll"
      style={{
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
        padding: mobile ? '8px 16px 16px' : '8px 24px 24px',
      }}
    >
      <div
        style={{
          border: `1px solid ${C.border}`,
          borderRadius: 16,
          background: C.white,
          overflow: 'hidden',
        }}
      >
        {/* Header: count + provenance, and the Download action. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
            flexWrap: 'wrap',
            padding: mobile ? '16px' : '20px 24px',
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2
              style={{
                margin: 0,
                fontFamily: DISPLAY_FONT,
                fontWeight: 600,
                fontSize: 18,
                lineHeight: '24px',
                letterSpacing: '-0.01em',
              }}
            >
              {countByType[activeType]} {activeType.toLowerCase()} leads
            </h2>
            <div style={{ marginTop: 4, fontSize: 12, color: C.sub }}>
              Data from Realtor.com&apos;s Market VIP, Local Expert, and ReadyConnect Concierge
            </div>
          </div>

          <HoverButton
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              height: 36,
              flex: 'none',
              padding: '0 12px',
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              color: C.dark,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            hoverStyle={{ background: C.alt }}
          >
            <IconExport size={14} />
            Download
          </HoverButton>
        </div>

        {/* Buyer / Seller tabs. */}
        <div
          style={{
            display: 'flex',
            gap: 20,
            padding: mobile ? '0 16px' : '0 24px',
            borderBottom: `1px solid ${C.hair}`,
          }}
        >
          {TABS.map((t) => (
            <Tab
              key={t}
              label={`${t} (${countByType[t]})`}
              active={activeType === t}
              negativeMargin
              onClick={() => {
                setActiveType(t)
                setPage(0)
              }}
            />
          ))}
        </div>

        {/* Controls: search + Filters. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
            padding: mobile ? '12px 16px' : '16px 24px',
          }}
        >
          <SearchField
            value={query}
            onChange={(v) => {
              setQuery(v)
              setPage(0)
            }}
            placeholder="Search by lead name, email, or phone…"
            style={{ flex: 1, minWidth: 220, maxWidth: 420 }}
          />

          <HoverButton
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              height: 38,
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
            <IconFilters size={14} />
            Filters
          </HoverButton>
        </div>

        <div
          style={{
            padding: mobile ? '0 16px 8px' : '0 24px 10px',
            fontSize: 12,
            color: C.sub,
          }}
        >
          Showing {rangeStart}&ndash;{rangeEnd} of {total}
        </div>

        {/* Table. */}
        <div ref={tableScrollRef} style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 880 }}>
            <thead>
              <tr>
                <HeadCell label="Lead name" sortKey="name" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                <HeadCell label="Status" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                <HeadCell label="Market" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                <HeadCell label={budgetLabel} sortKey="budget" activeKey={sortKey} dir={sortDir} onSort={onSort} align="right" />
                <HeadCell label="Date" sortKey="date" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                <HeadCell label="Delivery" activeKey={sortKey} dir={sortDir} onSort={onSort} />
                <HeadCell label="" activeKey={sortKey} dir={sortDir} onSort={onSort} align="right" sticky stickyShadow={pinnedShadow} />
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ ...CELL, textAlign: 'center', color: C.muted, padding: '40px 16px' }}>
                    No leads match your search.
                  </td>
                </tr>
              ) : (
                visible.map((lead) => (
                  <tr key={lead.id}>
                    {/* Lead name */}
                    <td style={CELL}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Initials initials={lead.initials} size={36} />
                        <div style={{ minWidth: 0 }}>
                          <HoverButton
                            onClick={() => onOpenLead(lead.id)}
                            style={{
                              padding: 0,
                              border: 'none',
                              background: 'transparent',
                              font: 'inherit',
                              fontWeight: 700,
                              color: C.dark,
                              whiteSpace: 'nowrap',
                              cursor: 'pointer',
                            }}
                            hoverStyle={{ color: C.brand }}
                          >
                            {lead.name}
                          </HoverButton>
                          <div style={{ fontSize: 12, color: C.sub }}>{lead.email}</div>
                        </div>
                      </div>
                    </td>

                    {/* Status + follow-up + provenance */}
                    <td style={CELL}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                        <Tag dataColor={lead.statusColor}>{lead.status}</Tag>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: lead.overdue ? 700 : 500,
                            color: lead.overdue ? C.brand : C.sub,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {lead.overdue ? '⚠ ' : ''}
                          {lead.followUp}
                        </div>
                        {lead.status !== 'New' && (
                          <div style={{ fontSize: 11, color: C.muted }}>Updated by {lead.updatedBy}</div>
                        )}
                        {lead.readyToPromote && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              color: C.online,
                            }}
                          >
                            <IconCircleCheck size={11} />
                            Ready to work together
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Market */}
                    <td style={{ ...CELL, whiteSpace: 'nowrap' }}>
                      <div>{lead.marketCity}</div>
                      <div style={{ fontSize: 12, color: C.sub }}>{lead.marketZip}</div>
                    </td>

                    {/* Budget / Est. value */}
                    <td style={{ ...CELL, textAlign: 'right', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {lead.budget}
                    </td>

                    {/* Date */}
                    <td style={{ ...CELL, whiteSpace: 'nowrap' }}>{lead.dateLabel}</td>

                    {/* Delivery */}
                    <td style={{ ...CELL, whiteSpace: 'nowrap' }}>
                      <div style={{ fontWeight: 600 }}>{lead.delivery.method}</div>
                      <div style={{ fontSize: 12, color: C.sub }}>{lead.delivery.product}</div>
                    </td>

                    {/* Actions — frozen to the right edge; the rest of the row scrolls behind it. */}
                    <td
                      style={{
                        ...CELL,
                        textAlign: 'right',
                        position: 'sticky',
                        right: 0,
                        zIndex: 2,
                        // Opaque so the scrolling columns pass behind, not through.
                        background: C.white,
                      }}
                    >
                      {pinnedShadow && <PinnedShadow />}
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {lead.readyToPromote && (
                          <HoverButton
                            onClick={() => onInvite(lead.id)}
                            aria-label={`Work with ${lead.name}`}
                            title={`Work with ${lead.name}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: 32,
                              height: 32,
                              padding: 0,
                              borderRadius: 40,
                              border: 'none',
                              background: C.dark,
                              color: C.white,
                              cursor: 'pointer',
                            }}
                            hoverStyle={{ background: C.action }}
                          >
                            <IconUserPlus size={14} />
                          </HoverButton>
                        )}
                        <Menu
                          bare
                          size={32}
                          aria-label={`Actions for ${lead.name}`}
                          items={[
                            'Call',
                            'Email',
                            'Log activity',
                            { label: 'View details', onSelect: () => onOpenLead(lead.id) },
                            ...(lead.readyToPromote
                              ? [{ label: `Work with ${lead.name}`, onSelect: () => onInvite(lead.id) }]
                              : []),
                            { separator: true },
                            { label: 'Archive lead', destructive: true },
                          ]}
                        />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer: rows-per-page + pagination. */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
            padding: mobile ? '12px 16px' : '14px 24px',
          }}
        >
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, color: C.sub }}>
            Rows per page
            <select
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value))
                setPage(0)
              }}
              style={{
                height: 32,
                padding: '0 8px',
                borderRadius: 8,
                border: `1px solid ${C.border}`,
                background: C.white,
                color: C.dark,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              {ROWS_PER_PAGE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: C.sub }}>
              Page {clampedPage + 1} of {pageCount}
            </span>
            <PageButton label="Previous" disabled={clampedPage === 0} onClick={() => setPage(clampedPage - 1)} />
            <PageButton
              label="Next"
              disabled={clampedPage >= pageCount - 1}
              onClick={() => setPage(clampedPage + 1)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function PageButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
  return (
    <HoverButton
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      style={{
        height: 32,
        padding: '0 12px',
        borderRadius: 8,
        border: `1px solid ${C.border}`,
        background: C.white,
        color: disabled ? C.muted : C.dark,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
      }}
      hoverStyle={disabled ? undefined : { borderColor: C.dark }}
    >
      {label}
    </HoverButton>
  )
}
