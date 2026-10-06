# Fix Report

Date: 2026-10-06

Task: seed-smoke

Scope: Findings CR-1 and CR-2 from `reviews/review-agent-1-seed-smoke.md`

## Fixed findings

### CR-1: Default DB path duplicated in seed CLI

Files changed:
- `backend/src/db.ts`
- `backend/src/seed-cli.ts`

Problem:
`seed-cli.ts` repeated the `process.env.DB_PATH ?? "data/expenses.db"` default from `openDb`, so the two could drift apart.

Fix:
Added an exported `defaultDbPath()` to `db.ts`. It returns `process.env.DB_PATH ?? "data/expenses.db"`, and `openDb` now uses it as its default parameter. `seed-cli.ts` calls `defaultDbPath()` for both the path it opens and the path it logs. Behavior is unchanged because `DB_PATH` is still read when the call happens. `grep` now finds the literal only in `db.ts`.

Validation:
- `npm run check`: Pass

### CR-2: Smoke test server start promise never rejects

Files changed:
- `backend/src/smoke.test.ts`

Problem:
The `beforeAll` promise that wraps `listen` had no error handler. If `listen` failed, the hook hung until it timed out instead of failing with the real error.

Fix:
The promise executor now takes `reject` and registers `s.once("error", reject)`.

Validation:
- `npm run check`: Pass

## Not fixed

None.

## Validation summary

Focused tests:
- Covered by the full run below (backend: 9 files, 252 tests pass).

Full test suite:
- `npm run check` (eslint, then tsc and vitest for backend and frontend): Pass. Backend: 252 tests. Frontend: 384 tests.

Lint/type-check/build:
- Included in `npm run check`: Pass

`.taskcheck`:
- Not run by the fixer. It runs the same `npm run check` through `scripts/check.sh`. The parent worker runs it before `done`.

Remaining unresolved findings:
0

## Final status

All validated findings fixed and validation passed.
