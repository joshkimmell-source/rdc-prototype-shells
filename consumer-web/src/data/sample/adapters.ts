/**
 * consumer-web ← sample dataset mapping.
 *
 * The `inject-dummy-data` skill overwrites `index.ts` and `sample-data.json` on
 * every run but leaves this file alone, so anything prototype-specific belongs
 * here rather than in either of those.
 *
 * The dataset is structured (`address.line1`, `bathsFull` / `bathsHalf`, MLS
 * status names); the shell's card grid wants two address lines, a decimal bath
 * count and consumer-facing status wording. This file is the seam between them.
 */

import type { StatusBadgeColor } from '@rdc-npm/rdc-ui-v4'
import {
  LISTINGS,
  agentSavedSearches,
  formatBaths,
  formatCityLine,
  type Listing,
  type ListingStatus,
} from './index'

/** The shape consumer-web's PropertyCard grid consumes. */
export interface ConsumerListing {
  id: string
  address1: string
  address2: string
  price: number
  beds: number
  /** Decimal, MLS convention — `2.5` for 2 full + 1 half. */
  baths: number
  /** `undefined` where the source has no square footage — PropertyMeta shows its null text. */
  sqft: number | undefined
  /** Consumer-facing status wording. */
  status: string
  /** The dataset's own status vocabulary, kept for filtering and debugging. */
  mlsStatus: ListingStatus
  statusColor: StatusBadgeColor
  daysOnMarket: number
  /** Pre-formatted, so a listing 0 days on market doesn't read "0d". */
  daysOnMarketLabel: string
  photo: string
  photoCount: number
  /** Empty when there is no open house scheduled. */
  openHouse: string[]
  propertyType: string
  /** Multi-unit properties only. */
  units?: number
}

/**
 * MLS status → consumer wording and dot color. Every `ListingStatus` has an
 * entry, so a badge always resolves a color; add here, not at the call site, if
 * the dataset gains a status.
 */
const CONSUMER_STATUS: Record<ListingStatus, { label: string; color: StatusBadgeColor }> = {
  New: { label: 'New', color: 'green' },
  Active: { label: 'For sale', color: 'green' },
  'Price Change': { label: 'Price reduced', color: 'yellow' },
  'Coming Soon': { label: 'Coming soon', color: 'gray' },
  Closed: { label: 'Sold', color: 'red' },
}

const daysOnMarketLabel = (days: number): string =>
  days === 0 ? 'New today' : `${days}d on realtor.com`

const toConsumerListing = (listing: Listing): ConsumerListing => {
  const status = CONSUMER_STATUS[listing.status]
  return {
    id: listing.id,
    address1: listing.address.line1,
    address2: formatCityLine(listing),
    price: listing.price,
    beds: listing.beds,
    baths: formatBaths(listing),
    // PropertyMeta's `sqft` is optional, not nullable.
    sqft: listing.sqft ?? undefined,
    status: status.label,
    mlsStatus: listing.status,
    statusColor: status.color,
    daysOnMarket: listing.daysOnMarket,
    daysOnMarketLabel: daysOnMarketLabel(listing.daysOnMarket),
    photo: listing.primaryPhoto,
    photoCount: listing.photoCount,
    openHouse: listing.openHouse,
    propertyType: listing.propertyType,
    ...(listing.units === undefined ? {} : { units: listing.units }),
  }
}

export const listings: ConsumerListing[] = LISTINGS.map(toConsumerListing)

/**
 * The results page's location scope. Taken from the dataset's own
 * broadest-scoped saved search rather than hardcoded, so it stays consistent
 * with the fictional geography.
 */
export const searchLocation: string = agentSavedSearches()[0]?.criteria.location ?? 'Anytown, ST'

/** Honest count for the results meta row — the grid renders every listing. */
export const resultCount: number = listings.length

/** A listing the returning user has already saved, for the pre-filled heart. */
export const initialSavedIds: string[] = ['lst_02']
