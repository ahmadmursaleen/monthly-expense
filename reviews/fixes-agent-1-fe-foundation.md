# Fix Report

Date: 2026-10-06

Task: fe-foundation - Frontend types, typed API client and formatting helpers

Scope: findings CR-1, CR-2, CR-3 from `reviews/review-agent-1-fe-foundation.md` (all approved by the parent worker)

## Fixed findings

### CR-1 - "Can't reach the server" is never shown when the backend is down in the dev setup

Files changed:
- `frontend/src/api.ts`
- `frontend/src/api.test.ts`

Problem:
With the Vite dev proxy, a stopped backend yields a `502` with an empty body, so the client produced "Request failed (502)" instead of the network message.

Fix:
`toApiError` now uses `NETWORK_ERROR_MESSAGE` as the fallback for 502/503/504 when the body has no JSON string `error`; the HTTP status is kept on the `ApiError`. A server-provided `error` on a gateway status is still used. Tests added for 502 empty text body, 503 null body, 504 non-JSON body, 502 JSON without `error`, and 503 with a JSON `error`. The existing "empty body" generic-message table case was moved from 502 to 500, since 502 now intentionally maps to the network message.

Validation:
- `npx vitest run src/api.test.ts` (frontend) - Pass

### CR-2 - Failures after the response headers escape as non-ApiError exceptions

Files changed:
- `frontend/src/api.ts`
- `frontend/src/api.test.ts`

Problem:
`res.json()` on a 2xx and `res.blob()` in `downloadReport` could throw raw `SyntaxError`/`TypeError`.

Fix:
`json()` converts body-parse failures to `ApiError(res.status, UNEXPECTED_RESPONSE_MESSAGE)` ("Unexpected response from the server", exported). `downloadReport` converts a `blob()` read failure to `ApiError(0, NETWORK_ERROR_MESSAGE)`. Tests added: invalid JSON on 200, empty body on 201, and a rejecting `blob()`.

Validation:
- `npx vitest run src/api.test.ts` (frontend) - Pass

### CR-3 - `ApiErrorBody` is exported but unused

Files changed:
- `frontend/src/api.ts`

Problem:
`toApiError` used an ad-hoc type instead of `ApiErrorBody`.

Fix:
`toApiError` now destructures the body as `Partial<Record<keyof ApiErrorBody, unknown>>`, tying the parsing to the shared type.

Validation:
- type-check via `npm run check` - Pass

## Not fixed

None.

## Validation summary

Focused tests:
- `npx vitest run src/api.test.ts` in `frontend/` - Pass (64 tests)

Full test suite:
- `npm run check` at repo root (lint + backend check + frontend type-check and tests) - Pass (backend 1 test, frontend 163 tests)

Lint/type-check/build:
- Included in `npm run check` - Pass

`.taskcheck`:
- `sh scripts/check.sh` could not be run directly by the fixer (command required approval in this environment); its effective step `npm run check` was run and passed (dependencies already installed). The parent worker should run `.taskcheck` before `done`.

Remaining unresolved findings:
0

## Final status

All validated findings fixed and validation passed.
