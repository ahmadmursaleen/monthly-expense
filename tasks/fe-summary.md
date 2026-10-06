---
title: Summary panel with category spending bars
status: done
owner: sisterPC/agent-1
deps: [fe-shell]
prio: 2
lease_until: 
releases: 0
extended: 
---
## Goal
SPEC M5: the month's total and a simple visual of spending per category.

## Acceptance criteria
- [ ] Uses the `frontend-design` skill, consistent with `docs/UI-DESIGN.md`; record it with `python tasks.py assume fe-summary "frontend-design: <what it decided>"`
- [ ] `SummaryPanel`: total spending (`formatMoney`), number of expenses, and `CategoryBars`: one
      horizontal bar per category with spending (hand-rolled CSS/SVG), label, amount and share %, sorted
      by total. Values are text, not only bar length (accessible). Empty month: 0,00 € and a short
      "Nothing spent yet" message instead of bars
- [ ] Tests: total and count, bar order, widths proportional to the largest category, shares, empty month
- [ ] Quality gate per AGENTS.md: `reviews/tests-*-fe-summary.md` and `reviews/review-*-fe-summary.md` (plus `reviews/fixes-*-fe-summary.md` if findings were fixed) are committed with the task
- [ ] `.taskcheck` passes

## Notes
Owns `SummaryPanel.tsx`, `CategoryBars.tsx` and their CSS/tests only. Keep the props from `fe-shell`; if
the contract is insufficient, make the smallest change elsewhere and record it with `tasks.py assume`.
Do not add npm dependencies (avoids package-lock conflicts with parallel tasks).
- ASSUMPTION (2026-10-06 11:15+0200 by R1427WW10P/agent-1): frontend-design: summary is one bordered sheet; left column = month total (Bricolage, --text-xl) + 'N expenses' in --ink-soft; right column = ledger-style category rows (label left, semibold amount and share % right, thin 8px --bar on --bar-track below, bars aria-hidden since values are text); stacks below 720px; shares rounded to whole %, '<1%' for tiny non-zero shares; unknown category ids fall back to the raw id
- release by R1427WW10P/agent-1: handed off by R1427WW10P/agent-1: You've hit your session limit · resets 3:10pm (Europe/Berlin)
