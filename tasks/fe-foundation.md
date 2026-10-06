---
title: Frontend types, typed API client and formatting helpers
status: in_progress
owner: R1427WW10P/agent-1
deps: []
prio: 1
lease_until: 2026-10-06T08:54:29Z
---
## Goal
The non-visual base for every UI task: types and a client for the whole API contract (SPEC §6), and
the formatting/parsing helpers. Independent of the backend: test with a mocked `fetch`.

## Acceptance criteria
- [ ] `frontend/src/types.ts`: `Category`, `Transaction`, `TransactionInput`, `MonthSummary` per SPEC §6
- [ ] `frontend/src/api.ts`: `getCategories`, `listTransactions(month)`, `getSummary(month)`,
      `createTransaction`, `updateTransaction`, `deleteTransaction`, `downloadReport(month)` (returns
      `{blob, filename}`). Non-2xx throws an `ApiError` with `status`, `message` and `fields` (from a 400
      body); a network failure throws `ApiError` with the message "Can't reach the server"
- [ ] `frontend/src/format.ts`: `formatMoney(cents)` → `1.234,56 €` (Intl de-DE EUR),
      `formatDate("2026-10-06")` → `06.10.2026`, `monthTitle("2026-10")` → `October 2026`,
      `currentMonth(now)`, `shiftMonth(month, n)` (year rollover), `monthOf(date)`,
      `defaultDateFor(month, today)` (today in the current month, else the 1st), `parseAmount(text)` →
      cents or null: accepts `42`, `42,5`, `42,50`, `42.50`, `1.234,56`; rejects empty, `abc`, `0`, `-5`,
      more than 2 decimals
- [ ] Tests: every api function incl. 400 with fields, 404 and network error; table tests for each
      helper (normalize Intl's non-breaking spaces in assertions)
- [ ] Quality gate per AGENTS.md: `reviews/tests-*-fe-foundation.md` and `reviews/review-*-fe-foundation.md` (plus `reviews/fixes-*-fe-foundation.md` if findings were fixed) are committed with the task
- [ ] `.taskcheck` passes

## Notes
Non-visual: do not use frontend-design, add no components. Replace the existing `getHealth` freely.
Do not add npm dependencies (avoids package-lock conflicts with parallel tasks).
