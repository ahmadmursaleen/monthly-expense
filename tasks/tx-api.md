---
title: REST endpoints: categories, transactions, monthly summary
status: in_progress
owner: R1427WW10P/agent-1
deps: [data-model]
prio: 1
lease_until: 2026-10-06T09:14:41Z
---
## Goal
Implement the JSON part of the API contract (SPEC §6) on top of the repository.

## Acceptance criteria
- [ ] `GET /api/categories`, `GET /api/transactions?month=`, `POST /api/transactions`,
      `PUT /api/transactions/:id`, `DELETE /api/transactions/:id`, `GET /api/summary?month=` with exactly
      the status codes, shapes and error format of SPEC §6
- [ ] Router module(s) under `backend/src/routes/`, mounted in `createApp(db)`. Non-numeric `:id` → 404;
      malformed JSON body → 400 `{error}`; unknown `/api/*` path → 404 JSON
- [ ] supertest tests: each endpoint's happy path and at least one error; a create → list → update →
      summary → delete round trip; month boundaries in list and summary
- [ ] `docs/ARCHITECTURE.md` API table lists the full contract (incl. the PDF endpoint, marked as
      provided by `pdf-report`)
- [ ] Quality gate per AGENTS.md: `reviews/tests-*-tx-api.md` and `reviews/review-*-tx-api.md` (plus `reviews/fixes-*-tx-api.md` if findings were fixed) are committed with the task
- [ ] `.taskcheck` passes

## Notes
Do not add npm dependencies (avoids package-lock conflicts with parallel tasks).
- ASSUMPTION (2026-10-06 10:51+0200 by R1427WW10P/agent-1): PUT checks the id (404) before validating the body (400): an unknown id answers 404 even with an invalid body
- ASSUMPTION (2026-10-06 10:51+0200 by R1427WW10P/agent-1): Unsupported methods on /api paths (e.g. PATCH) answer 404 JSON, not 405; 4xx errors from body-parser map to {error}, others to 500 {error: Internal server error}
