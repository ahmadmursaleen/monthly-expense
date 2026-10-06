# Test Report

Date: 2026-10-06

Task: fe-shell - Dashboard shell: visual direction, month navigation, transaction list

Scope: commit `0d02c00` (`git show HEAD`, branch `main`), frontend/src only: Dashboard, MonthHeader,
TransactionList, ErrorBanner, Notice, useMonthData, useMonthParam and the stubs SummaryPanel, FilterBar,
filters, ReportButton, ExpenseDialog, DeleteDialog. Working tree was clean before testing.

Requirements:
- `tasks/fe-shell.md` acceptance criteria
- `SPEC.md` (month navigation, URL `?month=`, filters vs. totals, sort order, states)
- `docs/UI-DESIGN.md` (component ownership / contract)
- `AGENTS.md` conventions (tests next to code, mock `api.ts`)

## Test files changed

- `frontend/src/useMonthParam.test.ts` (new)
- `frontend/src/useMonthData.test.ts` (new)
- `frontend/src/Dashboard.test.tsx` (extended; existing tests unchanged; FilterBar, ReportButton and
  `filters.applyFilters` are now mocked/spied the same way the dialogs already were)

## Tests added or updated

Count: 56 (30 in useMonthParam.test.ts incl. parameterized cases, 12 in useMonthData.test.ts,
14 in Dashboard.test.tsx)

## Requirement coverage

| Requirement | Tests | Result |
|---|---|---|
| Month in URL `?month=YYYY-MM`; missing/invalid -> current month | `monthFromUrl` "reads a valid month" (6 cases), "falls back to the current month" (14 cases: empty, `?`, other params only, `2026-00`, `2026-13`, `2026-1`, `26-10`, `2026-10-01`, `2026/10`, leading/trailing space, `Month=` case, non-digits), "uses the real current month", "defaults to window.location.search" | Pass |
| Invalid/missing month normalized with replaceState, no new history entry; valid URL untouched | `useMonthParam` "returns the month from the URL and leaves a valid URL untouched", "writes the current month ... using replaceState" | Pass |
| Single `month` param; other params, path and hash preserved | "replaces an invalid ?month but keeps the other params, the path and the hash", "setMonth pushes a history entry and keeps a single month param plus the other params", "collapses duplicate month params into one", Dashboard "keeps other query params when changing the month" | Pass |
| Back/Forward follow the URL | "follows popstate, and falls back to the current month when the popped URL is invalid", "stops listening to popstate after unmount" | Pass |
| Previous / Today / Next across year boundaries | "Previous from January goes to December of the previous year", "Next from December goes to January of the next year", "Today is enabled on another month and returns to the current month" | Pass |
| `useMonthData` returns `{transactions, summary, categories, loading, error, reload}` | "starts loading with no data, then returns transactions, summary and categories", "keeps the same reload function across renders" | Pass |
| Reload keeps previous data visible (stale-while-reload) | hook: "keeps the previous data visible while reloading the same month"; Dashboard: "keeps the list and total visible (no skeleton) while the month reloads" (also checks `aria-busy`) | Pass |
| Reload error keeps data, shows banner, Retry recovers | hook: "keeps the data and reports the error when a reload fails"; Dashboard: "keeps the loaded month visible and shows the error banner when a reload fails" | Pass |
| Error handling on first load / retry | "reports a failed first load ...", "turns a non-Error rejection into a string message", "clears the error while retrying and after a successful retry" | Pass |
| Month switch does not show stale month data or stale errors | "does not show the previous month's data after switching months, but keeps the categories", "does not carry an error over to a newly selected month", Dashboard "does not show the previous month's rows when the next month fails to load" | Pass |
| Late responses ignored | "ignores a late response for a month that is no longer selected", "ignores a late failure ...", "ignores a superseded reload that resolves after the newer one" | Pass |
| FilterBar `{categories, filters, onChange}`; list gets `applyFilters(...)`; `filtered` = any filter active; totals unfiltered | "passes the categories and empty filters to FilterBar", "gives the list applyFilters(transactions, filters) and keeps the total unfiltered", "shows the no-matches state when a search query / a category filters out every row; Clear filters resets", "treats a whitespace-only query as no filter" | Pass |
| ReportButton `{month, onError}`; onError -> error notice | "passes the month and turns onError into an error notice" | Pass |
| onSaved in another month -> "Saved to <Month Year>" | existing test + "onSaved for a different year names that year in the notice" | Pass |
| Loading, error + Retry, empty month, list order, Edit/Delete dialogs | already covered by the commit's own tests in `Dashboard.test.tsx`, `TransactionList.test.tsx`, `Notice.test.tsx` (unchanged) | Pass |
| Design docs, CSS per component, single column < 720 px | - | Not testable (visual/CSS; jsdom does no layout) |

## Focused test execution

Command:

`npm exec -w frontend -- vitest run src/useMonthParam.test.ts src/useMonthData.test.ts src/Dashboard.test.tsx`

Result:

Pass (3 files, 75 tests)

## Full test execution

Command:

`npm run check` (repo root: eslint + backend tsc/vitest + frontend tsc/vitest)

Result:

Pass (lint clean; backend 106 tests; frontend 8 files, 248 tests)

## .taskcheck

Result:

Not run directly: `scripts/check.sh` may run `npm ci`, which this sub-agent must not do. Its test step is
`npm run check`, which passed above. The parent worker should run `.taskcheck` before `done`.

## Bugs found

No bug that violates an acceptance criterion. One low-severity edge case, not covered by a failing test
because the spec does not define it:

### Years 0000-0099 in `?month=` are accepted but shown as 19xx

Test:

None (observation only)

Source:

`frontend/src/useMonthParam.ts:4` (regex `^\d{4}-(0[1-9]|1[0-2])$` accepts any 4-digit year) together with
`frontend/src/format.ts:26` (`Date.UTC(y, ...)` maps years 0-99 to 1900-1999)

Requirement:

SPEC: invalid month -> current month; the title should match the month being fetched.

Actual behavior:

`?month=0050-03` fetches `0050-03` but the title reads "March 1950"; `shiftMonth("0000-01", -1)` yields
`"-1-00"`. Unrealistic input, so Low.

Severity:

Low

## Coverage

Code coverage not measured because the project does not have existing coverage tooling configured.

## Unable to test

- Visual direction, design tokens, per-component CSS files and the single-column layout below 720 px:
  jsdom does not compute layout. Needs a manual or browser check; no follow-up task needed.
- Not specified by the spec, so not tested: whether filters reset when the month changes (currently
  they persist across months).

## Summary

Tests added and all validation passed.
