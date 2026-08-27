/**
 * Small primitives that stand in for the DC runtime's `style-hover` attribute.
 * The source markup carried hover styles inline alongside interpolated values, so
 * these keep the same "base style + hover overlay" shape rather than splitting each
 * one into a static Panda recipe.
 */
import { useState } from 'react'
import type {
  ButtonHTMLAttributes,
  ComponentProps,
  CSSProperties,
  FocusEvent,
  HTMLAttributes,
  MouseEvent,
  ReactNode,
} from 'react'
import { Button } from '@rdc-npm/rdc-ui-v4'
import { C, DISPLAY_FONT } from '../theme'

type HoverProps<T> = T & {
  style?: CSSProperties
  hoverStyle?: CSSProperties
  focusStyle?: CSSProperties
  children?: ReactNode
}

/**
 * React applies inline styles by diffing individual properties. When a base style sets the
 * `border` *shorthand* (e.g. `1px solid <hair>`) and a hover/focus overlay sets the
 * `borderColor` *longhand*, React clears `borderColor` on the way out but leaves the
 * unchanged shorthand in place — so `border-color` reverts to its CSS initial value,
 * `currentColor` (black), instead of the base colour. Expanding the base shorthand into
 * longhands up front means the overlay's `borderColor` reverts cleanly to the base colour.
 */
function expandBorderShorthand(style?: CSSProperties): CSSProperties | undefined {
  if (!style || typeof style.border !== 'string') return style
  const m = /^(\S+)\s+(\S+)\s+(.+)$/.exec(style.border.trim())
  if (!m) return style
  const { border: _border, ...rest } = style
  return { borderWidth: m[1], borderStyle: m[2], borderColor: m[3], ...rest }
}

export function HoverButton({
  style,
  hoverStyle,
  focusStyle,
  children,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...rest
}: HoverProps<ButtonHTMLAttributes<HTMLButtonElement>> & {
  /** Overrides the underlying Haven Button's default `Ghost` styleType. */
  styleType?: ComponentProps<typeof Button>['styleType']
  /** Overrides the underlying Haven Button's default `lg` size. */
  size?: ComponentProps<typeof Button>['size']
}) {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  // A genuine Haven v4 Button underneath (emits `data-rui="Button"`). `Ghost` is
  // chromeless and `size="inline"` drops the recipe's min-height and padding, so the
  // inline `style` below fully controls the look — inline styles beat the recipe's
  // classes, so each caller's exact appearance (and its base/hover/focus overlays) is
  // preserved. `underline="never"` suppresses Ghost's hover underline on text buttons.
  const props = {
    styleType: 'Ghost' as const,
    size: 'inline' as const,
    underline: 'never' as const,
    type: 'button' as const,
    ...rest,
    children,
    onMouseEnter: (e: MouseEvent<HTMLButtonElement>) => {
      setHover(true)
      onMouseEnter?.(e)
    },
    onMouseLeave: (e: MouseEvent<HTMLButtonElement>) => {
      setHover(false)
      onMouseLeave?.(e)
    },
    onFocus: (e: FocusEvent<HTMLButtonElement>) => {
      setFocus(true)
      onFocus?.(e)
    },
    onBlur: (e: FocusEvent<HTMLButtonElement>) => {
      setFocus(false)
      onBlur?.(e)
    },
    style: {
      ...expandBorderShorthand(style),
      ...(hover ? expandBorderShorthand(hoverStyle) : null),
      ...(focus ? expandBorderShorthand(focusStyle) : null),
    },
  }
  // A single cast of the whole props object bridges HoverButton's plain button-attribute
  // props to Button's button|anchor union props — passing no extra JSX attributes alongside
  // the spread keeps TS from re-merging (and failing to discriminate) the `iconOnly` union.
  return <Button {...(props as ComponentProps<typeof Button>)} />
}

export function HoverDiv({
  style,
  hoverStyle,
  children,
  onMouseEnter,
  onMouseLeave,
  ...rest
}: HoverProps<HTMLAttributes<HTMLDivElement>>) {
  const [hover, setHover] = useState(false)
  return (
    <div
      {...rest}
      onMouseEnter={(e) => {
        setHover(true)
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        setHover(false)
        onMouseLeave?.(e)
      }}
      style={{ ...expandBorderShorthand(style), ...(hover ? expandBorderShorthand(hoverStyle) : null) }}
    >
      {children}
    </div>
  )
}

/**
 * Bare circular icon button. `variant` covers the three treatments in the design:
 * a borderless subnav button, a bordered white control, and an on/off toggle.
 */
export function CircleButton({
  size = 36,
  hoverBg = C.hair,
  bordered = false,
  style,
  children,
  ...rest
}: HoverProps<ButtonHTMLAttributes<HTMLButtonElement>> & {
  size?: number
  hoverBg?: string
  bordered?: boolean
}) {
  return (
    <HoverButton
      {...rest}
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: '50%',
        border: bordered ? `1px solid ${C.border}` : 'none',
        background: bordered ? C.white : 'transparent',
        color: C.dark,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'background 120ms',
        ...style,
      }}
      hoverStyle={bordered ? { boxShadow: '0 1px 4px rgba(26,24,22,0.16)' } : { background: hoverBg }}
    >
      {children}
    </HoverButton>
  )
}

/** Initials avatar. Sizes and colours vary per surface, so both are props. */
export function Initials({
  initials,
  size = 40,
  bg = C.dark,
  fg = C.white,
  fontSize = 13,
  radius = '50%',
}: {
  initials: string
  size?: number
  bg?: string
  fg?: string
  fontSize?: number
  radius?: string
}) {
  return (
    <div
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: radius,
        background: bg,
        color: fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: DISPLAY_FONT,
        fontWeight: 400,
        fontSize,
      }}
    >
      {initials}
    </div>
  )
}

/** Section heading in the display face (h2 at 16px, h3 at 15/16px). */
export function Heading({
  as: Tag = 'h2',
  size = 16,
  lineHeight = 20,
  children,
  style,
}: {
  as?: 'h1' | 'h2' | 'h3'
  size?: number
  lineHeight?: number
  children: ReactNode
  style?: CSSProperties
}) {
  return (
    <Tag
      style={{
        margin: 0,
        fontFamily: DISPLAY_FONT,
        fontWeight: 600,
        fontSize: size,
        lineHeight: `${lineHeight}px`,
        letterSpacing: '-0.01em',
        ...style,
      }}
    >
      {children}
    </Tag>
  )
}

/** Rounded search field used in both subnav variants and the threads dock. */
export function SearchField({
  value,
  onChange,
  placeholder,
  height = 38,
  fontSize = 13,
  iconSize = 14,
  style,
}: {
  value: string
  onChange: (v: string) => void
  placeholder: string
  height?: number
  fontSize?: number
  iconSize?: number
  style?: CSSProperties
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        height,
        flex: 'none',
        padding: '0 14px',
        borderRadius: 40,
        border: `1px solid ${C.border}`,
        background: C.white,
        ...style,
      }}
    >
      <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={C.muted} style={{ flex: 'none' }}>
        <g transform="translate(2,2)">
          <path
            fillRule="evenodd"
            d="M 14.618 16.032 C 13.078 17.264 11.125 18 9 18 C 4.029 18 0 13.971 0 9 C 0 4.029 4.029 0 9 0 C 13.971 0 18 4.029 18 9 C 18 11.125 17.264 13.078 16.032 14.618 L 19.707 18.293 C 20.098 18.683 20.098 19.317 19.707 19.707 C 19.317 20.098 18.683 20.098 18.293 19.707 L 14.618 16.032 Z M 16 9 C 16 12.866 12.866 16 9 16 C 5.134 16 2 12.866 2 9 C 2 5.134 5.134 2 9 2 C 12.866 2 16 5.134 16 9 Z"
          />
        </g>
      </svg>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize,
          color: C.dark,
        }}
      />
    </div>
  )
}

/** Underlined tab used by both subnav variants. */
export function Tab({
  label,
  active,
  onClick,
  negativeMargin = false,
}: {
  label: string
  active: boolean
  onClick: () => void
  negativeMargin?: boolean
}) {
  return (
    <HoverButton
      onClick={onClick}
      style={{
        padding: '10px 2px',
        border: 'none',
        borderBottom: `2px solid ${active ? C.dark : 'transparent'}`,
        marginBottom: negativeMargin ? -1 : undefined,
        background: 'transparent',
        color: active ? C.dark : C.sub,
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
      }}
    >
      {label}
    </HoverButton>
  )
}

/** Empty-state line shared by the client, tour, and thread lists. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <div style={{ padding: 12, fontSize: 12, color: C.muted }}>{children}</div>
}

/**
 * Callback ref that keeps a native `title` in sync with whether the element's single-line text
 * is actually clipped by `text-overflow: ellipsis`. A truncated label then reveals its full text
 * on hover; an untruncated one shows no redundant tooltip. Safe inline and inside `.map()` — it
 * is a ref callback, not a hook — and re-measures when the element resizes (e.g. dragging the
 * viewport between breakpoints, which does not always re-render).
 *
 *   <span style={ellipsisStyle} ref={truncationTitle(fullText)}>{fullText}</span>
 */
export function truncationTitle(text: string) {
  return (el: HTMLElement | null) => {
    if (!el) return
    // Stash the latest text on the node so the (once-created) observer always reads the current
    // value rather than the string captured on first mount.
    const store = el as HTMLElement & { _truncText?: string; _truncRO?: ResizeObserver }
    store._truncText = text
    const sync = () => {
      const full = store._truncText ?? ''
      if (el.scrollWidth > el.clientWidth) el.setAttribute('title', full)
      else el.removeAttribute('title')
    }
    sync()
    if (typeof ResizeObserver !== 'undefined' && !store._truncRO) {
      store._truncRO = new ResizeObserver(sync)
      store._truncRO.observe(el)
    }
  }
}
