# Test Report

Date: 2026-10-06

Task: seed-smoke: Seed script and end-to-end API smoke test

Scope: `git diff 7cef0d0 HEAD -- backend/` (branch `main`, HEAD 74dc9e2). Files: `backend/src/seed.ts`,
`seed-cli.ts`, `seed.test.ts`, `smoke.test.ts`, `transactions.repo.ts` (`replaceAll`), `transactions.repo.test.ts`,
`backend/package.json` (`seed` script). The working tree was clean before testing.

Requirements:
- `tasks/seed-smoke.md` acceptance criteria and its recorded assumption (deterministic per day, every category in
  every month, no current-month date after today)
- `AGENTS.md` conventions (tests next to code, the real DB file is never touched)

## Test files changed

- `backend/src/seed.test.ts`
- `backend/src/transactions.repo.test.ts`

## Tests added or updated

Count: 4 new tests in total. One of them is a parameterized `it.each` that runs 5 cases, so vitest reports 8 more
test cases than before.

- `seed.test.ts`
  - `rejects malformed today %j` (5 cases): `""`, `"2026-10"`, `"06.10.2026"`, `"2026-13-01"`, and
    `"2025-02-29"` (Feb 29 in a non-leap year).
  - `holds every acceptance property for every day of a leap and a non-leap year`: runs every day of 2024 and
    2026 (731 values of `today`). For each one it checks:
    - the count is between 40 and 60;
    - exactly the current month and the 2 previous months are present;
    - every category appears in every month;
    - no date is after today;
    - every item passes `validateTransactionInput`.

    The existing tests checked only 5 fixed dates. This sweep covers the PRNG output across month ends, the year
    boundary, and the 1st of every month (where the current-month day range is only 1).
- `transactions.repo.test.ts` (`transactions repo replaceAll`)
  - `returns 0 on an empty table and clears everything when given no inputs`
  - `leaves no open transaction after a rollback, so the repo keeps working`: after a failed `replaceAll`, the
    test calls `create` and then `replaceAll` again. Both must work, which proves `ROLLBACK` really ended the
    transaction. If it had not, the next `BEGIN` would throw.
  - `commits the replacement durably to a file database`: uses a temporary file DB, closes it, reopens it, and
    checks that only the replacement rows remain.

The block also has an `afterEach` that deletes the temporary directory.

## Requirement coverage

| Requirement | Tests | Result |
|---|---|---|
| Seed replaces all transactions atomically | existing `deletes everything...`, `rolls back when an insert fails`; new `returns 0 on an empty table...`, `leaves no open transaction after a rollback...`, `commits the replacement durably...` | Pass |
| 40-60 expenses, current month and 2 previous, every category | existing `generateSeed` tests; new full-year sweep | Pass |
| Pure, deterministic `generateSeed(today)`, every item valid | existing `is deterministic...`, `returns 40-60 valid expenses...`; new sweep | Pass |
| Invalid `today` rejected | existing `rejects an invalid date`; new `rejects malformed today` | Pass |
| Smoke test: real server on port 0, temp-file DB, full flow, under 5 s | existing `smoke.test.ts` (whole backend suite takes about 1 s) | Pass |
| CLI uses `DB_PATH` and prints what it did | none (CLI entry point has no export) | Not testable (see below) |

## Focused test execution

Command:

`npm test -w backend -- src/seed.test.ts src/transactions.repo.test.ts`

Result:

Pass (2 files, 50 tests)

## Full test execution

Command:

`npm test -w backend` and `npm run check` (eslint + backend tsc/vitest + frontend tsc/vitest)

Result:

Pass. Backend: 9 files, 252 tests. Frontend: 16 files, 384 tests. Lint and type-check are clean.

## .taskcheck

Result:

Not run directly: running `sh scripts/check.sh` was denied by the sandbox. `npm run check` passed, which per
`AGENTS.md` does the same checks (`scripts/check.sh` only adds `npm ci` when needed). The parent worker should run
`.taskcheck` before `done`.

## Bugs found

None.

## Coverage

Code coverage not measured because the project does not have existing coverage tooling configured.

## Unable to test

- `seed-cli.ts` (that it reads `DB_PATH`, prints its output, and closes the DB): it is a top-level script with side
  effects at import and no exported function. Testing it would mean spawning `tsx` as a subprocess against a temp
  DB, or changing production code to export a `main()`. Both are outside the remit of this test writer. Its logic
  is thin: `generateSeed`, `replaceAll`, and `localDate` are each covered. A manual run of
  `DB_PATH=<tmp> npm run seed -w backend` is a reasonable check for the parent. No follow-up task is needed.

## Summary

Tests added and all validation passed.
