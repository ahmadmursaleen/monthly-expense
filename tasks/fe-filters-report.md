---
title: Search, category filter and PDF download
status: done
owner: R1427WW10P/agent-1
deps: [fe-shell]
prio: 2
lease_until: 
---
## Goal
SPEC M6, M7: narrow the list by description and category, and download the monthly PDF.

## Acceptance criteria
- [ ] Uses the `frontend-design` skill, consistent with `docs/UI-DESIGN.md`; record it with `python tasks.py assume fe-filters-report "frontend-design: <what it decided>"`
- [ ] `FilterBar`: search input labelled "Search descriptions", category select with "All categories",
      a Clear button while a filter is active
- [ ] `applyFilters`: trimmed, case-insensitive substring on description; exact category; both combine.
      Pure and unit-tested
- [ ] `ReportButton`: "Download PDF" → `downloadReport(month)` → saves `expenses-YYYY-MM.pdf` (object URL
      + temporary link); "Generating…" while busy; failure → `onError("Couldn't generate the PDF report.
      Try again.")`. It never receives filters: the PDF is always the full month
- [ ] Tests: filter combinations incl. no match, Clear, button busy state, filename used for the
      download (mock `URL.createObjectURL`), error → `onError`
- [ ] Quality gate per AGENTS.md: `reviews/tests-*-fe-filters-report.md` and `reviews/review-*-fe-filters-report.md` (plus `reviews/fixes-*-fe-filters-report.md` if findings were fixed) are committed with the task
- [ ] `.taskcheck` passes

## Notes
Owns `FilterBar.tsx`, `filters.ts`, `ReportButton.tsx` and their CSS/tests only. Keep the props from
`fe-shell`; if the contract is insufficient, make the smallest change elsewhere and record it with
`tasks.py assume`. Do not add npm dependencies (avoids package-lock conflicts with parallel tasks).
- ASSUMPTION (2026-10-06 11:07+0200 by R1427WW10P/agent-1): frontend-design: kept the cash-book direction quiet - visible sentence-case labels above 40px fields with --control-border, Clear as a .btn-quiet at field height, outlined .btn for Download PDF (Add expense stays the one primary); fields stack full width below 720px
- ASSUMPTION (2026-10-06 11:07+0200 by R1427WW10P/agent-1): Changed .dashboard__toolbar align-items center->flex-end in Dashboard.css (fe-shell file) so buttons line up with the labelled fields instead of floating mid-label
- ASSUMPTION (2026-10-06 11:07+0200 by R1427WW10P/agent-1): ReportButton always saves as expenses-<month>.pdf (per acceptance criteria) and ignores the Content-Disposition filename returned by downloadReport
- ASSUMPTION (2026-10-06 11:12+0200 by R1427WW10P/agent-1): Moved isFiltered from Dashboard.tsx into filters.ts (exported) so FilterBar's Clear and the list's filtered state share one definition
