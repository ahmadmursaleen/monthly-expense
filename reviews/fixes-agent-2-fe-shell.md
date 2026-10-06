# Fix Report

Date: 2026-10-06

Task: fe-shell: Dashboard shell: visual direction, month navigation, transaction list

Scope: Findings from `reviews/review-agent-2-fe-shell.md` (CR-1 to CR-4) and the month-regex edge case from
`reviews/tests-agent-2-fe-shell.md`. The test-writer already covered CR-5, and the parent handles CR-6.

## Fixed findings

### CR-1: Control border color fails WCAG non-text contrast

Files changed:
- `frontend/src/styles.css`
- `docs/UI-DESIGN.md`

Problem:
`.btn` used `--rule-strong` (`#8fae99`) for its border, and UI-DESIGN.md prescribed the same color for inputs. That color gives 2.35:1 on `--surface` and 2.12:1 on `--paper`, below the 3:1 minimum.

Fix:
Added a new token, `--control-border: #677f6f`, with a computed contrast of 4.21:1 on `--surface` and 3.80:1 on `--paper`. `.btn` now uses it for its border. In UI-DESIGN.md, the Palette table now lists the token and marks `--rule`/`--rule-strong` as decorative only, and the Inputs pattern now says to use `1px solid var(--control-border)`. The remaining `--rule-strong` uses (list rules and the notice panel border) are decorative, so they stay as they are.

Validation:
- `npm run check`: Pass

### CR-2: `loading` was false after A -> B -> A navigation

Files changed:
- `frontend/src/useMonthData.ts`
- `frontend/src/useMonthData.test.ts`

Problem:
The request key was `${month}#${version}`, and `version` only changed on reload. Returning to a month before the other month loaded produced the old key again. The result was `loading: false` with a stale result or a stale error banner.

Fix:
State is now `{ month, seq }`. `seq` increases on every month change (derived state, updated during render when the `month` prop changes) and on every `reload()`. The key is `${month}#${seq}`, so every request is unique. Added two regression tests:
- A -> B -> A reports `loading: true` and ignores B's late response.
- Returning to a month whose load failed shows no stale error while it refetches.

Validation:
- `npm run check`: Pass (the new tests would fail against the old key scheme, where the key equals `result.key`)

### CR-3: Nested live regions in Notice

Files changed:
- `frontend/src/Notice.tsx`

Problem:
The `.notices` container had `aria-live="polite"`, and each notice also had `role="status"` or `role="alert"`. Screen readers could announce a notice twice.

Fix:
Removed `aria-live` from the container and kept the per-notice roles, so errors are still announced assertively. The existing Notice tests pass unchanged.

Validation:
- `npm run check`: Pass

### CR-4: Stub components had no CSS files

Files changed:
- `frontend/src/FilterBar.css` (new), `frontend/src/FilterBar.tsx`
- `frontend/src/ExpenseDialog.css` (new), `frontend/src/ExpenseDialog.tsx`
- `frontend/src/DeleteDialog.css` (new), `frontend/src/DeleteDialog.tsx`

Problem:
The AC and UI-DESIGN.md say each component has its own CSS file, but these three stubs had none.

Fix:
Added a minimal CSS file for each stub (an owner comment plus one root class) and imported it in the stub.

Validation:
- `npm run check`: Pass

### Tests-report edge case: years below 1000 were accepted in `?month=`

Files changed:
- `frontend/src/useMonthParam.ts`
- `frontend/src/useMonthParam.test.ts`

Problem:
`^\d{4}-...` accepted `0050-06`. `Date.UTC` maps years 0-99 to 1900-1999, so such a month was rendered wrongly.

Fix:
The regex is now `^[1-9]\d{3}-(0[1-9]|1[0-2])$`. Added tests: `0000-01`, `0050-06` and `0999-12` fall back to the current month, and `1000-01` and `9999-12` are accepted.

Validation:
- `npm run check`: Pass

## Not fixed

### CR-5: Dashboard filtered wiring and reload tests

Status:
Out of scope for this fixer run

Reason:
The parent reports that the test-writer already added this coverage.

### CR-6: SPEC section 8 vs UI-DESIGN.md location

Status:
Out of scope for this fixer run

Reason:
The parent worker handles it (assumption or follow-up task).

## Validation summary

Focused tests:
- `npm run check` (includes the frontend vitest run): Pass, 8 files, 255 tests

Full test suite:
- `npm run check` (lint, type-check, backend 180 tests, frontend 255 tests): Pass

Lint/type-check/build:
- `eslint .` and `tsc --noEmit` (backend and frontend): Pass

`.taskcheck`:
- `sh scripts/check.sh`: Pass

Remaining unresolved findings:
0 in the supplied scope (CR-5 and CR-6 are handled elsewhere)

## Final status

All validated findings are fixed and validation passed.
