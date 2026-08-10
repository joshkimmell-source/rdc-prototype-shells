import { test, expect, type Page } from '@playwright/test'

/**
 * The RealAssist+ tour-coordination flow, a faithful reproduction of the design
 * walkthrough, centred on an existing client — Jordan & Mia Castellanos (`cli_02`), the
 * busiest active client and the one carrying the sample dataset's richest upcoming tour
 * (`tour_01`, Aug 15, three stops).
 *
 * "Plan a tour" pulls their saved listings (tool trace → selection card → plan table with
 * the "A few things to note" caveats) and asks for a start time. A bare time reply builds
 * the full coordination plan — the Tour Timeline, the per-agent Showing Requirements &
 * Outreach drafts, and the Potential Conflicts / Recommended Next Steps summary. "Pick a
 * date" hands off to a calendar, and picking a day schedules the tour, ending on the
 * Upcoming Tour panel.
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

/**
 * Send a message through the composer. On the home state the composer leads with the
 * "How can I help you today?" placeholder; once a conversation is under way it drops to the
 * foot of the panel with a different placeholder — so both are accepted.
 */
async function ask(page: Page, text: string) {
  const home = page.getByPlaceholder('How can I help you today?')
  const input = (await home.count()) ? home : page.getByPlaceholder('Ask about clients, tours, or listings')
  await input.fill(text)
  await input.press('Enter')
}

test.describe('RealAssist+ tour-coordination flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/?view=home')
    await fab(page).click()
    await expect(page.getByRole('button', { name: 'Close panel' })).toBeVisible()
  })

  test('the Coordinate Tour capability plans the tour for the featured client', async ({ page }) => {
    // The home state lists what RealAssist+ can do; "Coordinate Tour" kicks the flow off,
    // sending the prompt that names Jordan and Mia, the flow's client.
    const card = page.getByRole('button', { name: /Coordinate Tour/ })
    await expect(card).toBeVisible()
    await card.click()

    // The plan card leads with its heading and lays out all three real stops in tour order.
    // Each address appears in the plan table and again in a "note" caveat below it, so
    // match the first occurrence.
    await expect(transcript(page).getByText('Tour plan for Jordan and Mia')).toBeVisible()
    await expect(transcript(page).getByText('195 Stanton Way', { exact: true }).first()).toBeVisible()
    await expect(transcript(page).getByText('1678 Wallace Ave', { exact: true }).first()).toBeVisible()
    await expect(transcript(page).getByText('3975 Turnley Ct', { exact: true }).first()).toBeVisible()

    // The plan asks for a start time — the design's exact next-step prompt.
    await expect(transcript(page).getByText(/What time would you like to start the tour/)).toBeVisible()
  })

  test('a start time builds the timeline, outreach drafts, and the conflicts summary', async ({ page }) => {
    await ask(page, 'Plan a tour for Jordan and Mia')
    await expect(transcript(page).getByText('Tour plan for Jordan and Mia')).toBeVisible()

    // A bare time reply is acknowledged and expands into the full coordination plan.
    await ask(page, '10:00 AM')
    await expect(transcript(page).getByText(/Got it — 10:00 AM start time/)).toBeVisible()

    // The three coordination sections, headed verbatim as in the design.
    await expect(transcript(page).getByText(/Tour Timeline —/)).toBeVisible()
    await expect(transcript(page).getByText(/Showing Requirements & Outreach/)).toBeVisible()
    await expect(transcript(page).getByText('Potential Conflicts', { exact: false })).toBeVisible()
    await expect(transcript(page).getByText(/Recommended Next Steps/)).toBeVisible()

    // The outreach drafts carry the invented listing-agent contacts for the real stops.
    await expect(transcript(page).getByText('Elena Marsh (Summit Grove Realty)')).toBeVisible()
  })

  test('picking a date schedules the tour and shows the upcoming-tour panel', async ({ page }) => {
    await ask(page, 'Plan a tour for Jordan and Mia')
    // Wait for the plan to land before replying, or the second message is dropped while busy.
    await expect(transcript(page).getByText('Tour plan for Jordan and Mia')).toBeVisible()
    await ask(page, '10:00 AM')

    // "Pick a date" is unique to the summary card — it hands off to the calendar, opened
    // on the tour's month.
    const pick = page.getByRole('button', { name: 'Pick a date' })
    await expect(pick).toBeVisible()
    await pick.click()
    await expect(transcript(page).getByText('Pick a day for the tour')).toBeVisible()
    await expect(transcript(page).getByText('August 2026')).toBeVisible()

    // Pick the pre-highlighted best-fit day — the tour's own date, Aug 15 (a Saturday).
    // Exact, so the day cell isn't confused with a threads-dock row carrying the same date.
    await page.getByRole('button', { name: 'Sat, Aug 15', exact: true }).click()

    // That schedules the tour — the Upcoming Tour panel lands in the transcript.
    await expect(transcript(page).getByText(/Upcoming Tour –/)).toBeVisible()
    await expect(transcript(page).getByText('Completed', { exact: true })).toBeVisible()
  })
})
