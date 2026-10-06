---
title: Seed script and end-to-end API smoke test
status: todo
owner:
deps: [pdf-report]
prio: 2
---
## Goal
Make the demo look alive (SPEC S1) and prove the whole backend flow against a real server (SPEC S2).

## Acceptance criteria
- [ ] `npm run seed -w backend`: replaces all transactions with 40–60 fictitious expenses spread over
      the current month and the 2 previous months (relative to today), every category used; uses
      `DB_PATH` like the server; prints what it did
- [ ] The data comes from a pure `generateSeed(today)`; tests check count, months covered, and that every
      item passes `validateTransactionInput`
- [ ] `backend/src/smoke.test.ts`: starts the real app on port 0 with a temp-file DB and uses `fetch`:
      health → categories → create → list → update → summary → PDF → delete → empty list. Runs in the
      normal test run in under 5 s
- [ ] Quality gate per AGENTS.md: `reviews/tests-*-seed-smoke.md` and `reviews/review-*-seed-smoke.md` (plus `reviews/fixes-*-seed-smoke.md` if findings were fixed) are committed with the task
- [ ] `.taskcheck` passes

## Notes
Backend only. Do not add npm dependencies (avoids package-lock conflicts with parallel tasks).
