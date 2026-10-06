# Code Review

Date: 2026-10-06

Task: fe-summary - Summary panel with category spending bars

Scope: commit 04fbf63 (`fe-summary: SummaryPanel with total, count and CategoryBars`), committed changes only

Requirements:
- `tasks/fe-summary.md` acceptance criteria and notes (including the recorded frontend-design assumption)
- `docs/UI-DESIGN.md` (tokens, palette, type, component ownership / props contract)
- `SPEC.md` (`GET /api/summary` contract: only categories with spending, sorted desc)
- `AGENTS.md` conventions (tests next to code, TypeScript strict, components own their CSS)

Git range:
- Branch: main
- HEAD: 04fbf63
- Base/start: 25a2183
- Commits reviewed: 1

Summary: 0 P0, 0 P1, 0 P2, 2 P3

## Verification performed

- Read the full diff and all five files in full, plus `types.ts`, `styles.css` tokens, `Dashboard.tsx` usage and the backend summary contract.
- Props contract: `SummaryPanelProps` is unchanged (`{summary: MonthSummary, categories: Category[]}`); only the destructuring now uses `categories`. `Dashboard.tsx:59` call site is unaffected.
- AC coverage: total via `formatMoney`, singular/plural count, one row per category sorted by `totalCents` desc (defensively re-sorted even though the API already sorts), label + amount + share % as text, bars hand-rolled in CSS and `aria-hidden`, width relative to the largest category, empty month shows `0,00 €` and "Nothing spent yet" with no list. All covered by tests in `SummaryPanel.test.tsx` (total/count, order, widths 100/60/40, shares, empty month, label fallback, `formatShare` rounding and `<1%`).
- Tokens: every `var(--...)` used (`--space-1..6`, `--rule`, `--rule-strong`, `--ink`, `--ink-soft`, `--ink-faint`, `--bar`, `--bar-track`, `--text-xs/sm/xl`, `--radius-md`, `--font-display`, `--leading-tight`, `--surface`) exists in `styles.css`. No hard-coded colors; `forced-colors` fallback uses system colors. Display font used only for the total, as UI-DESIGN prescribes. 719px breakpoint matches the project convention.
- No new dependencies; only owned files touched.
- `npm test -w frontend`: 16 files / 384 tests pass (run on the current working tree).

Note for the parent (outside the reviewed commit, not a finding): the working tree currently contains an uncommitted `frontend/src/CategoryBars.test.tsx` and a modified `SummaryPanel.test.tsx` (presumably from the test-writer). `npm run check` fails on `tsc --noEmit` because `CategoryBars.test.tsx` lines 9, 35, 55, 79 use `"leisure"`, which is not a `CategoryId`. That must be fixed before `.taskcheck` / `tasks.py done`.

## P0 Critical

None.

## P1 High

None.

## P2 Medium

None.

## P3 Low

- [ ] **CR-1 | CategoryBars tests live in SummaryPanel.test.tsx**
    - File: `frontend/src/SummaryPanel.test.tsx:2`
    - Category: Tests
    - Problem: `formatShare` and the bar rendering of `CategoryBars.tsx` are tested only through `SummaryPanel.test.tsx` (it imports `formatShare` from `./CategoryBars`); the commit adds no `CategoryBars.test.tsx`.
    - Why it matters: AGENTS.md convention is "Tests live next to the code (`foo.ts` + `foo.test.ts`)". Direct `CategoryBars` edge cases (e.g. `totalCents` 0 with rows, empty `byCategory`) are not exercised on the component itself.
    - Suggested fix: commit a `CategoryBars.test.tsx` (an uncommitted one is already in progress; fix its `"leisure"` type errors first) and move the `formatShare` tests there.

- [ ] **CR-2 | Hard-coded bar track radius instead of a token**
    - File: `frontend/src/CategoryBars.css:50`
    - Category: Quality
    - Problem: `.category-bars__track` uses `border-radius: 2px`, a value not in the token scale (`--radius-sm` 4px, `--radius-md` 6px).
    - Why it matters: `docs/UI-DESIGN.md` says "Use the tokens and don't hard-code colors or sizes in components"; ad-hoc radii drift from the design system.
    - Suggested fix: use `var(--radius-sm)` or drop the radius (UI-DESIGN: "Ledger rows: none").

## Review conclusion

No material issues found. The two P3 items are optional cleanups; the uncommitted test file's type errors (noted above, outside this commit) must be resolved before `.taskcheck`.
