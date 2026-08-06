/**
 * Overflow menu — ported from components/Menu.jsx. Keeps the figma-aligned ⋯ toggle
 * geometry and the panel's own shadow/radius rather than delegating to Haven's Menu,
 * so the header cluster matches the source design exactly.
 */
import { useEffect, useRef, useState } from 'react'
import { IconMenuDots } from '../icons'
import { C } from '../theme'

export interface MenuItem {
  label: string
  destructive?: boolean
  onSelect?: () => void
}

interface MenuToggleProps {
  open: boolean
  onClick: () => void
  'aria-label'?: string
}

export function MenuToggle({ open, onClick, 'aria-label': label = 'More' }: MenuToggleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="menu"
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: `1px solid ${open ? C.dark : C.border}`,
        background: open ? C.dark : C.white,
        color: open ? C.white : C.dark,
        cursor: 'pointer',
        transition: 'all 120ms',
      }}
    >
      <IconMenuDots />
    </button>
  )
}

interface MenuProps {
  items?: Array<string | MenuItem>
  align?: 'left' | 'right'
  defaultOpen?: boolean
  onSelect?: (label: string) => void
  'aria-label'?: string
}

export function Menu({
  items = ['Share', 'Export', 'Print', 'Settings'],
  align = 'right',
  defaultOpen = false,
  onSelect,
  'aria-label': label,
}: MenuProps) {
  const [open, setOpen] = useState(defaultOpen)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const resolved: MenuItem[] = items.map((it) => (typeof it === 'string' ? { label: it } : it))

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <MenuToggle open={open} onClick={() => setOpen((o) => !o)} aria-label={label} />
      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            [align === 'left' ? 'left' : 'right']: 0,
            minWidth: 180,
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
          {resolved.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                it.onSelect?.()
                onSelect?.(it.label)
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = C.alt
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
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
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
