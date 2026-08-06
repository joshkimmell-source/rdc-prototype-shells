/**
 * Small primitives that stand in for the DC runtime's `style-hover` attribute.
 * The source markup carried hover styles inline alongside interpolated values, so
 * these keep the same "base style + hover overlay" shape rather than splitting each
 * one into a static Panda recipe.
 */
import { useState } from 'react'
import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { C, DISPLAY_FONT } from '../theme'

type HoverProps<T> = T & {
  style?: CSSProperties
  hoverStyle?: CSSProperties
  focusStyle?: CSSProperties
  children?: ReactNode
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
}: HoverProps<ButtonHTMLAttributes<HTMLButtonElement>>) {
  const [hover, setHover] = useState(false)
  const [focus, setFocus] = useState(false)
  return (
    <button
      type="button"
      {...rest}
      onMouseEnter={(e) => {
        setHover(true)
        onMouseEnter?.(e)
      }}
      onMouseLeave={(e) => {
        setHover(false)
        onMouseLeave?.(e)
      }}
      onFocus={(e) => {
        setFocus(true)
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocus(false)
        onBlur?.(e)
      }}
      style={{
        ...style,
        ...(hover ? hoverStyle : null),
        ...(focus ? focusStyle : null),
      }}
    >
      {children}
    </button>
  )
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
      style={{ ...style, ...(hover ? hoverStyle : null) }}
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
  size = 28,
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
  bg = C.hair,
  fg = C.action,
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
        fontWeight: 600,
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
    <button
      type="button"
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
    </button>
  )
}

/** Empty-state line shared by the client, tour, and thread lists. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <div style={{ padding: 12, fontSize: 12, color: C.muted }}>{children}</div>
}
