import { test, expect } from '@playwright/test'

/**
 * The on-load "This is a prototype" notice, now a password gate. It is open on mount for every
 * real visitor and cannot be dismissed until the shared password is entered, so no one mistakes
 * a sample client, listing, or address for a real one — and a public demo URL isn't wide open.
 * The rest of the suite seeds `ra-suppress-prototype-notice` (see playwright.config.ts) so the
 * overlay never blocks a test — here we drop that seed to exercise the genuine load.
 */
test.describe('prototype notice', () => {
  // A clean origin with no seeded suppress flag: this is what a first-time visitor sees.
  test.use({ storageState: { cookies: [], origins: [] } })

  test('gates on load and unlocks with the correct password', async ({ page }) => {
    await page.goto('/')

    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(dialog.getByText('This is a prototype')).toBeVisible()
    await expect(dialog.getByText(/sample data for demonstration only/)).toBeVisible()

    // The primary button is "Enter" and disabled until a password is typed.
    const enter = dialog.getByRole('button', { name: 'Enter' })
    await expect(enter).toBeDisabled()

    // A wrong password is rejected and keeps the gate up.
    await dialog.locator('#prototype-password').fill('nope')
    await enter.click()
    await expect(dialog.getByText(/Incorrect password/)).toBeVisible()
    await expect(dialog).toBeVisible()

    // The correct password unlocks and dismisses.
    await dialog.locator('#prototype-password').fill('B0bsYourUncle')
    await dialog.getByRole('button', { name: 'Enter' }).click()
    await expect(dialog).toBeHidden()
  })
})
