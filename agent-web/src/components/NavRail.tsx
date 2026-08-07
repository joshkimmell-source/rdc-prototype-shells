/**
 * Left navigation rail. Collapsed at 64px, expanded at 192px; expansion is driven by
 * hover on desktop and by click when `railMode === 'click'`.
 *
 * Desktop only: below 768px the shell renders `NavBar` in the footer instead, which reuses
 * the destinations and icons exported from here.
 */
import type { ReactNode } from 'react'
import { token } from 'styled-system/tokens'
import { C, DISPLAY_FONT, EASE } from '../theme'
import { HoverButton } from './primitives'
import { AGENT_FULL_NAME, AGENT_INITIALS } from '../data'
import { IconBell, IconCalendar, IconChat, IconClients, IconHome, IconSearch, IconSupport } from '../icons'

export type NavId = 'home' | 'clients' | 'search' | 'tours'

/** Shared with `NavBar`, so the two layouts cannot drift apart. */
export const NAV_ITEMS: Array<{ id: NavId; label: string; icon: ReactNode }> = [
  { id: 'home', label: 'Home', icon: <IconHome /> },
  { id: 'clients', label: 'Clients', icon: <IconClients /> },
  { id: 'search', label: 'Search', icon: <IconSearch /> },
  { id: 'tours', label: 'Tours', icon: <IconCalendar /> },
]

const INERT_ITEMS: Array<{ label: string; icon: ReactNode }> = [
  { label: 'Support', icon: <IconSupport /> },
  { label: 'Alerts', icon: <IconBell /> },
  { label: 'Chat', icon: <IconChat /> },
]

interface NavRailProps {
  expanded: boolean
  activeNav: NavId
  onNavigate: (id: NavId) => void
  onEnter: () => void
  onLeave: () => void
  onClick: () => void
}

export function NavRail({ expanded, activeNav, onNavigate, onEnter, onLeave, onClick }: NavRailProps) {
  const railW = expanded ? 192 : 64
  const railBtnW = expanded ? 168 : 40
  const railPadX = expanded ? 10 : 9
  const labelOp = expanded ? 1 : 0
  const logoColOp = expanded ? 0 : 1

  const buttonBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    height: 40,
    width: railBtnW,
    flex: 'none',
    padding: `0 ${railPadX}px`,
    borderRadius: 40,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 500,
    whiteSpace: 'nowrap',
    transition: `background 120ms, border-color 120ms, width 220ms ${EASE}`,
  } as const

  return (
    <nav
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        width: railW,
        flex: 'none',
        // token(), not a raw var(--…) string: Panda only emits variables for tokens it
        // can see being used, so a hand-written var() would be tree-shaken out.
        background: token('colors.bg.base'),
        borderRight: `1px solid ${C.hair}`,
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 30,
        transition: `width 220ms ${EASE}`,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: railBtnW,
          height: 40,
          flex: 'none',
          marginBottom: 4,
          transition: `width 220ms ${EASE}`,
        }}
      >
        <img
          src="assets/logo-rail-collapsed.svg"
          alt="realtor.com"
          style={{
            position: 'absolute',
            left: 5.9,
            top: 3.5,
            width: 30.3,
            height: 30.3,
            display: 'block',
            opacity: logoColOp,
            transition: 'opacity 180ms',
          }}
        />
        <img
          src="assets/logo-rail-expanded.svg"
          alt="realtor.com+"
          style={{
            position: 'absolute',
            left: 6.5,
            top: 4.4,
            height: 29.1,
            display: 'block',
            opacity: labelOp,
            transition: 'opacity 180ms',
          }}
        />
      </div>

      {NAV_ITEMS.map(({ id, label, icon }) => {
        const active = activeNav === id
        return (
          <HoverButton
            key={id}
            onClick={(e) => {
              e.stopPropagation()
              onNavigate(id)
            }}
            style={{
              ...buttonBase,
              border: `1px solid ${active ? C.border : 'transparent'}`,
              background: active ? token('colors.bg.alternate', C.alt) : 'transparent',
              color: active ? C.dark : C.sub,
              boxShadow: active ? token('shadows.lifted') : 'none',
            }}
            hoverStyle={{ background: C.alt }}
          >
            <span style={{ flex: 'none', display: 'flex' }}>{icon}</span>
            <span style={{ opacity: labelOp, transition: 'opacity 180ms' }}>{label}</span>
          </HoverButton>
        )
      })}

      <div style={{ flex: 1 }} />

      {INERT_ITEMS.map(({ label, icon }) => (
        <HoverButton
          key={label}
          style={{
            ...buttonBase,
            border: '1px solid transparent',
            background: 'transparent',
            color: C.sub,
          }}
          hoverStyle={{ background: C.alt }}
        >
          <span style={{ flex: 'none', display: 'flex' }}>{icon}</span>
          <span style={{ opacity: labelOp, transition: 'opacity 180ms' }}>{label}</span>
        </HoverButton>
      ))}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          height: 40,
          width: railBtnW,
          flex: 'none',
          padding: '0 3px',
        }}
      >
        <div
          title={AGENT_FULL_NAME}
          style={{
            width: 34,
            height: 34,
            flex: 'none',
            borderRadius: '50%',
            background: C.border,
            color: C.action,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: DISPLAY_FONT,
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {AGENT_INITIALS}
        </div>
        <span
          style={{
            fontSize: 13,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            opacity: labelOp,
            transition: 'opacity 180ms',
          }}
        >
          {AGENT_FULL_NAME}
        </span>
      </div>
    </nav>
  )
}
