---
title: Add, edit and delete expenses
status: in_progress
owner: R1427WW10P/agent-2
deps: [fe-shell]
prio: 1
lease_until: 2026-10-06T09:35:40Z
---
## Goal
SPEC M1–M3, M9: the dialogs to create, edit and delete expenses, with validation and error states.

## Acceptance criteria
- [ ] Uses the `frontend-design` skill, consistent with `docs/UI-DESIGN.md`; record it with `python tasks.py assume fe-form "frontend-design: <what it decided>"`
- [ ] `ExpenseDialog`: accessible modal with description, amount (text, `parseAmount`), category select
      (placeholder "Choose a category"), date. New: date `defaultDateFor(month, today)`. Edit: prefilled,
      amount shown as `42,50`
- [ ] Client validation with the SPEC §6 messages next to the fields on submit; server 400 `fields`
      mapped to the same places; other API errors shown in the dialog with the form kept filled
- [ ] Saving state ("Saving…", submit disabled); success → `onSaved(tx)`. Escape/Cancel closes; focus
      goes to the first field on open and back to the opener on close
- [ ] `DeleteDialog`: "Delete “Groceries” (42,50 €)?" with Cancel / Delete, error shown on failure,
      success → `onDeleted()`
- [ ] Tests: each validation message, create sends cents, edit prefill and PUT, server 400 mapping,
      API error keeps input, delete confirm and cancel
- [ ] Quality gate per AGENTS.md: `reviews/tests-*-fe-form.md` and `reviews/review-*-fe-form.md` (plus `reviews/fixes-*-fe-form.md` if findings were fixed) are committed with the task
- [ ] `.taskcheck` passes

## Notes
Owns `ExpenseDialog.tsx`, `DeleteDialog.tsx` and their CSS/tests only. Keep the props from `fe-shell`;
if the contract is insufficient, make the smallest change elsewhere and record it with `tasks.py assume`.
Do not add npm dependencies (avoids package-lock conflicts with parallel tasks).
- ASSUMPTION (2026-10-06 11:02+0200 by R1427WW10P/agent-2): frontend-design: dialogs follow docs/UI-DESIGN.md as-is (native dialog, --surface panel, --shadow-raised, 28rem); the title sits on a 2px ink rule like a ledger page heading; amount field is right-aligned tabular with a trailing euro sign like a ledger amount column; amount and date share one row (stacked below 720px); errors in --danger below each field; no new tokens
- ASSUMPTION (2026-10-06 11:02+0200 by R1427WW10P/agent-2): Added frontend/src/useModalDialog.ts (shared showModal/close, Escape, focus-in/focus-return hook) used by both dialogs; falls back to the open attribute when showModal is missing (jsdom)
