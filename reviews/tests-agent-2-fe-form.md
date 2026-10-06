# Test Report

Date: 2026-10-06

Task: fe-form - Add, edit and delete expenses

Scope: commit abbde8e (branch main, HEAD abbde8e, base fca7b40): `frontend/src/ExpenseDialog.tsx`,
`DeleteDialog.tsx`, `useModalDialog.ts`, their CSS and tests. No uncommitted production changes.

Requirements:
- `tasks/fe-form.md` acceptance criteria
- `SPEC.md` M1-M3, M9, §6 (validation rules and messages, amount input)
- `AGENTS.md` conventions (tests next to code, only `api.ts` calls fetch)

## Test files changed

- `frontend/src/ExpenseDialog.test.tsx` (extended)
- `frontend/src/DeleteDialog.test.tsx` (extended)
- `frontend/src/useModalDialog.test.tsx` (new)

## Tests added or updated

Count: 49 added (31 ExpenseDialog incl. parameterised cases, 7 DeleteDialog, 11 useModalDialog); no existing test changed.

## Requirement coverage

| Requirement | Tests | Result |
|---|---|---|
| Accessible modal, focus to first field on open, back to opener on close | existing focus tests; `focuses the data-autofocus element on open`, `falls back to the first focusable element...`, `returns focus to the opener on unmount`, `does not fail when the opener was removed...`, DeleteDialog `returns focus to the opener when it closes`, `uses showModal when available and close on unmount`, `opens the dialog with the open attribute where showModal is missing` | Pass |
| Escape/Cancel closes | `calls onClose on Escape and prevents the default`, `ignores other keys`, `handles the native cancel event...`, `closes on the native cancel event (browser Escape)` (both dialogs), `does not call the API when cancelled`, `calls the latest onClose after a rerender`, `stops listening after unmount` | Pass |
| Validation messages per SPEC §6 next to fields | existing; `accepts a description of exactly 200 characters and rejects 201`, `limits the description input to 200 characters`, `accepts the amount %s as %i cents` (0,01 / 1000000 / 42.50 / 42,5), `rejects the amount %j` ("", whitespace, 1e3, 0,00, 1.234.56), `rejects the date %s` (month 13, unpadded, dotted, 2025-02-29), `accepts 29 February in a leap year`, `rejects a category that is not one of the given categories`, `shows only the failing field's message and focuses that field`, `clears validation messages once the input is fixed and resubmitted` | Pass |
| Server 400 `fields` mapped to the same places | existing; `maps server 400 description and category errors and focuses the first one`, `shows the server message when a 400 has only unknown fields`, `shows the server message when a 400 has empty fields` | Pass |
| Other API errors shown in dialog, form kept filled | existing; `shows a 404 on edit in the dialog and keeps the input`, `falls back to a generic message for a non-Error rejection`, `clears the API error alert when resubmitting and succeeds on retry` | Pass |
| Saving state, submit disabled, no double submit | existing; `submits only once while saving`, `submits on Enter in a field (form submit)` | Pass |
| Edit prefill / switching rows | existing; `refills the form when switching to another row` | Pass |
| DeleteDialog question, Cancel/Delete, error, onDeleted | existing; `formats larger amounts with grouping in the question`, `deletes only once when Delete is clicked repeatedly`, `falls back to a generic message for a non-Error rejection`, `clears the error and succeeds on retry` | Pass |
| Safe rendering of user text | `renders HTML in the description as plain text` (both dialogs) | Pass |
| frontend-design / UI-DESIGN consistency | - | Not testable (visual; recorded as assumption) |

## Focused test execution

Command:

`npx vitest run --root frontend src/ExpenseDialog.test.tsx src/DeleteDialog.test.tsx src/useModalDialog.test.tsx`

Result:

Pass (3 files, 75 tests)

## Full test execution

Command:

`npm run check` (eslint + tsc + backend and frontend vitest)

Result:

Pass (backend 229 tests, frontend 11 files / 330 tests). A first run failed on a type error in a new test
(invalid `CategoryId` literal); the test was fixed to use a valid id missing from the `categories` prop.

## .taskcheck

Result:

Not run directly (`sh scripts/check.sh` was denied by the shell permissions); `npm run check`, which it wraps, passes.

## Bugs found

None. No production behavior contradicted the acceptance criteria or SPEC §6.

Observations (not bugs, for the parent to judge):
- A 400 whose `fields` contain only unknown keys (or `{}`) falls back to the dialog alert with the server
  `error` text; unknown field messages are not shown. Reasonable, covered by tests.
- Double-submit protection relies on the `saving` state from the last render; two submits within the
  same React batch could theoretically both pass. Not reproducible via DOM events in tests; the disabled
  button makes it practically unreachable.

## Coverage

Code coverage not measured because the project does not have existing coverage tooling configured.

## Unable to test

- Visual design (frontend-design / docs/UI-DESIGN.md, responsive row stacking below 720px): visual, not
  covered by jsdom tests.
- Real browser focus trapping / inertness of `showModal()`: jsdom lacks it; tested via a stubbed
  `showModal`/`close` and the `open` attribute fallback only.

## Summary

Tests added and all validation passed.
