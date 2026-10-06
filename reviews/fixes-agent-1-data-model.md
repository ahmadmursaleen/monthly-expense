# Fix Report

Date: 2026-10-06

Task: data-model

Scope: findings CR-1 and CR-2 from `reviews/review-agent-1-data-model.md`

## Fixed findings

### CR-1 — Persistence tests leak DB handles when an assertion fails

Files changed:
- `backend/src/transactions.repo.test.ts`

Problem:
Both persistence tests called `db.close()` only after their assertions. When an assertion failed, the
file DB stayed open, so on Windows the `afterEach` `rmSync` failed with EBUSY and hid the real failure.

Fix:
Each `openDb(path)` handle in both persistence tests ("keeps data after closing and reopening a file DB"
and "persists updates and deletes, and continues ids after reopening") is now closed in a
`try/finally`. Assertions are unchanged. I checked the other test files (`db.test.ts`, `domain.test.ts`):
none of them open file DBs, so nothing else needed this change.

Validation:
- `npm run check` — Pass

### CR-2 — `daysInMonth` wrong for years 0000-0099

Files changed:
- `backend/src/domain.ts`
- `backend/src/domain.test.ts`

Problem:
`Date.UTC` treats years 0-99 as 1900-1999, so `isValidDate("0000-02-29")` returned false (year 0 was
read as 1900, which is not a leap year).

Fix:
`daysInMonth` now uses a fixed month-length table plus Gregorian leap-year arithmetic (`isLeapYear`:
divisible by 4 and not by 100, or divisible by 400). No `Date` is used. Regression tests added:
`0000-02-29`, `0004-02-29`, `0400-02-29` accepted; `0001-02-29`, `0100-02-29` rejected;
`monthBounds("0000-02")` and `monthBounds("0001-02")` give the correct last day.

Validation:
- `npm run check` — Pass

## Not fixed

None.

## Validation summary

Focused tests:
- covered by `npm run check` (backend: 4 files, 106 tests passed)

Full test suite:
- `npm run check` — Pass (lint, tsc, backend 106 tests, frontend 163 tests)

Lint/type-check/build:
- `eslint .` and `tsc --noEmit` (both workspaces) — Pass

`.taskcheck`:
- `sh scripts/check.sh` — Pass

Remaining unresolved findings:
0

## Final status

All validated findings fixed and validation passed.
