# Test Report

Date: 2026-10-06

Task: `data-model` - Backend domain, SQLite schema and transaction repository

Scope: commit `334a5de` (HEAD on `main`, base `dde7d4f`); production files `backend/src/domain.ts`,
`backend/src/db.ts`, `backend/src/transactions.repo.ts`. Working tree was clean before testing.

Requirements:
- `tasks/data-model.md` acceptance criteria and recorded assumptions
- `SPEC.md` §5 (data model, categories) and §6 (transaction object, validation)
- `AGENTS.md` conventions (tests next to code, `openDb(":memory:")`, temp-file DB only)

## Test files changed

- `backend/src/db.test.ts` (new)
- `backend/src/domain.test.ts`
- `backend/src/transactions.repo.test.ts`

## Tests added or updated

Count: 33 test cases (backend went from 71 to 104 cases, `it.each` rows counted individually). No existing
test was changed, weakened or skipped.

## Requirement coverage

| Requirement | Tests | Result |
|---|---|---|
| `CATEGORIES` ids/labels in SPEC §5 order | existing `lists the SPEC §5 ids and labels in order`; new `accepts every SPEC category id` | Pass |
| Validation messages exactly as SPEC §6, per field | existing per-field `it.each` suites; new `reports only the invalid fields when several but not all are wrong` | Pass |
| Description trimmed, 1-200 chars, whitespace-only / 201 chars rejected | existing suites; new `keeps inner whitespace of the description` | Pass |
| Amount integer, > 0, <= 100 000 000 (0, non-integer) | existing suites; new `rejects a boolean or null amount` | Pass |
| Unknown category rejected | existing `rejects a %s category` | Pass |
| Real `YYYY-MM-DD` date (`2026-02-30` rejected) | existing suite; new `rejects the date %j with surrounding whitespace` | Pass |
| `isValidMonth`, `monthBounds` | existing suites; new `throws on the invalid month %j` (5 cases), `handles a century non-leap year and a 400-year leap year` | Pass |
| `migrate()` creates table per SPEC §5, `CHECK (amount_cents > 0)`, `date` index, `IF NOT EXISTS` | new `creates the transactions table with the SPEC §5 columns`, `creates an index on date`, `is idempotent and keeps existing rows`, `rejects amount_cents %d via the CHECK constraint`, `accepts amount_cents 1`, `rejects NULL in required columns` | Pass |
| Repo CRUD, `update` null if missing, `remove` boolean, timestamps | existing CRUD suite; new `update and remove only touch the targeted row`, `does not reuse the id of a deleted transaction`, `stores descriptions with quotes and SQL-like text verbatim`, `stores the maximum amount exactly`, `returns false when removing an id that never existed` | Pass |
| Month boundaries (30 Sep vs 1 Oct) | existing `separates 30 September from 1 October`; new `separates 31 December from 1 January of the next year`, `includes 29 February in a leap-year February and excludes 1 March`, `moves a transaction between months when its date is updated` | Pass |
| Sort date desc, then id desc | existing `sorts by date desc, then id desc` | Pass |
| `summarizeMonth` shape, only categories with spending, total desc | existing suite; new `returns an empty summary for a month that only has neighbouring-month data`, `agrees with listByMonth on total and count`, `sums many maximum amounts exactly as integer cents`, `reflects removals and updates`, `throws on an invalid month` | Pass |
| Empty month summary (`totalCents: 0`, `byCategory: []`) | existing `summarizes an empty month` | Pass |
| Data survives close/reopen of a temp-file DB | existing `keeps data after closing and reopening a file DB`; new `persists updates and deletes, and continues ids after reopening` | Pass |

## Focused test execution

Command:

`npx -w backend vitest run src/db.test.ts src/domain.test.ts src/transactions.repo.test.ts`

Result:

Pass (3 files, 103 tests)

## Full test execution

Command:

`npm test -w backend` and `npm run check` (lint + tsc + backend and frontend tests)

Result:

Pass (backend 4 files / 104 tests; frontend 3 files / 163 tests; lint and type-check clean)

## .taskcheck

Result:

Pass (`sh scripts/check.sh`)

## Bugs found

No production bugs against the task acceptance criteria or SPEC were found.

Observation (not a bug, no test added): `daysInMonth` uses `Date.UTC(year, ...)`, which maps years
0-99 to 1900-1999. For example, `isValidDate("0000-02-29")` returns false although year 0 is a leap year
in the proleptic Gregorian calendar. SPEC does not define a valid year range, so this is reported only for
the parent to decide whether it matters. Severity: Low.

## Coverage

Code coverage not measured because the project does not have existing coverage tooling configured
(no `@vitest/coverage-*` package installed, no coverage script).

## Unable to test

- Nothing in scope. The schema `CHECK` and `NOT NULL` constraints are verified through direct SQL in
  `db.test.ts` because the repo only receives pre-validated input.

## Summary

Tests added and all validation passed.
