# Code Review

Date: 2026-10-06

Task: data-model - Backend domain, SQLite schema and transaction repository

Scope: commit HEAD (`git show HEAD`), committed changes only

Requirements:
- `tasks/data-model.md` acceptance criteria and recorded assumptions (`python tasks.py assumptions`)
- `SPEC.md` §3 (sort order), §5 (data model), §6 (API contract, validation)
- `AGENTS.md` conventions, `docs/ARCHITECTURE.md` backend structure

Git range:
- Branch: main
- HEAD: 334a5de4f9dcbb10c1b3bc6bd88c570e7561d88f
- Base/start: 334a5de^ (dde7d4f)
- Commits reviewed: 1

Files reviewed: `backend/src/domain.ts`, `backend/src/domain.test.ts`, `backend/src/db.ts`,
`backend/src/transactions.repo.ts`, `backend/src/transactions.repo.test.ts`.

Verification run (read-only): `npm test -w backend` (3 files, 71 tests passed), `tsc --noEmit` for the
backend (clean), `eslint backend/src` (clean).

Summary: 0 P0, 0 P1, 0 P2, 2 P3

## Acceptance criteria check

| Criterion | Result |
|---|---|
| `domain.ts`: `CATEGORIES` in SPEC §5 order, `Transaction`/`TransactionInput` camelCase, `validateTransactionInput` with exact SPEC §6 messages, `isValidMonth`, `monthBounds` | Met. Messages match SPEC §6 verbatim; over-length description and non-integer/over-max amount reuse the single SPEC message (recorded assumption). |
| `migrate()` creates `transactions` + `date` index, `CREATE TABLE IF NOT EXISTS`, `CHECK (amount_cents > 0)` | Met (`db.ts:15-28`). Idempotent; exercised by reopening the file DB in the persistence test. |
| Repo: `create`, `update` (null if missing), `remove` (boolean), `getById`, `listByMonth` (date desc, id desc), `summarizeMonth` (`{month,totalCents,count,byCategory}`, only categories with spending, total desc), sets timestamps | Met. Parameterised SQL only; `updated_at` bumped and `created_at` kept on update; tie-break by CATEGORIES order (recorded assumption). |
| Tests: every validation rule incl. `2026-02-30`, amount 0, whitespace-only and 201-char description, unknown category, non-integer cents; CRUD; 30 Sep vs 1 Oct; sort order; empty-month summary; temp-file persistence | Met (`domain.test.ts`, `transactions.repo.test.ts`). |
| Quality gate reports committed | Pending; parent worker's responsibility after this review. |
| `.taskcheck` passes | Not run by the reviewer; backend tests, type-check and lint pass locally. |

Architecture: SQLite is still opened only in `db.ts`; SQL is confined to the repository module; no HTTP
code; `app.ts` untouched; no npm dependencies added. No security concerns: all queries use bound
parameters, no secrets or personal data.

## P0 Critical

None.

## P1 High

None.

## P2 Medium

None.

## P3 Low

- [ ] **CR-1 | Persistence test leaks an open DB handle when an assertion fails**
    - File: `backend/src/transactions.repo.test.ts:162-165`
    - Category: Tests
    - Problem: `db2.close()` runs only after both `expect` calls succeed. If either assertion fails, the
      file stays open and `afterEach` calls `rmSync(dir, { recursive: true, force: true })` on it. On
      Windows (where this project's agents run) deleting an open SQLite file fails with `EBUSY`, so the
      hook error is reported next to, or instead of, the real assertion failure.
    - Why it matters: makes a future regression in persistence harder to diagnose on Windows.
    - Suggested fix: close the handle in `try/finally` (or track open DBs and close them in `afterEach`
      before `rmSync`).

- [ ] **CR-2 | `daysInMonth` treats year 0000 as 1900**
    - File: `backend/src/domain.ts:99-102`
    - Category: Correctness
    - Problem: `Date.UTC` maps years 0-99 to 1900-1999. Checked with Node: `Date.UTC(0, 2, 0)` gives
      day 28, so `isValidDate("0000-02-29")` returns false and `monthBounds("0000-02").last` is
      `"0000-02-28"`, although year 0 is a leap year in the proleptic Gregorian calendar. Years 1-99 give
      the correct result by coincidence (1900+y has the same leap rule as y for those years).
    - Why it matters: very low practical impact (no real expense is dated in year 0). It is an
      edge-case defect in a "real calendar date" check.
    - Suggested fix: compute leap years arithmetically
      (`(y % 4 === 0 && y % 100 !== 0) || y % 400 === 0`) or use `setUTCFullYear` instead of `Date.UTC`.
      Alternatively, reject years below 1000 if that is acceptable (record as an assumption).

## Review conclusion

No material issues found. The two P3 items are optional cleanups and do not block completing the task.
