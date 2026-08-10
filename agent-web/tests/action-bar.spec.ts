import { test, expect, type Page } from '@playwright/test'

/**
 * The action bar (variant B of the FAB-placement test, `?ab=b`) degrades in three measured
 * stages as its row runs short: full pills → icon-only circles → fold into the overflow menu.
 * The behaviour is width-measured, not keyed to a breakpoint, so it can only be verified in a
 * real browser at real widths.
 *
 * It is implemented three times — the React component (`src/components/ActionBar.tsx`) and the
 * two standalone map pages (`public/{search,tours}-map.html`, which share
 * `public/map-actionbar.js`). All three must behave the same, so each is exercised here.
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

  test('keeps the primary action reachable at every width', async ({ page }) => {
    for (const width of [1600, 1000, 720, 480]) {
      await page.setViewportSize({ width, height: 900 })
      await page.goto(url)
      // Either a pill/circle in the bar, or a row in the menu — but always present and
      // clickable somewhere. Check the bar first, then the menu.
      const inBar = page.getByRole('button', { name: /Ask RealAssist/ })
      if (await inBar.count()) {
        await expect(inBar.first()).toBeVisible()
      } else {
        const menu = await openOverflowMenu(page)
        await expect(menu.getByRole('menuitem', { name: /Ask RealAssist/ })).toBeVisible()
      }
    }
  })
})

/**
 * `folds` is the leftmost action, which degrades first: its label drops as the row runs short,
 * and it is the first to fold into the menu. The map bar sits after a greedy `flex:1` spacer
 * and carries only two or three actions, so — like the React bar with five — it keeps fitting a
 * row of circles until the viewport is quite narrow; folding only engages in the low hundreds.
 * `collapseWidth` is a viewport where that leftmost action is an icon-only circle but has not
 * yet folded; `foldWidth` is one where it has folded into the menu. Both differ per page: the
 * two-action search bar keeps its labels down to a narrower width than the three-action tours
 * bar, since fewer pills need less room.
 */
const MAP_PAGES = [
  { name: 'search-map', path: '/search-map.html?ab=b', folds: 'Save search', collapseWidth: 300, foldWidth: 170 },
  { name: 'tours-map', path: '/tours-map.html?ab=b', folds: 'Export', collapseWidth: 380, foldWidth: 160 },
]

for (const { name, path, folds, collapseWidth, foldWidth } of MAP_PAGES) {
  test.describe(`map page action bar (${name})`, () => {
    test('shows the labelled pills when wide', async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 800 })
      await page.goto(path)
      // The shared script runs on load/resize via rAF; let it settle.
      await page.waitForTimeout(300)

      // Wide, the action keeps its visible label and nothing is folded into the menu.
      await expect(page.locator('.actionbar .lbl', { hasText: folds })).toBeVisible()
      await expect(page.locator('.menupanel .mi-folded')).toHaveCount(0)
    })

    test('drops the leftmost label to a circle before folding', async ({ page }) => {
      // A middle width: the leftmost action has shed its label (stage 2) but is still a control
      // in the bar, not yet in the menu (stage 3).
      await page.setViewportSize({ width: collapseWidth, height: 800 })
      await page.goto(path)
      await page.waitForTimeout(300)

      // The pill is still present in the bar…
      const pill = page.locator('.actionbar > *', { hasText: folds }).first()
      await expect(pill).toBeVisible()
      // …but its label span is hidden — it has collapsed to an icon-only circle.
      await expect(pill.locator('.lbl')).toBeHidden()
      // Nothing has folded into the menu yet.
      await expect(page.locator('.menupanel .mi-folded')).toHaveCount(0)
    })

    test('folds the leftmost action into the overflow menu when narrow', async ({ page }) => {
      await page.setViewportSize({ width: foldWidth, height: 800 })
      await page.goto(path)
      await page.waitForTimeout(300)

      // Open the page's own overflow menu (a ⋯ button, aria-label "More").
      await page.getByRole('button', { name: 'More' }).click()
      const panel = page.locator('.menupanel')
      await expect(panel).toBeVisible()

      // A folded action appears as an appended .mi-folded row carrying the pill's label.
      await expect(panel.locator('.mi-folded', { hasText: folds })).toBeVisible()
    })
  })
}
