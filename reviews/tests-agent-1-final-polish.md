# Test Report

Date: 2026-10-06

Task: final-polish - Polish pass, README and final demo run

Scope: `git diff fd075ce..HEAD` on `main` (HEAD `0c0940b`), tasks/ files ignored. Production changes in scope:
`frontend/src/MonthHeader.tsx` (Today uses `aria-disabled`, click is a no-op on the current month),
`frontend/src/Dashboard.tsx` (focus moves to the `Expenses` section after a successful delete),
`frontend/src/styles.css` / `Dashboard.css` (styles only, not testable in jsdom). No uncommitted
production changes.

Requirements:
- `tasks/final-polish.md` (keyboard path through the whole demo, UI review fixes)
- Assumption recorded on the task: "Today uses aria-disabled so keyboard focus survives, focus moves to the expense list after a delete"
- `AGENTS.md` conventions (tests next to code, components testable with mocked `api.ts`)
- Parent agent's test brief

## Test files changed

- `frontend/src/MonthHeader.test.tsx` (new)
- `frontend/src/Dashboard.test.tsx` (4 tests added, none changed)
- `frontend/src/Dashboard.focus.test.tsx` (new; uses the real `DeleteDialog`, because `Dashboard.test.tsx` stubs the dialogs file-wide)

## Tests added or updated

Count: 16 (6 in MonthHeader.test.tsx, 4 in Dashboard.test.tsx, 6 in Dashboard.focus.test.tsx)

## Requirement coverage

| Requirement | Tests | Result |
|---|---|---|
| Today is aria-disabled on the current month, not natively disabled, and stays focusable | MonthHeader: `is aria-disabled on the current month but stays focusable (no native disabled)`; Dashboard: `Today on the current month stays focusable and does nothing ...` | Pass |
| Clicking Today on the current month is a no-op (no onToday, no URL change, no extra history entry, no refetch) | MonthHeader: `ignores clicks on the current month`; Dashboard: `Today on the current month stays focusable and does nothing (no URL change, history entry or refetch)` | Pass |
| Today from another month navigates and keeps keyboard focus on Today | MonthHeader: `is enabled and calls onToday on another month`, `keeps focus when it becomes the current month after being pressed`; Dashboard: `keeps keyboard focus on Today after it returns to the current month` | Pass |
| After a confirmed delete, focus is on the Expenses section (tabIndex -1), not body | Dashboard: `moves focus to the Expenses section (not focusable by Tab) after onDeleted`; focus: `moves focus to the Expenses section, not <body>, after confirming a delete`, `... when the last row of the month is deleted` | Pass |
| Cancelling/escaping delete returns focus to the row's Delete button | Dashboard: `does not move focus to the Expenses section when the delete dialog is closed without deleting`; focus: `returns focus to the row's Delete button when the delete is cancelled`, `... closed with Escape` | Pass |
| A failed delete does not move focus to the list; the pending flag does not leak into a later cancel | focus: `keeps focus in the dialog when the delete fails, then cancel returns it to the row`, `a cancel after an earlier successful delete still returns focus to the row` | Pass |
| Previous/Next still work | MonthHeader: `calls onPrevious and onNext` | Pass |
| `.btn-danger` hover, `.btn[aria-disabled="true"]` styles | none | Not testable (CSS in jsdom) |

## Focused test execution

Command:

`npm test -w frontend -- src/MonthHeader.test.tsx src/Dashboard.test.tsx src/Dashboard.focus.test.tsx`

Result:

Pass (3 files, 49 tests)

## Full test execution

Commands:

`npm test -w frontend` -> Pass (18 files, 400 tests)

`npm run lint` -> Pass (no findings)

`npm run check` (lint + backend tsc/vitest + frontend tsc/vitest) -> Pass (backend 252 tests, frontend 400 tests)

## .taskcheck

Result:

Not run directly: running `sh scripts/check.sh` was denied by the sandbox. `npm run check`, which
does the same checks without the `npm ci` step, passed.

## Bugs found

None.

## Coverage

Code coverage not measured because the project does not have existing coverage tooling configured.

## Unable to test

- CSS changes (`.btn-danger:hover`, `.btn[aria-disabled="true"]` visuals): jsdom does not apply
  stylesheets. Needs a manual or real-browser check if wanted; no follow-up task needed.
- Real-browser focus behavior of native `<dialog>.showModal()`: jsdom falls back to the `open`
  attribute (see `useModalDialog`), so the tests check the React effect order (the dialog's
  focus-return cleanup runs before the Dashboard effect), not browser-specific focus handling.

## Summary

Tests added and all validation passed.
