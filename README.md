# Monthly Expense Dashboard

A local, single-user web app to record expenses and browse spending month by month: totals and bars per
category, search and a category filter, and a downloadable PDF report for every month. Money is in EUR,
numbers and dates are formatted de-DE (`1.234,56 €`, `06.10.2026`), the UI text is English.

- Requirements: [`SPEC.md`](SPEC.md)
- Architecture, API and environment variables: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- Visual design (the "cash book" direction, tokens, component contract): [`docs/UI-DESIGN.md`](docs/UI-DESIGN.md)

## Install

Needs **Node.js 22.13 or newer** (Node 24 LTS recommended; `node:sqlite` is built in, nothing native to
compile). In the repo root:

```sh
npm install
```

## Seed

```sh
npm run seed -w backend
```

Fills `backend/data/expenses.db` with ~3 months of fictitious expenses up to today. It **replaces all
existing data**, so it is meant for demos. Run it again any time to reset.

## Run

In two terminals:

```sh
npm run dev -w backend     # API on http://localhost:3001
npm run dev -w frontend    # UI on http://localhost:5173, proxies /api to the backend
```

Open http://localhost:5173. The data lives in `backend/data/expenses.db` (git-ignored) and survives
restarts; delete the file to start empty.

Production build of the UI: `npm run build -w frontend` (output in `frontend/dist/`), preview it with
`npx -w frontend vite preview` (also proxies `/api` to the backend).

## Test

```sh
npm run check              # lint + type-check + all tests (backend and frontend)
sh scripts/check.sh        # the same, after `npm ci` if the lockfile changed (what .taskcheck runs)
npm test -w backend        # backend only (includes the API smoke test, src/smoke.test.ts)
npm test -w frontend       # frontend only
```

Backend tests use an in-memory database (the smoke test a temporary file), never the real one.

## Demo script

From SPEC §2. Steps 2–10 happen in the browser.

1. Fresh clone → `npm install` → `npm run seed -w backend` → start backend and frontend → open
   http://localhost:5173.
2. The dashboard opens on the **current month** (e.g. "October 2026"): total spending, category bars and
   the transaction list, newest first.
3. Click **Previous month**: "September 2026" with its own totals and transactions. Click **Today** to
   return. The month is kept in the URL (`?month=2026-09`), so a reload stays on it.
4. **Add expense**: leave the description empty and enter amount `0` → inline validation messages. Fix
   it: "Groceries", `42,50`, Food & Groceries, today → the expense appears at the top, and the total and
   bars update.
5. **Edit** it to `45,00` → the totals update. **Delete** another expense (with confirmation) → it
   disappears.
6. Type "groc" in **Search descriptions** → the list narrows. Pick the category "Transport" → the list
   narrows further, with a "No expenses match your filters" state and **Clear filters**. The total and
   bars still show the full month.
7. **Download PDF** → `expenses-2026-10.pdf` with the month, total, category totals, all transactions of
   the month (filters don't apply) and the generation date.
8. Go to an empty month (e.g. January 2026) → "No expenses in January 2026"; the PDF still downloads and
   says "No transactions this month."
9. Stop the backend and click **Previous month** or reload → an error banner ("Can't reach the server")
   with **Retry**. Restart the backend and retry → the data is still there.
10. Narrow the window to phone width (375 px) → single column, stacked toolbar, two-line rows.

Everything also works from the keyboard: Tab through month navigation, search, category, Download PDF,
Add expense and each row's Edit / Delete; dialogs trap focus and close with Escape.

## Project layout

```
backend/      Express 5 + TypeScript API, SQLite via node:sqlite, PDF report with pdfkit
  src/server.ts            entry point (PORT, DB_PATH)
  src/app.ts               createApp(db): the Express app, used by tests with supertest
  src/db.ts                openDb(): the only module that opens SQLite, runs the schema
  src/domain.ts            categories, validation, month helpers
  src/transactions.repo.ts SQL for transactions and summaries
  src/routes/              HTTP routers: api.ts (transactions, summary, categories), report.ts (PDF)
  src/report.ts            buildReport(): the PDF content as plain data; renderReportPdf() draws it
  src/seed.ts, seed-cli.ts demo data and `npm run seed`
frontend/     React 19 + Vite single-page app, plain CSS
  src/api.ts               the only module that calls fetch
  src/Dashboard.tsx        the page: header, summary, toolbar, list, dialogs
  src/*.tsx + *.css        one component per file (see docs/UI-DESIGN.md for the contract)
  src/format.ts            money, date and month formatting, amount parsing
docs/         ARCHITECTURE.md, UI-DESIGN.md
scripts/      check.sh (the project check)
tasks/        Taskflow task board (`python tasks.py`, see AGENTS.md)
reviews/      test, review and fix reports of every task, plus demo runs
```

Each source file has its test next to it (`foo.ts` + `foo.test.ts`).

## How it was built

This repo was built by autonomous agents following the Taskflow protocol in [`AGENTS.md`](AGENTS.md):
one task file per unit of work in `tasks/`, a quality gate (tests, review, fixes) per task, and
`.taskcheck` on every merge. The original brief is in [`BRIEF.md`](BRIEF.md).
