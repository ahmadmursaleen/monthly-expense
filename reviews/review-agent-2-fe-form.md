# Code Review

Date: 2026-10-06

Task: fe-form - Add, edit and delete expenses

Scope: commit abbde8e (`git show abbde8e`): `frontend/src/ExpenseDialog.tsx`, `DeleteDialog.tsx`,
`useModalDialog.ts`, their CSS and tests

Requirements:
- `tasks/fe-form.md` acceptance criteria and recorded assumptions
- `SPEC.md` M1-M3, M9, §6 (validation messages, amount input), §8 (form, states, accessibility)
- `docs/UI-DESIGN.md` (dialog/input patterns, tokens, component ownership and props contract)
- `AGENTS.md` conventions (only `api.ts` calls fetch, tests next to code, no new dependencies)

Git range:
- Branch: main
- HEAD: abbde8e
- Base/start: fca7b40
- Commits reviewed: 1 (working tree clean)

Summary: 0 P0, 0 P1, 1 P2, 3 P3

Verified as meeting the criteria:
- `ExpenseDialog`: native `<dialog>` via `showModal()`, labelled fields, amount as text parsed with
  `parseAmount`, category placeholder "Choose a category", new date from `defaultDateFor(month, today)`,
  edit prefill with `centsToInput` ("42,50"), POST for new / PUT for edit, trimmed description, cents sent.
- Client validation uses the exact SPEC §6 messages (including the 200-char and 1 000 000 € limits and real
  calendar dates); server `fields` (`amountCents` -> amount) are mapped to the same places; other errors
  are shown in a `role="alert"` with the input kept.
- "Saving…" with submit disabled; success calls only `onSaved(tx)` (the dialog does not close itself, as
  the dashboard contract requires). Escape (keydown and native `cancel`) and Cancel call `onClose`.
- Focus goes to the first field on open and back to the opener on unmount; works under StrictMode
  (opener re-captured on the re-run effect).
- `DeleteDialog`: title "Delete “Groceries” (42,50 €)?", Cancel / Delete, error alert on failure,
  `onDeleted()` on success.
- Props match the `fe-shell` contract in `docs/UI-DESIGN.md` and `Dashboard.tsx` usage; no new
  dependencies; only `api.ts` performs requests.
- `npm test -w frontend -- --run ExpenseDialog DeleteDialog`: 26 tests pass.

## P0 Critical

None.

## P1 High

None.

## P2 Medium

- [ ] **CR-1 | Focus moves to the invalid field before its error is linked, so screen readers miss the message**
    - File: `frontend/src/ExpenseDialog.tsx:118-121` and `:133-134` (with `focusFirstError` at `:142`)
    - Category: Correctness (accessibility)
    - Problem: `setErrors(...)` is followed synchronously by `focusFirstError(...)`, which calls
      `.focus()` on the existing input. With React 19 batching, the state update commits only after the
      handler (or the awaited continuation) returns, so at the moment focus lands the input has no
      `aria-invalid` and no `aria-describedby`, and the `<p id="...-error">` does not exist yet. Screen
      readers announce the field on focus and generally do not re-announce when `aria-describedby` is added
      afterwards, so the user hears "Description, edit text" without "Description is required". The test
      at `ExpenseDialog.test.tsx` ("shows every validation message...") asserts focus and the accessible
      description only after the re-render, so it cannot catch the ordering.
    - Why it matters: SPEC §8 requires field-level validation messages and accessible inputs; UI-DESIGN
      requires the error below the field with `aria-describedby`. The link exists, but it is not in place
      when the field is announced, which is exactly when it is needed.
    - Suggested fix: move focus after the errors are committed, e.g. keep a "focus first error" request in
      state/ref and perform it in a `useEffect`/`useLayoutEffect` keyed on `errors`, or wrap the
      `setErrors` call in `flushSync` before focusing. Optionally add a test that checks, inside a `focus`
      listener on the input, that `aria-describedby` already points to the error.

## P3 Low

- [ ] **CR-2 | Delete dialog's "This can’t be undone." is not exposed as the dialog description**
    - File: `frontend/src/DeleteDialog.tsx:46-50`
    - Category: Correctness (accessibility)
    - Problem: the dialog has `aria-labelledby` only. Focus starts on Cancel, so assistive technology
      announces the title and "Cancel" but not the warning paragraph.
    - Why it matters: the irreversible-action warning is the main content of a confirmation dialog.
    - Suggested fix: give the hint an id and add `aria-describedby` on the `<dialog>`; add a
      `toHaveAccessibleDescription("This can’t be undone.")` assertion.

- [ ] **CR-3 | Hard-coded backdrop color and duplicated dialog panel styles**
    - File: `frontend/src/ExpenseDialog.css:3-15`, `frontend/src/DeleteDialog.css:2-15`
    - Category: Quality (design consistency)
    - Problem: both files repeat the same panel block (width, max-width 28rem, padding, border, radius,
      surface, shadow) and the same literal `rgb(29 42 68 / 0.35)` backdrop. `docs/UI-DESIGN.md` says
      "use the tokens and don't hard-code colors". The two dialogs also already diverge visually: only the
      expense dialog title has the 2px ink rule (`ExpenseDialog.css:26`).
    - Why it matters: any change to the dialog look must be made twice and can drift; the raw color
      bypasses the token system.
    - Suggested fix: since `styles.css` belongs to `fe-shell`, the smallest compliant step is a local
      custom property in each file (or a shared selector covering both classes in one of the owned files)
      referencing `--ink`-derived values; if a `--backdrop` token is wanted in `styles.css`, record it with
      `tasks.py assume`. Decide whether the delete title should share the ink rule for consistency.

- [ ] **CR-4 | Focus return and the native `cancel` path are only partially tested**
    - File: `frontend/src/DeleteDialog.test.tsx`, `frontend/src/ExpenseDialog.test.tsx` ("closes on Cancel and on Escape")
    - Category: Tests
    - Problem: focus return to the opener is tested only for `ExpenseDialog`; `DeleteDialog` (the same
      hook, but a different opener: the row's Delete button) has no such test. Escape is tested only via
      `keydown` on the dialog; the `cancel` listener in `useModalDialog.ts`, which is what a real browser
      fires when focus is not inside the dialog (e.g. after the submit/Delete button becomes disabled),
      is never exercised.
    - Why it matters: both are acceptance-criteria behaviors ("Escape/Cancel closes", "back to the opener
      on close") whose regressions would not be detected.
    - Suggested fix: add a DeleteDialog focus-return test mirroring the ExpenseDialog one, and a test that
      dispatches `new Event("cancel", { cancelable: true })` on the dialog and expects `onClose` once and
      `defaultPrevented` true.

## Review conclusion

Material issues found; fix before completing the task. (No P0/P1; CR-1 is a real accessibility defect in
the validation flow that should be fixed, the P3 items are optional cleanups.)
