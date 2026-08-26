/**
 * Bottom tab bar — the mobile counterpart to `NavRail`. Below the breakpoint the rail's
 * 64px column costs a fifth of a 320px screen, so navigation moves to the footer, where it
 * spends height instead of width and sits within thumb reach.
 *
 * Same destinations and same icons as the rail. The rail's inert Support / Alerts / Chat
 * entries have no screen behind them, so they stay out of the bar rather than padding it
 * with tabs that lead nowhere; the account avatar comes along as the fifth tab because it
 * is the rail footer's only content.
 */
import { token } from 'styled-system/tokens'
import { C } from '../theme'
import { HoverButton, truncationTitle } from './primitives'
import { AccountAvatar } from './AccountAvatar'
import { AGENT_FULL_NAME } from '../data'
import { NAV_ITEMS, type NavId } from './NavRail'

/**
 * Height of the bar's own row, above the iOS safe-area inset. Exported so the shell can
 * lift the assistant FAB clear of it.
 */
export const NAV_BAR_HEIGHT = 56

interface NavBarProps {
  activeNav: NavId
  onNavigate: (id: NavId) => void
}

/**
 * Five tabs share the width, so each is a flexible track rather than a fixed one: at
 * 320px that is 64px apiece, which "Clients" fits at 11px.
 */
const TAB = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 3,
  flex: '1 1 0',
  minWidth: 0,
  height: NAV_BAR_HEIGHT,
  padding: '0 2px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  transition: 'color 120ms, background 120ms',
} as const

const LABEL = {
  fontSize: 11,
  lineHeight: '13px',
  fontWeight: 700,
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const

export function NavBar({ activeNav, onNavigate }: NavBarProps) {
  return (
    <nav
      aria-label="Main"
      style={{
        flex: 'none',
        display: 'flex',
        alignItems: 'stretch',
        // token(), not a raw var(--…) string: Panda only emits variables for tokens it
        // can see being used, so a hand-written var() would be tree-shaken out.
        background: token('colors.bg.base'),
        borderTop: `1px solid ${C.hair}`,
        // Keeps the tabs above the home indicator on a notched phone; 0 everywhere else.
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {NAV_ITEMS.map(({ id, label, icon }) => {
        const active = activeNav === id
        return (
          <HoverButton
            key={id}
            onClick={() => onNavigate(id)}
            aria-current={active ? 'page' : undefined}
            style={{ ...TAB, color: active ? C.dark : C.sub }}
            hoverStyle={{ background: C.alt }}
          >
            <span style={{ flex: 'none', display: 'flex' }}>{icon}</span>
            <span style={{ ...LABEL, fontWeight: active ? 800 : 700 }} ref={truncationTitle(label)}>
              {label}
            </span>
          </HoverButton>
        )
      })}

      {/* Inert, like the rail's own footer avatar — there is no account screen behind it. The
          same shared headshot as the rail, sized down for the tab. */}
      <div style={{ ...TAB, color: C.sub, cursor: 'default' }} title={AGENT_FULL_NAME}>
        <AccountAvatar size={20} />
        <span style={LABEL}>Account</span>
      </div>
    </nav>
  )
}
