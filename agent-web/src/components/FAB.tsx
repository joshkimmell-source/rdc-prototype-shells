/**
 * RealAssist+ floating action button — ported from components/FAB.jsx (figma node 21:212).
 * Mounted with aura=false in the shell, so the aura layer is omitted.
 */
import type { CSSProperties, ReactNode } from 'react'
import { IconRealAssist } from '../icons'
import { BRAND_GRADIENT } from '../theme'

interface FABProps {
  icon?: ReactNode
  className?: string
  style?: CSSProperties
}

export function FAB({ icon, className, style }: FABProps) {
  return (
    <div
      className={className}
      style={{
        width: 'fit-content',
        borderRadius: 9999,
        boxShadow: '0px 4px 20px 0px rgba(0,0,0,0.16)',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        ...style,
      }}
    >
      <div
        style={{
          position: 'relative',
          borderRadius: 9999,
          background: BRAND_GRADIENT,
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'row',
          padding: 12,
          alignItems: 'center',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon ?? <IconRealAssist />}
        </div>
      </div>
    </div>
  )
}
