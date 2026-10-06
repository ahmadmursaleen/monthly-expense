# Code Review

Date: 2026-10-06

Task: fe-filters-report - Search, category filter and PDF download

Scope: implementation commit f59de29 (task commits 7bbdc35..f59de29; the others are claim/assume bookkeeping)

Requirements:
- tasks/fe-filters-report.md (acceptance criteria and notes)
- SPEC.md M6, M7
- docs/UI-DESIGN.md (inputs, buttons, below-720px rules, component ownership/contract)
- docs/ARCHITECTURE.md, AGENTS.md conventions

Git range:
- Branch: main
- HEAD: f59de2908ce5b4fd8d20a33f72332a588d5b3dae
- Base/start: 7bbdc35 (claim)
- Commits reviewed: 1 implementation commit (f59de29)
- Uncommitted changes: none

Validation run: `npm run check` passes (lint, tsc, backend 229 tests, frontend 287 tests).

Summary: 0 P0, 0 P1, 1 P2, 1 P3

## Acceptance criteria check

- FilterBar: label "Search descriptions" (visible `<label htmlFor>`), select with "All categories" option, Clear rendered only while `query.trim()` or `category` is non-empty. Met.
- applyFilters: trimmed, lower-cased substring on description; exact category match; AND combination; pure (`filter` returns a new array). Unit-tested incl. whitespace query, no match, combination, non-mutation. Met.
- ReportButton: calls `downloadReport(month)`, saves `expenses-${month}.pdf` via object URL + temporary appended/removed anchor, revokes the URL; "Generating…" + disabled while busy; any failure calls `onError("Couldn't generate the PDF report. Try again.")`; props are only `{month, onError}` so filters cannot reach it. Met.
- Tests: filter combinations incl. no match, Clear (hidden/shown/reset), busy state, filename with mocked `URL.createObjectURL`, error -> onError. Met.
- Props contract from fe-shell / UI-DESIGN.md kept unchanged. The one edit outside owned files (`Dashboard.css` `align-items: flex-end`) is minimal and recorded with `tasks.py assume`.
- Styling uses tokens only (`--control-border`, `--surface`, `--radius-md`, 2.5rem = 40 px fields), visible labels above fields, stacks full width below 720 px. Consistent with UI-DESIGN.md.
- Quality-gate report files and `.taskcheck` via `done` are the parent worker's remaining steps (not a code finding).

## P0 Critical

None.

## P1 High

None.

## P2 Medium

- [ ] **CR-1 | Activating Clear removes the focused button, dropping keyboard focus to the document**
    - File: `frontend/src/FilterBar.tsx:48`
    - Category: Correctness (accessibility)
    - Problem: Clear is rendered only while `active` is true. Clicking it calls `onChange(emptyFilters)`, which makes `active` false and unmounts the button that currently has focus. Keyboard and screen-reader users are left with focus on `<body>` and must tab again from the start of the page.
    - Why it matters: SPEC M10 asks for a polished UI and the design doc targets WCAG AA; losing focus on a common action is a WCAG 2.4.3 (focus order) problem and is easy to hit.
    - Suggested fix: keep a ref to the search input and focus it in the Clear handler after calling `onChange(emptyFilters)`. Add a test asserting the search input has focus after clicking Clear.

## P3 Low

- [ ] **CR-2 | "Filter is active" predicate duplicated between FilterBar and Dashboard**
    - File: `frontend/src/FilterBar.tsx:17` (duplicate of `frontend/src/Dashboard.tsx:20` `isFiltered`)
    - Category: Quality
    - Problem: `filters.query.trim() !== "" || filters.category !== ""` is written out again in FilterBar. The Clear-visibility rule and the dashboard's `filtered` flag (which drives the "No matching expenses / Clear filters" empty state) must stay identical, but nothing ties them together.
    - Why it matters: if one side changes (e.g. trimming rules), the Clear button and the list's filtered empty state can disagree.
    - Suggested fix: export `isFiltered(f)` from `filters.ts` (owned by this task) and use it in FilterBar; Dashboard can switch to it in a later fe-shell change, or now as a minimal recorded edit.

## Review conclusion

Material issues found; fix before completing the task. (No blocking defects; CR-1 is a worthwhile accessibility fix, CR-2 optional.)
