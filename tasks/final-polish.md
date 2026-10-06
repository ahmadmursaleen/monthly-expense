---
title: Polish pass, README and final demo run
status: todo
owner:
deps: [fe-summary,fe-form,fe-filters-report,seed-smoke]
prio: 1
---
## Goal
Make the app demo-ready (SPEC M10, S2) and verify the SPEC §2 demo script end to end.

## Acceptance criteria
- [ ] Uses the `frontend-design` skill, consistent with `docs/UI-DESIGN.md`; record it with `python tasks.py assume final-polish "frontend-design: <what it decided>"`
- [ ] UI review against `docs/UI-DESIGN.md`: consistency between the components built in parallel,
      layout at 375 px and 1280 px, keyboard path through the whole demo, contrast; fix what you find (any
      frontend file)
- [ ] No stub left: every component of the `fe-shell` contract is implemented
- [ ] `README.md` at the root: what it is, install, seed, run, test, the demo script (SPEC §2), project
      layout, links to `SPEC.md` and `docs/`
- [ ] Demo run on the real servers (seed, backend, `npm run build -w frontend`, API calls incl. the PDF
      of the current and of an empty month) recorded step by step as pass/fail in
      `reviews/demo-<date>-final-polish.md`
- [ ] Every Must feature of SPEC §4 is present. A gap you can't fix within this task becomes a new
      task (`python tasks.py new`), not a silent omission
- [ ] Quality gate per AGENTS.md: `reviews/tests-*-final-polish.md` and `reviews/review-*-final-polish.md` (plus `reviews/fixes-*-final-polish.md` if findings were fixed) are committed with the task
- [ ] `.taskcheck` passes

## Notes
Do not add npm dependencies (avoids package-lock conflicts with parallel tasks).
