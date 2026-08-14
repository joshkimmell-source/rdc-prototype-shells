/**
 * Left navigation rail — static. A fixed-width column that always shows every destination as
 * an icon stacked above its label; it does not expand, and nothing about it responds to hover
 * beyond the per-item highlight. (It used to grow from 64px to 192px on hover; that behaviour
 * is gone, so the shell no longer tracks a rail-expand state.)
 *
 * Desktop only: below 768px the shell renders `NavBar` in the footer instead, which reuses
 * the destinations and icons exported from here.
 */
import type { ReactNode } from 'react'
import { token } from 'styled-system/tokens'
import { C } from '../theme'
import { HoverButton } from './primitives'
import { AccountAvatar } from './AccountAvatar'
import { AGENT_FULL_NAME } from '../data'
import { IconContact } from '@rdc-npm/rdc-ui-v4'
import { IconBell, IconCalendar, IconChat, IconClients, IconHome, IconSearch, IconSupport } from '../icons'

export type NavId = 'home' | 'leads' | 'clients' | 'search' | 'tours'

/**
 * Shared with `NavBar`, so the two layouts cannot drift apart. Home leads the rail, labelled
 * "Home" — the `?view=home` destination surfaced as a first-class nav item. "Leads" sits
 * directly above "Clients": a lead becomes a client, so the funnel reads top-to-bottom.
 */
export const NAV_ITEMS: Array<{ id: NavId; label: string; icon: ReactNode }> = [
  { id: 'home', label: 'Home', icon: <IconHome /> },
  // Haven's contact glyph, sized to 20px (2.5 × the 8px base) to match the sibling icons.
  { id: 'leads', label: 'Leads', icon: <IconContact size={2.5} /> },
  { id: 'clients', label: 'Clients', icon: <IconClients /> },
  { id: 'search', label: 'Search', icon: <IconSearch /> },
  { id: 'tours', label: 'Tours', icon: <IconCalendar /> },
]

const INERT_ITEMS: Array<{ label: string; icon: ReactNode }> = [
  { label: 'Support', icon: <IconSupport /> },
  { label: 'Alerts', icon: <IconBell /> },
  { label: 'Chat', icon: <IconChat /> },
]

/**
 * The rail's fixed width. Exported so the shell's layout math (the expanded push panel leaves
 * exactly this much of the window uncovered) tracks it instead of repeating the number.
 */
export const RAIL_WIDTH = 64

interface NavRailProps {
  activeNav: NavId
  onNavigate: (id: NavId) => void
}

/**
 * One rail cell: icon over label, filling the rail's width. Active cells get a filled pill;
 * the inert footer entries pass `active={false}` and never take it.
 */
const cellBase = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  width: '100%',
  flex: 'none',
  paddingTop: 8,
  paddingBottom: 8,
  borderRadius: 14,
  cursor: 'pointer',
  transition: 'background 120ms, color 120ms',
} as const

const labelStyle = {
  fontSize: 11,
  lineHeight: '14px',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const

export function NavRail({ activeNav, onNavigate }: NavRailProps) {
  return (
    <nav
      aria-label="Main"
      style={{
        width: RAIL_WIDTH,
        flex: 'none',
        // token(), not a raw var(--…) string: Panda only emits variables for tokens it
        // can see being used, so a hand-written var() would be tree-shaken out.
        background: token('colors.bg.base'),
        borderRight: `1px solid ${C.hair}`,
        padding: '12px 6px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 30,
      }}
    >
      <img
        src="assets/logo-rail-collapsed.svg"
        alt="realtor.com+"
        style={{ width: 34, height: 34, display: 'block', marginBottom: 8, flex: 'none' }}
      />

      {NAV_ITEMS.map(({ id, label, icon }) => {
        const active = activeNav === id
        return (
          <HoverButton
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={active ? 'page' : undefined}
            style={{
              ...cellBase,
              border: 'none',
              background: active ? token('colors.bg.alternate', C.alt) : 'transparent',
              color: active ? C.dark : C.sub,
            }}
            hoverStyle={active ? {} : { background: C.alt }}
          >
            <span style={{ flex: 'none', display: 'flex' }}>{icon}</span>
            <span style={{ ...labelStyle, fontWeight: active ? 800 : 600 }}>{label}</span>
          </HoverButton>
        )
      })}

      <div style={{ flex: 1 }} />

      {INERT_ITEMS.map(({ label, icon }) => (
        <HoverButton
          key={label}
          style={{ ...cellBase, border: 'none', background: 'transparent', color: C.sub }}
          hoverStyle={{ background: C.alt }}
        >
          <span style={{ flex: 'none', display: 'flex' }}>{icon}</span>
          <span style={{ ...labelStyle, fontWeight: 600 }}>{label}</span>
        </HoverButton>
      ))}

      {/* Account — the shared headshot over its label, the rail's only photo. Inert, like on mobile. */}
      <div style={{ ...cellBase, color: C.sub, cursor: 'default' }} title={AGENT_FULL_NAME}>
        <AccountAvatar size={30} />
        <span style={{ ...labelStyle, fontWeight: 600 }}>Account</span>
      </div>
    </nav>
  )
}
