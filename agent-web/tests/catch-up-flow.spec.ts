import { test, expect, type Page } from '@playwright/test'

/**
 * The RealAssist+ "Catch Up" AI daily-briefing flow — agent-initiated, single-shot:
 *
 *   0. "Catch Up" capability      → the thread titles "Catch Up", a three-state processing
 *                                    stream runs, then the tools collapse to "Used 19 tools".
 *   1. Briefing                   → the "Catch Up Summary" header with the tier counts, the
 *                                    priority tiers (CRITICAL / IMPORTANT / FYI) with per-client
 *                                    items, and embedded tour cards. Ends with "Completed".
 *   2. Action picker              → radio options generated from the CRITICAL/IMPORTANT items,
 *                                    a free-text hint, and a Skip button.
 *   3. Execute                    → picking "Send tour confirmation to …" sends the drafted
 *                                    message (Sending message… → ✓ Message sent).
 *
 * The responder is the local rule-based stand-in, so the copy is deterministic. The briefing
 * and picker reveal after the processing stream, so the assertions wait on their content.
 */

const fab = (page: Page) => page.locator('button:has(.ra-fab)')

/** The chat transcript. */
const transcript = (page: Page) => page.locator('.ra-scroll')

test.describe('RealAssist+ Catch Up daily-briefing flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/?view=home')
    await fab(page).click()
    await expect(page.getByRole('button', { name: 'Close panel' })).toBeVisible()
  })

  test('the Catch Up capability runs the briefing and ends on the action picker', async ({
    page,
  }) => {
    await page.getByRole('button', { name: /Catch Up/ }).click()

    // The data-gathering steps collapse into a single "Used 19 tools" summary.
    await expect(transcript(page).getByRole('button', { name: /Used 19 tools/ })).toBeVisible()

    // The summary header carries the analysed count and the per-tier tallies.
    await expect(transcript(page).getByText('Catch Up Summary')).toBeVisible()
    await expect(
      transcript(page).getByText(/Analyzed 5 clients — 🔥 2 critical \| ⚠️ 1 important \| ℹ️ 2 FYI/)
    ).toBeVisible()

    // The priority tiers.
    await expect(transcript(page).getByText('🔥 CRITICAL (Handle Now)')).toBeVisible()
    await expect(transcript(page).getByText('⚠️ IMPORTANT')).toBeVisible()
    await expect(transcript(page).getByText('ℹ️ FYI (No action needed)')).toBeVisible()

    // The imminent, still-unconfirmed tour is the top critical item, with its tour card.
    await expect(
      transcript(page).getByText(/tour is 5 days out and still unconfirmed/)
    ).toBeVisible()
    await expect(transcript(page).getByText('Tour Priyanka Raman')).toBeVisible()
    await expect(transcript(page).getByText('Sun, Aug 9 | 2:30 PM')).toBeVisible()

    // The turn ends with the "Completed" marker and the action picker.
    await expect(transcript(page).getByText('Completed', { exact: true }).first()).toBeVisible()
    await expect(
      transcript(page).getByText('Which actions would you like me to take?')
    ).toBeVisible()
    await expect(
      transcript(page).getByRole('button', { name: 'Send tour confirmation to Priyanka Raman' })
    ).toBeVisible()
    await expect(
      transcript(page).getByRole('button', { name: 'Send re-invite to Erik and Nina' })
    ).toBeVisible()
  })

  test('the thread titles "Catch Up"', async ({ page }) => {
    await page.getByRole('button', { name: /Catch Up/ }).click()
    await expect(transcript(page).getByText('Catch Up Summary')).toBeVisible()

    await page.getByRole('button', { name: 'Open threads' }).click()
    await expect(page.getByText('Catch Up', { exact: true }).first()).toBeVisible()
  })

  test('the collapsed tool group expands to show the 19 steps', async ({ page }) => {
    await page.getByRole('button', { name: /Catch Up/ }).click()
    const used = transcript(page).getByRole('button', { name: /Used 19 tools/ })
    await expect(used).toBeVisible()

    // The friendly-labelled steps are collapsed until the summary is expanded.
    await expect(transcript(page).getByText('✓ Grabbed conversation context')).toHaveCount(0)
    await used.click()
    await expect(transcript(page).getByText('✓ Grabbed conversation context')).toBeVisible()
    await expect(transcript(page).getByText('✓ Got your groups')).toBeVisible()
  })

  test('picking a send action sends the drafted message', async ({ page }) => {
    await page.getByRole('button', { name: /Catch Up/ }).click()
    const option = transcript(page).getByRole('button', {
      name: 'Send tour confirmation to Priyanka Raman',
    })
    await expect(option).toBeVisible()
    await option.click()

    await expect(transcript(page).getByText('✓ Message sent')).toBeVisible()
    await expect(transcript(page).getByText(/Sent to Priyanka Raman/)).toBeVisible()
  })
})
