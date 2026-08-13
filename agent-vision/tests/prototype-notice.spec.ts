import { test, expect } from '@playwright/test'

/**
 * The on-load "This is a prototype" disclaimer. It is open on mount for every real visitor and
 * dismissed by its "Okay" button, so no one mistakes a sample client, listing, or address for a
 * real one. The rest of the suite seeds `ra-suppress-prototype-notice` (see playwright.config.ts)
 * so the overlay never blocks a test — here we drop that seed to exercise the genuine load.
 */
test.describe('prototype notice', () => {
  // A clean origin with no seeded suppress flag: this is what a first-time visitor sees.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('shows on load and dismisses with Okay', async ({ page }) => {
    await page.goto('/')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('This is a prototype')).toBeVisible()
    await expect(dialog.getByText(/sample data for demonstration only/)).toBeVisible()

    await dialog.getByRole('button', { name: 'Okay' }).click()
    await expect(dialog).toBeHidden()
  })
})
