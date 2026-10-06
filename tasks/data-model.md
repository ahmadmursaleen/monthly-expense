---
title: Backend domain, SQLite schema and transaction repository
status: in_progress
owner: R1427WW10P/agent-1
deps: []
prio: 1
lease_until: 2026-10-06T09:03:06Z
---
## Goal
The backend data layer from SPEC.md §5–6: everything the API and the PDF report need to read and write
transactions. No HTTP code (that is `tx-api`).

## Acceptance criteria
- [ ] `backend/src/domain.ts`: `CATEGORIES` (ids and labels in SPEC §5 order), types `Transaction` and
      `TransactionInput` (camelCase as in SPEC §6), `validateTransactionInput(body)` returning the valid
      value or per-field messages exactly as in SPEC §6, `isValidMonth(s)`, `monthBounds("2026-10")`
- [ ] `migrate()` in `backend/src/db.ts` creates the `transactions` table and the `date` index per SPEC §5
      (`CREATE TABLE IF NOT EXISTS`, `CHECK (amount_cents > 0)`)
- [ ] `backend/src/transactions.repo.ts`: `create`, `update` (null if missing), `remove` (boolean),
      `getById`, `listByMonth` (date desc, then id desc), `summarizeMonth` (`{month, totalCents, count,
      byCategory}`, only categories with spending, total desc). Sets `createdAt`/`updatedAt`
- [ ] Tests: every validation rule (incl. `2026-02-30`, amount 0, whitespace-only and 201-char
      description, unknown category, non-integer cents); repo CRUD; month boundaries (30 Sep vs 1 Oct);
      sort order; summary of an empty month (`totalCents: 0`, `byCategory: []`); data survives closing and
      reopening a temp-file DB
- [ ] Quality gate per AGENTS.md: `reviews/tests-*-data-model.md` and `reviews/review-*-data-model.md` (plus `reviews/fixes-*-data-model.md` if findings were fixed) are committed with the task
- [ ] `.taskcheck` passes

## Notes
Files: `backend/src/domain.ts`, `db.ts`, `transactions.repo.ts` and their tests. Don't touch `app.ts`.
Do not add npm dependencies (avoids package-lock conflicts with parallel tasks).
