# 0003 — The Node engine is the authoritative scorer

Date: 2026-09-01
Status: Accepted

## Decision

`src/domain/igcse/` + `scripts/scoring/scoreAttempt.ts` + `server/index.ts` (the `french-scoring`
Render service) is the one authoritative Cambridge IGCSE French scorer. `ExamMode.tsx` reaches it
exclusively through `scoringApiClient`, which calls `${VITE_SCORING_API_URL}/score`, with no
fallback — if the env var is unset, the client throws (see `docs/systems/topology.md`).
`server/index.ts` imports `scoreAttempt` from `scripts/scoring/scoreAttempt.ts` directly.

## Why — the evidence

Two other scoring code paths exist in the separate `backend/` (FastAPI) repository. Neither is
authoritative:

- **`backend/evaluator_service.py`'s `evaluate_full_exam`** is still reachable at
  `POST /api/exam/finish` and `POST /api/exam/evaluate` (`backend/exam_controller.py`, mounted in
  `backend/main.py`), but has **zero callers anywhere in `src/`**. Its Communication and Quality of
  Language bands diverge materially from `rubric.ts`'s sourced values: 3 unsourced bands each, plus
  an invented "AI Heuristic" description and an invented A\*–U grade-boundary table, with no
  citation to any Cambridge document anywhere in the prompt. `rubric.ts` uses 6 bands per
  criterion, each carrying an `exactSource(page)` citation into `0520/03/TN/M/J/24`. This is not an
  intentional dual rubric — the Python version predates the audited Node engine and violates
  ADR-0001's sourcing rule.
- **`POST /api/feedback/igcse`** (`backend/main.py`) has zero callers in `src/`. It is what
  `src/services/api/apiClient.ts`'s own comment calls "the legacy invented scorer" — an accurate
  description, not a misleading one.

## Consequences

- Do not "fix" or re-rubric `backend/evaluator_service.py` to match `rubric.ts` — it is out of
  scope for this decision and unreached in production. If it needs to be dealt with, that's a
  separate decision (deletion, or wiring it up deliberately), not a documentation fix.
- Any future work on exam scoring belongs in `src/domain/igcse/` + `scripts/scoring/` +
  `server/index.ts`. A change to `backend/evaluator_service.py`'s scoring logic does not affect
  what any user sees.
- `CLAUDE.md`'s claim that "there is no Python rubric or scoring prompt anywhere" is stale — see
  `docs/systems/assessment-engine.md`'s "A known-stale claim in CLAUDE.md" section. This ADR
  records the actual, current three-scorer situation regardless of that claim's state.
