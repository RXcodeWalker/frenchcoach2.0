# CLAUDE.md

Guidance for Claude Code working in this repository. Keep this file lean — if something can be discovered from the code or from `docs/`, it doesn't belong here.

## What This Is

A French speaking-practice app for IGCSE/A-Level learners (Vite + React + TypeScript frontend, localStorage-first state). Users record spoken French, get AI feedback, earn XP, and track skill mastery. The project is mid-rewrite of its **Cambridge IGCSE French (0520) speaking scorer** — the "Assessment Engine" — replacing older ad hoc scoring logic with a single audited, three-layer pipeline.

> **No design docs currently exist for the Assessment Engine.** `docs/architecture/` was deleted (2026-08-31) because it assumed validation against real teacher/examiner-graded data that no longer reflects the plan. There is no replacement yet. Don't reconstruct assumptions from git history (`git log -- docs/architecture/`) or from this file's prior versions — treat the current code under `src/domain/igcse/` plus its own tests as the only authority until new docs land, and ask before assuming anything about validation/calibration strategy.

## Three Runtime Surfaces — Don't Conflate Them

1. **`src/`** (this repo) — the React frontend.
2. **`server/`** (this repo, separate deploy) — a Node service that hosts the **Cambridge scoring API**. It imports `scoreAttempt` from `scripts/scoring/scoreAttempt.ts` directly; there is no Python rubric or scoring prompt anywhere. Deployed per `render.yaml` (`french-scoring` service).
3. **`backend/`** — a **separate git repository** (own remote, own `.gitignore`, listed in this repo's root `.gitignore`) running FastAPI. It handles general coaching feedback, transcription, and exam endpoints — **not** Cambridge scoring. Before editing it, run `git -C backend status` (expect clean) and `git -C backend push` after committing there; this repo's history is no safety net for `backend/` changes. Vercel proxies `/api/*` to the deployed FastAPI service (see `vercel.json`); the scoring service is a separate Render host.

## Repository Structure

- `src/context/AppContext.tsx` — single `useReducer` global state, hydrated on mount from three localStorage services (analytics, progression, diagnostics).
- `src/services/` — `api/` (backend client + offline fallback), `coaching/` (offline regex evaluator + diagnostic engine), `analytics/`, `progression/`, `coach/` (closed-loop coach — see below), plus feature services (`shop/`, `social/`, `duels/`, `sync/`, …) that talk to Supabase.
- `src/domain/igcse/` — the Assessment Engine domain code: `rubric.ts` (sourced Cambridge mark scheme, data only), `evidence/`, `judgement/`, `guardrails/`, `envelope/`, `stt/`, `session/`, `comparison/`, `content/`. This is the three-layer scoring pipeline (see Core Architectural Rules below) — its own code and tests are the current source of truth, since the design docs that used to describe it are gone.
- `src/screens/` — top-level screens (Learn, ExamMode, Progress, Explore, Home, …), each with a matching sub-directory for extracted sub-components.
- `scripts/authoring/`, `scripts/roleplay/` — content validation/authoring CLIs for `backend/data/igcse/*.json`, `src/data/scenarios/`, `src/data/learn/demands/*.json`.
- `scripts/scoring/`, `scripts/stt/` — CLIs for the scoring pipeline (batch scoring against teacher marks, golden regression, STT ingestion, attempt inspection/review).
- `docs/content/` — content-authoring rules for the IGCSE question bank. (`docs/architecture/` — the former Assessment Engine design docs — was removed as outdated; see the note under "What This Is".)
- Root-level `plan.md`, `IMPLEMENTATION_CHECKLIST.md`, `COMPONENT_REFERENCE.md`, `QUICK_START.md`, `README_REDESIGN.md`, `REDESIGN_SUMMARY.md`, `UI_UX_IMPLEMENTATION_GUIDE.md` — historical planning docs, **not maintained**, not authoritative. Don't treat their contents as current behavior.

## Core Architectural Rules

1. **Cambridge IGCSE French (0520) only.** No generic rubric engine, no `ExamBoard` abstraction, no multi-board future-proofing. This is referenced in code as "hard-constraint #1" (see `src/domain/igcse/rubric.ts`) — if you're about to add a board-agnostic layer, stop and ask instead of proceeding (the doc that used to explain why this was rejected no longer exists).
2. **Three-layer scoring pipeline, never collapsed:** deterministic evidence extraction (`evidence/`) → constrained LLM judgement (`judgement/`) → deterministic guardrails (`guardrails/`) → persisted `ScoringEnvelope` (`envelope/`). Don't replace with pure-deterministic or unrestricted-LLM scoring.
3. **Every rubric number is sourced.** Mark ranges, band descriptors, and thresholds must trace to official Cambridge documentation — check `src/domain/igcse/rubric.ts`'s own source comments (it cites the specific Teacher/Examiner Notes booklet). Anything uncertain is marked `UNVALIDATED`, not guessed.
4. **All frontend app state flows through `AppContext`'s single reducer** + the three localStorage services. Don't introduce parallel state stores for existing app data.
5. **Calibration and validation datasets stay separate**, and validation-corpus availability is never assumed — the previous validation-strategy doc is gone, so ask before assuming any graded/held-out corpus exists rather than inferring it from code.

## Source of Truth

| Question | Look here |
|---|---|
| Assessment Engine design/rationale, validation strategy, roadmap order | **Nothing right now** — `docs/architecture/` was removed as outdated (2026-08-31) and not yet replaced. Don't invent or infer this from git history; ask instead. |
| Current scoring pipeline behavior | `src/domain/igcse/` itself, and its `__tests__/` (especially golden-transcript regressions) |
| What's actually been verified so far | `verification-log.md` (repo root) — append here, don't just claim a gate passed |
| Content wording/register/authoring rules | `docs/content/authoring-guide.md`, `docs/content/corpus-matrix.md` |
| Current runtime behavior of anything else | The code. `README.md` and the root planning `*.md` files describe intent, not necessarily current state. |

## Development Workflow

**General app changes:** inspect the relevant screen/service and its existing contracts → implement the smallest correct change → `npm run typecheck` + `npm test` for touched areas → `npm run lint` → review the diff → update `README.md`/docs only if you changed documented behavior.

**Assessment Engine changes (`src/domain/igcse/`, `server/`, `scripts/scoring/`, `scripts/stt/`):** with no architecture docs to consult, treat this as higher-risk than a normal change.

1. **Plan first, in a separate step from implementation**, even for a change that looks small — state what you intend to change and why before touching `evidence/`, `judgement/`, `guardrails/`, `envelope/`, or `rubric.ts`, and get it confirmed.
2. Don't infer validation/calibration strategy, rubric weights, or rollout order from memory of the old docs — if you need to know one of those, ask rather than guess.
3. On completion, append what you did and what you verified to `verification-log.md` (repo root) — it's the only remaining audit trail for this subsystem.

## Validation Commands

```bash
npm run dev                              # Vite dev server
npm run build                            # production build
npm run typecheck                        # tsc --noEmit, tsconfig.app.json
npm run lint                             # ESLint
npm test                                 # vitest run (repo-wide)
npm run test:watch                       # vitest watch mode
```

```bash
npm run score:golden                     # deterministic scoring regression (no LLM/network calls) — run this
                                          # after any change to evidence/judgement/guardrails/envelope/rubric
npm run authoring:check                  # content gate: validate + lint + cross-set corpus check
npm run authoring:check -- --draft       # same, minus the "not-approved" error (work-in-progress sets)
npm run authoring:skeleton -- <NN>       # emit a pre-tagged question-set skeleton
npm run authoring:review-sheet -- <NN>   # render one set as readable Markdown for reviewers
npm run authoring:status                 # review-tier counts + corpus coverage
npm run roleplay:check                   # validate roleplay scenario registry (graph/meta/deck)
npm run learn:check                      # validate src/data/learn/demands/*.json against the question bank
```

Other CLIs exist under `scripts/scoring/` (batch-score against teacher marks, inspect/review a scored attempt) and `scripts/stt/` (STT ingestion) for later validation work — read the script's own header comment before using them (it's the only documentation for these now); they're not part of the everyday loop.

## Testing

Tests are colocated in `__tests__/` directories next to the code they cover, across `src/` — the heaviest concentration is under `src/domain/igcse/` (the Assessment Engine), where golden-transcript regression tests are load-bearing: if one changes shape, that's a signal you changed scoring behavior, not a test to casually update. Only pure functions are unit-tested; impure wrappers (localStorage, network) are integration concerns and generally untested directly. If `npm test` has pre-existing failures before your change, note them and don't fold an unrelated fix into your diff without calling it out.

## Known Traps

- **"Feedback restructure" (Phase 2.5) was never implemented.** No flag, no code. If older docs or discussion reference it, treat that as describing work that doesn't exist in this codebase.
- **Don't confuse `backend/data/igcse/*.json` (question-bank content) with `src/domain/igcse/` (scoring engine code).** The former is validated by `npm run authoring:check`; the latter is the actual rubric/evidence/judgement/guardrail pipeline and lives in this repo, not `backend/`.
- **The canonical XP formula is `src/domain/xp.ts`'s `computeXPGain`**, not `progressionService.ts` (which calls it). Similarly, the canonical color-to-score mapping is `src/domain/scoring.ts`. Both have been duplicated informally elsewhere in the past — if you find a second implementation, that's drift, not a second source of truth.
- **`src/services/supabase/` is not dead code.** Auth, sync, social, shop, league, and duel features are all wired through Supabase — check for existing usage before assuming a feature needs new plumbing.
