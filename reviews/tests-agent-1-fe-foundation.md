# Test Report

Date: 2026-10-06

Task: fe-foundation: Frontend types, typed API client and formatting helpers

Scope: last commit on HEAD, `c56b979` (`frontend/src/types.ts`, `api.ts`, `api.test.ts`, `format.ts`, `format.test.ts`), branch `main`. No uncommitted production changes.

Requirements:
- `tasks/fe-foundation.md` acceptance criteria and recorded assumptions
- `SPEC.md` §6 (API contract, validation, amount input)
- `AGENTS.md` conventions (tests next to code, mocked `fetch`, no new dependencies)

## Test files changed

- `frontend/src/api.test.ts` (+128 lines, existing tests unchanged)
- `frontend/src/format.test.ts` (+66 lines, existing tests unchanged)

## Tests added or updated

Count: 87 new test cases, counting table rows (41 in `api.test.ts`, 46 in `format.test.ts`). The frontend suite went from 68 to 155 cases. No existing test was modified or removed.

## Requirement coverage

| Requirement | Tests | Result |
|---|---|---|
| Every API function: network error gives `ApiError` "Can't reach the server" | `describe.each(allCalls) ... network failure` (all 7 functions) | Pass |
| Every API function: 400 gives `status`, `message`, `fields` | `describe.each(allCalls) ... on 400` (all 7), existing createTransaction 400 test | Pass |
| Every API function: 404 gives `ApiError` | `describe.each(allCalls) ... on 404` (all 7) | Pass |
| `ApiError` shape | `ApiError is a real Error named ApiError` | Pass |
| Malformed error bodies (assumption: `Request failed (<status>)`) | `uses the generic message for %s` (empty body, JSON null, string, missing/empty/non-string `error`) | Pass |
| `fields` only taken from a valid string record | `ignores fields that are %s` (array, non-string values, string, null) | Pass |
| Correct URLs / methods / bodies | `encodes the month ...`, `does not send a body or method for GET requests`, `sends the full TransactionInput as JSON on PUT`, existing per-function tests | Pass |
| `downloadReport` returns `{blob, filename}` | `Content-Disposition parsing` table (quoted, unquoted, case-insensitive, extra params, missing filename gives fallback), `returns the body bytes as a Blob` | Pass |
| `formatMoney` gives `1.234,56 €` (Intl NBSP normalized) | extended table (1, 29, 99, 100, 1999, 99999, 100000 cents), `separates the amount and the € sign with a single whitespace character` | Pass |
| `formatDate` | extended table (leap day, December 1st) | Pass |
| `monthTitle` | extended table (February, March, September) | Pass |
| `currentMonth(now)` / `defaultDateFor` default to the system clock | `currentMonth() and defaultDateFor(month) use the system clock` (fake timers) | Pass |
| `shiftMonth` year rollover | extended table (±12, -13, +2 across year-end) | Pass |
| `defaultDateFor` today vs 1st | `at the edges of the month` (Jan 1st / Dec 31st, neighbouring months) | Pass |
| `parseAmount` accept list | extended table: `1234.56`, `42,05`, `42.05`, `0,5`, `19,99`, `0.29`, `1.234,5`, `1.000.000,00`, tab/newline trim | Pass |
| `parseAmount` reject list | extended table: `0.00`, `0,001`, `-0,50`, `+5`, `42,50 €`, `1.000.000`, `1.234.56`, `1.23,45`, `1234.567,89`, `42..5`, `42,,5`, `Infinity`, `NaN`, `0x10` | Pass |
| `types.ts` per SPEC §6 | Checked by `tsc --noEmit` through the typed fixtures in `api.test.ts` | Pass |

## Focused test execution

Command:

`npx vitest run src/api.test.ts src/format.test.ts` (in `frontend/`)

Result:

Pass (154 tests)

## Full test execution

Commands:

- `npm run check -w frontend`: Pass (tsc + 155 tests)
- `npx eslint frontend`: Pass (no findings; no literal non-breaking spaces used, `\s` regex only)
- `sh scripts/check.sh` (lint + type-check + backend and frontend tests): Pass

## .taskcheck

Result:

Pass (`sh scripts/check.sh`)

## Bugs found

None. All the new tests passed against the current implementation.

Observations, not requirement violations (for the parent agent to decide):
- `api.ts` `json()`: when a 2xx response has a body that is not valid JSON, `res.json()` throws a raw `SyntaxError` instead of an `ApiError`. The acceptance criteria only define `ApiError` for non-2xx responses and network failures, so this is not tested. Severity: Low.
- `filenameFrom` ignores RFC 5987 `filename*=` and falls back to `expenses-<month>.pdf`. The backend contract (SPEC §7) only sends plain `filename="..."`, so this has no impact.

## Coverage

Code coverage not measured because the project does not have existing coverage tooling configured (no `@vitest/coverage-*` package).

Manual review: every branch in `send`, `toApiError`, `isStringRecord`, `filenameFrom`, and both `parseAmount` regexes plus the `> 0` guard is exercised by at least one test.

## Unable to test

- Real-browser `fetch` and `Blob` behavior: the tests use jsdom/undici `Response` objects with a mocked `fetch`, as the task requires. No follow-up needed.
- Locale/ICU differences in the Intl output beyond the separator whitespace: depends on the Node ICU build. The tests normalize whitespace only.

## Summary

Tests added and all validation passed.
