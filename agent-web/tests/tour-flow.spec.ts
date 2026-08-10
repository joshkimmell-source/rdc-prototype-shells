import { test, expect, type Page } from '@playwright/test'

/**
 * The RealAssist+ tour-planning flow, centred on an existing client — Jordan & Mia
 * Castellanos (`cli_02`), the busiest active client and the one carrying the sample
 * dataset's richest upcoming tour (`tour_01`, Aug 15, three stops). "Plan a tour"
 * assembles that tour as a plan card — the ordered stops, the conflicts read off the
 * stops' statuses, and the ranked next steps — then "Start the tour" hands off to a
 * calendar, and picking a day schedules it.
 *
 * The responder is the local rule-based stand-in (no `window.claude`), so the cards and
 * copy are deterministic and can be asserted directly.
 */

const fab = (page: Page) => page.locator('button:has(.ra-fab)')

/**
 * The chat transcript. Scoped to, because the threads dock carries rows titled "Tour plan
 * for <client>" that would otherwise collide with the plan card's own heading.
 */
const transcript = (page: Page) => page.locator('.ra-scroll')

/** Open the panel and send a message through the composer. */
async function ask(page: Page, text: string) {
  const input = page.getByPlaceholder('Ask about clients, tours, or listings')
  await input.fill(text)
  await input.press('Enter')
}

test.describe('RealAssist+ tour-planning flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/?view=home')
    await fab(page).click()
    await expect(page.getByRole('button', { name: 'Close panel' })).toBeVisible()
  })

  test('a starter chip plans the tour for the featured client', async ({ page }) => {
    // The first chip kicks the flow off — it names Jordan and Mia, the flow's client.
    const chip = page.getByRole('button', { name: /Plan a tour for Jordan and Mia/ })
    await expect(chip).toBeVisible()
    await chip.click()

    // The plan card lays out all three real stops in tour order, and carries the
    // "Start the tour" control that is unique to it.
    // Exact — an address also appears inside a conflict sentence below the table.
    await expect(transcript(page).getByText('195 Stanton Way', { exact: true })).toBeVisible()
    await expect(transcript(page).getByText('1678 Wallace Ave', { exact: true })).toBeVisible()
    await expect(transcript(page).getByText('3975 Turnley Ct', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Start the tour' })).toBeVisible()
  })

  test('the plan surfaces conflicts and ranked next steps', async ({ page }) => {
    await ask(page, 'Plan a tour for Jordan and Mia')

    // The tour has two unconfirmed stops, so both sections are present.
    await expect(page.getByText('POTENTIAL CONFLICTS')).toBeVisible()
    await expect(page.getByText('RECOMMENDED NEXT STEPS')).toBeVisible()

    // The stops' statuses come straight from the dataset: one Confirmed, one Requested.
    await expect(page.getByText('Confirmed').first()).toBeVisible()
    await expect(page.getByText('Requested').first()).toBeVisible()
  })

  test('starting the tour opens a calendar, and a day schedules it', async ({ page }) => {
    await ask(page, 'Plan a tour for Jordan and Mia')

    // "Start the tour" is unique to the plan card — its presence confirms the card rendered,
    // and it hands off to the date picker, opened on the tour's month.
    const start = page.getByRole('button', { name: 'Start the tour' })
    await expect(start).toBeVisible()
    await start.click()
    await expect(page.getByText('Pick a day for the tour')).toBeVisible()
    await expect(page.getByText('August 2026')).toBeVisible()

    // Pick the pre-highlighted best-fit day (the tour's own date, Aug 15). Exact, so the
    // day cell isn't confused with a threads-dock row that carries the same date string.
    await page.getByRole('button', { name: 'Sat, Aug 15', exact: true }).click()

    // That schedules the tour — a confirmation tour card lands in the transcript.
    await expect(page.getByText('Invite sent')).toBeVisible()
  })
})
