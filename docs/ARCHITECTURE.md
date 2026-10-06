# Architecture

A local, single-user expense tracker: record expenses, browse them month by month, download a monthly
PDF report. Requirements: `SPEC.md` (derived from `BRIEF.md`).

```
monthly-expense/
  backend/    Express 5 + TypeScript REST API, SQLite via node:sqlite, PDF generation
  frontend/   React 19 + TypeScript single-page app, built with Vite
  scripts/    check.sh (the project check, see .taskcheck)
  docs/       this file
  tasks/      Taskflow task board (managed with `python tasks.py`, never by hand)
  reviews/    reports written by the test-writer / code-reviewer / fixer sub-agents
```

One npm workspace: a single `npm install` at the root installs both parts.

## Stack

| Part | Runtime / libraries | Tests |
|---|---|---|
| backend | Node 22.13+, Express 5, `node:sqlite` (built into Node, no native build), pdfkit (PDF report), run with `tsx` | Vitest + supertest |
| frontend | React 19, Vite 8, plain CSS | Vitest + jsdom + Testing Library |
| tooling | TypeScript 6.0 (strict; pinned below 6.1 for typescript-eslint), ESLint 10 flat config at the root | |

No Docker, no external services, no secrets.

## Install

Needed on every laptop that runs agents: **git**, **Python 3** (for Taskflow), **Node.js 22.13 or newer**
(includes npm). Node 24 LTS recommended.

| | Linux | macOS | Windows |
|---|---|---|---|
| Node.js | [nvm](https://github.com/nvm-sh/nvm): `nvm install 24` (or distro package if >= 22.13) | `brew install node@24` or nvm | [nodejs.org](https://nodejs.org) LTS installer, or `winget install OpenJS.NodeJS.LTS` |

Then, in the repo root:

```sh
npm install
```

Windows: the check runs in Git for Windows' bash, so `node`/`npm` must be on the PATH there too
(the nodejs.org installer does that). If you use nvm, start agents from a shell where the right Node
version is active: agents inherit its PATH.

## Run

```sh
npm run dev -w backend     # API on http://localhost:3001 (tsx watch)
npm run dev -w frontend    # UI on http://localhost:5173, proxies /api to the backend
```

Open http://localhost:5173. The SQLite file is created on first start at `backend/data/expenses.db`
(git-ignored); data survives restarts. Delete the file to start empty.

## Test

```sh
sh scripts/check.sh        # what .taskcheck runs: npm ci if the lockfile changed, then lint + tsc + tests
npm run check              # lint + type-check + tests of both parts (deps already installed)
npm test -w backend        # backend tests only
npm test -w frontend       # frontend tests only
npx -w backend vitest src/app.test.ts   # a single file, watch mode
```

The whole check takes ~20 s and must stay under 2 min.

## Environment variables

| Variable | Default | Used by |
|---|---|---|
| `PORT` | `3001` | backend: HTTP port |
| `DB_PATH` | `data/expenses.db` (relative to `backend/`) | backend: SQLite file, `:memory:` in tests |
| `API_PORT` | `3001` | frontend dev server: where `/api` is proxied to |

## Backend structure

- `src/server.ts`: entry point; opens the DB and listens. Contains no logic.
- `src/app.ts`: `createApp(db)` builds the Express app without listening, so tests call it with
  supertest and an in-memory DB.
- `src/db.ts`: `openDb(path)`, the **only** module that opens SQLite; runs the schema migration.
- Feature code goes into its own modules (e.g. a repository module for SQL, a router module for HTTP,
  a PDF module), each with a `*.test.ts` next to it.

## Frontend structure

- `src/main.tsx`: mounts `<App />`.
- `src/App.tsx`: top-level layout.
- `src/api.ts`: the **only** module that calls `fetch`; components use its typed functions.
- Components with their tests next to them (`Foo.tsx`, `Foo.test.tsx`).

## API between frontend and backend

JSON over HTTP under `/api`. In development the Vite dev server proxies `/api` to the backend, so the
frontend always uses relative URLs.

Errors are JSON: `{"error": string, "fields"?: {"<field>": "<message>"}}`. Transaction object:
`{id, description, amountCents, category, date, createdAt, updatedAt}` (SPEC §6).

| Method | Path | Request | Success | Errors | Provided by |
|---|---|---|---|---|---|
| GET | `/api/health` | – | `200 {"ok": true}` | – | `app.ts` |
| GET | `/api/categories` | – | `200 [{id, label}]` in SPEC §5 order | – | `routes/api.ts` |
| GET | `/api/transactions?month=YYYY-MM` | – | `200 [Transaction]`, date desc, then id desc | `400` missing/invalid month | `routes/api.ts` |
| POST | `/api/transactions` | `{description, amountCents, category, date}` | `201 Transaction` | `400` with `fields` | `routes/api.ts` |
| PUT | `/api/transactions/:id` | same as POST (full replace) | `200 Transaction` | `404` unknown/non-numeric id, `400` with `fields` | `routes/api.ts` |
| DELETE | `/api/transactions/:id` | – | `204` | `404` | `routes/api.ts` |
| GET | `/api/summary?month=YYYY-MM` | – | `200 {month, totalCents, count, byCategory: [{category, totalCents, count}]}`, only spent categories, total desc | `400` | `routes/api.ts` |
| GET | `/api/reports/YYYY-MM.pdf` | – | `200 application/pdf`, `Content-Disposition: attachment; filename="expenses-YYYY-MM.pdf"` | `400` JSON for an invalid month or a name not ending in `.pdf`; query parameters ignored | `routes/report.ts` (data: `report.ts`) |

Any other `/api/*` path or method → `404 {"error"}`; a malformed JSON body → `400 {"error"}`. New API
routers are mounted in `createApp` before the `/api` 404 catch-all.
