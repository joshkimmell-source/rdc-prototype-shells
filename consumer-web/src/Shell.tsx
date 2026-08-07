import React, { useState } from 'react'
import { Search, PropertyCard, StatusBadge, SaveButton, Nav, Button, Chip, Avatar, ContentSwitch, Link } from '@rdc-npm/rdc-ui-v4'
import { FilterDrawer, DEFAULT_FILTERS, type FilterState } from './FilterDrawer'
import {
  listings as SAMPLE_LISTINGS,
  searchLocation,
  resultCount,
  initialSavedIds,
} from './data/sample/adapters'
import { IconHeart, IconFilter, IconChevronDown, IconCashReward } from '@rdc-npm/rdc-ui-v4/illustrations'
import { css } from 'styled-system/css'
import { hstack, vstack } from 'styled-system/patterns'

// ─── Prototype content slots ──────────────────────────────────────────────────

function PlaceholderContent({ label }: { label: string }) {
  return (
    <div className={vstack({ alignItems: 'center', justifyContent: 'center', py: '1400' })}>
      <div className={css({
        w: '64px',
        h: '64px',
        borderRadius: 'circle',
        bg: 'bg.alternate',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        mb: '500',
      })}>
        <span className={css({ textStyle: 'headingMd' })}>✦</span>
      </div>
      <p className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>{label}</p>
      <p className={css({ textStyle: 'bodySm', color: 'text.disabled', mt: '200' })}>Replace with your prototype content</p>
    </div>
  )
}

// ─── realtor.com logo ─────────────────────────────────────────────────────────

function RealtorLogo() {
  return (
    <Link href="#" aria-label="realtor.com home" underline="none" className={css({ display: 'flex', alignItems: 'center', flexShrink: '0' })}>
      <img
        src="https://static.rdc.moveaws.com/rdc-ui/logos/logo-brand.svg"
        alt="realtor.com"
        className={css({ h: '19px', w: '136px', display: 'block' })}
      />
    </Link>
  )
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export default function Shell() {
  const [activeNav, setActiveNav] = useState('buy')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set(initialSavedIds))
  const [searchValue, setSearchValue] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [mapView, setMapView] = useState(false)
  const [activeChips, setActiveChips] = useState<Set<string>>(new Set())

  function toggleChip(id: string) {
    setActiveChips(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSaveToggle(id: string) {
    setSavedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const primaryNav = [
    { label: 'Buy', id: 'buy' },
    { label: 'Sell', id: 'sell' },
    { label: 'Rent', id: 'rent' },
    { label: 'Mortgage', id: 'mortgage' },
    { label: 'Find an Agent', id: 'find-an-agent' },
    { label: 'My Home', id: 'my-home' },
    { label: 'News & Insights', id: 'news' },
  ]

  return (
    <div className={vstack({ minH: '100dvh', alignItems: 'stretch', justify: 'flex-start', gap: '0' })}>

      {/* ── Global header ── */}
      <header className={css({
        position: 'sticky',
        top: '0',
        zIndex: 'sticky',
        bg: 'bg.base',
        borderBottomWidth: '100',
        borderBottomStyle: 'solid',
        borderColor: 'border.base',
        h: '56px',
        display: 'flex',
        alignItems: 'center',
        px: { base: '500', sm: '700' },
        gap: '0',
      })}>

        <RealtorLogo />

        {/* Primary nav — hidden on mobile */}
        <Nav
          aria-label="Main navigation"
          hideBorder
          className={css({
            alignSelf: 'stretch',
            display: 'none',
            sm: { display: 'flex' },
            '& > *': { alignSelf: 'stretch' },
          })}
        >
          {primaryNav.map(item => (
            <Nav.Link key={item.id} active={activeNav === item.id} onClick={() => setActiveNav(item.id)}>
              {item.label}
            </Nav.Link>
          ))}
        </Nav>

        {/* Ad links — hidden on mobile */}
        <div className={hstack({
          flex: '1',
          minW: '0',
          justifyContent: 'flex-end',
          gap: '600',
          pr: '600',
          display: 'none',
          sm: { display: 'flex' },
        })}>
          {['Manage rentals', 'Advertise'].map(label => (
            <Link key={label} href="#" underline="none" size="inline">
              {label}
            </Link>
          ))}
        </div>

        {/* Spacer on mobile to push icons right */}
        <div className={css({ flex: '1', display: { base: 'block', sm: 'none' } })} />

        {/* Right icons */}
        <div className={hstack({ gap: '300', flexShrink: '0', alignItems: 'center' })}>
          <Button styleType="Ghost" size="sm" iconOnly={<IconHeart size={3} />} aria-label="Saved homes" />
          <Button styleType="Ghost" size="sm" iconOnly={<Avatar size="xs" />} aria-label="Sign in or join" />
        </div>
      </header>

      {/* ── Search + Save search row ── */}
      <div className={css({
        bg: 'bg.base',
        borderBottomWidth: '100',
        borderColor: 'border.base',
        px: { base: '500', sm: '700' },
        py: '300',
      })}>
        <div className={hstack({ gap: '300', alignItems: 'center', flexWrap: 'wrap' })}>
          {/* Search — full width on mobile, flex-1 on desktop */}
          <div className={css({ flex: '1', minW: { base: 'full', sm: '0' }, maxW: { sm: '720px' } })}>
            <Search
              size="inline"
              placeholder={`Try "3 bedrooms with wood floors in ${searchLocation.split(',')[0]}"`}
              value={searchValue}
              sections={[]}
              onInputChange={(val) => setSearchValue(val)}
              onSearch={async () => {}}
              searchButtonStyleType="Ghost"
            />
          </div>
          <Button styleType="Primary" size="lg" startIcon={<IconHeart size={3} />}>
            Save search
          </Button>
          {/* Spacer — desktop only */}
          <div className={css({ flex: '1', display: { base: 'none', sm: 'block' } })} />
          {/* List / Map toggle */}
          <ContentSwitch size="lg">
            <ContentSwitch.Item selected={!mapView} onClick={() => setMapView(false)}>List</ContentSwitch.Item>
            <ContentSwitch.Item selected={mapView} onClick={() => setMapView(true)}>Map</ContentSwitch.Item>
          </ContentSwitch>
        </div>
      </div>

      {/* ── Filter chip bar ── */}
      <div className={css({
        bg: 'bg.base',
        borderBottomWidth: '100',
        borderColor: 'border.base',
        px: { base: '500', sm: '700' },
        py: '300',
        overflowX: 'auto',
      })}>
        <div className={hstack({ gap: '200', flexWrap: 'nowrap', alignItems: 'center' })}>
          <Chip size="lg" startIcon={<IconFilter size={2} />} onClick={() => setFilterOpen(true)}>Filters</Chip>
          <Chip size="lg" selected={activeChips.has('price')} onClick={() => toggleChip('price')}>
            <span className={hstack({ gap: '200', alignItems: 'center' })}>Price <IconChevronDown size={3} /></span>
          </Chip>
          <Chip size="lg" selected={activeChips.has('rooms')} onClick={() => toggleChip('rooms')}>
            <span className={hstack({ gap: '200', alignItems: 'center' })}>Rooms <IconChevronDown size={3} /></span>
          </Chip>
          <Chip size="lg" selected={activeChips.has('hometype')} onClick={() => toggleChip('hometype')}>
            <span className={hstack({ gap: '200', alignItems: 'center' })}>Home type <IconChevronDown size={3} /></span>
          </Chip>
          <Chip size="lg" selected={activeChips.has('newcon')} showDismiss={activeChips.has('newcon')} onDismissClick={() => toggleChip('newcon')} onClick={() => toggleChip('newcon')}>New construction</Chip>
          <Chip size="lg" selected={activeChips.has('min100k')} showDismiss={activeChips.has('min100k')} onDismissClick={() => toggleChip('min100k')} onClick={() => toggleChip('min100k')}>Min $100K</Chip>
          <Chip size="lg" selected={activeChips.has('pending')} showDismiss={activeChips.has('pending')} onDismissClick={() => toggleChip('pending')} onClick={() => toggleChip('pending')}>Hide pending / contingent</Chip>
          <Chip size="lg" selected={activeChips.has('foreclosures')} showDismiss={activeChips.has('foreclosures')} onDismissClick={() => toggleChip('foreclosures')} onClick={() => toggleChip('foreclosures')}>Hide foreclosures</Chip>
          <Chip size="lg" selected={activeChips.has('land')} showDismiss={activeChips.has('land')} onDismissClick={() => toggleChip('land')} onClick={() => toggleChip('land')}>Hide land</Chip>
          <Chip size="lg" selected={activeChips.has('mobile')} showDismiss={activeChips.has('mobile')} onDismissClick={() => toggleChip('mobile')} onClick={() => toggleChip('mobile')}>Hide mobile homes</Chip>
        </div>
      </div>

      {/* ── Content area ── */}
      <main className={css({ flex: '1', w: 'full', px: { base: '500', sm: '700' }, py: '600' })}>

        {/* Page heading */}
        <h1 className={css({ textStyle: 'headingMd', fontWeight: 'bold', mb: '300' })}>
          {searchLocation} homes for sale &amp; real estate
        </h1>

        {/* Results meta row */}
        <div className={hstack({ justifyContent: 'space-between', mb: '500', alignItems: 'center', flexWrap: 'wrap', gap: '300' })}>
          <div className={hstack({ gap: '400', alignItems: 'center' })}>
            <span className={css({ textStyle: 'bodySm', color: 'text.base', fontWeight: 'medium' })}>
              {resultCount} {resultCount === 1 ? 'Home' : 'Homes'}
            </span>
            <span className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>
              Sort by{' '}
              <Button styleType="Ghost" size="inline">
                Relevant listings <IconChevronDown size={2} />
              </Button>
            </span>
          </div>
          {/* Hide affordability link on mobile */}
          <div className={css({ display: { base: 'none', sm: 'block' } })}>
            <Button styleType="Ghost" size="inline" startIcon={<IconCashReward size={3} />} css={{ textDecoration: 'none' }}>
              How much home can I afford?
            </Button>
          </div>
        </div>

        <div className={css({
          display: 'grid',
          gridTemplateColumns: 'repeat(1, 1fr)',
          gap: '500',
          xs: { gridTemplateColumns: 'repeat(2, 1fr)' },
          md: { gridTemplateColumns: 'repeat(3, 1fr)' },
          lg: { gridTemplateColumns: 'repeat(4, 1fr)' },
        })}>
          {SAMPLE_LISTINGS.map(listing => (
            <PropertyCard
              key={listing.id}
              address1={listing.address1}
              address2={listing.address2}
              price={listing.price}
              propertyMeta={{
                beds: listing.beds,
                baths_full: Math.floor(listing.baths),
                baths_half: listing.baths % 1 >= 0.5 ? 1 : 0,
                sqft: listing.sqft,
              }}
              media={<img src={listing.photo} alt={listing.address1} />}
              labels={listing.openHouse.map(slot => ({ text: `Open ${slot}`, dataColor: 'white' as const }))}
              description={
                <StatusBadge dataColor={listing.statusColor}>
                  {listing.status}
                </StatusBadge>
              }
              footer={
                <span className={css({ textStyle: 'bodySm', color: 'text.alternate' })}>
                  {listing.daysOnMarketLabel}
                </span>
              }
              cardOverlayProps={{
                bottomRightComponent: (
                  <SaveButton
                    saved={savedIds.has(listing.id)}
                    label={listing.address1}
                    size="sm"
                    onClick={() => handleSaveToggle(listing.id)}
                  />
                ),
              }}
            />
          ))}
        </div>
      </main>

      {/* ── Global footer ── */}
      <footer className={css({ bg: 'bg.inverse', color: 'text.alternate', textStyle: 'bodySm', px: { base: '500', sm: '600' }, py: '700' })}>
        <div className={css({ maxW: '1280px', mx: 'auto' })}>
          <div className={hstack({ flexWrap: 'wrap', gap: '300', mb: '500' })}>
            {['About', 'Contact', 'Careers', 'News', 'Advertise', 'Agent tools', 'Privacy', 'Terms', 'Sitemap'].map(link => (
              <Link key={link} href="#" inverse underline="none" size="inline">
                {link}
              </Link>
            ))}
          </div>
          <p className={css({ textStyle: 'bodySm', color: 'text.disabled' })}>
            © {new Date().getFullYear()} Move, Inc. All rights reserved. realtor.com® is the official site of the National Association of REALTORS®.
          </p>
        </div>
      </footer>

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
      />

    </div>
  )
}
