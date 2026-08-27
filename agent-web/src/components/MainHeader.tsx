/**
 * Header above the active screen. Every screen uses this one component, so the title, action
 * bar, and overflow menu read identically on Clients, Tours, and Search — the map pages hand
 * their title, per-screen actions, and (for Search) a lead region in rather than drawing their
 * own header inside the iframe.
 *
 * The four toggle circles only appear on Clients. Under `?ab=b` the control cluster is the
 * `ActionBar` — which labels the toggles and carries the inline "Ask RealAssist+" action — but
 * Tours and Search use the `ActionBar` in either arm, so their Export / Add to calendar / Save
 * search controls always read as labelled pills that collapse and fold rather than icon circles.
 */
import type { ReactNode } from 'react'
import { Tooltip } from '@rdc-npm/rdc-ui-v4'
import { C, DISPLAY_FONT } from '../theme'
import { HoverButton, truncationTitle } from './primitives'
import { Menu, type MenuItem } from './Menu'
import { ActionBar, type ActionItem } from './ActionBar'
import { IconBell, IconChart, IconFlame, IconPanelOpen, IconRealAssist, IconStar } from '../icons'
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
  /**
   * Render the controls as the `ActionBar` (labelled pills that collapse then fold) rather than
   * the icon cluster. True in the `?ab=b` arm for every screen, and true for Tours and Search
   * in either arm — their actions carry labels the icon cluster has no room for.
   */
  useActionBar: boolean
  /**
   * Include the inline "Ask RealAssist+" action in the bar. Set in the `?ab=b` arm; in the FAB
   * arm the trigger floats in the corner instead, so it is left out here.
   */
  showAsk: boolean
  /** Opens the assistant panel — the action under test, absent in the FAB arm. */
  onAsk: () => void
  /**
   * The assistant panel is on screen. The Ask action drops out while it is: the panel is
   * the thing the action produces, so offering it again says nothing, and the freed width
   * goes to the other actions' labels.
   */
  askOpen: boolean
  showSubnavButton: boolean
  /** The subnav section's name (e.g. "Clients") — labels the drawer button "Show <name>". */
  subnavLabel?: string
  onOpenSubnav: () => void
  /**
   * Left region in place of the title — the Search header's MLS selector and search field.
   * When set, the `title`/`countLabel` block is not rendered.
   */
  lead?: ReactNode
  title: string
  countLabel: string
  showToggles: boolean
  toggles: Toggles
  onToggle: (id: ToggleId) => void
  /**
   * Per-screen actions shown before Ask — Tours' Export and Add to calendar, Search's Save
   * search. Clients leaves this empty and shows its toggles instead.
   */
  actions?: ActionItem[]
  /** Overflow-menu rows; defaults to the Clients set. Tours and Search pass their own. */
  menuItems?: Array<string | MenuItem>
}

/** Opens the subnav, which is an overlay drawer below the mobile breakpoint. */
function DrawerButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Tooltip body={label} placement="bottom">
      <HoverButton
        onClick={onClick}
        aria-label={label}
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
        <IconPanelOpen size={18} />
      </HoverButton>
    </Tooltip>
  )
}

export function MainHeader({
  visible,
  mobile,
  useActionBar,
  showAsk,
  onAsk,
  askOpen,
  showSubnavButton,
  subnavLabel,
  onOpenSubnav,
  lead,
  title,
  countLabel,
  showToggles,
  toggles,
  onToggle,
  actions,
  menuItems = MENU_ITEMS,
}: MainHeaderProps) {
  // Ask sits last, at the right end of the row, where the FAB arm puts it in the corner. The
  // toggles (Clients) or the per-screen actions (Tours, Search) keep the order they have in
  // the icon-only arm, ahead of it.
  const barItems: ActionItem[] = [
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
    ...(actions ?? []),
    ...(showAsk && !askOpen
      ? [
          {
            id: 'ask',
            label: 'Ask RealAssist™+ AI',
            // 16, matching the map pages' Ask pill — the same control at the same scale.
            icon: <IconRealAssist size={16} />,
            tone: 'brand' as const,
            onClick: onAsk,
          },
        ]
      : []),
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
        flexWrap: 'nowrap',
        // flexWrap: mobile && !useActionBar ? 'wrap' : 'nowrap',
      }}
    >
      {showSubnavButton && (
        <DrawerButton
          label={subnavLabel ? `Show ${subnavLabel}` : 'Show'}
          onClick={onOpenSubnav}
        />
      )}

      {lead ? (
        // The Search header's MLS selector and field. Shrinks but never grows, so — like the
        // title — it hands the free width to the `ActionBar` beside it rather than splitting it.
        <div style={{ flex: '0 1 auto', minWidth: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
          {lead}
        </div>
      ) : (
        <h1
          style={{
            margin: 0,
            // The title grows to fill the row, pushing the controls to the right edge (the
            // `ActionBar` measures the room it is left and folds into it). Beside an action bar
            // the title still ellipsizes rather than shoving the controls off, since it can
            // shrink past its content width.
            flex: '1 1 auto',
            // Desktop only: never let the title take more than 45% of the header row, so the
            // controls beside it keep their space (it ellipsizes within that cap). On mobile the
            // controls wrap below, so the title gets the full width and shows in full instead.
            maxWidth: mobile ? undefined : '45%',
            // A floor rather than 0: it is what forces the wrap instead of letting the title
            // ellipsize down to nothing beside the controls.
            minWidth: mobile ? 130 : 0,
            // The secondary label sits on its own line below the title, so the two stack.
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <span
            style={{
              fontFamily: DISPLAY_FONT,
              fontWeight: 600,
              fontSize: mobile ? 20 : 24,
              lineHeight: mobile ? '26px' : '28px',
              letterSpacing: '-0.02em',
              // On mobile the title is never truncated — it wraps to as many lines as it needs;
              // on desktop it stays a single ellipsized line beside the controls.
              whiteSpace: mobile ? 'normal' : 'nowrap',
              overflow: mobile ? 'visible' : 'hidden',
              textOverflow: mobile ? 'clip' : 'ellipsis',
            }}
            ref={truncationTitle(title)}
          >
            {title}
          </span>
          {countLabel && (
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: C.muted,
                letterSpacing: 0,
                lineHeight: '18px',
              }}
            >
              {countLabel}
            </span>
          )}
        </h1>
      )}

      <ActionBar items={barItems} menuItems={menuItems} menuLabel="More" />
      {/* {useActionBar ? (
        // Collapses its own labels to fit and folds what still will not fit into its overflow
        // menu, so unlike the cluster below it never wraps. `menuItems` are the menu's static
        // rows; folded actions append below them.
        <ActionBar items={barItems} menuItems={menuItems} menuLabel="More" />
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
          <Menu aria-label="More" items={menuItems} />
          {showToggles &&
            TOGGLES.map(({ id, label, icon }) => {
              const on = toggles[id]
              return (
                <Tooltip key={id} body={label} placement="bottom">
                  <HoverButton
                    onClick={() => onToggle(id)}
                    aria-label={label}
                    aria-pressed={on}
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
                </Tooltip>
              )
            })}
        </div>
      )} */}
    </div>
  )
}
