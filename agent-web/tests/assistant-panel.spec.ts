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
