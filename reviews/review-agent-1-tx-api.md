# Code Review

Date: 2026-10-06

Task: tx-api - REST endpoints: categories, transactions, monthly summary

Scope: commit HEAD (8017353) - `backend/src/routes/api.ts`, `backend/src/app.ts`, `backend/src/routes/api.test.ts`, `docs/ARCHITECTURE.md`

Requirements:
- `tasks/tx-api.md` acceptance criteria and recorded assumptions (PUT checks id before body; unsupported methods -> 404 JSON; body-parser 4xx -> `{error}`, others -> 500)
- `SPEC.md` §3, §5, §6
- `docs/ARCHITECTURE.md`
- `AGENTS.md` conventions (router validates bodies, `400 {"error", "fields"?}`, supertest on `createApp(openDb(":memory:"))`, tests next to code)

Git range:
- Branch: main
- HEAD: 80173539d5e7907ea1368f44ad4fed729be12cbc
- Base/start: HEAD~1 (8b434d9)
- Commits reviewed: 1
- Uncommitted changes: none at start of review

Summary: 0 P0, 0 P1, 0 P2, 2 P3

## Verification performed

- Read the full diff and the full current versions of `routes/api.ts`, `app.ts`, `routes/api.test.ts`, plus `domain.ts`, `transactions.repo.ts`, `app.test.ts`, SPEC §6 and the ARCHITECTURE API section.
- Ran `npx vitest run src/routes/api.test.ts --root backend`: 29/29 tests pass.
- Acceptance criteria check:
  - All six endpoints match SPEC §6 status codes and shapes (categories in §5 order with `{id, label}` only; list sorted date desc, id desc; POST 201; PUT 200/400/404 full replace; DELETE 204 empty body / 404; summary `{month, totalCents, count, byCategory}` with only spent categories, total desc; 400 `{error}` for missing/invalid/duplicated `month`).
  - Router lives in `backend/src/routes/api.ts`, mounted in `createApp(db)`; non-numeric/zero/negative/fractional/unsafe ids -> 404; malformed JSON -> 400 `{error}` via `entity.parse.failed`; unknown `/api/*` path and unsupported method -> 404 JSON.
  - Tests cover each endpoint's happy path and errors, the create -> list -> update -> summary -> delete round trip, and month edges (09-30 / 10-01 / 10-31 / 11-01) for both list and summary.
  - ARCHITECTURE API table lists the full contract including the PDF endpoint, marked as provided by `pdf-report`.
- Architecture: HTTP and validation stay in the router, SQL stays in the repository, no new dependencies, no `any`.
- Security: 500 responses return a generic message (no stack/err message leaked); `:id` is strictly parsed and passed as a bound parameter; query arrays (`?month=a&month=b`) are rejected.
- The quality-gate and `.taskcheck` criteria are the parent worker's responsibility and are not evaluated here.

## P0 Critical

None.

## P1 High

None.

## P2 Medium

None.

## P3 Low

- [ ] **CR-1 | 500 branch of `apiErrorHandler` is untested**
    - File: `backend/src/routes/api.ts:94-105`
    - Category: Tests
    - Problem: The tests only cover the `entity.parse.failed` path (`api.test.ts:57-65`). Nothing checks that an unexpected error becomes `500 {"error": "Internal server error"}` without exposing the original error message.
    - Why it matters: This branch is what keeps internal details (for example SQLite error text) out of API responses. A later change to the handler could break it and no test would catch it.
    - Suggested fix: Add a supertest case that makes a route throw. For example, build `createApp(db)`, call `db.close()`, then `GET /api/transactions?month=2026-10`. Assert status 500, a JSON content type, and a body of exactly `{ error: "Internal server error" }`. Optionally mock `console.error` so the test output stays clean.

- [ ] **CR-2 | Recorded PUT precedence assumption is not pinned by a test**
    - File: `backend/src/routes/api.test.ts:132-138`
    - Category: Tests
    - Problem: The task records this assumption: "PUT checks the id (404) before validating the body (400)". `api.ts:51-55` implements it. However, every PUT 404 test sends a valid body, so the documented precedence (unknown id plus invalid body gives 404) is not tested. A malformed JSON body on PUT is not tested either.
    - Why it matters: If someone reorders the checks, the API's behavior would change quietly, and the frontend may rely on that behavior.
    - Suggested fix: Add one case: `PUT /api/transactions/999` with `{}` should return 404 `{error}`. Consider also adding a malformed-JSON case for PUT.

## Review conclusion

No material issues found. The two P3 items are optional test hardening.
