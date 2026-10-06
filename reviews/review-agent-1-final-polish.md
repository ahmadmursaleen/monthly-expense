# Code Review

Date: 2026-10-06

Task: `final-polish`: Polish pass, README and final demo run

Scope: `git diff fd075ce..HEAD -- . ':!tasks'` (README.md, docs/UI-DESIGN.md, reviews/demo-2026-10-06-final-polish.md,
frontend/src/{MonthHeader.tsx, Dashboard.tsx, Dashboard.css, styles.css, Dashboard.test.tsx}), plus a short
UI consistency review of the frontend components against `docs/UI-DESIGN.md` as requested by the parent.

Requirements:
- `tasks/final-polish.md` acceptance criteria
- `SPEC.md` (§2 demo script, §4 Must features M1-M10, §8 Frontend UX)
- `docs/UI-DESIGN.md`, `AGENTS.md` conventions
- Parent agent instructions

Git range:
- Branch: main
- HEAD: 0c0940b
- Base/start: fd075ce
- Commits reviewed: 5 (ce5f27c claim, d59ebfa/9b21ada assume, 747c19f code, 0c0940b docs)
- Uncommitted at review time: `frontend/src/Dashboard.test.tsx` (modified), `frontend/src/MonthHeader.test.tsx`
  and `frontend/src/Dashboard.focus.test.tsx` (untracked), apparently test-writer work in progress. Not reviewed.

Summary: 0 P0, 0 P1, 3 P2, 3 P3

Verified as correct:
- README commands match the scripts: root `check`, `-w backend` `dev`/`start`/`seed`/`test`, `-w frontend`
  `dev`/`build`/`test`. `scripts/check.sh` behaves as described. The default DB path `data/expenses.db`
  (relative to `backend/` under `npm run -w backend`) gives `backend/data/expenses.db`, which is git-ignored.
  The smoke test uses a temp dir. `buildReport`/`renderReportPdf` and the file layout match. `BRIEF.md` exists.
  The README demo script matches SPEC §2 and the actual UI strings ("Search descriptions",
  "No expenses match your filters", "Clear filters", "Can't reach the server").
- Today with `aria-disabled`: the click is guarded, `aria-disabled="false"` renders off the current month, and
  `.btn[aria-disabled="true"]:hover` comes after `.btn:hover:not(:disabled)` with equal specificity, so it wins.
- Focus after delete: React runs every passive-effect cleanup before any effect setup. So `useModalDialog`'s
  cleanup (focus back to the opener) runs first, and the Dashboard effect then moves focus to the
  `tabIndex=-1` section. The flag is set only on a successful delete. Cancel and Escape keep the normal focus return.
- `--danger-hover` is added to the tokens and documented in UI-DESIGN.md. White on `#8f1e18` passes AA.
- SPEC §4 M1-M10: every Must feature is present in code (create/edit/delete with validation, month
  navigation with URL, summary + bars, client-side search/filter, PDF incl. empty month, SQLite file
  persistence, loading/empty/validation/API-error/PDF-error states, responsive CSS at `max-width: 719px`).
  No gap found.
- No stubs left in the fe-shell contract components. `applyFilters` and the other contract functions are implemented.
- Spot-checked contrast: `--ink-faint` on `--paper` is about 4.8:1 and white on `--action` about 7.9:1, as claimed.

## P0 Critical

None.

## P1 High

None.

## P2 Medium

- [ ] **CR-1 | Keyboard focus still drops to `<body>` in three demo-path places (same bug class the task fixed)**
    - File: `frontend/src/ErrorBanner.tsx:15`, `frontend/src/TransactionList.tsx:41` and `:48`, `frontend/src/Dashboard.tsx:67,100`
    - Category: Correctness (accessibility)
    - Problem: The task fixed focus loss for Today and Delete, but other buttons also remove themselves when pressed:
      1. **Retry** (demo step 9): `reload()` changes the request key, so `useMonthData` immediately reports
         `error: null` (`useMonthData.ts:63-64`). The banner and its focused Retry button unmount at once.
      2. **Clear filters** in the "No expenses match your filters" state (demo step 6):
         `onClearFilters={() => setFilters(emptyFilters)}` replaces the empty state with the list and nothing
         moves focus. `FilterBar`'s own "Clear" does handle this (`FilterBar.tsx:20-24`), so the two clear
         buttons behave differently.
      3. **Add expense** in the empty-month state: after a save into the viewed month, the dialog returns focus
         to that button while it is still mounted (reload pending). The reload then swaps the empty state for
         the list, and focus is lost.
    - Why it matters: The AC requires checking and fixing the "keyboard path through the whole demo", and SPEC §8
      requires keyboard reachability. The demo report (row 22) says the keyboard path passes, but steps 6 and 9 still lose focus.
    - Suggested fix: Use the same pattern as delete. After Retry, focus the list section or the `<main>`
      region. For "Clear filters", focus the search input or the list section. For empty-state Add, focus
      the list section once the reload finishes. Add a focus assertion for each.

- [ ] **CR-2 | Download PDF uses native `disabled` while busy, which contradicts the rule this task just added to UI-DESIGN.md**
    - File: `frontend/src/ReportButton.tsx:42`; rule in `docs/UI-DESIGN.md:60-62`
    - Category: Architecture / Correctness (accessibility)
    - Problem: UI-DESIGN.md now says: "A button that can become unavailable right after it is pressed (Today)
      uses `aria-disabled="true"` instead of `disabled`, so keyboard focus stays on it." `ReportButton` is
      exactly this case: it sets `disabled={busy}` as soon as it is pressed. By the task's own reasoning
      (`MonthHeader.tsx:22`), keyboard focus is dropped during every download (demo step 7). The same applies to
      the DeleteDialog "Delete" button (`DeleteDialog.tsx:64`) when the delete fails and the dialog stays open.
    - Why it matters: The new design rule is not applied consistently in the same pass, so a keyboard user
      loses their position after Download PDF.
    - Suggested fix: Use `aria-disabled={busy}` plus a guard in `handleClick` (the click handler already
      has `busy` state) in ReportButton, and the same in DeleteDialog's Delete button. Alternatively, narrow
      the UI-DESIGN rule if this is intentional.

- [ ] **CR-3 | Committed scope has no tests for the two new focus behaviors**
    - File: `frontend/src/Dashboard.test.tsx:170,357` (only assertions changed); `frontend/src/Dashboard.tsx:42-54`; `frontend/src/MonthHeader.tsx:23-32`
    - Category: Tests
    - Problem: Commit 747c19f adds new behavior: focus stays on Today, Today is a no-op on the current month, and
      focus moves to the list after a delete. The committed tests only change `toBeDisabled()`/`toBeEnabled()`
      into `aria-disabled` attribute checks. No committed test checks focus after a delete or that clicking an
      `aria-disabled` Today does nothing. `Dashboard.test.tsx` mocks `DeleteDialog`, so the cleanup-ordering
      interaction that the delete fix relies on is never tested. AGENTS.md: "Every new behavior gets a test."
    - Why it matters: The delete-focus fix depends on React effect ordering between `useModalDialog`'s cleanup
      and the Dashboard effect. A refactor could silently bring the bug back.
    - Suggested fix: Commit the test-writer's in-progress files (`MonthHeader.test.tsx`,
      `Dashboard.focus.test.tsx`, the `Dashboard.test.tsx` edits) once they pass. Make sure one of them uses
      the real `DeleteDialog` and asserts `document.activeElement` is the "Expenses" section after a delete.

## P3 Low

- [ ] **CR-4 | Demo report overstates a few checks**
    - File: `reviews/demo-2026-10-06-final-polish.md:7,9,26`
    - Category: Quality
    - Problem: Row 20 says `@media (max-width: 719px)` exists "in every component", but `CategoryBars.css`,
      `ErrorBanner.css`, `Notice.css` and `ReportButton.css` have none. Their layouts may not need one, but the
      claim is inaccurate. Row 23 gives `--danger` on `--danger-tint` as about 5.7:1. Computed from the tokens
      (`#b3261e` on `#f8e4e2`) it is about 5.3:1. It still passes AA, but the figure is wrong. Row 1 records
      `npm install` "up to date", which shows this was not the fresh clone SPEC §1.5 and §2 step 1 describe.
      Row 22 marks the keyboard path PASS despite CR-1 and CR-2.
    - Why it matters: The demo report is the evidence for the "demo run" AC and SPEC §1.5. Its claims should be exact.
    - Suggested fix: Correct the wording and the ratio, say the run used an existing checkout, and update row 22 after CR-1 and CR-2.

- [ ] **CR-5 | README says every source file has a test next to it**
    - File: `README.md:105`
    - Category: Quality
    - Problem: "Each source file has its test next to it" is false in the committed tree. `ErrorBanner.tsx`,
      `MonthHeader.tsx` (untracked test only), `main.tsx`, `types.ts`, `backend/src/server.ts` and
      `backend/src/seed-cli.ts` have no `*.test.*` file. Also, `README.md:84` lists `DB_PATH` under
      `server.ts`, but it is read in `db.ts` (`defaultDbPath`).
    - Why it matters: Small inaccuracies in the published README.
    - Suggested fix: Change it to "Tests live next to the code they cover (`foo.ts` + `foo.test.ts`)", and attribute `DB_PATH` to `db.ts`.

- [ ] **CR-6 | Stale comments about stub/disabled state**
    - File: `frontend/src/Dashboard.test.tsx:53`, `frontend/src/MonthHeader.tsx:6`
    - Category: Quality
    - Problem: The test comment says "applyFilters is still a stub", but `filters.ts` implements it, which
      matters for the "no stub left" AC. The `isCurrent` JSDoc says "Today is then disabled", but it is now
      `aria-disabled` and stays focusable.
    - Why it matters: The comments mislead readers about the current behavior.
    - Suggested fix: Update both comments.

## Review conclusion

Material issues found; fix before completing the task.

No blocking (P0/P1) defects. CR-1 and CR-2 are keyboard-path gaps that fall under this task's own AC ("keyboard
path through the whole demo ... fix what you find"). CR-3 is a test gap in the committed scope. Also pending
under the quality-gate AC: `reviews/tests-*-final-polish.md` (and `fixes-*` if applicable) are not committed
yet, and `.taskcheck` was not run by this reviewer.
