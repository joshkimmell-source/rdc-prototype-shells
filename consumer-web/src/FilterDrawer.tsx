import React, { useState, useEffect } from 'react'
import { Modal, Accordion, Button, Chip, PickerGroup, Picker, SelectDropdown, Slider, AutocompleteMultiselect } from '@rdc-npm/rdc-ui-v4'
import { ModalHeader, ModalBody, ModalFooter } from '@rdc-npm/rdc-ui-v4/modal'
import {
  IconPropertyType, IconSingleFamily, IconCondo, IconTownhome,
  IconApartment, IconMobileHome, IconFarm, IconLotSize, IconPlus,
} from '@rdc-npm/rdc-ui-v4/illustrations'
import { css } from 'styled-system/css'
import { vstack, hstack } from 'styled-system/patterns'

// ─── Types ────────────────────────────────────────────────────────────────────
// A representative slice of the real SRP filter set — enough to show how each
// rdc-ui input composes. Add fields (lot size, HOA, commute time, listing status…)
// as your prototype needs them.

export interface FilterState {
  priceType: 'list' | 'monthly'
  priceRange: [number, number]
  priceMin: string
  priceMax: string
  bedsMin: number
  bathsMin: number
  homeTypes: string[]
  homeFeatures: string[]
}

export const DEFAULT_FILTERS: FilterState = {
  priceType: 'list',
  priceRange: [0, 100],
  priceMin: '',
  priceMax: '',
  bedsMin: 0,
  bathsMin: 0,
  homeTypes: [],
  homeFeatures: [],
}

interface FilterDrawerProps {
  open: boolean
  onClose: () => void
  filters: FilterState
  onApply: (filters: FilterState) => void
}

// ─── Static prototype data ────────────────────────────────────────────────────

const HISTOGRAM_BARS = [3, 4, 4, 8, 17, 18, 29, 21, 46, 52, 70, 63, 76, 51, 63, 53, 82, 69, 72, 48, 55, 21, 43, 33, 19, 24, 25, 39, 33, 17, 20, 9, 17, 11, 14, 4, 6, 8, 11, 3]

const PRICE_OPTIONS = [
  { value: '', text: 'No min', placeholder: true },
  { value: '200000', text: '$200K' },
  { value: '300000', text: '$300K' },
  { value: '400000', text: '$400K' },
  { value: '500000', text: '$500K' },
  { value: '750000', text: '$750K' },
  { value: '1000000', text: '$1M' },
]

const PRICE_MAX_OPTIONS = [{ value: '', text: 'No max', placeholder: true }, ...PRICE_OPTIONS.slice(1)]

const HOME_TYPES = [
  { id: 'any', label: 'Any', icon: <IconPropertyType size={3} /> },
  { id: 'house', label: 'House', icon: <IconSingleFamily size={3} /> },
  { id: 'condo', label: 'Condo', icon: <IconCondo size={3} /> },
  { id: 'townhome', label: 'Townhome', icon: <IconTownhome size={3} /> },
  { id: 'multifamily', label: 'Multi family', icon: <IconApartment size={3} /> },
  { id: 'mobile', label: 'Mobile', icon: <IconMobileHome size={3} /> },
  { id: 'farm', label: 'Farm', icon: <IconFarm size={3} /> },
  { id: 'land', label: 'Land', icon: <IconLotSize size={3} /> },
]

const FEATURE_CHIPS = ['Pool', 'Water front', 'Basement', 'Gated', 'Fireplace', 'Fenced yard', 'Home office']

const sectionPadding = css({ px: '500', pb: '600' })

// ─── FilterDrawer ─────────────────────────────────────────────────────────────

export function FilterDrawer({ open, onClose, filters, onApply }: FilterDrawerProps) {
  const [local, setLocal] = useState<FilterState>(filters)

  useEffect(() => { if (open) setLocal(filters) }, [open])

  function set<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setLocal(prev => ({ ...prev, [key]: value }))
  }

  function handleReset() { setLocal(DEFAULT_FILTERS) }
  function handleApply() { onApply(local); onClose() }

  return (
    <Modal open={open} onClose={onClose} layout="drawer" drawerPosition="right" size="sm" style={{ '--modal-width': '540px' } as React.CSSProperties}>
      <ModalHeader title="Filters" />

      <ModalBody style={{ padding: 0 }}>
        <div className={vstack({ gap: '0', alignItems: 'stretch' })}>

          {/* ── Price ── demonstrates PickerGroup, Slider + histogram, SelectDropdown */}
          <Accordion title="Price" defaultOpen size="sm">
            <div className={sectionPadding}>
              <div className={vstack({ gap: '500', alignItems: 'stretch' })}>

                {/* List price / Monthly payment toggle */}
                <PickerGroup>
                  <Picker
                    id="priceType-list"
                    type="radio"
                    name="priceType"
                    justifyContent="center"
                    checked={local.priceType === 'list'}
                    onChange={() => set('priceType', 'list')}
                    labelText="List price"
                  />
                  <Picker
                    id="priceType-monthly"
                    type="radio"
                    name="priceType"
                    justifyContent="center"
                    checked={local.priceType === 'monthly'}
                    onChange={() => set('priceType', 'monthly')}
                    labelText="Monthly payment"
                  />
                </PickerGroup>

                {/* Histogram + Slider */}
                <div style={{ position: 'relative', width: '100%' }}>
                  <div className={css({ display: 'flex', alignItems: 'flex-end', h: '82px', w: 'full', gap: '100', px: '400', boxSizing: 'border-box' })}>
                    {HISTOGRAM_BARS.map((h, i) => {
                      const pct = (i / (HISTOGRAM_BARS.length - 1)) * 100
                      const inRange = pct >= local.priceRange[0] && pct <= local.priceRange[1]
                      return (
                        <div
                          key={i}
                          className={css({ borderRadius: '200' })}
                          style={{
                            flex: 1,
                            height: `${h}px`,
                            minWidth: 0,
                            backgroundColor: inRange ? 'var(--colors-bg-inverse)' : 'var(--colors-border-base)',
                          }}
                        />
                      )
                    })}
                  </div>
                  <Slider
                    value={local.priceRange}
                    min={0}
                    max={100}
                    step={1}
                    onValueChange={(vals: number[]) => set('priceRange', vals as [number, number])}
                  />
                </div>

                {/* Price range selects */}
                <div className={hstack({ gap: '400', alignItems: 'flex-end' })}>
                  <div className={css({ flex: '1', minW: '0' })}>
                    <SelectDropdown
                      label="Min price"
                      options={PRICE_OPTIONS}
                      value={local.priceMin}
                      onChange={(val: string) => set('priceMin', val)}
                    />
                  </div>
                  <div className={css({ flex: '1', minW: '0' })}>
                    <SelectDropdown
                      label="Max price"
                      options={PRICE_MAX_OPTIONS}
                      value={local.priceMax}
                      onChange={(val: string) => set('priceMax', val)}
                    />
                  </div>
                </div>

              </div>
            </div>
          </Accordion>

          {/* ── Rooms ── demonstrates PickerGroup as a segmented control */}
          <Accordion title="Rooms" defaultOpen size="sm">
            <div className={sectionPadding}>
              <div className={vstack({ gap: '400', alignItems: 'stretch' })}>
                <div>
                  <p className={css({ textStyle: 'bodySm', color: 'text.base', mb: '200' })}>Bedrooms</p>
                  <PickerGroup>
                    {['Any', 'Studio', '1', '2', '3', '4', '5+'].map((label, i) => {
                      const val = i === 0 ? 0 : i
                      return (
                        <Picker
                          key={label}
                          id={`beds-${label}`}
                          type="radio"
                          name="beds"
                          justifyContent="center"
                          checked={local.bedsMin === val}
                          onChange={() => set('bedsMin', val)}
                          labelText={label}
                        />
                      )
                    })}
                  </PickerGroup>
                </div>
                <div>
                  <p className={css({ textStyle: 'bodySm', color: 'text.base', mb: '200' })}>Bathrooms</p>
                  <PickerGroup>
                    {['Any', '1', '2', '3', '4', '5+'].map((label, i) => {
                      const val = i === 0 ? 0 : i
                      return (
                        <Picker
                          key={label}
                          id={`baths-${label}`}
                          type="radio"
                          name="baths"
                          justifyContent="center"
                          checked={local.bathsMin === val}
                          onChange={() => set('bathsMin', val)}
                          labelText={label}
                        />
                      )
                    })}
                  </PickerGroup>
                </div>
              </div>
            </div>
          </Accordion>

          {/* ── Home type ── demonstrates a stacked Picker checkbox grid with icons */}
          <Accordion title="Home type" defaultOpen size="sm">
            <div className={sectionPadding}>
              <div className={css({ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '300' })}>
                {HOME_TYPES.map(type => (
                  <Picker
                    key={type.id}
                    type="checkbox"
                    layout="stacked"
                    name="homeType"
                    checked={type.id === 'any' ? local.homeTypes.length === 0 : local.homeTypes.includes(type.id)}
                    onChange={() => {
                      if (type.id === 'any') {
                        set('homeTypes', [])
                      } else {
                        const next = local.homeTypes.includes(type.id)
                          ? local.homeTypes.filter(x => x !== type.id)
                          : [...local.homeTypes, type.id]
                        set('homeTypes', next)
                      }
                    }}
                    startIcon={type.icon}
                    labelText={type.label}
                  />
                ))}
              </div>
            </div>
          </Accordion>

          {/* ── Home features ── demonstrates AutocompleteMultiselect + Chip multi-select */}
          <Accordion title="Home features" size="sm">
            <div className={vstack({ p: '500', gap: '300', alignItems: 'stretch' })}>
              <p className={css({ textStyle: 'bodySm', color: 'text.base' })}>Keyword search</p>
              <AutocompleteMultiselect
                placeholder="Select a keyword or type here"
                items={[]}
                selectedValues={local.homeFeatures}
                onSelectedValuesChange={(vals) => set('homeFeatures', vals)}
                openOnFocus={false}
              />
              <div className={hstack({ gap: '200', flexWrap: 'wrap' })}>
                {FEATURE_CHIPS.map(feat => {
                  const selected = local.homeFeatures.includes(feat)
                  return (
                    <Chip
                      key={feat}
                      size="sm"
                      selected={selected}
                      showDismiss={selected}
                      onClick={() => { if (!selected) set('homeFeatures', [...local.homeFeatures, feat]) }}
                      onDismissClick={() => set('homeFeatures', local.homeFeatures.filter(f => f !== feat))}
                      startIcon={!selected ? <IconPlus size={3} /> : undefined}
                    >
                      {feat}
                    </Chip>
                  )
                })}
              </div>
            </div>
          </Accordion>

          {/* Add more sections here (listing details, home details, commute time,
              expanded search…) following the patterns above. */}

        </div>
      </ModalBody>

      <ModalFooter style={{ borderTop: '1px solid var(--colors-border-base)' }}>
        <div className={hstack({ justifyContent: 'space-between', w: 'full', gap: '400' })}>
          <Button styleType="Ghost" size="lg" onClick={handleReset}>
            Clear all
          </Button>
          <Button styleType="Primary" size="lg" onClick={handleApply}>
            View homes
          </Button>
        </div>
      </ModalFooter>
    </Modal>
  )
}
