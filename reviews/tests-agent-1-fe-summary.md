# Test Report

Date: 2026-10-06

Task: fe-summary - Summary panel with category spending bars

Scope: commit 04fbf63 (HEAD on `main`, parent 25a2183); production files `frontend/src/SummaryPanel.tsx`,
`frontend/src/CategoryBars.tsx` (+ CSS). There were no uncommitted production changes. An untracked
`reviews/review-agent-1-fe-summary.md` from the code reviewer was present, and I did not touch it.

Requirements:
- `tasks/fe-summary.md` acceptance criteria and the recorded frontend-design assumption
- `SPEC.md` M5 and the `GET /api/summary` contract (only categories with spending, sorted by total desc)
- `docs/UI-DESIGN.md` (SummaryPanel props contract), `AGENTS.md` conventions

## Test files changed

- `frontend/src/CategoryBars.test.tsx` (new)
- `frontend/src/SummaryPanel.test.tsx` (one test added; existing tests unchanged)

## Tests added or updated

Count: 9 (8 new in `CategoryBars.test.tsx`, 1 new in `SummaryPanel.test.tsx`)

## Requirement coverage

| Requirement | Tests | Result |
|---|---|---|
| Total via `formatMoney` and number of expenses | `shows the total and the number of expenses`, `uses the singular for one expense` (existing) | Pass |
| One bar per category with label, amount, share % | `lists one bar per category sorted by total...` (existing), `gives a single category a full-width bar and a 100% share` | Pass |
| Sorted by total | existing ordering test; `sorts by total descending even when the largest category arrives last`; `does not reorder the caller's array` | Pass |
| Widths proportional to the largest category | `sizes bars relative to the largest category` (existing); `sorts by total descending...` (widths 100/75/25 vs month total); `gives equal totals equal full-width bars`; `shows <1% for a tiny category...` (non-zero sub-1% width) | Pass |
| Shares (based on month total) | existing row test; `bases shares on the month total, not on the largest category` (50/38/13 %); `formatShare` tests (existing); `shows <1% for a tiny category while keeping its amount visible` | Pass |
| Values are text, not only bar length (accessible) | `hides the decorative bars from assistive technology; values remain text` | Pass |
| Empty month: 0,00 EUR and "Nothing spent yet" instead of bars | `shows 0,00 EUR and a message instead of bars for an empty month` (existing); `does not show the empty-month message when there is spending`; `renders an empty list without bars when there is no spending` (component level) | Pass |
| Unknown category id falls back to raw id (assumption) | `falls back to the category id when no label is known` (existing) | Pass |
| Uses frontend-design skill / consistent with UI-DESIGN.md | - | Not testable (process/visual) |

## Focused test execution

Command:

`npm --prefix <repo> test -w frontend -- SummaryPanel CategoryBars`

Result:

Pass: 2 files, 17 tests.

## Full test execution

Command:

`npm --prefix <repo> run check` (lint + tsc + backend and frontend vitest)

Result:

Pass: lint clean, backend 229 tests, frontend 16 files and 384 tests. My first run failed with a
type error in my new test, which used an invalid category id `"leisure"`. I fixed the test to use
`"entertainment"` and reran the check, which passed.

## .taskcheck

Result:

Not run directly. The shell permissions in this environment deny `sh scripts/check.sh`. Instead I ran
`npm run check`, which covers the same lint, type-check and tests (without `npm ci`), and it passed.

## Bugs found

None.

## Coverage

Code coverage was not measured because the project does not have coverage tooling configured.

## Unable to test

- Visual design consistency with `docs/UI-DESIGN.md` and use of the frontend-design skill: this is
  a process and visual criterion, so I left it to the code review.
- Responsive stacking below 720px: jsdom does not apply CSS layout.

## Summary

Tests added and all validation passed.
