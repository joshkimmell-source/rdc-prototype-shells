/**
 * Header above the active screen. Hidden on Search and Tours, which own their full viewport.
 * The four toggle circles only appear on Clients.
 */
import { C, DISPLAY_FONT } from '../theme'
import { HoverButton } from './primitives'
import { Menu } from './Menu'
import { IconBell, IconChart, IconFlame, IconHamburger, IconStar } from '../icons'
import { MENU_ITEMS } from '../data'

export type ToggleId = 'bell' | 'flame' | 'chart' | 'star'

export type Toggles = Record<ToggleId, boolean>

const TOGGLES: Array<{ id: ToggleId; label: string; icon: React.ReactNode }> = [
  { id: 'bell', label: 'Notifications', icon: <IconBell size={17} /> },
  { id: 'flame', label: 'Hot leads', icon: <IconFlame /> },
  { id: 'chart', label: 'Market data', icon: <IconChart /> },
  { id: 'star', label: 'Favorites panel', icon: <IconStar /> },
]

interface MainHeaderProps {
  visible: boolean
  showSubnavButton: boolean
  onOpenSubnav: () => void
  title: string
  countLabel: string
  showToggles: boolean
  toggles: Toggles
  onToggle: (id: ToggleId) => void
}

export function MainHeader({
  visible,
  showSubnavButton,
  onOpenSubnav,
  title,
  countLabel,
  showToggles,
  toggles,
  onToggle,
}: MainHeaderProps) {
  return (
    <div
      style={{
        display: visible ? 'flex' : 'none',
        alignItems: 'center',
        gap: 12,
        padding: '16px 24px',
      }}
    >
      {showSubnavButton && (
        <HoverButton
          onClick={onOpenSubnav}
          aria-label="Open subnav"
          title="Open subnav"
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            border: 'none',
            background: 'transparent',
            color: C.dark,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 120ms',
          }}
          hoverStyle={{ background: C.hair }}
        >
          <IconHamburger size={18} />
        </HoverButton>
      )}

      <h1
        style={{
          margin: 0,
          flex: 1,
          fontFamily: DISPLAY_FONT,
          fontWeight: 600,
          fontSize: 24,
          lineHeight: '28px',
          letterSpacing: '-0.02em',
        }}
      >
        {title}{' '}
        <span
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: C.muted,
            letterSpacing: 0,
            marginLeft: 6,
          }}
        >
          {countLabel}
        </span>
      </h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Menu aria-label="More" items={MENU_ITEMS} />
        {showToggles &&
          TOGGLES.map(({ id, label, icon }) => {
            const on = toggles[id]
            return (
              <HoverButton
                key={id}
                onClick={() => onToggle(id)}
                aria-label={label}
                aria-pressed={on}
                title={label}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${on ? C.dark : C.border}`,
                  background: on ? C.dark : C.white,
                  color: on ? C.white : C.dark,
                  cursor: 'pointer',
                  transition: 'all 120ms',
                }}
                hoverStyle={{ boxShadow: '0 1px 4px rgba(26,24,22,0.16)' }}
              >
                {icon}
              </HoverButton>
            )
          })}
      </div>
    </div>
  )
}
