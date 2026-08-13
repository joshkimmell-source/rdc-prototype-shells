import { test, expect, type Page } from '@playwright/test'

/**
 * The RealAssist+ "Add Client" onboarding flow — a chat-driven, multi-turn sequence that
 * collects the client's people and search preferences, then runs the backend tool stubs:
 *
 *   0. "Add Client" capability          → State 1: "Let's get your new client set up!"
 *   1. Contact details                  → create_group (Churning the data… → ✓ Created a new
 *                                          group), the thread title updates, the group-ready
 *                                          message, and a "Completed" turn marker.
 *   2. Free-text preferences            → save_group_context (✓ Saved group information) and
 *                                          the parsed criteria echoed back.
 *   3. Location + sale/rental           → the five search tools, shown collapsed as "Used 5
 *                                          tools", then the finalized search for confirmation.
 *   4. "Create this search"             → create_saved_search (✓ Ran create_saved_search) and
 *                                          the final summary with next-step suggestions.
 *
 * The responder is the local rule-based stand-in, so the copy is deterministic. Tool calls
 * animate from a processing label to a checkmarked line, so the assertions wait on the
 * resolved text.
 */

const fab = (page: Page) => page.locator('button:has(.ra-fab)')

/** The chat transcript. */
const transcript = (page: Page) => page.locator('.ra-scroll')

/**
 * Send a message through the composer — the home state leads with the "How can I help you
 * today?" placeholder, and a live conversation drops to a different one, so both are accepted.
 */
async function ask(page: Page, text: string) {
  const home = page.getByPlaceholder('How can I help you today?')
  const input = (await home.count()) ? home : page.getByPlaceholder('Ask about clients, tours, or listings')
  await input.fill(text)
  await input.press('Enter')
}

test.describe('RealAssist+ Add Client onboarding flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/?view=home')
    await fab(page).click()
    await expect(page.getByRole('button', { name: 'Close panel' })).toBeVisible()
  })

  test('the Add Client capability opens the onboarding flow', async ({ page }) => {
    await page.getByRole('button', { name: /Add Client/ }).click()
    await expect(transcript(page).getByText("Let's get your new client set up!")).toBeVisible()
    await expect(transcript(page).getByText(/Single buyer or co-buyers/)).toBeVisible()
  })

  test('the full flow creates a group, saves context, and creates a search', async ({ page }) => {
    await page.getByRole('button', { name: /Add Client/ }).click()
    await expect(transcript(page).getByText(/Single buyer or co-buyers/)).toBeVisible()

    // State 2 — the people are provided; the group is created.
    await ask(page, 'Dave Firenze, daveyf@email.com, 405-555-6594')
    await expect(transcript(page).getByText('Got it! Let me create the group for Dave.')).toBeVisible()
    await expect(transcript(page).getByText('✓ Created a new group')).toBeVisible()
    await expect(transcript(page).getByText(/Client group ready:/)).toBeVisible()
    await expect(
      transcript(page).getByText(/Dave Firenze \(daveyf@email.com, 405-555-6594\)/)
    ).toBeVisible()
    // Every working turn ends with the "Completed" marker.
    await expect(transcript(page).getByText('Completed', { exact: true }).first()).toBeVisible()

    // State 3 — free-text preferences are parsed into structured criteria.
    await ask(
      page,
      '2br/1b duplex or condo with pool access, walking distance from elementary school. Budget up to 600K. Move in within 3 months.'
    )
    await expect(transcript(page).getByText('✓ Saved group information')).toBeVisible()
    await expect(transcript(page).getByText(/Context saved\./)).toBeVisible()
    await expect(transcript(page).getByText(/Up to \$600,000/)).toBeVisible()

    // State 4 — location + sale/rental; the five tools run, then the search is presented.
    await ask(page, 'Sale. Berkeley, Oakland')
    await expect(transcript(page).getByText('Got it — sale in Berkeley & Oakland. Let me set up that search now.')).toBeVisible()
    await expect(transcript(page).getByText('Used 5 tools')).toBeVisible()
    await expect(transcript(page).getByText(/I have everything I need\./)).toBeVisible()
    await expect(transcript(page).getByText(/Berkeley & Oakland, CA/)).toBeVisible()

    // State 5 — confirm; the saved search is created and the summary lands.
    await transcript(page).getByRole('button', { name: 'Create this search' }).click()
    await expect(transcript(page).getByText('✓ Ran create_saved_search')).toBeVisible()
    await expect(transcript(page).getByText(/All set! Here's the summary:/)).toBeVisible()
    await expect(transcript(page).getByText(/Search created:/)).toBeVisible()
    await expect(transcript(page).getByRole('button', { name: 'Add another client' })).toBeVisible()
  })

  test('the thread title updates once the group is created', async ({ page }) => {
    await page.getByRole('button', { name: /Add Client/ }).click()
    await expect(transcript(page).getByText(/Single buyer or co-buyers/)).toBeVisible()
    await ask(page, 'Dave Firenze, daveyf@email.com, 405-555-6594')
    await expect(transcript(page).getByText('✓ Created a new group')).toBeVisible()

    // Open the threads dock; the active conversation now leads with its onboarding title.
    await page.getByRole('button', { name: 'Open threads' }).click()
    await expect(page.getByText('Onboarding Dave Firenze as New Client').first()).toBeVisible()
  })

  test('the collapsed tool group expands to show each tool line', async ({ page }) => {
    await page.getByRole('button', { name: /Add Client/ }).click()
    await expect(transcript(page).getByText(/Single buyer or co-buyers/)).toBeVisible()
    await ask(page, 'Dave Firenze, daveyf@email.com, 405-555-6594')
    await expect(transcript(page).getByText('✓ Created a new group')).toBeVisible()
    await ask(page, '2br/1b condo, budget up to 600K')
    await expect(transcript(page).getByText('✓ Saved group information')).toBeVisible()
    await ask(page, 'Sale. Berkeley, Oakland')

    const used = transcript(page).getByRole('button', { name: /Used 5 tools/ })
    await expect(used).toBeVisible()
    // The five tool lines are collapsed until the summary is expanded.
    await expect(transcript(page).getByText('✓ Ran get_filter_details')).toHaveCount(0)
    await used.click()
    await expect(transcript(page).getByText('✓ Ran get_filter_details')).toBeVisible()
    await expect(transcript(page).getByText('✓ Ran get_searchable_markets')).toBeVisible()
  })
})
