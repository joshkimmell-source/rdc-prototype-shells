/**
 * The Search header's left region: the MLS selector and the search field, ported from the
 * `.mls` / `.searchbox` controls that search-map.html used to draw inside the iframe. They now
 * sit in the shared `MainHeader` (see the "merge into the header" decision) so Search reads with
 * the same header as every other screen; the map, chips, and view toggles stay in the iframe.
 *
 * Prototype chrome: the selector and field are non-functional, matching the standalone page.
 */
import { C } from '../theme'
import { HoverButton } from './primitives'
import { IconChevronDown, IconSearch } from '../icons'

export function SearchHeaderLead({ mobile }: { mobile: boolean }) {
  return (
    <>
      <HoverButton
        aria-label="Searching All Available MLSs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flex: 'none',
          border: `1px solid ${C.border}`,
          borderRadius: 40,
          padding: mobile ? '6px 12px' : '6px 16px',
          background: C.white,
          color: C.dark,
          cursor: 'pointer',
          transition: 'box-shadow 120ms',
        }}
        hoverStyle={{ boxShadow: '0 1px 4px rgba(26,24,22,0.16)' }}
      >
        <span style={{ textAlign: 'left', lineHeight: 1 }}>
          <span style={{ display: 'block', fontSize: 11, fontWeight: 700, lineHeight: '13px' }}>
            Searching
          </span>
          <span style={{ display: 'block', fontSize: 13, fontWeight: 800, lineHeight: '16px', whiteSpace: 'nowrap' }}>
            All Available MLSs
          </span>
        </span>
        <IconChevronDown size={12} />
      </HoverButton>

      <div
        style={{
          // Fixed 420px when there is room, shrinking to a readable floor before the ActionBar
          // beside it starts folding — mirroring the field's behaviour on the standalone page.
          flex: '1 1 420px',
          minWidth: 120,
          maxWidth: 420,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          border: `1px solid ${C.border}`,
          borderRadius: 40,
          padding: '0 18px',
          height: 44,
          background: C.white,
        }}
      >
        <IconSearch size={16} style={{ flex: 'none', color: C.sub }} />
        <input
          type="text"
          placeholder="City, neighborhood, address, school..."
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            minWidth: 0,
            fontSize: 14,
            fontFamily: 'inherit',
            color: C.dark,
            background: 'transparent',
          }}
        />
      </div>
    </>
  )
}
