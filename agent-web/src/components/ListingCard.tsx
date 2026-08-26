/**
 * A listing in the Clients screen's feed, built on Haven's `PropertyCard`.
 *
 * The mapping onto `PropertyCard`'s slots, since only two of them are self-evident:
 *
 * - `media` — the photo. `CardMedia` supplies the 3/2 ratio and `object-fit: cover`.
 * - `cardOverlayProps.topLeftComponent` — the recency / price-drop / open-house pills.
 *   `PropertyCard`'s own `labels` prop renders `Tag`s into exactly this slot, but its
 *   `PropertyLabel.text` is typed `string`, and the price-drop pill needs a struck-through
 *   old price beside the new one. So the pills are composed here as `Tag`s directly —
 *   the same component `labels` would have produced, with markup this slot allows.
 * - `cardOverlayProps.topRightComponent` / `bottomLeftComponent` — the select checkbox
 *   and the "Saved" flag.
 * - `description` — a `ReactNode` slot that renders between the media and the price,
 *   which is where the delete / send / save action row sits.
 * - `priceAddon` — renders inside the price row, so the status and days-on-market sit
 *   on the price's baseline, pushed right.
 * - `propertyMeta` — beds, baths and square footage, through Haven's own
 *   `PropertyMeta`. It takes snake_case MLS fields (`baths_full`, not `bathsFull`).
 * - `footer` — the property type and parking. `PropertyCard` has no slot between the
 *   meta row and the address, so this reads below the address rather than beside it.
 */
import { useState } from 'react'
import { Checkbox, PropertyCard, Tag } from '@rdc-npm/rdc-ui-v4'
import { token } from 'styled-system/tokens'
import { C } from '../theme'
import { HoverButton, truncationTitle } from './primitives'
import { IconArrowDown, IconHeart, IconShare, IconTrash } from '../icons'
import type { ClientListing, ListingPill } from '../data'

/** A pill's kind, in Haven `Tag` colours. Recency is red; the rest read as good news. */
const PILL_COLOR = { new: 'red', priceDrop: 'greenSubtle', openHouse: 'greenSubtle' } as const

/**
 * One overlay pill. A `priceDrop` carries two prices — `"$1.19M $1.16M"` — with the old
 * one struck through, so it needs markup a plain `Tag` child string can't express;
 * that's also why these are composed here rather than passed to `PropertyCard`'s
 * `labels` prop, whose `text` is typed `string`.
 */
function Pill({ pill }: { pill: ListingPill }) {
  if (pill.kind === 'priceDrop') {
    const [was, now] = pill.text.split(' ')
    return (
      <Tag dataColor={PILL_COLOR.priceDrop} endIcon={<IconArrowDown />}>
        <span style={{ textDecoration: 'line-through', opacity: 0.75 }}>{was}</span>
        <span>{now}</span>
      </Tag>
    )
  }
  return <Tag dataColor={PILL_COLOR[pill.kind]}>{pill.text}</Tag>
}

/** Bare icon button — the action row's icons carry no chrome until hovered. */
function ActionButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <HoverButton
      aria-label={label}
      title={label}
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        flex: 'none',
        borderRadius: '50%',
        border: 'none',
        background: 'transparent',
        color: C.dark,
        cursor: 'pointer',
        transition: 'background 120ms',
      }}
      hoverStyle={{ background: C.alt }}
    >
      {children}
    </HoverButton>
  )
}

export function ListingCard({ listing }: { listing: ClientListing }) {
  // Selection and save live on the card: nothing outside it reads them, and the
  // prototype has no server to persist a change to.
  const [selected, setSelected] = useState(false)
  const [saved, setSaved] = useState(listing.saved)
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const { headline, openHouse } = listing

  return (
    <PropertyCard
      media={<img src={listing.photo} alt={listing.photoAlt} loading="lazy" />}
      cardOverlayProps={{
        topLeftComponent: (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
            <Pill pill={headline} />
            {openHouse && <Pill pill={openHouse} />}
          </div>
        ),
        topRightComponent: (
          // `CardOverlay` is `pointer-events: none` and restores it only for
          // `:is(a, button)` descendants. Haven's `Checkbox` is an `input` inside a
          // `label`, so without this it renders but cannot be clicked.
          <span style={{ pointerEvents: 'auto' }}>
            <Checkbox
              checked={selected}
              onChange={(_e, next) => setSelected(next)}
              aria-label={`Select ${listing.address1}`}
            />
          </span>
        ),
        bottomLeftComponent: saved ? <Tag dataColor="gray">Saved</Tag> : undefined,
      }}
      description={
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <ActionButton label={`Hide ${listing.address1}`} onClick={() => setDismissed(true)}>
            <IconTrash size={15} />
          </ActionButton>
          <ActionButton label={`Send ${listing.address1} to a client`} onClick={() => {}}>
            <IconShare />
          </ActionButton>
          <div style={{ flex: 1 }} />
          <ActionButton
            label={saved ? `Unsave ${listing.address1}` : `Save ${listing.address1}`}
            onClick={() => setSaved((s) => !s)}
          >
            <IconHeart size={16} filled={saved} />
          </ActionButton>
        </div>
      }
      price={listing.price}
      priceAddon={
        // `priceRowStyles` is a flex row with the price first, so `marginLeft: auto`
        // pushes this to the right edge. The row has no `min-width: 0`, so this must
        // shrink on its own: a long status ("PRICE CHANGE | 198 DOM") beside a
        // seven-figure price needs more than a narrow card's content width. The status
        // is the part that gives, since the days-on-market number is the one that
        // changes card to card and so the one worth keeping whole.
        <div
          style={{
            marginLeft: 'auto',
            minWidth: 0,
            display: 'flex',
            gap: 4,
            fontSize: 11,
            lineHeight: '14px',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{ fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}
            ref={truncationTitle(listing.status)}
          >
            {listing.status}
          </span>
          <span style={{ flex: 'none', color: token('colors.text.alternate', C.sub) }}>
            | {listing.dom} DOM
          </span>
        </div>
      }
      propertyMeta={listing.meta}
      // One address line, as on the reference. `address1` and `address2` each render as a
      // `display: block` span, so passing them separately stacks the city onto its own
      // line; `addressLineStyles` already truncates, so the joined line ellipsizes on a
      // narrow card rather than wrapping.
      address1={`${listing.address1} ${listing.address2}`}
      footer={
        <div
          style={{
            display: 'flex',
            gap: 8,
            fontSize: 12,
            color: token('colors.text.alternate', C.sub),
          }}
        >
          <span>{listing.secondary}</span>
          <span style={{ marginLeft: 'auto', textAlign: 'right' }}>{listing.propertyType}</span>
        </div>
      }
    />
  )
}
