---
title: Monthly PDF report endpoint
status: in_progress
owner: R1427WW10P/agent-1
deps: [tx-api]
prio: 1
lease_until: 2026-10-06T09:15:07Z
---
## Goal
`GET /api/reports/YYYY-MM.pdf` per SPEC §6 and §7: a printable report of the complete month.

## Acceptance criteria
- [ ] `backend/src/report.ts`: pure `buildReport(month, transactions, now)` → title ("Expense report:
      October 2026"), generated-at text ("Generated 06.10.2026 10:30"), total, count, category rows
      (label, count, total, share %), transaction rows (formatted date, description, category label,
      formatted amount, newest first), `empty` flag. Money formatted de-DE EUR
- [ ] `renderReportPdf(report)` with pdfkit: A4, sections per SPEC §7, transaction table header repeated
      after page breaks, empty month shows "No transactions this month."
- [ ] Endpoint returns `application/pdf` with `Content-Disposition: attachment;
      filename="expenses-YYYY-MM.pdf"`; always the whole month (ignores query parameters); 400 JSON for
      `2026-13`, `abc`
- [ ] Tests: `buildReport` content incl. empty month and shares; HTTP status, content type, filename,
      body starts with `%PDF`; empty month → 200; 80 transactions render without error (multi-page)
- [ ] Quality gate per AGENTS.md: `reviews/tests-*-pdf-report.md` and `reviews/review-*-pdf-report.md` (plus `reviews/fixes-*-pdf-report.md` if findings were fixed) are committed with the task
- [ ] `.taskcheck` passes

## Notes
`pdfkit` and `@types/pdfkit` are already installed in `backend/`. Do not add npm dependencies
(avoids package-lock conflicts with parallel tasks).
