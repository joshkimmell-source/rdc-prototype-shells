import { test, expect, type Page } from '@playwright/test'

/**
 * The RealAssist+ tour-coordination flow, now broken into a stepwise, question-driven
 * sequence centred on an existing client — Jordan & Mia Castellanos (`cli_02`), the busiest
 * active client, carrying the sample dataset's richest upcoming tour (`tour_01`, Aug 15,
 * three stops).
 *
 * The flow:
 *   1. "Create a tour"                → "I can do that." + a client picker.
 *   2. Pick a client                  → "Okay, I'll coordinate a tour for …" + how to select
 *                                        listings (only "Choose the top 3" is wired; the other
 *                                        two are disabled "Coming soon" rows).
 *   3. "Choose the top 3"             → the coordinated tour with NO times or dates: the tool
 *                                        trace, the saved-listing selection, and the plan table.
 *   4. "Choose a date & start time"  → a calendar + start-time chips.
 *   5. Build the plan                 → the Tour Timeline, per-agent Outreach, and the
 *                                        Conflicts / Next Steps summary.
 *   6. "Confirm & schedule"          → the Upcoming Tour panel; the tour is on the calendar.
 *
 * The responder is the local rule-based stand-in (no `window.claude`), so the cards and copy
 * are deterministic and can be asserted directly.
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

/**
 * The Jordan & Mia chip in the client picker. Scoped by its "saved homes" meta so it can't be
 * confused with the threads-dock rows titled "Tour plan for Jordan & Mia Castellanos".
 */
const clientChip = (page: Page) =>
  transcript(page).getByRole('button').filter({ hasText: 'Jordan & Mia Castellanos' }).filter({ hasText: 'saved homes' })

test.describe('RealAssist+ stepwise tour-coordination flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/?view=home')
    await fab(page).click()
    await expect(page.getByRole('button', { name: 'Close panel' })).toBeVisible()
  })

  test('the Coordinate Tour capability opens the client picker', async ({ page }) => {
    // "Coordinate Tour" kicks the flow off with a bare "Create a tour" — no client yet.
    const card = page.getByRole('button', { name: /Coordinate Tour/ })
    await expect(card).toBeVisible()
    await card.click()

    // The acknowledgement leads, then the picker asks who the tour is for and lists the
    // clients who have saved listings to tour — Jordan & Mia among them.
    await expect(transcript(page).getByText('I can do that.', { exact: true })).toBeVisible()
    await expect(transcript(page).getByText('For whom do you wish to coordinate a tour?')).toBeVisible()
    await expect(clientChip(page)).toBeVisible()
  })

  test('picking a client offers the listing-selection methods, only top-3 wired', async ({ page }) => {
    await ask(page, 'Create a tour')
    const pick = clientChip(page)
    await expect(pick).toBeVisible()
    await pick.click()

    // The acknowledgement names the chosen client, then the method question lands.
    await expect(transcript(page).getByText("Okay, I'll coordinate a tour for Jordan and Mia.")).toBeVisible()
    await expect(transcript(page).getByText('How would you like to select listings?')).toBeVisible()

    // Only "Choose the top 3" is a live button; the other two are disabled "Coming soon".
    await expect(transcript(page).getByRole('button', { name: /Choose the top 3 listings/ })).toBeVisible()
    await expect(transcript(page).getByText('Coming soon').first()).toBeVisible()
    // The disabled methods render as non-button rows, so they can't be clicked.
    await expect(transcript(page).getByRole('button', { name: /Choose from a list/ })).toHaveCount(0)
  })

  test('choosing the top 3 shows the coordinated tour with no times or dates', async ({ page }) => {
    await ask(page, 'Choose the top 3 listings for Jordan and Mia')

    // The plan card leads with its heading and lays out all three real stops in tour order.
    // Each address appears in the plan table and again in a "note" caveat below it, so match
    // the first occurrence.
    await expect(transcript(page).getByText('Tour plan for Jordan and Mia')).toBeVisible()
    await expect(transcript(page).getByText('195 Stanton Way', { exact: true }).first()).toBeVisible()
    await expect(transcript(page).getByText('1678 Wallace Ave', { exact: true }).first()).toBeVisible()
    await expect(transcript(page).getByText('3975 Turnley Ct', { exact: true }).first()).toBeVisible()

    // No schedule table yet — the plan is timeless. The next step is offered as a CTA.
    await expect(transcript(page).getByText(/no times locked in yet/)).toBeVisible()
    await expect(transcript(page).getByRole('button', { name: /Choose a date & start time/ })).toBeVisible()
  })

  test('the date & time picker builds the full coordination plan', async ({ page }) => {
    await ask(page, 'Choose the top 3 listings for Jordan and Mia')
    const cta = transcript(page).getByRole('button', { name: /Choose a date & start time/ })
    await expect(cta).toBeVisible()
    await cta.click()

    // The calendar opens on the tour month with start-time chips.
    await expect(transcript(page).getByText('Choose a date and start time', { exact: true })).toBeVisible()
    await expect(transcript(page).getByText('August 2026')).toBeVisible()

    // Pick the pre-highlighted best-fit day (Aug 15) and a start time, then build.
    await transcript(page).getByRole('button', { name: 'Sat, Aug 15', exact: true }).click()
    await transcript(page).getByRole('button', { name: '10:00 AM', exact: true }).click()
    await transcript(page).getByRole('button', { name: /Build the plan/ }).click()

    // The acknowledgement carries the chosen day and time, then the three coordination
    // sections land, headed verbatim as in the design.
    await expect(transcript(page).getByText(/Got it — Sat, Aug 15 at 10:00 AM start time/)).toBeVisible()
    await expect(transcript(page).getByText(/Tour Timeline —/)).toBeVisible()
    await expect(transcript(page).getByText(/Showing Requirements & Outreach/)).toBeVisible()
    await expect(transcript(page).getByText('Potential Conflicts', { exact: false })).toBeVisible()
    await expect(transcript(page).getByText(/Recommended Next Steps/)).toBeVisible()

    // The outreach drafts carry the invented listing-agent contacts for the real stops.
    await expect(transcript(page).getByText('Elena Marsh (Summit Grove Realty)')).toBeVisible()
  })

  test('confirming schedules the tour and shows the upcoming-tour panel', async ({ page }) => {
    await ask(page, 'Choose the top 3 listings for Jordan and Mia')
    const cta = transcript(page).getByRole('button', { name: /Choose a date & start time/ })
    await expect(cta).toBeVisible()
    await cta.click()
    // No day/time picked — "Build the plan" defaults to the suggested day and slot.
    await transcript(page).getByRole('button', { name: /Build the plan/ }).click()

    // "Confirm & schedule" on the summary card books the tour.
    const confirm = page.getByRole('button', { name: /Confirm & schedule/ })
    await expect(confirm).toBeVisible()
    await confirm.click()

    await expect(transcript(page).getByText(/Upcoming Tour –/)).toBeVisible()
    await expect(transcript(page).getByText('Completed', { exact: true })).toBeVisible()
  })
})
