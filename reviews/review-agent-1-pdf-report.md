# Code Review

Date: 2026-10-06

Task: `pdf-report` - Monthly PDF report endpoint

Scope: last commit on local `main` (`git show HEAD`): `backend/src/report.ts`, `backend/src/report.test.ts`,
`backend/src/routes/report.ts`, `backend/src/routes/report.test.ts`, `backend/src/app.ts`, `docs/ARCHITECTURE.md`.
Uncommitted test-writer changes were ignored (none were present at review time).

Requirements:
- `tasks/pdf-report.md` acceptance criteria and recorded assumptions (server-local generated-at time;
  one-decimal de-DE shares; 400 for anything not exactly `YYYY-MM.pdf`; one-line clipping with ellipsis;
  no font embedding)
- `SPEC.md` §5 (data limits), §6 (API contract), §7 (PDF content)
- `docs/ARCHITECTURE.md`
- `AGENTS.md` conventions
- pdfkit 0.20 `LineWrapper` source (`node_modules/pdfkit/js/pdfkit.js`) to verify page-break behaviour

Git range:
- Branch: main
- HEAD: 1c30b4de873099ad7d9051566c26afaee3a394ae
- Base/start: 1666209 (HEAD~1)
- Commits reviewed: 1

Summary: 0 P0, 0 P1, 0 P2, 2 P3

## Verification notes

These were checked and are **not** findings:

- **`buildReport`**: the title, the `Generated dd.mm.yyyy hh:mm` text, the total and count, the category rows
  (label, count, total, share; sorted by total descending, ties in category table order), the transaction rows
  (newest first: date descending, then id descending) and the `empty` flag all match the criteria.
  Money uses de-DE EUR through `Intl`. The function is pure and gets `now` injected.
- **Page breaks / pdfkit auto page add**: every table cell is drawn with `height: ROW_HEIGHT - 4` and
  `ellipsis: true`. In pdfkit 0.20, `LineWrapper.nextSection()` returns `false` when `height` is set
  (pdfkit.js:4110-4113), so a cell can never trigger `continueOnNewPage`. The renderer controls all page
  breaks explicitly:
  - before each row it checks `doc.y + ROW_HEIGHT > bottom()`;
  - it checks the heading plus the header row plus one data row before starting a table;
  - it redraws the header row after every `addPage()`.
  
  A cell's line height is about 11.6pt at 10pt Helvetica, which fits in the 14pt cell height. Text after a
  newline in a description is cut off with an ellipsis (the `bk.required` branch at pdfkit.js:4038-4054).
  At 10pt, the widest values (1.000.000,00 EUR per transaction; per-category totals) fit their columns.
- **Empty month**: sections 1-3 are rendered with `0,00 €` and "0 transactions". After that, only
  "No transactions this month." is shown and neither table is drawn.
- **Endpoint**: it returns `application/pdf` and `attachment; filename="expenses-YYYY-MM.pdf"`. The filename
  is built only from a month that passed `isValidMonth`, so header injection is not possible. Query
  parameters are not read. `2026-13.pdf`, `abc`, `abc.pdf`, `2026-10`, `2026-1.pdf`, `2026-10.PDF` and
  `2026-00.pdf` get `400 {"error"}` with the shared `INVALID_MONTH` message. The router is mounted before
  the `/api` 404 catch-all.
- **Error handling**: the router uses an async handler on Express 5, so a rejection from `renderReportPdf`
  reaches `apiErrorHandler` and returns a generic `500 {"error"}` without internal details.
- **Architecture**: SQL stays in `transactions.repo.ts`, HTTP handling in `routes/report.ts`, and
  formatting and layout in `report.ts`. No new dependencies were added.
- **Tests**: `vitest run src/report.test.ts src/routes/report.test.ts` passes 21/21. The tests cover every
  item the criteria require: `buildReport` content including the empty month and shares; status, content
  type, filename and `%PDF`; empty month returns 200; 80 transactions render on more than one page.

## P0 Critical

None.

## P1 High

None.

## P2 Medium

None.

## P3 Low

- [ ] **CR-1 | Repeated table header on page breaks is not verified by any test**
    - File: `backend/src/report.test.ts:93`
    - Category: Tests
    - Problem: The 80-transaction test only checks that the PDF has more than one page
      (`/Type /Page` count > 1). pdfkit compresses content streams by default, so no test can check that
      the "Date / Description / Category / Amount" header is drawn again on the following pages. This is
      an explicit acceptance criterion (SPEC §7.5). Today it is only covered by the code at `report.ts:216-220`.
    - Why it matters: If the loop in `drawTable` is changed later (for example, the `drawRow(columns, header, true)`
      call after `addPage()` is removed or moved), all tests would still pass.
    - Suggested fix: Make the check observable. One option: let `renderReportPdf` accept an optional
      `{ compress?: boolean }` (passed to `new PDFDocument`), call it with `compress: false` in the test,
      and assert that the number of `(Amount)` header strings in the output equals the page count minus
      the pages before the table starts. Another option: extract the row/page-break planning into a small
      pure function that returns per-page row lists, and unit-test that each page after the first starts
      with the header.

- [ ] **CR-2 | Stale comment in `createApp` still names the PDF report as a future router**
    - File: `backend/src/app.ts:18`
    - Category: Quality
    - Problem: The comment says "Further API routers (e.g. the PDF report) go above this line", but the PDF
      report router is now mounted on the line above it (`app.ts:17`).
    - Why it matters: It is a small inaccuracy that suggests the report router is still missing.
    - Suggested fix: Change the comment to "Further API routers go above this line: the 404 catch-all must
      stay last."

## Review conclusion

No material issues found. The two P3 items are optional improvements. They do not block the task.
The task's quality-gate criterion also needs `reviews/tests-*-pdf-report.md` and this report to be
committed with the task. The parent worker is responsible for that.
