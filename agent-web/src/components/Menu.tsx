/**
 * Overflow menu — ported from components/Menu.jsx. Keeps the figma-aligned ⋯ toggle
 * geometry and the panel's own shadow/radius rather than delegating to Haven's Menu,
 * so the header cluster matches the source design exactly.
 *
 * This is the only three-dot control in the shell: a ⋯ button always opens this menu, and
 * nothing else wears the glyph. `bare` and `size` exist so the surfaces that used to draw
 * their own inert ⋯ (the subnav header, its list rows) can adopt it without changing shape.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { IconMenuDots } from '../icons'
import { HoverButton } from './primitives'
import { C } from '../theme'

export interface MenuItem {
  label?: string
  /** Shown left of the label. Folded `ActionBar` actions carry their pill icon in here. */
  icon?: ReactNode
  destructive?: boolean
  /** A hairline rule instead of a row — used to fence folded actions off from static items. */
  separator?: boolean
  onSelect?: () => void
}

interface MenuToggleProps {
  open: boolean
  onClick: () => void
  /** 36 is the header circle; the subnav's own circles are 28. */
  size?: number
  /** Borderless and transparent until hovered, matching `CircleButton`'s default look. */
  bare?: boolean
  /** Only read when `bare`. The fill needs to differ from whatever sits behind it. */
  hoverBg?: string
  /** Only read when `bare` — list rows keep their ⋯ de-emphasised. */
  color?: string
  'aria-label'?: string
}

export function MenuToggle({
  open,
  onClick,
  size = 36,
  bare = false,
  hoverBg = C.hair,
  color,
  'aria-label': label = 'More',
}: MenuToggleProps) {
  const filled = open && !bare
  return (
    <HoverButton
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={onClick}
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: bare ? 'none' : `1px solid ${open ? C.dark : C.border}`,
        // Bare: no border to darken, so the open state reads through the hover fill instead.
        background: bare ? (open ? hoverBg : 'transparent') : open ? C.dark : C.white,
        color: filled ? C.white : (color ?? C.dark),
        cursor: 'pointer',
        transition: 'all 120ms',
        boxShadow: 'none',
      }}
      // Bare fills on hover; bordered lifts with a shadow. The open state is already at rest.
      hoverStyle={{
        background: bare ? hoverBg : open ? C.dark : C.white,
        boxShadow: !bare && !open ? '0 1px 4px rgba(26,24,22,0.16)' : 'none',
      }}
    >
      <IconMenuDots />
    </HoverButton>
  )
}

interface MenuProps {
  items?: Array<string | MenuItem>
  align?: 'left' | 'right'
  defaultOpen?: boolean
  onSelect?: (label: string) => void
  size?: number
  bare?: boolean
  hoverBg?: string
  color?: string
  'aria-label'?: string
}

/** Panel width, needed up front to keep a right-aligned menu on screen. */
const PANEL_MIN_W = 180
/** Kept off all four viewport edges by this much. */
const EDGE = 8

/**
 * Closes whichever menu is open when another opens. A document `mousedown` handler already
 * does this for the mouse, but opening by keyboard fires no such event — without this, two
 * panels could be on screen at once and one Escape would close both.
 */
let closeOpenMenu: (() => void) | null = null

export function Menu({
  items = ['Share', 'Export', 'Print', 'Settings'],
  align = 'right',
  defaultOpen = false,
  onSelect,
  size,
  bare,
  hoverBg,
  color,
  'aria-label': label,
}: MenuProps) {
  const [open, setOpen] = useState(defaultOpen)
  const ref = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState<{ left: number; top: number } | null>(null)

  /**
   * The panel is `fixed` rather than absolute, so it can escape an ancestor that clips —
   * `ActionBar` scrolls horizontally and hides vertical overflow, which would cut an
   * absolute panel off at the toggle's own bottom edge. That means positioning it by hand.
   */
  const place = useCallback(() => {
    const el = ref.current
    const panel = panelRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const w = Math.max(panel?.offsetWidth ?? 0, PANEL_MIN_W)
    const h = panel?.offsetHeight ?? 0
    const raw = align === 'left' ? r.left : r.right - w

    // Below the toggle by preference, above it when there is no room below — a menu opened
    // from a row near the bottom of a long list would otherwise run off the viewport.
    const below = r.bottom + EDGE
    const flip = h > 0 && below + h > window.innerHeight - EDGE && r.top - EDGE - h >= EDGE
    const top = flip ? r.top - EDGE - h : below

    // Clamped to the viewport with an 8px margin, in case the toggle sits near an edge.
    const next = {
      left: Math.min(Math.max(raw, EDGE), Math.max(window.innerWidth - w - EDGE, EDGE)),
      top: Math.min(Math.max(top, EDGE), Math.max(window.innerHeight - h - EDGE, EDGE)),
    }
    // Same position, same object — this runs on every render while open, and a fresh object
    // each time would be a new state value and so a render of its own, forever.
    setAt((prev) => (prev && prev.left === next.left && prev.top === next.top ? prev : next))
  }, [align])

  /**
   * On every render while open, not just on opening: the toggle moves whenever the layout
   * reflows around it — the subnav closing, the assistant panel docking — and none of those
   * fire an event a listener could catch. Re-placing each render covers them all.
   */
  useLayoutEffect(() => {
    if (open) place()
  })

  /**
   * The reflows that matter are also animated (220ms), so the toggle keeps moving after the
   * render that started them. Track it until it comes to rest.
   */
  useEffect(() => {
    if (!open) return
    let raf = 0
    const stop = window.setTimeout(() => cancelAnimationFrame(raf), 400)
    const tick = () => {
      place()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(stop)
    }
  }, [open, place])

  // Only one menu on screen at a time, however it was opened.
  useEffect(() => {
    if (!open) return
    closeOpenMenu?.()
    const self = () => setOpen(false)
    closeOpenMenu = self
    return () => {
      if (closeOpenMenu === self) closeOpenMenu = null
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    // Fixed coordinates go stale the moment anything moves the toggle. `true` to catch
    // scrolls in the action bar and the page columns, which do not bubble to `window`.
    window.addEventListener('resize', place)
    document.addEventListener('scroll', place, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', place)
      document.removeEventListener('scroll', place, true)
    }
  }, [open, place])

  const resolved: MenuItem[] = items.map((it) => (typeof it === 'string' ? { label: it } : it))

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', flex: 'none' }}>
      <MenuToggle
        open={open}
        onClick={() => setOpen((o) => !o)}
        size={size}
        bare={bare}
        hoverBg={hoverBg}
        color={color}
        aria-label={label}
      />
      {open && (
        <div
          ref={panelRef}
          role="menu"
          style={{
            position: 'fixed',
            left: at?.left ?? 0,
            top: at?.top ?? 0,
            // Placed on the first layout pass; until then it would flash at the origin.
            visibility: at ? 'visible' : 'hidden',
            minWidth: PANEL_MIN_W,
            background: C.white,
            border: `1px solid ${C.hair}`,
            borderRadius: 16,
            boxShadow: '0 1px 2px rgba(26,24,22,0.08), 0 8px 24px rgba(26,24,22,0.16)',
            padding: 6,
            zIndex: 100,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {resolved.map((it, i) =>
            it.separator ? (
              <div
                key={`sep-${i}`}
                role="separator"
                style={{ height: 1, background: C.hair, margin: '5px 8px' }}
              />
            ) : (
              <HoverButton
                key={it.label}
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  it.onSelect?.()
                  if (it.label) onSelect?.(it.label)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  height: 38,
                  padding: '0 12px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'transparent',
                  color: it.destructive ? C.brand : C.dark,
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  whiteSpace: 'nowrap',
                  transition: 'background 120ms',
                }}
                hoverStyle={{ background: C.alt }}
              >
                {it.icon && (
                  <span
                    style={{
                      display: 'flex',
                      flex: 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 18,
                      color: C.muted,
                    }}
                  >
                    {it.icon}
                  </span>
                )}
                {it.label}
              </HoverButton>
            )
          )}
        </div>
      )}
    </div>
  )
}
