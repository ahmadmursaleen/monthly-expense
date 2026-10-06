# Code Review

Date: 2026-10-06

Task: fe-shell: Dashboard shell: visual direction, month navigation, transaction list

Scope: commit `HEAD` (`git show HEAD`), frontend dashboard shell, design tokens, component stubs and tests. Committed changes only; working tree clean at review time.

Requirements:
- `tasks/fe-shell.md` acceptance criteria and notes (incl. recorded assumptions)
- `SPEC.md` §2, §3, §6, §8
- `docs/ARCHITECTURE.md` (Frontend structure)
- `AGENTS.md` conventions
- `docs/UI-DESIGN.md` (written by this task)

Git range:
- Branch: main
- HEAD: 0d02c00c8a510d78aad32920fa8d70fdf88f4be4
- Base/start: 8b434d97316a890f712b5642c9eea4a795278e0f
- Commits reviewed: 1

Validation run: `npm test -w frontend` passes (7 files, 222 tests). `.taskcheck` was not run by the reviewer.

Summary: 0 P0, 0 P1, 1 P2, 5 P3

## Acceptance criteria check

| Criterion | Result |
|---|---|
| frontend-design, `docs/UI-DESIGN.md` with direction, palette, type, spacing, patterns, Component ownership; tokens in `styles.css`; assumption recorded | Met (assumption present in task notes) |
| Header `monthTitle` + Previous / Today / Next; `?month=YYYY-MM`, missing/invalid -> current month | Met (`useMonthParam.ts`, regex rejects `2026-13`, `2026-1`, empty; URL normalized with `replaceState`) |
| `useMonthData(month)` -> `{transactions, summary, categories, loading, error, reload}`; skeleton; error banner with Retry | Met (see CR-2 for a minor `loading` edge case) |
| `TransactionList` rows, Edit/Delete with `onEdit(tx)`/`onDelete(tx)`, two empty states by `filtered` | Met |
| Notice/toast with `notify(message, kind)` | Met (`useNotify()` in `Notice.tsx`) |
| Stubs with exactly the specified props, wired into the dashboard | Met: `SummaryPanel {summary, categories}` (total only), `FilterBar {categories, filters, onChange}` (null), `filters.ts` (`Filters`, `emptyFilters`, `applyFilters` returns `txs`), `ReportButton {month, onError}` (disabled "Download PDF"), `ExpenseDialog {open, month, transaction, categories, onClose, onSaved}` (null), `DeleteDialog {transaction, onClose, onDeleted}` (null). Add -> `null`, Edit -> row, `onSaved` -> reload + "Saved to <Month YYYY>" for other months, `onDeleted` -> reload. Totals use the unfiltered summary. |
| Own CSS per component; `styles.css` tokens + base only; single column below 720 px | Mostly met (see CR-4); the layout is a single flex column at all widths and the toolbar/header/rows stack at `max-width: 719px` |
| Component tests: month from URL, prev/next/today + refetch, loading, error + Retry, empty month, list order, Edit/Delete open the right dialog with the row | Met (`Dashboard.test.tsx`, `TransactionList.test.tsx`, `Notice.test.tsx`) |
| Quality-gate reports, `.taskcheck` | Pending (parent worker) |

React correctness: stale responses are discarded via the `current` flag in the effect cleanup (tested for month change); StrictMode double effects are safe (`useMonthParam` only rewrites the URL when it differs, listener is removed in cleanup; `NoticeProvider` timer cleanup is idempotent). No `fetch` outside `api.ts`. No secrets or personal data found.

## P0 Critical

None.

## P1 High

None.

## P2 Medium

- [ ] **CR-1 | Prescribed input/control border color fails WCAG non-text contrast**
    - File: `frontend/src/styles.css:14`, `docs/UI-DESIGN.md:60-61`
    - Category: Quality (Accessibility)
    - Problem: `--rule-strong` (`#8fae99`) is the border for `.btn` and is the border UI-DESIGN.md prescribes for all inputs ("`1px solid var(--rule-strong)`"). Its contrast is about 2.3:1 against `--surface` (`#fbfcfa`) and about 2.1:1 against `--paper` (`#edf1ec`), below the 3:1 WCAG 1.4.11 minimum for the boundary of a text input, which has no other visual cue to identify it. Buttons are OK because their text labels them, but `fe-form` and `fe-filters-report` will build the search box, category select and form fields from this rule.
    - Why it matters: SPEC §8 requires "sufficient contrast". UI-DESIGN.md is the contract later UI tasks must follow, so the issue would spread to every input. The doc only claims AA for text colors.
    - Suggested fix: Add a darker border token for form controls (at least 3:1 on `--surface` and `--paper`, e.g. around `#6f8a78` or use `--ink-faint`) and reference it in the "Inputs" pattern in UI-DESIGN.md. Or darken `--rule-strong` if it should still work as a row/sheet rule.

## P3 Low

- [ ] **CR-2 | `loading` reports false while a refetch is in flight after quick back-and-forth navigation**
    - File: `frontend/src/useMonthData.ts:31`, `frontend/src/useMonthData.ts:59-60`
    - Category: Correctness
    - Problem: The request key is `${month}#${version}`, and `version` changes only on `reload()`. Example: on October (`2026-10#0` resolved), click Previous and then Next before September resolves. The key is `2026-10#0` again and equals `result.key`, so `loading` is `false` and the stale October result (or a stale October error banner if October had failed) is shown while the effect refetches October. This contradicts the doc comment on `loading` ("True while a request for the current month ... is in flight"), and `aria-busy` on `<main>` is wrong for that time.
    - Why it matters: The impact is small and short-lived (the old data is shown, and the refetch then replaces it). But a stale error banner can briefly show alongside a retry that is already running, and the contract that other tasks read is inaccurate.
    - Suggested fix: Make each effect run unique, for example a ref counter incremented in the effect and stored in the result, or clear `result` when the effect starts (`setResult(null)` is acceptable here). Alternatively, reword the `loading` docs.

- [ ] **CR-3 | Nested live regions in the notice container**
    - File: `frontend/src/Notice.tsx:50-52`
    - Category: Quality (Accessibility)
    - Problem: The container has `aria-live="polite"`, and each notice inside it also has `role="status"` (implicitly polite live) or `role="alert"` (implicitly assertive live). Nested live regions can make screen readers announce a notice twice, and the outer polite region can conflict with the assertive `alert` for errors.
    - Why it matters: Notices are the shared channel for PDF errors and "Saved to ..." messages that other tasks will use.
    - Suggested fix: Drop `aria-live` from `.notices` and rely on the per-notice roles, or keep the container live region and remove the per-item roles. Keep the error case assertive.

- [ ] **CR-4 | Stub components have no CSS files of their own**
    - File: `frontend/src/FilterBar.tsx`, `frontend/src/ExpenseDialog.tsx`, `frontend/src/DeleteDialog.tsx`
    - Category: Architecture
    - Problem: The AC says "Each component has its own CSS file", and UI-DESIGN.md line 75 says the same. `SummaryPanel` and `ReportButton` got stub CSS files, but `FilterBar`, `ExpenseDialog` and `DeleteDialog` did not.
    - Why it matters: This is minor. Owners can add the files themselves, but the contract is inconsistent and the stubs are not set up the same way.
    - Suggested fix: Add empty `FilterBar.css`, `ExpenseDialog.css` and `DeleteDialog.css` and import them in the stubs. Or state in UI-DESIGN.md that owners create them.

- [ ] **CR-5 | Dashboard-level "filtered" wiring and same-month reload behavior are untested**
    - File: `frontend/src/Dashboard.tsx:20-22`, `frontend/src/Dashboard.tsx:91`, `frontend/src/useMonthData.ts:54`
    - Category: Tests
    - Problem: `isFiltered` (the `query.trim()` / `category` rule documented in UI-DESIGN.md) and the `onClearFilters -> emptyFilters` wiring are only tested inside `TransactionList` with a hand-set prop. No test drives them through the dashboard, for example by mocking `./FilterBar` to call `onChange`. The documented behaviors "previous data stays visible while reloading the same month" and "error banner shown together with retained data when a reload fails" also have no tests.
    - Why it matters: `fe-filters-report` relies on this dashboard behavior and will not change `Dashboard.tsx`, so a regression here would only show up in that later task.
    - Suggested fix: Add a Dashboard test that mocks `FilterBar` and `filters.applyFilters` (return `[]`), calls `onChange({query: " x", category: ""})`, and asserts "No expenses match your filters", then that Clear filters restores the list. Also add a test that `reload` keeps the rows rendered (no skeleton) while the second request is pending.

- [ ] **CR-6 | SPEC §8 says the visual direction goes in ARCHITECTURE.md, but the task writes UI-DESIGN.md**
    - File: `docs/UI-DESIGN.md:1-4` (vs `SPEC.md` §8 "Visual direction")
    - Category: Integration
    - Problem: SPEC §8 says the visual direction is "recorded in `docs/ARCHITECTURE.md` under 'UI design'". The task instead requires `docs/UI-DESIGN.md` and forbids editing ARCHITECTURE.md. The more specific task requirement was followed correctly, but nothing in ARCHITECTURE.md points to the new file, and no assumption records the discrepancy.
    - Why it matters: Later UI agents that follow SPEC §8 will look in ARCHITECTURE.md and find nothing.
    - Suggested fix: Record an assumption (`tasks.py assume fe-shell ...`) and/or create a small follow-up task to add a "UI design" pointer to `docs/UI-DESIGN.md` in ARCHITECTURE.md once `tx-api` is done.

## Review conclusion

No material issues found. All acceptance criteria that can be checked in code are met, and no P0/P1 findings exist. I recommend fixing CR-1 in this task, because UI-DESIGN.md is owned here and later UI tasks will copy the input pattern. The P3 items are optional.
