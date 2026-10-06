# Fix Report

Date: 2026-10-06

Task: `final-polish`: Polish pass, README and final demo run

Scope: findings CR-1, CR-2, CR-4, CR-5, CR-6 from `reviews/review-agent-1-final-polish.md` (CR-3 was
already resolved by the parent in 972dc4b)

## Fixed findings

### CR-1: Keyboard focus drops to `<body>` after Retry, empty-state Clear filters, and empty-state Add expense

Files changed:
- `frontend/src/Dashboard.tsx`
- `frontend/src/Dashboard.test.tsx`
- `frontend/src/Dashboard.focus.test.tsx`
- `docs/UI-DESIGN.md`

Problem:
These three buttons unmount themselves when pressed (Retry, Clear filters) or after the save's reload
(empty-state Add expense, which the dialog returns focus to). Focus then fell to `<body>`.

Fix:
All three now use the existing focus target from the delete fix, the Expenses section (`listRef`, `tabIndex=-1`).
- `handleRetry` and `handleClearFilters` focus the section, then call `reload()` / `setFilters(emptyFilters)`.
- `handleSaved` sets a `focusListIfLostAfterReload` flag. An effect on `loading` checks it once the reload
  has finished, and moves focus to the section only if focus is on `<body>`. The toolbar's "Add expense"
  stays mounted and keeps focus. The effect also covers an edited row that moved to another month.

No component prop contracts changed. UI-DESIGN.md's focus note now lists these cases.

Validation:
- `npm test -w frontend`: Pass. New tests:
  - Retry moves focus to the section.
  - Clear filters moves focus to the section (both `it.each` cases).
  - Empty-state Add followed by `onSaved` moves focus to the section once the reload has replaced the button.
  - Toolbar Add keeps focus after a save.
  - Real-dialog test in `Dashboard.focus.test.tsx`: fill the form and submit from the empty month's Add
    expense, then check that the Expenses section has focus.

### CR-2: Download PDF and the dialog's Delete use native `disabled` while busy

Files changed:
- `frontend/src/ReportButton.tsx`, `frontend/src/ReportButton.test.tsx`
- `frontend/src/DeleteDialog.tsx`, `frontend/src/DeleteDialog.test.tsx`
- `frontend/src/styles.css`
- `docs/UI-DESIGN.md`

Problem:
Both buttons became `disabled` when pressed, which drops keyboard focus. This contradicts the UI-DESIGN rule.

Fix:
- Both buttons now use `aria-disabled={busy}` instead of `disabled`.
- ReportButton's `handleClick` returns early while busy. DeleteDialog already had an `if (deleting) return` guard.
- Added `.btn-danger[aria-disabled="true"]:hover`, so a busy Delete button does not get the hover darkening.
- The UI-DESIGN rule now names both buttons.

Validation:
- `npm test -w frontend`: Pass.
- ReportButton test: the busy button has `aria-disabled="true"`, stays enabled and keeps focus, and focus
  remains after it finishes. The existing "no second download" test still passes.
- New DeleteDialog test: while deleting, focus stays on the button and a second click does not call the
  API. After a failure, the button is `aria-disabled="false"` and still focused.

### CR-4: Demo report overstates checks

Files changed:
- `reviews/demo-2026-10-06-final-polish.md`

Fix:
- Row 1 now says the run used the existing checkout, not a fresh clone.
- Row 20 lists the seven CSS files that have the 719px media query and the four that don't.
- Row 23 gives the danger-on-tint contrast as ~5.3:1. Recomputed from `#b3261e` on `#f8e4e2`: 5.35:1.
- Row 22 describes the CR-1/CR-2 fixes and the tests that cover them.

Validation:
- Manual re-read of the file. `grep -l "max-width: 719px" frontend/src/*.css` matches the list.

### CR-5: README inaccuracies

Files changed:
- `README.md`

Fix:
- The "Each source file has its test" sentence now reads "Tests live next to the code they cover (`foo.ts` + `foo.test.ts`)".
- `DB_PATH` is now attributed to `src/db.ts` (where `defaultDbPath` reads it). `server.ts` keeps `PORT`.

Validation:
- `grep DB_PATH backend/src/*.ts` confirms it is read only in `db.ts`.

### CR-6: Stale comments

Files changed:
- `frontend/src/Dashboard.test.tsx` (the applyFilters spy comment no longer says "stub")
- `frontend/src/MonthHeader.tsx` (the `isCurrent` JSDoc now says aria-disabled, still focusable, clicks do nothing)

Validation:
- `npm run lint`: Pass. Type-check: Pass.

## Not fixed

### CR-3: Committed scope has no tests for the new focus behaviors

Status:
Invalid (already resolved)

Reason:
The parent states that the tests were committed in 972dc4b (`MonthHeader.test.tsx`,
`Dashboard.focus.test.tsx`, `Dashboard.test.tsx`). They pass.

## Observation (not a supplied finding, not changed)

`ExpenseDialog.tsx`'s submit button also uses `disabled={saving}`. On success the dialog closes, so
nothing is lost. On a failed save, focus may drop while the request is in flight. This is the same class
of issue as CR-2, but it was not in the supplied findings. Left for the parent to decide.

## Validation summary

Focused tests:
- `npm test -w frontend`: Pass (18 files, 405 tests)

Full test suite:
- `npm run check` (eslint, then tsc + vitest for backend and frontend): Pass. Backend 252 tests, frontend 405 tests.

Lint/type-check/build:
- `npm run lint`: Pass (part of `npm run check`)
- `tsc --noEmit` for both workspaces: Pass

`.taskcheck`:
- `sh scripts/check.sh`: Pass

Remaining unresolved findings:
0

## Final status

All validated findings fixed and validation passed.
