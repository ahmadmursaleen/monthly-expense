# Fix Report

Date: 2026-10-06

Task: fe-form - Add, edit and delete expenses

Scope: findings CR-1 to CR-4 from `reviews/review-agent-2-fe-form.md`, limited to `frontend/src/ExpenseDialog.tsx`,
`DeleteDialog.tsx`, `useModalDialog.ts`, their CSS and tests (`styles.css` is owned by fe-shell and was not touched)

## Fixed findings

### CR-1 - Focus moves to the invalid field before its error is linked

Files changed:
- `frontend/src/ExpenseDialog.tsx`
- `frontend/src/ExpenseDialog.test.tsx`

Problem:
`setErrors(...)` was followed right away by `.focus()`. Because React batches the update, the field got focus
before it had `aria-invalid`/`aria-describedby` and before the error `<p>` existed, so screen readers announced
the field without its message.

Fix:
`showErrors(found)` now sets a `pendingFocus` ref and calls `setErrors`. A `useLayoutEffect` reads the ref after
the commit and focuses the first invalid field (`FIELD_ORDER`), so the error link is in the DOM when focus
lands. This covers client validation and server 400 `fields`. The `focusFirstError` helper was removed.
Two regression tests use a `focus` listener to record `aria-invalid` and the described-by text at the
moment focus lands (client and server paths). I checked that both tests fail when the old synchronous focus
is put back.

Validation:
- `npm test -w frontend -- --run ExpenseDialog` - Pass (53 tests); 2 new tests fail with the old ordering

### CR-2 - Delete dialog warning is not the dialog description

Files changed:
- `frontend/src/DeleteDialog.tsx`
- `frontend/src/DeleteDialog.test.tsx`

Problem:
The `<dialog>` had only `aria-labelledby`, so "This can't be undone." was not announced.

Fix:
The hint has the id `${id}-hint`, and the dialog references it with `aria-describedby`. The test now checks
`toHaveAccessibleDescription("This can't be undone.")`.

Validation:
- `npm run check` - Pass

### CR-3 - Hard-coded backdrop color; title styling differs between dialogs

Files changed:
- `frontend/src/ExpenseDialog.css`
- `frontend/src/DeleteDialog.css`

Problem:
Both files hard-coded `rgb(29 42 68 / 0.35)` for the backdrop. Only the expense dialog title had the 2px
ink rule.

Fix:
Both backdrops now use `color-mix(in srgb, var(--ink, #1d2a44) 35%, transparent)`. The `#1d2a44` fallback
equals the `--ink` token. It is there because older browsers do not let `::backdrop` inherit custom
properties from `:root`. The delete title now has the same `padding-bottom: var(--space-2); border-bottom:
2px solid var(--ink)`, and the hint margin went from `--space-2` to `--space-3` so it sits clear of the rule.
As instructed, each component keeps its own panel block in its own CSS file (the panel duplication remains;
see Not fixed). No new tokens were added and `styles.css` was not edited.

Validation:
- `npm run check` - Pass (lint included)

## Not fixed

### CR-3 (part) - Duplicated dialog panel block

Status:
Out of scope (by parent instruction)

Reason:
The parent said to keep each component's CSS in its own file. Sharing the panel block would need a shared
selector or a token/class in `styles.css`, which belongs to fe-shell.

### CR-4 - DeleteDialog focus return and native cancel tests

Status:
Invalid (no longer valid)

Reason:
The test-writer had already added these tests. `DeleteDialog.test.tsx` has "returns focus to the opener when it
closes" and "closes on the native cancel event (browser Escape)", which checks `onClose` is called once and
`defaultPrevented`. `ExpenseDialog.test.tsx` and `useModalDialog.test.tsx` also cover the native `cancel`
path. No changes were needed.

## Validation summary

Focused tests:
- `npm test -w frontend -- --run ExpenseDialog` - Pass (53)

Full test suite:
- `npm run check` - Pass (backend 229 tests, frontend 332 tests)

Lint/type-check/build:
- `eslint .` and `tsc --noEmit` (both run by `npm run check`) - Pass

`.taskcheck`:
- `sh scripts/check.sh` - Pass

Remaining unresolved findings:
0 in scope (the CR-3 panel duplication is out of scope by instruction)

## Final status

All validated findings fixed and validation passed.
