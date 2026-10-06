---
title: Dashboard shell: visual direction, month navigation, transaction list
status: in_progress
owner: R1427WW10P/agent-2
deps: [fe-foundation]
prio: 1
lease_until: 2026-10-06T09:05:28Z
---
## Goal
The first UI task: set the visual direction with frontend-design and build the dashboard frame
against the API. It also creates the **component contract** below as stubs, so `fe-summary`, `fe-form`
and `fe-filters-report` can run in parallel, each touching only its own files.

## Acceptance criteria
- [ ] Use the `frontend-design` skill. Write `docs/UI-DESIGN.md` (direction, palette, type, spacing,
      component patterns, a "Component ownership" section listing the contract below) and put the design
      tokens as CSS custom properties in `frontend/src/styles.css`. Record
      `python tasks.py assume fe-shell "frontend-design: <direction in one line>"`
- [ ] Header: `monthTitle`, Previous / Today / Next. Month kept in the URL `?month=YYYY-MM`; missing or
      invalid → current month
- [ ] `useMonthData(month)` → `{transactions, summary, categories, loading, error, reload}`; loading
      skeleton; API error banner with Retry
- [ ] `TransactionList`: rows with date, description, category label, amount, Edit and Delete buttons
      (`onEdit(tx)`, `onDelete(tx)`). Two empty states chosen by a `filtered` prop: "No expenses in
      October 2026" with an Add button, and "No expenses match your filters" with Clear filters
- [ ] A notice/toast component with `notify(message, kind)` for other components
- [ ] Stubs with exactly these props, wired into the dashboard (each later task edits only its own file):
  - `SummaryPanel.tsx` `{summary, categories}` (stub shows the total only)
  - `FilterBar.tsx` `{categories, filters, onChange}` (stub renders nothing) and `filters.ts` with
    `type Filters = {query: string; category: string}`, `emptyFilters`, `applyFilters(txs, f)` (stub
    returns `txs`). The dashboard keeps the filter state; the list gets `applyFilters(...)` and
    `filtered` = any filter active. Totals always use the unfiltered month
  - `ReportButton.tsx` `{month, onError(message)}` (stub: disabled "Download PDF")
  - `ExpenseDialog.tsx` `{open, month, transaction: Transaction | null, categories, onClose,
    onSaved(tx)}` (stub returns null). "Add expense" opens it with `null`, Edit with the row. `onSaved` →
    reload; if the saved date is in another month, notify "Saved to September 2026"
  - `DeleteDialog.tsx` `{transaction: Transaction | null, onClose, onDeleted()}` (stub returns null);
    `onDeleted` → reload
- [ ] Each component has its own CSS file; `styles.css` only holds tokens and base styles. Single
      column below 720 px
- [ ] Component tests (mock `api.ts`): month from URL, prev/next/today change month and refetch,
      loading, error + Retry, empty month, list order, Edit/Delete open the right dialog with the row
- [ ] Quality gate per AGENTS.md: `reviews/tests-*-fe-shell.md` and `reviews/review-*-fe-shell.md` (plus `reviews/fixes-*-fe-shell.md` if findings were fixed) are committed with the task
- [ ] `.taskcheck` passes

## Notes
The only frontend task allowed to add npm dependencies (e.g. self-hosted fonts). No chart library
(SPEC §3). Do not edit `docs/ARCHITECTURE.md` (owned by `tx-api` at the same time).
- ASSUMPTION (2026-10-06 10:46+0200 by R1427WW10P/agent-2): frontend-design: Kassenbuch (ledger book) direction - cool green-grey ledger paper, ink-blue text/actions, ruled list rows; Bricolage Grotesque for the month title, Public Sans (tabular figures) for UI; fonts self-hosted via @fontsource-variable
