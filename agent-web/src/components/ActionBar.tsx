/**
 * Action bar — the labelled control row that sits at the right of a content page header.
 *
 * Built for the `?ab=b` arm of the FAB-placement test, but not specific to it: any content
 * page can hand it a set of actions. The primary action renders in the RealAssist+ brand
 * gradient, secondary ones as light or dark pills, and an action with no label stays a
 * circle (the `•••` overflow toggle).
 *
 * Responsive behaviour is measured, not guessed at a breakpoint, and it is graduated: the
 * bar renders a hidden full-width mirror of itself, measures each pill in it, and drops
 * labels one at a time from the left until the row fits. The primary action is last, so it
 * keeps its label longest and the row degrades to icon-only rather than jumping there.
 *
 * Measuring beats a media query because the space available depends on the title beside it,
 * the nav rail, and the assistant panel's dragged width — none of which a breakpoint sees.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { BRAND_GRADIENT_PILL, C, EASE } from '../theme'

/** `brand` is the primary action; `dark` reads as an engaged toggle, `light` as an idle one. */
export type ActionTone = 'brand' | 'dark' | 'light'

export interface ActionItem {
  id: string
  /** Also the tooltip and the accessible name, so it is never dropped — only hidden. */
  label: string
  icon: ReactNode
  tone?: ActionTone
  onClick: () => void
  /** Set for toggles, left undefined for plain actions so they get no pressed state. */
  pressed?: boolean
}

interface ActionBarProps {
  items: ActionItem[]
  /** Rendered ahead of the actions and never collapsed — it has no label to drop. */
  leading?: ReactNode
  /** Tighter gaps below the shell's mobile breakpoint. */
  compact?: boolean
}

/**
 * Geometry shared with the Ask pill in `search-map.html` and `tours-map.html`. Those pages
 * are standalone documents that cannot import this file, so the numbers are duplicated
 * there — the same control has to read as the same control on all four screens.
 */
const HEIGHT = 36
const PAD_X = 16
const FONT_SIZE = 13
/** Brand hover lifts on its own red rather than the neutral shadow the other tones use. */
const BRAND_SHADOW = '0 4px 12px rgba(217,34,40,0.36)'

function toneStyle(tone: ActionTone): CSSProperties {
  if (tone === 'brand') {
    return { border: 'none', background: BRAND_GRADIENT_PILL, color: C.white }
  }
  if (tone === 'dark') {
    return { border: `1px solid ${C.dark}`, background: C.dark, color: C.white }
  }
  return { border: `1px solid ${C.border}`, background: C.white, color: C.dark }
}

/**
 * One action. Collapsed it is a circle, expanded a pill — the same element either way, so
 * the transition is a width change rather than a swap.
 */
function Action({
  item,
  collapsed,
  onTip,
  tabbable = true,
}: {
  item: ActionItem
  collapsed: boolean
  onTip?: (label: string, el: HTMLElement | null) => void
  tabbable?: boolean
}) {
  const [hover, setHover] = useState(false)
  const tone = item.tone ?? 'light'
  // A visible label needs no tooltip repeating it.
  const tip = collapsed ? onTip : undefined

  return (
    <button
      type="button"
      onClick={item.onClick}
      aria-label={item.label}
      aria-pressed={item.pressed}
      tabIndex={tabbable ? undefined : -1}
      onMouseEnter={(e) => {
        setHover(true)
        tip?.(item.label, e.currentTarget)
      }}
      onMouseLeave={() => {
        setHover(false)
        tip?.(item.label, null)
      }}
      onFocus={(e) => tip?.(item.label, e.currentTarget)}
      onBlur={() => tip?.(item.label, null)}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flex: 'none',
        height: HEIGHT,
        // A circle when collapsed; the padding is what the label needs when expanded.
        width: collapsed ? HEIGHT : undefined,
        padding: collapsed ? 0 : `0 ${PAD_X}px`,
        borderRadius: collapsed ? '50%' : 40,
        fontFamily: 'inherit',
        fontSize: FONT_SIZE,
        fontWeight: 700,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: `box-shadow 120ms, transform 120ms ${EASE}`,
        transform: hover ? 'translateY(-1px)' : 'none',
        boxShadow: hover
          ? tone === 'brand'
            ? BRAND_SHADOW
            : tone === 'light'
              ? '0 1px 4px rgba(26,24,22,0.16)'
              : '0 2px 8px rgba(26,24,22,0.2)'
          : 'none',
        ...toneStyle(tone),
      }}
    >
      <span style={{ display: 'flex', flex: 'none', alignItems: 'center' }}>{item.icon}</span>
      {/* Dropped from the DOM rather than hidden, so the collapsed circle has nothing to size to. */}
      {!collapsed && <span>{item.label}</span>}
    </button>
  )
}

export function ActionBar({ items, leading, compact = false }: ActionBarProps) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  /**
   * How many actions, counting from the left, are showing icons only. `0` is all labelled,
   * `items.length` is all collapsed.
   */
  const [collapsedCount, setCollapsedCount] = useState(0)
  const [tip, setTip] = useState<{ label: string; left: number; top: number } | null>(null)

  const gap = compact ? 6 : 8

  /**
   * Measured off the mirror, which always carries every label — so the widths read here
   * describe the fully expanded row whatever the live row is currently showing. Deriving
   * the answer from fixed geometry rather than from the live row is what keeps this from
   * oscillating: the input to the calculation never changes as its output is applied.
   */
  const measure = useCallback(() => {
    const wrap = wrapRef.current
    const mirror = mirrorRef.current
    if (!wrap || !mirror) return

    const avail = wrap.clientWidth
    const pills = Array.from(mirror.children) as HTMLElement[]
    if (!pills.length) return

    // Every label dropped takes the pill down to a HEIGHT-wide circle; the gaps are
    // unchanged by collapsing, so they are a constant here.
    const gaps = gap * (pills.length - 1)
    const expanded = pills.map((el) => el.offsetWidth)
    const total = expanded.reduce((a, b) => a + b, 0) + gaps

    let width = total
    let n = 0
    // Left to right: the rightmost action is the primary one, so it yields last.
    while (width > avail && n < pills.length) {
      width -= expanded[n] - HEIGHT
      n += 1
    }
    setCollapsedCount(n)

    // Below ~430px even the circles overflow. Rest at the end of the scroll range rather
    // than the start, so what is visible without scrolling is the primary action — the
    // same end of the row the labels were kept on.
    wrap.scrollLeft = wrap.scrollWidth
  }, [gap])

  useLayoutEffect(measure)

  useEffect(() => {
    const wrap = wrapRef.current
    const mirror = mirrorRef.current
    if (!wrap || !mirror) return

    // Both boxes: the available space changes with the window and the panel drag, and the
    // needed width changes when a toggle's label does.
    const ro = new ResizeObserver(measure)
    ro.observe(wrap)
    ro.observe(mirror)

    // The display face loads async, and the labels are wider once it lands.
    document.fonts?.ready.then(measure).catch(() => {})

    return () => ro.disconnect()
  }, [measure])

  const onTip = useCallback((label: string, el: HTMLElement | null) => {
    if (!el) {
      setTip((prev) => (prev?.label === label ? null : prev))
      return
    }
    const r = el.getBoundingClientRect()
    // Fixed, not absolute: the bar clips its own overflow, which is what lets it be
    // measured, and an absolute tooltip below a pill would be cut off by that clip.
    setTip({
      label,
      // Kept off both edges — a right-hand action's tooltip would otherwise run off-screen.
      left: Math.min(Math.max(r.left + r.width / 2, 76), window.innerWidth - 76),
      top: r.bottom + 8,
    })
  }, [])

  // Only the collapsed pills need one — a visible label explains itself.
  const tipShown = !!tip

  return (
    <div
      style={{
        // Grows into the space left by the title; `minWidth: 0` is what lets it be squeezed
        // below its content width instead of pushing the header wider.
        flex: '1 1 auto',
        minWidth: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap,
        // Anchors the absolutely-positioned mirror and tooltip below.
        position: 'relative',
      }}
    >
      {/* Outside the scroller: it has no label to drop, so it must not be what scrolls away. */}
      {leading}

      <div
        ref={wrapRef}
        className="ra-scroll-x"
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          // Even collapsed to circles, five actions plus the title can exceed a 320px
          // screen. Scrolling keeps the overflow reachable; clipping would not.
          overflowX: 'auto',
          overflowY: 'hidden',
        }}
      >
        {/*
          `marginLeft: auto` rather than the scroller's `justifyContent: flex-end`, which
          looks equivalent and is not: `flex-end` sends the overflow off the *start* edge,
          and a LTR scroller cannot scroll that way — the leftmost actions end up clipped
          and unreachable while still being focusable. An auto margin collapses to zero
          once the row overflows, so the overflow goes off the end, where it can scroll.
        */}
        <div style={{ display: 'flex', alignItems: 'center', gap, flex: 'none', marginLeft: 'auto' }}>
          {items.map((item, i) => (
            <Action key={item.id} item={item} collapsed={i < collapsedCount} onTip={onTip} />
          ))}
        </div>
      </div>

      {/*
        Measurement mirror, kept out of the scroller so it cannot add to its scroll width.
        `visibility: hidden` leaves it out of the tab order and the a11y tree while still
        giving it a layout box to measure, which `display: none` would not.
      */}
      <div
        ref={mirrorRef}
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          display: 'flex',
          alignItems: 'center',
          gap,
          flex: 'none',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {items.map((item) => (
          <Action key={item.id} item={item} collapsed={false} tabbable={false} />
        ))}
      </div>

      <div
        aria-hidden
        style={{
          position: 'fixed',
          left: tip?.left ?? 0,
          top: tip?.top ?? 0,
          transform: `translate(-50%, ${tipShown ? 0 : -4}px)`,
          zIndex: 200,
          background: C.dark,
          color: C.white,
          fontSize: 12,
          fontWeight: 700,
          padding: '7px 12px',
          borderRadius: 8,
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(26,24,22,0.24)',
          pointerEvents: 'none',
          opacity: tipShown ? 1 : 0,
          transition: `opacity 160ms ease-out, transform 160ms ${EASE}`,
        }}
      >
        {tip?.label}
      </div>
    </div>
  )
}
