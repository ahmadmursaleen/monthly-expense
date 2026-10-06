# Test Report

Date: 2026-10-06

Task: tx-api - REST endpoints: categories, transactions, monthly summary

Scope: commit HEAD `8017353` (tx-api: REST routers ...) on `main`; production files `backend/src/routes/api.ts`, `backend/src/app.ts`; existing tests `backend/src/routes/api.test.ts`. No other uncommitted production changes.

Requirements:
- `tasks/tx-api.md` acceptance criteria
- `SPEC.md` section 6 (API contract, validation)
- `AGENTS.md` conventions (supertest on `createApp(openDb(":memory:"))`, `400 {error, fields?}`)
- Recorded assumptions for tx-api (PUT checks id before body; unsupported methods -> 404 JSON; body-parser 4xx -> `{error}`, other errors -> 500)

## Test files changed

- `backend/src/routes/api.test.ts`

## Tests added or updated

Count: 45 new test cases (from 22 `it`/`it.each` declarations); no existing tests changed or removed. File now has 74 tests.

## Requirement coverage

| Requirement | Tests | Result |
|---|---|---|
| POST validation per SPEC (description <= 200, amount <= 100 000 000, integer, types) | `accepts a description of exactly the max length and rejects one char more`, `accepts the max amount and rejects one cent more`, `rejects %s with only that field` (5 cases) | Pass |
| 400 with `fields` for non-object / non-JSON bodies | `answers 400 with all fields for a JSON array body`, `does not parse a non-JSON content type and answers 400 with fields`, `answers 400 {error} for a JSON primitive body (strict JSON parser)` | Pass |
| Transaction object shape; server owns id/timestamps; PUT is full replace keeping createdAt | `ignores client-supplied id and timestamps on create and update` | Pass |
| Non-numeric / invalid `:id` -> 404, no side effects | `PUT answers 404 for id %j` (1e0, 0x1, +1, unsafe ints), `DELETE answers 404 JSON for id %j and deletes nothing` (0, -1, 1.0, abc, MAX_SAFE_INTEGER) | Pass |
| PUT unknown id with invalid body -> 404 (assumption) | `PUT answers 404 (not 400) for an unknown id with an invalid body` | Pass |
| Malformed JSON body -> 400 `{error}` (PUT too) | `PUT answers 400 {error} for a malformed JSON body` | Pass |
| DELETE removes only the target | `DELETE only removes the targeted transaction` | Pass |
| Month 400 for invalid/array query; month boundaries | `summary answers 400 {error} for %j` (5 cases incl. `month[]=`), `transactions answers 400 for a bracketed month array`, `includes Feb 29 in a leap-year February list and summary`, `handles December/January year boundaries` | Pass |
| JSON content type on success and errors; unknown `/api/*` path -> 404 JSON | `%s %s answers JSON` (5 cases), `unknown nested /api path and unsupported method on /api/categories answer 404 JSON` | Pass |
| Error handler: 413 too large, 415 charset, 500 generic without detail leakage, non-object errors, other 4xx | `answers 413 {error} for a body over the JSON size limit`, `answers 415 {error} for an unsupported JSON charset`, `answers 500 {error} without leaking details when the database fails`, `maps %s to 500 Internal server error` (3 cases), `keeps other 4xx statuses with a generic message` | Pass |

Already covered by the implementer's tests (not duplicated): happy paths of all six endpoints, round trip, month edges in list and summary, empty month, sort order, basic 404/400 cases.

## Focused test execution

Command:

`npx -w backend vitest run src/routes/api.test.ts`

Result:

Pass (74/74) after removing one wrong test case (see note below).

Note: a first draft included "throwing `null` maps to 500". Express treats a falsy thrown value as "no error" and falls through to its default 404, so the error handler is never reached; this is Express behavior, not a production bug, and the case was removed.

## Full test execution

Command:

`npm test -w backend`; `npx eslint backend/src`; `npx -w backend tsc --noEmit`

Result:

Pass: 5 files, 180 tests; eslint clean; tsc clean.

## .taskcheck

Result:

Not run (parent worker runs it before `done`).

## Bugs found

None.

Observation (not a bug, no requirement violated): `parseId` accepts leading zeros, so `/api/transactions/01` addresses id 1. SPEC does not define this; left untested to avoid locking in either behavior.

## Coverage

Code coverage not measured because the project does not have existing coverage tooling configured (no `@vitest/coverage-*` package installed).

## Unable to test

- `apiErrorHandler`'s `res.headersSent` branch: delegating to Express's default handler after headers are sent aborts the connection, which is not reliably observable via supertest. Low risk; no follow-up needed.
- `updatedAt` changing on PUT: `createApp` does not expose the repository clock, so the timestamp cannot be controlled over HTTP; covered at repository level by `transactions.repo.test.ts`.

## Summary

Tests added and all validation passed.
