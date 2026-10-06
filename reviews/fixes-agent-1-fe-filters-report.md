# Fix Report

Date: 2026-10-06

Task: fe-filters-report - Search, category filter and PDF download

Scope: findings CR-1 and CR-2 from `reviews/review-agent-1-fe-filters-report.md`

## Fixed findings

### CR-1 - Activating Clear removes the focused button, dropping keyboard focus to the document

Files changed:
- `frontend/src/FilterBar.tsx`
- `frontend/src/FilterBar.test.tsx`

Problem:
Clear is rendered only while a filter is active. Clicking it empties the filters, which unmounts the
focused button and leaves keyboard focus on `<body>` (WCAG 2.4.3).

Fix:
Added a `useRef` on the search input. The Clear handler now calls `onChange(emptyFilters)` and then
focuses the search input. New test renders FilterBar inside a stateful wrapper (so Clear really
unmounts), clicks Clear, and asserts Clear is gone and the "Search descriptions" input has focus.

Validation:
- `npm run check` - Pass

### CR-2 - "Filter is active" predicate duplicated between FilterBar and Dashboard

Files changed:
- `frontend/src/filters.ts`
- `frontend/src/FilterBar.tsx`
- `frontend/src/Dashboard.tsx`
- `frontend/src/filters.test.ts`

Problem:
`query.trim() !== "" || category !== ""` was written separately in FilterBar (Clear visibility) and
Dashboard (filtered empty state), so the two could drift apart.

Fix:
Exported `isFiltered(f: Filters): boolean` from `filters.ts`. FilterBar uses it for `active`.
Dashboard's local copy was removed and replaced by an import (minimal edit: one import line, the
local function deleted; behaviour unchanged). `Dashboard.test.tsx` mocks `./filters` with an
`importOriginal` spread, so `isFiltered` stays the real implementation there. Added `isFiltered`
unit tests: false for empty filters and whitespace-only query; true for a non-blank query, a
category, a category with whitespace-only query, and both.

Validation:
- `npm run check` - Pass

## Not fixed

None.

## Validation summary

Focused tests:
- Covered by `npm run check` (frontend: 11 files, 290 tests passed).

Full test suite:
- `npm run check` - Pass (eslint, tsc for both workspaces, backend 229 tests, frontend 290 tests).

Lint/type-check/build:
- Included in `npm run check` - Pass.

`.taskcheck`:
- Not run separately (it runs `sh scripts/check.sh`, the same lint/type-check/tests as
  `npm run check`); the parent worker runs it via `tasks.py done`.

Remaining unresolved findings:
0

## Final status

All validated findings fixed and validation passed.
