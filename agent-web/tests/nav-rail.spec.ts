import { test, expect } from '@playwright/test'

/**
 * The nav rail is static: a fixed-width column that always shows every destination as an
 * icon over its label, and does not expand on hover (the behaviour it used to have). These
 * tests pin that contract — a regression to the old hover-expand rail would trip them.
 */

const DESKTOP = { width: 1280, height: 900 }

test.describe('static nav rail', () => {
  test.use({ viewport: DESKTOP })

  test('shows every destination as icon over label', async ({ page }) => {
    await page.goto('/')
    const rail = page.getByRole('navigation', { name: 'Main' })
    await expect(rail).toBeVisible()

    // Home is intentionally absent — Clients is the landing screen.
    await expect(rail.getByText('Home', { exact: true })).toHaveCount(0)
    for (const label of ['Clients', 'Search', 'Tours', 'Support', 'Alerts', 'Chat']) {
      await expect(rail.getByText(label, { exact: true })).toBeVisible()
    }
    // Account is the footer identity cell, with the agent headshot beside its label.
    await expect(rail.getByText('Account', { exact: true })).toBeVisible()
    await expect(rail.getByRole('img', { name: /booth/i })).toBeVisible()
  })

  test('marks the active destination and follows navigation', async ({ page }) => {
    await page.goto('/')
    const rail = page.getByRole('navigation', { name: 'Main' })

    // Clients is the default landing destination.
    await expect(rail.getByRole('button', { name: 'Clients' })).toHaveAttribute(
      'aria-current',
      'page'
    )

    await rail.getByRole('button', { name: 'Tours' }).click()
    await expect(rail.getByRole('button', { name: 'Tours' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    await expect(rail.getByRole('button', { name: 'Clients' })).not.toHaveAttribute(
      'aria-current',
      'page'
    )
  })

  test('is 64px wide', async ({ page }) => {
    await page.goto('/?view=home')
    const rail = page.getByRole('navigation', { name: 'Main' })
    // The rail's fixed column: 64px including its 1px right border.
    expect(Math.round((await rail.boundingBox())!.width)).toBe(64)
  })

  test('does not widen on hover', async ({ page }) => {
    await page.goto('/?view=home')
    const rail = page.getByRole('navigation', { name: 'Main' })

    const before = (await rail.boundingBox())!.width
    await rail.hover()
    // Give any (unwanted) width transition time to run.
    await page.waitForTimeout(400)
    const after = (await rail.boundingBox())!.width

    expect(after).toBe(before)
  })
})

/**
 * The account headshot is shared between the desktop rail and the mobile tab bar — the same
 * photo, keyed off the agent's name as its alt text — so the two navs cannot show a different
 * identity. Below 768px the shell swaps the rail for the footer `NavBar`.
 */
test('mobile Account tab shows the same shared headshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await page.goto('/?view=home')
  const bar = page.getByRole('navigation', { name: 'Main' })
  await expect(bar).toBeVisible()
  await expect(bar.getByText('Account', { exact: true })).toBeVisible()
  // The headshot, not just initials — the same image the rail renders.
  await expect(bar.getByRole('img', { name: /booth/i })).toBeVisible()
})
