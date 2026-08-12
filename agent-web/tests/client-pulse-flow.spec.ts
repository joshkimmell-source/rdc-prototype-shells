import { test, expect, type Page } from '@playwright/test'

/**
 * The RealAssist+ "Client Pulse" AI flow — agent-initiated, single-group scoped:
 *
 *   0. "Client Pulse" capability → the thread titles "Client Pulse", the assistant asks which
 *                                  client to analyze and shows the "Select group" picker.
 *   1. Client picker             → one row per client and a Skip button.
 *   2. Pick a client            → the chosen client chips in, a data-gathering pass streams and
 *                                  collapses ("Used 12 tools" for the two-saved-search client).
 *   3. Pulse report             → the "👥 {client}" header, the confidence tag, the client
 *                                  profile, the intent read and headline, the activity table,
 *                                  members + saved searches, deep-linked top interests, the
 *                                  prioritized suggested actions with a ready-to-send draft, and
 *                                  the embedded tour card. Ends "Completed".
 *   4. Action picker            → "What would you like to do?" with the branches and Skip.
 *
 * The responder is the local rule-based stand-in, so the copy is deterministic. The report and
 * picker land in one turn on a stagger, so the post-stream assertions wait on their content.
 * The featured client is Jordan & Mia Castellanos (cli_02): two saved searches and a Saturday
 * tour with 2 of 3 stops unconfirmed.
 */

const fab = (page: Page) => page.locator('button:has(.ra-fab)')

/** The chat transcript. */
const transcript = (page: Page) => page.locator('.ra-scroll')

/** Run the flow up to the pulse report, for the client Jordan & Mia Castellanos (cli_02). */
async function runToReport(page: Page) {
  await page.getByRole('button', { name: /Client Pulse/ }).click()
  await expect(transcript(page).getByText('Which client would you like to analyze?')).toBeVisible()
  await transcript(page).getByRole('button', { name: /Jordan & Mia Castellanos.*Last seen/ }).click()
}

test.describe('RealAssist+ Client Pulse flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/?view=home')
    await fab(page).click()
    await expect(page.getByRole('button', { name: 'Close panel' })).toBeVisible()
  })

  test('the capability asks which client and offers the picker', async ({ page }) => {
    await page.getByRole('button', { name: /Client Pulse/ }).click()

    await expect(transcript(page).getByText('Which client would you like to analyze?')).toBeVisible()
    await expect(transcript(page).getByText('Select group')).toBeVisible()
    await expect(
      transcript(page).getByRole('button', { name: /Jordan & Mia Castellanos.*Last seen/ })
    ).toBeVisible()
    await expect(transcript(page).getByRole('button', { name: 'Skip' })).toBeVisible()
  })

  test('the thread titles "Client Pulse" on entry', async ({ page }) => {
    await page.getByRole('button', { name: /Client Pulse/ }).click()
    await expect(transcript(page).getByText('Select group')).toBeVisible()

    await page.getByRole('button', { name: 'Open threads' }).click()
    await expect(page.getByText('Client Pulse', { exact: true }).first()).toBeVisible()
  })

  test('the thread renames after the report', async ({ page }) => {
    await runToReport(page)
    await expect(transcript(page).getByText('📊 ACTIVITY SUMMARY')).toBeVisible()

    await page.getByRole('button', { name: 'Open threads' }).click()
    await expect(
      page.getByText("Jordan & Mia's Tour Needs Confirmation", { exact: true }).first()
    ).toBeVisible()
  })

  test('picking a client removes the selection prompt from history', async ({ page }) => {
    await page.getByRole('button', { name: /Client Pulse/ }).click()
    await expect(transcript(page).getByText('Select group')).toBeVisible()
    await transcript(page).getByRole('button', { name: /Jordan & Mia Castellanos.*Last seen/ }).click()

    // Once answered, the picker is consumed so the choice can't be revisited.
    await expect(transcript(page).getByText('Select group')).toHaveCount(0)
    await expect(
      transcript(page).getByRole('button', { name: /Priyanka Raman.*Last seen/ })
    ).toHaveCount(0)
  })

  test('picking a client gathers data and lands the pulse report', async ({ page }) => {
    await runToReport(page)

    // The data-gathering pass collapses to its tool-count summary (10 fixed + 2 saved searches).
    await expect(transcript(page).getByRole('button', { name: /Used 12 tools/ })).toBeVisible()

    // The report header, the confidence tag, and the "client since" line.
    await expect(transcript(page).getByText(/👥 Jordan & Mia Castellanos/)).toBeVisible()
    await expect(transcript(page).getByText(/Confidence:\s*Medium \(72%\)/)).toBeVisible()
    await expect(transcript(page).getByText(/Client since:.*\(\d+ days\)/)).toBeVisible()

    // The intent read and the headline insight.
    await expect(transcript(page).getByText(/High intent/)).toBeVisible()
    await expect(transcript(page).getByText(/2 of 3 stops unconfirmed/)).toBeVisible()

    // The activity table and its metrics.
    await expect(transcript(page).getByText('📊 ACTIVITY SUMMARY')).toBeVisible()
    await expect(transcript(page).getByText('Properties viewed')).toBeVisible()
    await expect(transcript(page).getByText('Tours scheduled')).toBeVisible()

    // Members and saved searches.
    await expect(transcript(page).getByText(/Jordan Castellanos, Mia Castellanos/)).toBeVisible()
    await expect(transcript(page).getByText(/Family homes near parks/).first()).toBeVisible()

    // Top interests — a clickable deep link to a real listing.
    await expect(transcript(page).getByText('🔍 TOP INTERESTS')).toBeVisible()
    await expect(transcript(page).getByRole('link', { name: '195 Stanton Way' })).toBeVisible()

    // Suggested actions — the top one is URGENT and carries a ready-to-send draft.
    await expect(transcript(page).getByText('💡 SUGGESTED ACTIONS')).toBeVisible()
    await expect(transcript(page).getByText('URGENT')).toBeVisible()
    await expect(transcript(page).getByText('Ready to send:')).toBeVisible()

    // The embedded tour card.
    await expect(transcript(page).getByText('Tour Jordan & Mia Castellanos')).toBeVisible()

    // The turn ends with the "Completed" marker and the action picker.
    await expect(transcript(page).getByText('Completed', { exact: true }).first()).toBeVisible()
    await expect(transcript(page).getByText('What would you like to do?')).toBeVisible()
    await expect(
      transcript(page).getByRole('button', { name: 'Draft a follow-up message (confirm tour attendance)' })
    ).toBeVisible()
  })

  test('the collapsed tool round expands to its steps', async ({ page }) => {
    await runToReport(page)
    const used = transcript(page).getByRole('button', { name: /Used 12 tools/ })
    await expect(used).toBeVisible()

    await expect(transcript(page).getByText('✓ Loaded upcoming tour schedule')).toHaveCount(0)
    await used.click()
    await expect(transcript(page).getByText('✓ Loaded upcoming tour schedule')).toBeVisible()
    await expect(transcript(page).getByText('✓ Ran get_search_details').first()).toBeVisible()
  })

  test('picking "Draft a follow-up message" offers a sendable draft', async ({ page }) => {
    await runToReport(page)
    const draft = transcript(page).getByRole('button', {
      name: 'Draft a follow-up message (confirm tour attendance)',
    })
    await expect(draft).toBeVisible()
    await draft.click()

    // The composed draft comes back with a Send button.
    await expect(transcript(page).getByText(/Here's a draft for Jordan and Mia/)).toBeVisible()
    const send = transcript(page).getByRole('button', { name: 'Send this message' })
    await expect(send).toBeVisible()
    await send.click()

    await expect(transcript(page).getByText('✓ Message sent')).toBeVisible()
    await expect(transcript(page).getByText(/Sent to Jordan & Mia Castellanos/)).toBeVisible()
  })
})
