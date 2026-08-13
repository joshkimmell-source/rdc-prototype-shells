import { test, expect } from '@playwright/test'

/**
 * The RealAssist+ assistant panel is closed on arrival at every width — the agent opens it
 * deliberately (the FAB, an Ask action, a deep link) rather than it occupying the content on
 * load. Earlier it docked open on desktop; these pin the closed-by-default contract.
 *
 * The floating FAB is the reliable signal: it is the panel's toggle, shown only while the
 * panel is closed (several content CTAs share the "Ask RealAssist+" name, so it is located by
 * its `.ra-fab` mark, not by name alone).
 */
test.describe('assistant panel default', () => {
  const fab = (page: import('@playwright/test').Page) =>
    page.locator('button:has(.ra-fab)')
  const closePanel = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Close panel' })

  test('is closed on a desktop load', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/?view=home')

    // Closed: its in-panel Close control is not visible (the panel is visibility:hidden)…
    await expect(closePanel(page)).toBeHidden()
    // …and the floating trigger, which only shows while the panel is closed, is present.
    await expect(fab(page)).toBeVisible()
  })

  test('opens when the FAB is used, then closes again', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/?view=home')

    await fab(page).click()
    await expect(closePanel(page)).toBeVisible()
    // The FAB steps aside while the panel is open.
    await expect(fab(page)).toBeHidden()

    await closePanel(page).click()
    await expect(closePanel(page)).toBeHidden()
    await expect(fab(page)).toBeVisible()
  })
})

/**
 * The medium band (769–1279px): wide enough for the docked desktop layout but too narrow to
 * hold the rail, the 320px subnav and the 420px assistant panel with a usable content column.
 * So the two side panels are mutually exclusive there — opening one retracts the other — and
 * the content between them is never squished. Above the band (≥1280px) both dock together.
 *
 * The subnav's open state is read off the header's "Open subnav" control, which the Clients
 * header shows only while the subnav is closed; the panel's off the "Close panel" control.
 */
test.describe('medium-band side panels are mutually exclusive', () => {
  const fab = (page: import('@playwright/test').Page) => page.locator('button:has(.ra-fab)')
  const closePanel = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Close panel' })
  const openSubnavBtn = (page: import('@playwright/test').Page) =>
    page.getByRole('button', { name: 'Open subnav' })

  test('opening the assistant panel retracts the subnav', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 })
    await page.goto('/') // Clients is the landing screen; its subnav opens by default.

    // Subnav open (no "Open subnav" affordance), panel closed (FAB present).
    await expect(openSubnavBtn(page)).toHaveCount(0)
    await expect(fab(page)).toBeVisible()

    // Opening the panel closes the subnav, so the content isn't squished between them.
    await fab(page).click()
    await expect(closePanel(page)).toBeVisible()
    await expect(openSubnavBtn(page)).toBeVisible()
  })

  test('opening the subnav retracts the assistant panel', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 900 })
    await page.goto('/')

    // Open the panel first (which retracts the subnav)…
    await fab(page).click()
    await expect(closePanel(page)).toBeVisible()
    await expect(openSubnavBtn(page)).toBeVisible()

    // …then re-open the subnav, which closes the panel again.
    await openSubnavBtn(page).click()
    await expect(openSubnavBtn(page)).toHaveCount(0)
    await expect(closePanel(page)).toBeHidden()
    await expect(fab(page)).toBeVisible()
  })

  test('above the band both panels dock together', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')

    await expect(openSubnavBtn(page)).toHaveCount(0) // subnav open
    await fab(page).click()

    // The panel opens and the subnav stays open — there's room for both plus content.
    await expect(closePanel(page)).toBeVisible()
    await expect(openSubnavBtn(page)).toHaveCount(0)
  })
})
