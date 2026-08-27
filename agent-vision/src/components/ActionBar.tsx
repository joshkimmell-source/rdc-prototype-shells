/**
 * Action bar — the labelled control row that sits at the right of a content page header.
 *
 * Built for the `?ab=b` arm of the FAB-placement test, but not specific to it: any content
 * page can hand it a set of actions. The `•••` overflow menu is the bar's far-left item and
 * the primary action its rightmost, rendered in the RealAssist+ brand gradient; secondary
 * actions sit between them as light or dark pills. Items are spacing-300 (8px) apart.
 *
 * Responsive behaviour is measured, not guessed at a breakpoint, and it degrades in two
 * graduated stages. The bar renders a hidden full-width mirror of itself, measures each pill,
 * and:
 *   1. drops labels one at a time from the left — each action becomes an icon-only circle —
 *      until the row fits. The primary action is last, so it keeps its label longest.
 *   2. if every action is already a circle and the row still overflows, it folds circles into
 *      the overflow menu one at a time from the left. Folded actions appear as labelled rows
 *      below the menu's static items, fenced off by a separator. The primary action (the
 *      RealAssist+ Ask, in the brand gradient) is exempt: it collapses to a circle like the
 *      rest but never folds, so it stays one click away at the right of the `•••`.
 *
 * Folding rather than scrolling keeps every action reachable at any width without a
 * horizontal scroller — which also means the row never clips its own vertical overflow, so
 * the hover lift and its shadow are never sheared off.
 *
 * Measuring beats a media query because the space available depends on the title beside it,
 * the nav rail, and the assistant panel's dragged width — none of which a breakpoint sees.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Menu, type MenuItem } from './Menu'
import { HoverButton } from './primitives'
import { BRAND_GRADIENT_PILL, BRAND_GRADIENT_PILL_HOVER, C, EASE } from '../theme'
import { useIsTouch } from '../useMobile'
import { Tooltip } from '@rdc-npm/rdc-ui-v4/tooltip'

/** `brand` is the primary action; `dark` reads as an engaged toggle, `light` as an idle one. */
export type ActionTone = 'brand' | 'dark' | 'light'

export interface ActionItem {
  id: string
  /** Also the tooltip and the accessible name, so it is never dropped — only hidden or folded. */
  label: string
  icon: ReactNode
  tone?: ActionTone
  onClick: () => void
  /** Set for toggles, left undefined for plain actions so they get no pressed state. */
  pressed?: boolean
  /**
   * Always render as an icon circle — never expand to a labelled pill, at any width. For
   * controls that read as icons by convention (e.g. Settings). The label still names it for
   * screen readers and drives the hover tooltip.
   */
  iconOnly?: boolean
}

interface ActionBarProps {
  items: ActionItem[]
  /**
   * Static rows for the overflow menu, shown at its top. Actions that overflow the bar are
   * folded in below these, separated by a rule. The menu is the bar's far-left item and is
   * always present, so it is the one control that never has to pay for the row's overflow.
   */
  menuItems?: Array<string | MenuItem>
  /** Accessible name for the overflow toggle. */
  menuLabel?: string
}

/** spacing-300. The gap between every item in the bar, at every width. */
const GAP = 8

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
  return { border: `0px solid ${C.border}`, color: C.dark }
}

/**
 * One action. Collapsed it is a circle, expanded a pill — the same element either way, so
 * the transition is a width change rather than a swap.
 */
function Action({
  item,
  collapsed,
  suppressTooltip,
  tabbable = true,
}: {
  item: ActionItem
  collapsed: boolean
  /** Touch can't hover, and a tap would leave the tooltip stuck with no `mouseleave` to close it. */
  suppressTooltip?: boolean
  tabbable?: boolean
}) {
  const tone = item.tone ?? 'light'
  const [tipOpen, setTipOpen] = useState(false)
  // An `iconOnly` action is a circle at every width, exactly like a collapsed one — so the
  // mirror (which measures with `collapsed={false}`) still sizes it as a circle and the
  // fit calculation stays honest.
  const circle = collapsed || !!item.iconOnly
  // The hover lift's shadow — the brand action lifts on its own red, the others on neutral.
  const hoverShadow =
    tone === 'brand'
      ? BRAND_SHADOW
      : tone === 'light'
        ? '0 1px 4px rgba(26,24,22,0.16)'
        : '0 2px 8px rgba(26,24,22,0.2)'

  const button = (
    <HoverButton
      onClick={() => {
        // Clicking an icon-only action opens the panel but leaves the pointer over the
        // button, so no `mouseleave` fires to retract its tooltip — dismiss it here, or it
        // lingers over whatever the click revealed.
        setTipOpen(false)
        item.onClick()
      }}
      aria-label={item.label}
      aria-pressed={item.pressed}
      tabIndex={tabbable ? undefined : -1}
      styleType="Secondary"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        flex: 'none',
        height: HEIGHT,
        // A circle when collapsed (or icon-only); the padding is what the label needs expanded.
        width: circle ? HEIGHT : undefined,
        padding: circle ? 0 : `0 ${PAD_X}px`,
        borderRadius: circle ? '50%' : 40,
        // fontFamily: 'inherit',
        // fontSize: FONT_SIZE,
        // fontWeight: 500,
        // lineHeight: 1,
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        transition: `all 120ms, transform 120ms ${EASE}`,
        transform: 'none',
        // boxShadow: 'none',
        ...toneStyle(tone),
      }}
      hoverStyle={tone === 'brand' ? { background: BRAND_GRADIENT_PILL_HOVER } : undefined}
      // hoverStyle={{ transform: 'translateY(0px)', }}
      // hoverStyle={{ transform: 'translateY(0px)', boxShadow: hoverShadow, }}
    >
      <span style={{ display: 'flex', flex: 'none', alignItems: 'center' }}>{item.icon}</span>
      {/* Dropped from the DOM rather than hidden, so the circle has nothing to size to. */}
      {!circle && <span>{item.label}</span>}
    </HoverButton>
  )

  // A visible label needs no tooltip repeating it; a circle (collapsed or icon-only) gets one,
  // and only on a pointer device.
  if (!circle || suppressTooltip) return button

  return (
    <Tooltip
      body={item.label}
      placement="bottom"
      open={tipOpen}
      onOpen={() => setTipOpen(true)}
      onClose={() => setTipOpen(false)}
    >
      {button}
    </Tooltip>
  )
}

export function ActionBar({ items, menuItems = [], menuLabel = 'More' }: ActionBarProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const mirrorRef = useRef<HTMLDivElement>(null)
  const leadRef = useRef<HTMLDivElement>(null)
  /**
   * `collapsedCount` — how many of the still-visible actions, counting from the left, show
   * icons only. `foldedCount` — how many actions, from the left, have moved into the menu.
   * Folding only begins once every visible action is already a circle, so in practice
   * `collapsedCount` is `items.length` whenever `foldedCount > 0`.
   */
  const [collapsedCount, setCollapsedCount] = useState(0)
  const [foldedCount, setFoldedCount] = useState(0)
  // A touch device can't hover, and a tap would leave the tooltip stuck on screen with no
  // pointer-leave to dismiss it — so the collapsed action's tooltip is disabled there.
  const touch = useIsTouch()

  // The primary action — the RealAssist+ Ask in the brand gradient, always the rightmost item
  // — is pinned: it collapses to a circle with the rest but never folds into the menu, so the
  // assistant stays a click away at the right of the `•••`. Held in a ref so `measure` can read
  // it without taking `items` (a fresh array each render) as a dependency.
  const pinnedRef = useRef(0)
  pinnedRef.current = items.length > 0 && items[items.length - 1]?.tone === 'brand' ? 1 : 0

  /**
   * Measured off the mirror, which always carries every action fully labelled — so the widths
   * read here describe the fully expanded row whatever the live row is currently showing.
   * Deriving the answer from fixed geometry rather than from the live row is what keeps this
   * from oscillating: the input to the calculation never changes as its output is applied.
   */
  const measure = useCallback(() => {
    const box = boxRef.current
    const mirror = mirrorRef.current
    if (!box || !mirror) return

    const pills = Array.from(mirror.children) as HTMLElement[]
    if (!pills.length) return

    // The overflow menu is always in the row and never folds — it is a fixed cost against the
    // space the actions have to fit in, so it is measured once and subtracted, not iterated.
    const menuW = leadRef.current ? leadRef.current.offsetWidth : HEIGHT
    // Against the outer box, whose width does not depend on what is in it: its flex basis is 0
    // and it is the header's only growing child, so the space it gets is a function of the
    // header and the title alone. Measuring anything the collapse/fold decision itself resizes
    // would feed the decision back into its own input and let it settle wherever it started.
    const avail = box.clientWidth
    const n = pills.length
    const expanded = pills.map((el) => el.offsetWidth)

    // Row width for a given (collapsed, folded) state. Folded actions leave the row entirely;
    // of the rest, the first `collapsed` show as HEIGHT-wide circles and the others at their
    // expanded width. The menu and one gap per remaining item complete the row.
    const widthFor = (collapsed: number, folded: number) => {
      let w = menuW
      for (let i = folded; i < n; i += 1) {
        w += GAP + (i < collapsed ? HEIGHT : expanded[i])
      }
      return w
    }

    // Try states in order of increasing degradation: drop labels left-to-right first (the
    // primary action is rightmost, so its label goes last), then — only once all are circles —
    // fold circles into the menu left-to-right. The primary never folds, so folding stops one
    // short of it (`maxFold`); its floor is the `•••` plus the primary circle. The first state
    // that fits wins.
    const maxFold = n - pinnedRef.current
    let chosen = { collapsed: 0, folded: 0 }
    outer: {
      for (let c = 0; c <= n; c += 1) {
        chosen = { collapsed: c, folded: 0 }
        if (widthFor(c, 0) <= avail) break outer
      }
      for (let f = 1; f <= maxFold; f += 1) {
        chosen = { collapsed: n, folded: f }
        if (widthFor(n, f) <= avail) break outer
      }
    }

    setCollapsedCount(chosen.collapsed)
    setFoldedCount(chosen.folded)
  }, [])

  useLayoutEffect(measure)

  useEffect(() => {
    const box = boxRef.current
    const mirror = mirrorRef.current
    if (!box || !mirror) return

    // Both boxes: the available space changes with the window and the panel drag, and the
    // needed width changes when a toggle's label does.
    const ro = new ResizeObserver(measure)
    ro.observe(box)
    ro.observe(mirror)

    // The display face loads async, and the labels are wider once it lands.
    document.fonts?.ready.then(measure).catch(() => {})

    return () => ro.disconnect()
  }, [measure])

  // Static rows first, then the folded actions below a separator — each carrying its own icon
  // and firing its original handler, so a folded control does exactly what its pill did.
  const staticItems: MenuItem[] = menuItems.map((it) =>
    typeof it === 'string' ? { label: it } : it
  )
  const foldedItems: MenuItem[] = items.slice(0, foldedCount).map((item) => ({
    label: item.label,
    icon: item.icon,
    onSelect: item.onClick,
  }))
  const resolvedMenu: MenuItem[] =
    foldedItems.length && staticItems.length
      ? [...staticItems, { separator: true }, ...foldedItems]
      : [...staticItems, ...foldedItems]

  return (
    <div
      ref={boxRef}
      style={{
        // `1 1 0`, not `1 1 auto`: the basis is what makes the box's width independent of its
        // own content, which is what `measure` relies on. The title is `0 1 auto` beside it,
        // so the box takes all the space the title does not need.
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        // The box is the bar: it holds the overflow menu and the visible actions, so one `gap`
        // sets the spacing between every item in the row.
        gap: GAP,
        // Anchors the absolutely-positioned mirror and tooltip below.
        position: 'relative',
      }}
    >
      {/*
        The overflow menu, always the row's leftmost item and never folded. Owned by the bar
        so overflowing actions can be appended to it — its `items` prop carries the static
        rows plus whatever has folded in, so an open panel updates as the width changes.
      */}
      <div ref={leadRef} style={{ display: 'flex', flex: 'none' }}>
        <Menu aria-label={menuLabel} items={resolvedMenu} bare />
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: GAP,
          flex: 'none',
        }}
      >
        {items.slice(foldedCount).map((item, i) => (
          // `i` is the index within the visible slice; an action is a circle when its position
          // from the left of that slice is below the collapse count.
          <Action
            key={item.id}
            item={item}
            collapsed={i + foldedCount < collapsedCount}
            suppressTooltip={touch}
          />
        ))}
      </div>

      {/*
        Measurement mirror, always the full labelled set. `visibility: hidden` leaves it out of
        the tab order and the a11y tree while still giving it a layout box to measure, which
        `display: none` would not.
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
          gap: GAP,
          flex: 'none',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {items.map((item) => (
          <Action key={item.id} item={item} collapsed={false} tabbable={false} />
        ))}
      </div>
    </div>
  )
}
