# Demo run: final-polish, 2026-10-06

Run by agent-1 on macOS (Darwin 24.6), Node 22+, on the real servers with the real DB file
(`backend/data/expenses.db`). The agent is headless: API steps were run with `curl`, the browser-only
parts (layout, keyboard path) were checked by CSS/code review and component tests.

| # | Step | Command / check | Result |
|---|---|---|---|
| 1 | Install | `npm install` | PASS: up to date |
| 2 | Seed | `npm run seed -w backend` | PASS: "inserted 50", months 2026-08, 2026-09, 2026-10 (up to 2026-10-06) |
| 3 | Backend | `npm run start -w backend`, `GET /api/health` | PASS: `{"ok":true}` |
| 4 | Frontend build | `npm run build -w frontend` | PASS: built in 0.5 s, JS 238 kB (74 kB gzip), CSS 14 kB, fonts self-hosted |
| 5 | Serve build | `npx -w frontend vite preview --port 4173`, `GET /` and `GET /api/summary?month=2026-01` via the preview proxy | PASS: index.html with hashed assets; proxied API answers 200 |
| 6 | Categories | `GET /api/categories` | PASS: 8 categories in SPEC §5 order |
| 7 | Current month (demo 2) | `GET /api/summary?month=2026-10`, `GET /api/transactions?month=2026-10` | PASS: total 97139 cents, 18 tx, byCategory sorted by total desc; list date desc, then id desc |
| 8 | Previous month (demo 3) | `GET /api/summary?month=2026-09` | PASS: total 142270 cents, 15 tx |
| 9 | Validation (demo 4) | `POST /api/transactions` with empty description and amount 0 | PASS: 400 with `fields.description` "Description is required" and `fields.amountCents` "Amount must be greater than zero" |
| 10 | Create (demo 4) | `POST` "Groceries", 4250, food, 2026-10-06 | PASS: 201, id 51, first in the October list |
| 11 | Edit (demo 5) | `PUT /api/transactions/51` amount 4500 | PASS: 200, `updatedAt` changed |
| 12 | Delete (demo 5) | `DELETE /api/transactions/50` | PASS: 204 |
| 13 | Totals update | `GET /api/summary?month=2026-10` | PASS: 93169 = 97139 + 4500 - 8470, count 18 |
| 14 | PDF current month (demo 7) | `GET /api/reports/2026-10.pdf` | PASS: 200, `application/pdf`, `attachment; filename="expenses-2026-10.pdf"`, starts with `%PDF-1.3`, 3061 bytes |
| 15 | PDF empty month (demo 8) | `GET /api/summary?month=2026-01`, `GET /api/reports/2026-01.pdf` | PASS: summary total 0, count 0; PDF 200, `expenses-2026-01.pdf`, `%PDF-1.3`, 1680 bytes. Its text ("No transactions this month.") is asserted in `routes/report.test.ts` |
| 16 | Invalid report month | `GET /api/reports/2026-13.pdf` | PASS: 400 `{"error":"Month must be in the format YYYY-MM"}` |
| 17 | Backend down (demo 9) | stop backend, `GET /api/summary` via the preview proxy | PASS: 502 with no JSON body, which `api.ts` maps to "Can't reach the server" (ErrorBanner + Retry, covered by `api.test.ts` / `Dashboard.test.tsx`) |
| 18 | Persistence (demo 9) | restart backend, `GET /api/summary?month=2026-10` and transactions | PASS: still 93169 cents, edited "Groceries" (4500) still first |
| 19 | Filters (demo 6) | client-side; `filters.test.ts`, `Dashboard.test.tsx` | PASS (tests): search + category narrow the list, "No expenses match your filters" + Clear filters, summary unchanged |
| 20 | Phone width (demo 10) | CSS review at 375 px | PASS: `@media (max-width: 719px)` in every component: header nav buttons share the row, toolbar stacks with full-width buttons, list rows become two lines, summary stacks, dialog actions stack full width |
| 21 | Desktop 1280 px | CSS review | PASS: page capped at `--page-width` (60rem) and centered; summary two columns; toolbar fields left, actions right |
| 22 | Keyboard path | code review + tests | PASS after fixes: Tab order header nav → search → category → (Clear) → Download PDF → Add expense → row Edit/Delete; dialogs focus the first field, trap focus, Escape closes and focus returns. Fixed in this task: focus was lost after pressing Today (button became `disabled`) and after deleting a row (its button disappeared) |
| 23 | Contrast | token review vs WCAG AA | PASS: text tokens >= 4.5:1 on `--paper`/`--surface` (e.g. `--ink-faint` ~4.8:1 on paper), white on `--action` ~8:1, `--danger` on `--danger-tint` ~5.7:1, control borders >= 3:1 |

Result: all steps PASS. Servers were stopped after the run.
