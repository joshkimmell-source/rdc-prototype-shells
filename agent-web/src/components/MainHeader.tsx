/**
 * Header above the active screen. Hidden on Search and Tours, which own their full viewport.
 * The four toggle circles only appear on Clients.
 *
 * Under `?ab=b` the control cluster is replaced by `ActionBar`, which labels the same
 * toggles and carries the "Ask RealAssist+" action inline instead of leaving it to the FAB.
 */
import { C, DISPLAY_FONT } from '../theme'
import { HoverButton } from './primitives'
import { Menu } from './Menu'
import { ActionBar, type ActionItem } from './ActionBar'
import { IconBell, IconChart, IconFlame, IconHamburger, IconRealAssist, IconStar } from '../icons'
import { MENU_ITEMS } from '../data'

export type ToggleId = 'bell' | 'flame' | 'chart' | 'star'

export type Toggles = Record<ToggleId, boolean>

const TOGGLES: Array<{ id: ToggleId; label: string; icon: React.ReactNode }> = [
  { id: 'bell', label: 'Notifications', icon: <IconBell size={17} /> },
  { id: 'flame', label: 'Hot leads', icon: <IconFlame /> },
  { id: 'chart', label: 'Market data', icon: <IconChart /> },
  { id: 'star', label: 'Favorites panel', icon: <IconStar /> },
]

/**
 * Labels for the action-bar arm. Longer than the icon-only tooltips, since a pill has room
 * for the phrasing the design calls for ("Agent notifications", not "Notifications").
 */
const ACTION_LABELS: Record<ToggleId, string> = {
  bell: 'Agent notifications',
  flame: 'Hotsheets',
  chart: 'Market data',
  star: 'Favorites',
}

interface MainHeaderProps {
  visible: boolean
  /** Below the mobile breakpoint: tighter gutters, and the controls may wrap below the title. */
  mobile: boolean
  /** `b` swaps the control cluster for `ActionBar` and shows the inline Ask action. */
  actionBar: boolean
  /** Opens the assistant panel — the action under test, absent in the FAB arm. */
  onAsk: () => void
  /**
   * The assistant panel is on screen. The Ask action drops out while it is: the panel is
   * the thing the action produces, so offering it again says nothing, and the freed width
   * goes to the toggles' labels.
   */
  askOpen: boolean
  showSubnavButton: boolean
  onOpenSubnav: () => void
  title: string
  countLabel: string
  showToggles: boolean
  toggles: Toggles
  onToggle: (id: ToggleId) => void
}

/** Opens the subnav, which is an overlay drawer below the mobile breakpoint. */
function DrawerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <HoverButton
      onClick={onClick}
      aria-label={label}
      title={label}
      style={{
        width: 32,
        height: 32,
        flex: 'none',
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
  )
}

export function MainHeader({
  visible,
  mobile,
  actionBar,
  onAsk,
  askOpen,
  showSubnavButton,
  onOpenSubnav,
  title,
  countLabel,
  showToggles,
  toggles,
  onToggle,
}: MainHeaderProps) {
  // Ask sits last, at the right end of the row, where the FAB arm puts it in the corner —
  // the toggles keep the order they have in the icon-only arm.
  const actions: ActionItem[] = [
    ...(showToggles
      ? TOGGLES.map(
          ({ id, icon }): ActionItem => ({
            id,
            label: ACTION_LABELS[id],
            icon,
            tone: toggles[id] ? 'dark' : 'light',
            pressed: toggles[id],
            onClick: () => onToggle(id),
          })
        )
      : []),
    ...(askOpen
      ? []
      : [
          {
            id: 'ask',
            label: 'Ask RealAssist™+ AI',
            // 16, matching the map pages' Ask pill — the same control at the same scale.
            icon: <IconRealAssist size={16} />,
            tone: 'brand' as const,
            onClick: onAsk,
          },
        ]),
  ]

  return (
    <div
      style={{
        display: visible ? 'flex' : 'none',
        alignItems: 'center',
        gap: 12,
        padding: mobile ? '12px 16px' : '16px 24px',
        // At 320px the title and the five Clients controls cannot share a line, so the
        // control group drops below rather than squeezing any of them out of reach.
        // `ActionBar` collapses to circles instead, and stays on the title's line.
        flexWrap: mobile && !actionBar ? 'wrap' : 'nowrap',
      }}
    >
      {showSubnavButton && <DrawerButton label="Open subnav" onClick={onOpenSubnav} />}

      <h1
        style={{
          margin: 0,
          flex: '1 1 auto',
          // A floor rather than 0: it is what forces the wrap instead of letting the title
          // ellipsize down to nothing beside the controls.
          minWidth: mobile ? 130 : 0,
          fontFamily: DISPLAY_FONT,
          fontWeight: 600,
          fontSize: mobile ? 20 : 24,
          lineHeight: mobile ? '26px' : '28px',
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

      {actionBar ? (
        // Collapses its own labels to fit, so unlike the cluster below it never wraps.
        <ActionBar items={actions} compact={mobile} leading={<Menu aria-label="More" items={MENU_ITEMS} />} />
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
            flex: mobile ? '1 1 auto' : '0 0 auto',
          }}
        >
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
      )}
    </div>
  )
}
