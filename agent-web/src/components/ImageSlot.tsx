/**
 * Stand-in for the source's `<image-slot>` custom element.
 *
 * The original persisted a dropped image to an `.image-slots.state.json` sidecar via the
 * authoring runtime's file bridge, which doesn't exist here. This keeps the drop-to-fill
 * and click-to-browse behaviour and persists to localStorage instead, so a filled tile
 * survives a reload during a demo.
 */
import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { C } from '../theme'

const STORE_PREFIX = 'ra-image-slot:'

interface ImageSlotProps {
  id: string
  placeholder?: string
  src?: string
  style?: CSSProperties
}

export function ImageSlot({ id, placeholder = 'Drop an image', src, style }: ImageSlotProps) {
  const [dropped, setDropped] = useState<string | null>(null)
  const [over, setOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      setDropped(localStorage.getItem(STORE_PREFIX + id))
    } catch {
      // private-mode / disabled storage: the slot just stays empty
    }
  }, [id])

  const accept = (file?: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result)
      setDropped(url)
      try {
        localStorage.setItem(STORE_PREFIX + id, url)
      } catch {
        // over quota — the image still shows for this session
      }
    }
    reader.readAsDataURL(file)
  }

  const shown = dropped ?? src

  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        accept(e.dataTransfer.files?.[0])
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        outline: over ? `2px dashed ${C.white}` : 'none',
        outlineOffset: -6,
        ...style,
      }}
    >
      {shown ? (
        <img src={shown} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        <span
          style={{
            padding: '0 12px',
            fontSize: 11.5,
            fontWeight: 600,
            color: C.muted,
            textAlign: 'center',
            lineHeight: 1.35,
          }}
        >
          {placeholder}
        </span>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={(e) => accept(e.target.files?.[0])}
        onClick={(e) => e.stopPropagation()}
        style={{ display: 'none' }}
      />
    </div>
  )
}
