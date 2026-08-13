import { test, expect, type Page } from '@playwright/test'

/**
 * The RealAssist+ "Search Optimization" AI flow — agent-initiated, client-scoped:
 *
 *   0. "Search Optimization" capability → the thread titles "Search Optimization", the assistant
 *                                         greets and asks which client to analyze.
 *   1. Client picker                    → the "Select group" card: one row per client and a
 *                                         Skip button.
 *   2. Pick a client                    → the chosen client chips in, two rounds of tool-gathering
 *                                         stream and collapse ("Used 7 tools", then "Used 4 tools").
 *   3. Analysis report                  → the "✅ Search Optimization Analysis" header, the confidence
 *                                         tag and activity stats, the current search, the changes table,
 *                                         evidence-cited rationale, and the caveat. Ends "Completed".
 *   4. Action picker                    → "What would you like to do?" with the four branches, a
 *                                         free-text hint, and Skip. Picking "Apply all suggestions"
 *                                         updates the saved search.
 *
 * The responder is the local rule-based stand-in, so the copy is deterministic. States 2–6 land in
 * one turn and reveal on a stagger, so the post-stream assertions wait on their content.
 */

const fab = (page: Page) => page.locator('button:has(.ra-fab)')

/** The chat transcript. */
const transcript = (page: Page) => page.locator('.ra-scroll')

/** Run the flow up to the analysis report, for the client Jordan & Mia Castellanos (cli_02). */
async function runToAnalysis(page: Page) {
  await page.getByRole('button', { name: /Search Optimization/ }).click()
  await expect(
    transcript(page).getByText(/Which client would you like me to analyze for search optimization/)
  ).toBeVisible()
  await transcript(page).getByRole('button', { name: /Jordan & Mia Castellanos.*Last seen/ }).click()
}

test.describe('RealAssist+ Search Optimization flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/?view=home')
    await fab(page).click()
    await expect(page.getByRole('button', { name: 'Close panel' })).toBeVisible()
  })

  test('the capability greets and offers the client picker', async ({ page }) => {
    await page.getByRole('button', { name: /Search Optimization/ }).click()

    await expect(
      transcript(page).getByText(/I'm ready to help optimize a client's saved search/)
    ).toBeVisible()
    await expect(transcript(page).getByText('Select group')).toBeVisible()
    await expect(
      transcript(page).getByRole('button', { name: /Jordan & Mia Castellanos.*Last seen/ })
    ).toBeVisible()
    await expect(transcript(page).getByRole('button', { name: 'Skip' })).toBeVisible()
  })

  test('the thread titles "Search Optimization" on entry', async ({ page }) => {
    await page.getByRole('button', { name: /Search Optimization/ }).click()
    await expect(transcript(page).getByText('Select group')).toBeVisible()

    await page.getByRole('button', { name: 'Open threads' }).click()
    await expect(page.getByText('Search Optimization', { exact: true }).first()).toBeVisible()
  })

  test('the thread renames after the analysis', async ({ page }) => {
    await runToAnalysis(page)
    await expect(transcript(page).getByText('✅ Search Optimization Analysis')).toBeVisible()

    await page.getByRole('button', { name: 'Open threads' }).click()
    await expect(
      page.getByText("Jordan & Mia's Search Needs Realignment", { exact: true }).first()
    ).toBeVisible()
  })

  test('picking a client removes the selection prompt from history', async ({ page }) => {
    await page.getByRole('button', { name: /Search Optimization/ }).click()
    await expect(transcript(page).getByText('Select group')).toBeVisible()
    await transcript(page).getByRole('button', { name: /Jordan & Mia Castellanos.*Last seen/ }).click()

    // Once answered, the picker is consumed so the choice can't be revisited.
    await expect(transcript(page).getByText('Select group')).toHaveCount(0)
    await expect(
      transcript(page).getByRole('button', { name: /Priyanka Raman.*Last seen/ })
    ).toHaveCount(0)
  })

  test('picking a client runs two tool rounds and lands the analysis report', async ({ page }) => {
    await runToAnalysis(page)

    // The two data-gathering rounds collapse to their tool-count summaries.
    await expect(transcript(page).getByRole('button', { name: /Used 7 tools/ })).toBeVisible()
    await expect(transcript(page).getByRole('button', { name: /Used 4 tools/ })).toBeVisible()

    // The report header, the confidence tag, the stat strip, and the current search.
    await expect(transcript(page).getByText('✅ Search Optimization Analysis')).toBeVisible()
    await expect(transcript(page).getByText(/Confidence:\s*Medium \(68%\)/)).toBeVisible()
    await expect(transcript(page).getByText('Analysis period')).toBeVisible()
    await expect(transcript(page).getByText(/^\d+ days$/)).toBeVisible()
    await expect(transcript(page).getByText('Views')).toBeVisible()
    await expect(transcript(page).getByText('Saves')).toBeVisible()
    await expect(transcript(page).getByText('Past stops')).toBeVisible()
    await expect(transcript(page).getByText('Upcoming stops')).toBeVisible()
    await expect(transcript(page).getByText(/Family homes near parks/)).toBeVisible()

    // The recommended changes — location, price, property type.
    await expect(transcript(page).getByText('📊 RECOMMENDED CHANGES')).toBeVisible()
    await expect(transcript(page).getByText('Maple Heights only')).toBeVisible()
    await expect(transcript(page).getByText(/Add Summit Grove, Old Quarter, Cedar Vale/)).toBeVisible()
    await expect(transcript(page).getByText('up to $1.2M')).toBeVisible()

    // Evidence-cited rationale.
    await expect(transcript(page).getByText(/195 Stanton Way is a stop at \$1,125,000/)).toBeVisible()

    // The turn ends with the "Completed" marker and the action picker.
    await expect(transcript(page).getByText('Completed', { exact: true }).first()).toBeVisible()
    await expect(transcript(page).getByText('What would you like to do?')).toBeVisible()
    await expect(
      transcript(page).getByRole('button', { name: 'Apply all suggestions' })
    ).toBeVisible()
  })

  test('the collapsed first tool round expands to its seven steps', async ({ page }) => {
    await runToAnalysis(page)
    const used = transcript(page).getByRole('button', { name: /Used 7 tools/ })
    await expect(used).toBeVisible()

    await expect(transcript(page).getByText('✓ Grabbed listings in the feed for this group')).toHaveCount(0)
    await used.click()
    await expect(transcript(page).getByText('✓ Grabbed listings in the feed for this group')).toBeVisible()
    await expect(transcript(page).getByText('✓ Pulled up saved searches')).toBeVisible()
  })

  test('picking "Apply all suggestions" updates the saved search', async ({ page }) => {
    await runToAnalysis(page)
    const apply = transcript(page).getByRole('button', { name: 'Apply all suggestions' })
    await expect(apply).toBeVisible()
    await apply.click()

    await expect(transcript(page).getByText('✓ Ran update_saved_search')).toBeVisible()
    await expect(
      transcript(page).getByText(/Done — I've updated “Family homes near parks”/)
    ).toBeVisible()
  })
})
