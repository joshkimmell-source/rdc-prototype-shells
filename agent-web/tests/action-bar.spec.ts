import { test, expect, type Page } from '@playwright/test'

/**
 * The action bar (`src/components/ActionBar.tsx`) degrades in three measured stages as its row
 * runs short: full pills → icon-only circles → fold into the overflow menu. The behaviour is
 * width-measured, not keyed to a breakpoint, so it can only be verified in a real browser at
 * real widths.
 *
 * It carries the header controls on every screen — the Clients toggles and Ask under `?ab=b`,
 * and Tours' / Search's own actions in either arm — so the shared header is the single place
 * the behaviour lives (the map pages no longer draw their own bar inside the iframe).
 */

/**
 * Open the action bar's overflow menu and return its panel locator. The shell carries several
 * other "More" controls (the subnav trigger, a per-row menu on every client card), so this is
 * scoped to the header bar's own toggle: inside `main`, named exactly "More".
 */
async function openOverflowMenu(page: Page) {
  await page.getByRole('main').getByRole('button', { name: 'More', exact: true }).click()
  return page.getByRole('menu')
}

test.describe('React ActionBar (Clients, ?ab=b)', () => {
  // Clients carries the most actions: four toggles plus Ask.
  const url = '/?ab=b&view=clients'

  test('shows every action labelled when there is room', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto(url)

    // Each action's label is its accessible name; wide, they are all visible pills.
    for (const name of ['Agent notifications', 'Hotsheets', 'Market data', 'Favorites']) {
      await expect(page.getByRole('button', { name })).toBeVisible()
    }
    await expect(page.getByRole('button', { name: /Ask RealAssist/ })).toBeVisible()

    // Nothing has folded: the overflow menu holds only its static rows.
    const menu = await openOverflowMenu(page)
    await expect(menu.getByRole('menuitem', { name: 'Agent notifications' })).toHaveCount(0)
  })

  test('folds leftmost actions into the overflow menu when narrow', async ({ page }) => {
    // Narrow the whole window so the header cannot fit the pills even as circles.
    await page.setViewportSize({ width: 560, height: 900 })
    await page.goto(url)

    const menu = await openOverflowMenu(page)
    // The leftmost action folds first; the primary Ask action folds last, so it should still
    // be a control in the bar (not in the menu) before Agent notifications is.
    await expect(menu.getByRole('menuitem', { name: 'Agent notifications' })).toBeVisible()

    // Its static rows are still present, above the folded ones.
    await expect(menu.getByRole('menuitem', { name: 'Manage stages' })).toBeVisible()
  })

  test('keeps the primary action a visible control in the bar at every width, never folded', async ({ page }) => {
    for (const width of [1600, 1000, 720, 480, 360]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url)

      // The primary Ask is pinned: it collapses to a circle but never folds, so it is always a
      // control in the bar (a pill or a circle), regardless of how narrow the row gets.
      await expect(page.getByRole('main').getByRole('button', { name: /Ask RealAssist/ })).toBeVisible()

      // And it is never a row in the overflow menu.
      const menu = await openOverflowMenu(page)
      await expect(menu.getByRole('menuitem', { name: /Ask RealAssist/ })).toHaveCount(0)
    }
  })
})

/**
 * A minimized (icon-only) action has no visible label, so its tooltip is the only thing that
 * names it — on a pointer device. A touch interface can't hover, and a tap would leave the
 * tooltip stuck on screen with no pointer-leave to dismiss it, so it is suppressed there.
 * `1300px` is a width where the leftmost Clients actions have collapsed to circles but not
 * folded into the menu.
 */
test.describe('React ActionBar tooltip on minimized actions', () => {
  const url = '/?ab=b&view=clients'
  const COLLAPSE_WIDTH = 1300
  // The Haven `Tooltip` only mounts its floating content while open, so idle there is no
  // element at all rather than one with empty text.
  const tooltip = (page: Page) => page.getByRole('tooltip')

  test('shows the tooltip when a collapsed icon-only action is hovered (pointer)', async ({ page }) => {
    await page.setViewportSize({ width: COLLAPSE_WIDTH, height: 800 })
    await page.goto(url)

    const circle = page.getByRole('button', { name: 'Agent notifications' })
    await expect(circle).toBeVisible()
    // It is a minimized circle: its label span has been dropped from the DOM.
    await expect(circle.getByText('Agent notifications')).toHaveCount(0)

    // Idle, no tooltip is mounted; hovering the circle summons it.
    await expect(tooltip(page)).toHaveCount(0)
    await circle.hover()
    await expect(tooltip(page)).toHaveText('Agent notifications')
  })

  test('dismisses the tooltip when the collapsed action is clicked', async ({ page }) => {
    // 1100px collapses the primary Ask action to an icon-only circle that is still in the bar
    // (not folded into the menu), so its tooltip is the only thing naming it.
    await page.setViewportSize({ width: 1100, height: 800 })
    await page.goto(url)

    const ask = page.getByRole('main').getByRole('button', { name: /Ask RealAssist/ })
    await expect(ask).toBeVisible()
    await expect(ask.getByText(/Ask RealAssist/)).toHaveCount(0) // icon-only: no label span

    // Hover names it; clicking opens the panel and must retract the tooltip — a click leaves
    // the pointer over the button with no mouseleave, so it would otherwise linger over the
    // panel the click revealed.
    await ask.hover()
    await expect(tooltip(page)).toHaveText(/Ask RealAssist/)
    await ask.click()
    await expect(page.getByRole('button', { name: 'Close panel' })).toBeVisible()
    await expect(tooltip(page)).toHaveCount(0)
  })

  test.describe('touch interface', () => {
    test.use({ hasTouch: true, isMobile: true })

    test('suppresses the tooltip on a touch interface', async ({ page }) => {
      await page.setViewportSize({ width: COLLAPSE_WIDTH, height: 800 })
      await page.goto(url)

      const circle = page.getByRole('button', { name: 'Agent notifications' })
      await expect(circle).toBeVisible()

      // Neither a synthesized hover nor a tap (which focuses the button) summons it.
      await circle.hover()
      await circle.tap()
      await expect(tooltip(page)).toHaveCount(0)
    })
  })
})

/**
 * Tours and Search now render the same shared header, and it always uses the `ActionBar` (their
 * actions carry labels the icon cluster has no room for) regardless of the `?ab=` arm. So their
 * per-screen actions read as labelled pills in the header bar, not controls inside the iframe.
 */
test.describe('shared header action bar (Tours, Search)', () => {
  test('Tours shows its Export and Add to calendar actions as header pills', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto('/?view=tours')

    const header = page.getByRole('main')
    await expect(header.getByRole('button', { name: 'Export' })).toBeVisible()
    await expect(header.getByRole('button', { name: 'Add to calendar' })).toBeVisible()
  })

  test('Search shows its Save search action as a header pill', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 })
    await page.goto('/?view=search')

    await expect(page.getByRole('main').getByRole('button', { name: 'Save search' })).toBeVisible()
  })
})
