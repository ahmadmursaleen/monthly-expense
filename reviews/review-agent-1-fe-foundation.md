# Code Review

Date: 2026-10-06

Task: fe-foundation - Frontend types, typed API client and formatting helpers

Scope: last commit on HEAD (`git show HEAD`): `frontend/src/types.ts`, `api.ts`, `api.test.ts`, `format.ts`, `format.test.ts`

Requirements:
- `tasks/fe-foundation.md` acceptance criteria and recorded assumptions
- `SPEC.md` §2 (demo script), §3, §5, §6
- `docs/ARCHITECTURE.md` (frontend structure, API section)
- `AGENTS.md` conventions

Git range:
- Branch: main
- HEAD: c56b979 (c56b97912758a8d0fc6964ccddea04d993570cb7)
- Base/start: b7df689
- Commits reviewed: 1
- Uncommitted changes at review time: none

Verification run: `npx vitest run` in `frontend/` -> 3 files, 120 tests passed.

Summary: 0 P0, 0 P1, 1 P2, 2 P3

## P0 Critical

None.

## P1 High

None.

## P2 Medium

- [ ] **CR-1 | "Can't reach the server" is never shown when the backend is down in the documented dev setup**
    - File: `frontend/src/api.ts:20-28` (`send`), `frontend/src/api.ts:30-42` (`toApiError`)
    - Category: Integration
    - Problem: The network-failure message is only produced when `fetch` itself rejects. In the documented setup (ARCHITECTURE.md: the UI always uses relative `/api` URLs proxied by the Vite dev server), a stopped backend does not make `fetch` reject: Vite's proxy error handler answers `502` with an empty `text/plain` body (`node_modules/vite/dist/node/chunks/node.js:19909`, `res.writeHead(502, ...)`). `toApiError` then fails to parse JSON and produces `ApiError(502, "Request failed (502)")`.
    - Why it matters: SPEC §2 step 9 ("Stop the backend -> the UI shows an API error with a retry") is exactly the case where the user should see "Can't reach the server"; instead they get a technical status code message. The acceptance criterion's intent (a clear network-failure message) is met only in unit tests with a mocked rejecting `fetch`, not in the real integration.
    - Suggested fix: In `toApiError`, when the response is a gateway error (502/503/504) with no parseable JSON `error` body, use `NETWORK_ERROR_MESSAGE` (keeping or mapping the status as the team prefers, and recording it with `tasks.py assume`). Add a test: `new Response("", { status: 502 })` -> message "Can't reach the server".

## P3 Low

- [ ] **CR-2 | Failures after the response headers escape as non-ApiError exceptions**
    - File: `frontend/src/api.ts:56-58` (`json`), `frontend/src/api.ts:85-89` (`downloadReport`)
    - Category: Correctness
    - Problem: `res.json()` on a 2xx response and `res.blob()` in `downloadReport` are outside the `try/catch` in `send`. A malformed 2xx body throws a raw `SyntaxError`, and a connection dropped mid-body (plausible for the PDF stream) throws a raw `TypeError`. This contradicts the `ApiError` doc comment ("Thrown for every failed request") that UI tasks will rely on, e.g. to read `err.message` for the error banner or PDF toast.
    - Why it matters: Callers that `catch (e) { if (e instanceof ApiError) ... }` would miss these, and a raw message such as "Unexpected token <" could reach the UI.
    - Suggested fix: Wrap body reading in `json()`/`downloadReport` and convert failures to `ApiError(res.status or 0, NETWORK_ERROR_MESSAGE or a generic message)`; add one test with a 200 response carrying invalid JSON.

- [ ] **CR-3 | `ApiErrorBody` is exported but unused**
    - File: `frontend/src/types.ts:51-54`
    - Category: Quality
    - Problem: `toApiError` (`api.ts:39`) destructures an ad-hoc `{ error?: unknown; fields?: unknown }` instead of using `ApiErrorBody`, and nothing else in `frontend/src` references the type.
    - Why it matters: Dead type that can drift from the actual parsing logic.
    - Suggested fix: Either remove it or use it in `toApiError` (e.g. `Partial<Record<keyof ApiErrorBody, unknown>>`).

## Notes (verified, no finding)

- All required types, API functions and helpers exist with the signatures in the acceptance criteria; types match SPEC §6 field names and the 8 category ids of §5.
- `fetch` is only called from `api.ts`; removed `getHealth` has no remaining references.
- `parseAmount` accepts/rejects every example listed in the AC; the `1.234` rejection and the missing upper bound are recorded assumptions.
- `shiftMonth` rollover (incl. multi-year and negative shifts), `monthTitle` (UTC-pinned), `defaultDateFor` and local-date `toISODate` are correct and table-tested; money assertions normalize Intl's non-breaking spaces.
- Tests cover every API function, a 400 with `fields`, 404s, a network error and a non-JSON error body. Network error and 400-with-fields are each exercised through one function only; acceptable since all functions share `send`.
- The quality-gate report files and `.taskcheck` criteria are the parent worker's responsibility and were not evaluated here.

## Review conclusion

Material issues found; fix before completing the task (CR-1 is the only material item; CR-2 and CR-3 are optional cleanups).
