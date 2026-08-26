## 1. Share MainHeader across all screens

- [x] 1.1 In `agent-web/src/Shell.tsx`, render one `MainHeader` above every screen — set it always `visible` instead of hiding it on Search and Tours. Verify Clients, Home, Tours, and Search all show the shell header.
- [x] 1.2 Derive each screen's header content in the shell: `title`/`countLabel` (Tours names the selected tour and its date), the `lead` region for Search, per-screen `actions`, and overflow `menuItems`. Verify each screen's header shows the correct title, count line, actions, and menu.
- [x] 1.3 Reduce `agent-web/src/screens/ToursScreen.tsx` and `agent-web/src/screens/SearchScreen.tsx` to pure map renderers — drop their in-screen headers, subnav-open affordance, and Ask/`?ab=` forwarding props. Verify each renders only its iframe map and follows the shell header.
- [x] 1.4 Remove the duplicate headers from `agent-web/public/tours-map.html` and `agent-web/public/search-map.html` so the map pages draw only the map, chips, and view toggles. Verify no header is rendered inside either iframe.

## 2. MainHeader props and lead region

- [x] 2.1 In `agent-web/src/components/MainHeader.tsx`, split the single `actionBar` prop into `useActionBar` (choose the `ActionBar` cluster) and `showAsk` (include the inline Ask action). Verify Tours/Search use the bar in either arm and Clients/Home only under `?ab=b`, with Ask shown only in the `?ab=b` arm.
- [x] 2.2 Add the optional `lead: ReactNode` prop that renders in place of the title/count block, shrinking but never growing. Verify Search shows its lead region and no title/count when `lead` is set.
- [x] 2.3 Add optional `actions` (per-screen action items rendered before Ask) and `menuItems` (overflow rows, defaulting to the Clients set). Verify Tours shows Export + Add to calendar, Search shows Save search, and each screen's overflow menu shows its own rows.
- [x] 2.4 Stack the count label onto a second line below the title (two-line title column) and keep the title ellipsizing. Verify the count label renders below the title on all screens that have one.
- [x] 2.5 Add `agent-web/src/components/SearchHeaderLead.tsx` — the MLS selector and search field ported from `search-map.html`, as prototype no-ops. Verify it renders the selector pill and the search field in the header.
- [x] 2.6 Add the header/action icons used by the new controls to `agent-web/src/icons.tsx` (Export, Calendar, Bookmark, etc.). Verify each new action renders its icon.

## 3. ActionBar pinned primary action

- [x] 3.1 In `agent-web/src/components/ActionBar.tsx`, pin the rightmost brand-toned (primary) action so folding into the overflow menu stops one short of it. Verify at the narrowest width the primary action stays a visible circle at the right of the `•••` and is never folded into the menu.

## 4. Tours mobile switcher

- [x] 4.1 Hide the Tours Vertical/Horizontal view switcher at `<=768px`. Verify the switcher is absent at mobile widths where the layout is already stacked and present above the breakpoint.

## 5. Remove dead cross-iframe plumbing

- [x] 5.1 Delete `agent-web/public/map-actionbar.js` and remove the `ASK_MESSAGE` ask bridge and `?ab=` param forwarding into the frames (`agent-web/src/askBridge.ts`, `agent-web/src/abParam.ts` dead code, and the `Shell.tsx` message listener). Verify the build has no remaining references to the removed plumbing.

## 6. Tests

- [x] 6.1 In `agent-web/tests/action-bar.spec.ts`, drop the MAP_PAGES loop, assert the primary action is never folded at any width, and add shared-header coverage that Tours shows Export + Add to calendar and Search shows Save search as header pills. Verify the suite passes.
- [x] 6.2 In `agent-web/tests/tour-flow.spec.ts`, repoint the tour title/locators to the shell header now that the map no longer draws its own. Verify the suite passes.

## 7. Add agent-vision shell (duplicated from agent-web)

- [x] 7.1 Create `agent-vision/` by duplicating `agent-web` at current main — copy tracked `src/`, `tests/`, `public/`, `scripts/`, configs (`vite.config.ts`, `panda.config.ts`, `playwright.config.ts`, `tsconfig.json`, `postcss.config.cjs`, `.gitignore`), `package.json`, and `README.md`. Exclude `node_modules`, `dist`, `styled-system`, and other generated/ignored artifacts. Verify only source/config/assets/scripts are added.
- [x] 7.2 Rename the package to `agent-vision-shell` in `agent-vision/package.json`. Verify the name and description reflect the new agent-vision shell.
- [x] 7.3 Regenerate the excluded artifacts with `npm ci` + `npm run build` and confirm `agent-vision` builds cleanly and runs on its own. Verify a clean install/build succeeds and the shell renders (including the shared header).

## 8. Verification

- [x] 8.1 Run `agent-web`'s build and E2E suite and verify no type/lint errors and all header/action-bar/tour tests pass.
- [x] 8.2 Manually verify every screen (Clients, Home, Tours, Search) renders the shared header with the correct title/count, lead region, actions, and overflow menu, and that the maps render only their content.
- [x] 8.3 Confirm `client-web` and `consumer-web` are unaffected and `agent-vision` starts identical to `agent-web`.
