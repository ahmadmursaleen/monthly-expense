# Code Review

Date: 2026-10-06

Task: seed-smoke: Seed script and end-to-end API smoke test

Scope: `git diff 7cef0d0 HEAD -- backend/` (committed changes only)

Requirements:
- tasks/seed-smoke.md acceptance criteria and notes (including the recorded generateSeed assumption)
- SPEC.md S1/S2 (as referenced by the task)
- AGENTS.md conventions (backend layering, tests next to code, no new dependencies)
- Existing code: db.ts, domain.ts, transactions.repo.ts, routes/report.ts, server.ts

Git range:
- Branch: main
- HEAD: 74dc9e2
- Base/start: 7cef0d0
- Commits reviewed: 3 (a9436b5 implementation, 9e27828 claim, 74dc9e2 merge)

Summary: 0 P0, 0 P1, 0 P2, 2 P3

## Acceptance criteria check

- `npm run seed -w backend`: `seed` script added (`tsx src/seed-cli.ts`). CLI calls `replaceAll`, which deletes all rows and inserts the new ones in a single transaction and rolls back on failure. Item count is 3 x (8 + 6..10) = 42..54, inside 40-60. Covers the current month and the 2 previous ones, every category in every month, never after today. Reads `DB_PATH` and prints the deleted/inserted counts and the months. Met.
- Pure `generateSeed(today)`: deterministic (PRNG seeded from the date string), no I/O. Tests check count (5 dates, including a leap day and both year ends), months covered (including the year boundary), every category, and `validateTransactionInput` for every item. Met.
- `smoke.test.ts`: real `listen(0)`, temp-file DB, `fetch`, the full flow health -> categories -> create -> list -> update -> summary -> PDF -> delete -> empty list, 5000 ms timeout, part of the normal vitest run. The asserted headers match `routes/report.ts`. Met.
- No dependencies were added (package.json only gains a script). Layering is respected: SQL is in the repo, only db.ts opens SQLite.
- The quality-gate reports and `.taskcheck` are the parent worker's responsibility. This report does not evaluate them.

## P0 Critical

None.

## P1 High

None.

## P2 Medium

None.

## P3 Low

- [ ] **CR-1 | Seed CLI duplicates the default DB path instead of reusing openDb's default**
    - File: `backend/src/seed-cli.ts:7`
    - Category: Quality
    - Problem: `const dbPath = process.env.DB_PATH ?? "data/expenses.db";` copies the fallback that `openDb()` already defines (`backend/src/db.ts:6`). The server uses `openDb()` with no argument.
    - Why it matters: The acceptance criterion says the seed script must use `DB_PATH` "like the server". If someone changes the default in db.ts, the seed script will quietly write to a different file than the server reads.
    - Suggested fix: Export the default path from db.ts (e.g. `export const DEFAULT_DB_PATH`) or a `resolveDbPath()` helper. Use it in both `openDb` and the CLI's log line.

- [ ] **CR-2 | Smoke test server start does not reject on listen errors**
    - File: `backend/src/smoke.test.ts:21-23`
    - Category: Tests
    - Problem: The `beforeAll` promise only resolves in the `listen` callback. It never attaches an `error` listener. If binding fails (e.g. a sandbox blocks the loopback socket), the hook hangs until vitest's hook timeout and the real cause is not shown.
    - Why it matters: This makes CI or sandbox failures in the end-to-end test hard to diagnose.
    - Suggested fix: Add `s.once("error", reject)` inside the promise executor.

## Observations (outside the reviewed committed scope)

- The working tree has an uncommitted change to `backend/src/transactions.repo.test.ts`, probably from the test-writer. It adds a test, "commits the replacement durably to a file database", that fails with `ReferenceError: dir is not defined` (line 339). With this change, `npm test -w backend` reports 1 failed / 245 passed. It is not part of the committed diff reviewed here. The parent must fix or drop it before running `.taskcheck` / `done`.

## Review conclusion

No material issues found. The committed implementation meets the seed-smoke acceptance criteria. CR-1 and CR-2 are optional cleanups. The uncommitted failing test noted above must be resolved before completion.
