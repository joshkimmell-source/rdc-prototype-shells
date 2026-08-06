/**
 * Vertical drag handle for the left edge of the right push panel.
 *
 * This is the ARIA window-splitter pattern: a focusable `separator` that reports its
 * position through `aria-valuenow`, drags with the pointer, and steps with the arrow
 * keys. The drag uses pointer capture so it survives crossing the map iframes and
 * scroll areas that sit under the pointer mid-drag.
 */
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import { C } from '../theme'

/** Width of the invisible grab strip; the visible indicator inside it is 2px. */
const HIT_WIDTH = 8
const KEY_STEP = 16
const KEY_STEP_LARGE = 64

export interface ResizeHandleProps {
  /** Current panel width in px — the value the drag starts from. */
  width: number
  min: number
  max: number
  /** Double-click and Enter reset target. */
  defaultWidth: number
  onWidth: (w: number) => void
  /**
   * True only while a pointer drag is in flight. The parent drops its width transition
   * for the duration so the edge sits under the pointer instead of easing behind it.
   * Deliberately excludes focus and keyboard stepping: those are discrete moves that
   * read better eased, and reporting focus here would flatten the expand animation
   * whenever the handle happened to be focused.
   */
  onInteract: (dragging: boolean) => void
}

export function ResizeHandle({ width, min, max, defaultWidth, onWidth, onInteract }: ResizeHandleProps) {
  const [hover, setHover] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dragging, setDragging] = useState(false)
  /** Non-null only mid-drag; also the gate for pointermove, which can outrun state. */
  const origin = useRef<{ x: number; width: number } | null>(null)

  const clamp = (w: number) => Math.min(max, Math.max(min, w))

  useEffect(() => {
    onInteract(dragging)
    return () => onInteract(false)
  }, [dragging, onInteract])

  // Hold the resize cursor and suppress selection for the whole drag, not just while
  // the pointer happens to be over the 8px strip.
  useEffect(() => {
    if (!dragging) return
    const { body } = document
    const prevCursor = body.style.cursor
    const prevSelect = body.style.userSelect
    body.style.cursor = 'col-resize'
    body.style.userSelect = 'none'
    return () => {
      body.style.cursor = prevCursor
      body.style.userSelect = prevSelect
    }
  }, [dragging])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    e.preventDefault()
    origin.current = { x: e.clientX, width }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
  }

  const endDrag = () => {
    origin.current = null
    setDragging(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? KEY_STEP_LARGE : KEY_STEP
    // The handle is on the panel's left edge, so left grows the panel and right shrinks it.
    if (e.key === 'ArrowLeft') onWidth(clamp(width + step))
    else if (e.key === 'ArrowRight') onWidth(clamp(width - step))
    else if (e.key === 'Home') onWidth(min)
    else if (e.key === 'End') onWidth(max)
    else if (e.key === 'Enter') onWidth(clamp(defaultWidth))
    else return
    e.preventDefault()
  }

  const indicator = dragging || focused ? C.action : hover ? C.border400 : 'transparent'

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize RealAssist+ panel"
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize — double-click to reset"
      onPointerDown={onPointerDown}
      onPointerMove={(e) => {
        if (!origin.current) return
        onWidth(clamp(origin.current.width - (e.clientX - origin.current.x)))
      }}
      onPointerUp={(e) => {
        if (!origin.current) return
        e.currentTarget.releasePointerCapture(e.pointerId)
        endDrag()
      }}
      onPointerCancel={endDrag}
      onDoubleClick={() => onWidth(clamp(defaultWidth))}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: HIT_WIDTH,
        zIndex: 30,
        display: 'flex',
        cursor: 'col-resize',
        // Keeps a touch drag from scrolling the page out from under the handle.
        touchAction: 'none',
        outline: 'none',
      }}
    >
      <div
        style={{
          width: 2,
          height: '100%',
          background: indicator,
          transition: 'background 120ms',
        }}
      />
    </div>
  )
}
