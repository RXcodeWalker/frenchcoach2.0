# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (Vite)
npm run build        # Production build
npm run typecheck    # Type-check without emitting (tsconfig.app.json)
npm run lint         # ESLint
npm run preview      # Preview production build locally
```

```bash
npm test             # Run tests once (vitest run)
npm run test:watch   # Run tests in watch mode
```

```bash
npm run authoring:skeleton -- <NN>   # Emit a pre-tagged question-set skeleton from the corpus matrix
npm run authoring:check              # Pre-seed gate: validate + lint + cross-set corpus check (backend/data/igcse/*.json)
npm run authoring:check -- --draft   # Same gate, minus the "not-approved" error (work-in-progress sets)
npm run authoring:review-sheet -- <NN>  # Render one set as readable Markdown for reviewers
npm run authoring:status             # internal:* vs teacher:* review-tier counts + corpus coverage
```

Tests live in `src/services/coach/__tests__/`. Only pure functions (no localStorage) are unit-tested; impure wrappers are integration concerns.

## What This Is

A French language speaking-practice app for IGCSE/A-Level learners. Users record spoken responses to French questions, receive AI feedback on grammar/vocabulary/fluency, earn XP, unlock achievements, and track skill mastery across 14 grammar categories. All state is localStorage-backed; the backend (AI feedback endpoint) is optional with a graceful offline fallback.

## Architecture

### State & Data Flow

Global state lives in a single `useReducer` in [src/context/AppContext.tsx](src/context/AppContext.tsx). On mount, `buildInitialState()` hydrates from three localStorage services:

- `analyticsService` → session history, streak, daily stats (`frenchCoach_v2`)
- `progressionService` → XP, level, achievements (`frenchCoach_progression`)
- `diagnosticEngine` → skill mastery profile (`frenchCoach_sde`)

Each screen owns its local state (recording, timer, step machine). Shared state is dispatched up via context actions (`ADD_XP`, `ADD_SESSION`, `UPDATE_SKILL_PROFILE`, etc.).

### Services Layer (`src/services/`)

| Service                             | Purpose                                                                             |
| ----------------------------------- | ----------------------------------------------------------------------------------- |
| `api/apiClient.ts`                  | POST `/api/feedback` → falls back to `coachService` if offline                      |
| `coaching/coachService.ts`          | Offline regex-based grammar evaluator (22 rules); computes 4 scores (0–10)          |
| `coaching/diagnosticEngine.ts`      | Maps grammar errors → 14 skill categories with exponential decay (14-day half-life) |
| `analytics/analyticsService.ts`     | Records sessions, computes streak, builds 7-day chart data                          |
| `progression/progressionService.ts` | XP formula: `10 + (score/10×15) + (streak×2)`; 5 levels; 12 achievements            |
| `supabase/`                         | Dead code — not wired up anywhere                                                   |

### Coach MVP Layer (`src/services/coach/`)

A closed-loop personal coach built on top of the services above. Entry point is `sessionOrchestrator.ts::orchestrateAttempt()`, called after every answer:

1. **Evidence** — `evidenceBuilder.ts` converts raw feedback into typed `EvidenceEvent` objects and appends them to `coachStorage`.
2. **Beliefs** — `beliefProjectionService.ts` + `beliefReducer.ts` maintain an `EvidenceBeliefSnapshot` per skill node (mastery, recurrence, avoidance).
3. **Recommendation** — `recommendationEngine.ts` picks a next action; `decisionEngine.ts` builds a `DailyPlan` (Today's Focus, urgency banners, session blend).
4. **Intervention loop** — `interventionService.ts` detects recurring-grammar problems (≥2 failures of the same node in 7 days), delivers a `MicroDrill` (retrieval-practice), and updates `LearningProblem` status through `active → monitoring → resolved`.
5. **Skill graph** — `skillGraph.ts` models the 14 grammar categories as nodes; `recurringGrammar.ts` maps node IDs to available MicroDrill content.
6. **Profile** — `coachProfileService.ts` tracks exam date, goals, and habits; `weeklyReviewService.ts` generates weekly summaries.

All coach state is persisted via `src/services/persistence/storage.ts` under separate localStorage keys (`coachProblems`, `coachInterventions`, `coachInterventionOutcomes`).

Key types for the coach layer are split across `src/types/`: `coach.ts` (DailyPlan, CoachProfile, OrchestratorInput/Result), `evidence.ts` (EvidenceEvent), `beliefs.ts` (EvidenceBeliefSnapshot), `intervention.ts` (LearningProblem, Intervention, InterventionOutcome).

### Screens (`src/screens/`)

- **Learn.tsx** — Topic picker → question → mic recording → feedback panel → session complete (state machine in a single component; ~518 LOC)
- **ExamMode.tsx** — Loads `EXAM_SETS` from raw JSON, enforces per-question time limits, auto-scores
- **Progress.tsx** — 3-tab dashboard: overview stats, skill profile (mastery per category), session history
- **Explore.tsx** — Roleplay scenario catalog (scenarios are JSON state machines in `src/data/scenarios/`)
- **Home.tsx** — Dashboard with hero section, daily cards, 7-day chart (~363 LOC)

Each big screen has a matching sub-directory (e.g., `src/screens/learn/`) with extracted sub-components.

### Routing

React Router v7. Two layouts in [src/App.tsx](src/App.tsx):

- `MainLayout` — wraps most routes with `<Navigation>` sidebar + animated `<Outlet>`
- `ExamLayout` — fullscreen, no sidebar

### Styling & Animation

Tailwind CSS 3.4. Custom animations (`blob`, `fade-in`, `shake`, `glow`) defined in [src/index.css](src/index.css). Framer Motion variants centralized in [src/components/motion/variants.ts](src/components/motion/variants.ts). Light/dark mode uses the Tailwind `dark:` class strategy with a `dark` class on `<html>` controlled by [src/context/AppContext.tsx](src/context/AppContext.tsx).

### Data

- `src/data/questions.ts` — 16 topics (8 core + 8 advanced, the latter `isAdvanced`/coming-soon pending authoring), 428 questions with metadata (difficulty, model answers, key vocab, and — since Learn adaptive difficulty — `demands`)
- `src/data/raw/` — JSON source files (papers, roleplays, IGCSE master list)
- `src/data/scenarios/` — 30+ roleplay JSON state machines
- `src/data/mocks/` — Fake stats/feedback for UI development

## Key Types

App types in [src/types/index.ts](src/types/index.ts); coach types split across separate files:

- `Session` / `Feedback` / `SkillProfile` / `UserProfile` — core app types (`index.ts`)
- `EvidenceEvent` — single observation from an answer attempt (`evidence.ts`)
- `EvidenceBeliefSnapshot` — per-skill mastery + recurrence belief state (`beliefs.ts`)
- `LearningProblem` / `Intervention` / `InterventionOutcome` — intervention loop contracts (`intervention.ts`)
- `CoachProfile` / `DailyPlan` / `OrchestratorInput` / `OrchestratorResult` — coach orchestration (`coach.ts`)

## Known Issues

- XP toast never auto-dismisses (possible double-award bug)
- `src/services/supabase/` is dead code (not imported)
- Mic recording + timer logic is duplicated between Learn and ExamMode
- Color-to-score mapping is defined in multiple places; canonical version is `src/domain/scoring.ts`
- Coach intervention loop (`interventionService.ts`) is wired in: `Learn.tsx` calls `recordIntervention`/`recordInterventionOutcome` and renders `MicroDrillModal`; also used by `WeaknessAnalysis.tsx` and `services/sync/coachSync.ts`
- "Feedback restructure" (sometimes referenced as Phase 2.5 in prior planning) was never implemented — no flag, no code, neither delivered nor deferred behind a flag. Treat any reference to it in older docs/discussion as describing work that does not exist in this codebase.

## Working in `backend/`

`backend/` is a separate git repository (own remote, own `.gitignore`) nested inside this one and deliberately excluded from the frontend repo's tracking (root `.gitignore`). Before editing it, confirm `git -C backend status` is clean, and `git -C backend push` after committing — the frontend repo's history provides no safety net for changes made there.

# Assessment Engine

This repository is implementing a complete replacement of the old IGCSE speaking scorer.

The previous system contained duplicated rubric logic, invented scoring weights, and multiple inconsistent implementations. This phase replaces it with a single audited Cambridge IGCSE French (0520) assessment engine.

## Before planning or implementing

Architecture docs are split by concern — read only what's relevant to the task.

Always read:

- `docs/architecture/00-overview-and-rationale.md` — why the old multi-board v1 architecture was rejected, what "success" means for this scorer
- `docs/architecture/roadmap.md` — implementation order (subphases S0–S17); single source of truth for subphase ordering

Plus whichever of the others matches the current subphase — do not read all six for every task:

- `docs/architecture/01-cambridge-rubric-source.md` — verbatim Cambridge 0520 mark scheme and audit of invented old numbers. Required for S0, and any time you touch `rubric.ts` or are tempted to add/adjust a band, weight, or threshold.
- `docs/architecture/02-scoring-pipeline-architecture.md` — three-layer scorer (deterministic evidence → constrained LLM judgement → deterministic guardrails), calibration anchors, and `ScoringEnvelope` versioning. Required for S1, S7, S8, S9, S11, S12.
- `docs/architecture/03-validation-strategy.md` — staged A/B/C validation phases and exit criteria. Required for S2, S5, S6, S10, S11, S15, S16, and anything touching the graded-response corpus.
- `docs/architecture/04-frontend-pipeline.md` — STT model choice, transcript quality, accent handling, original-question-bank/copyright constraint. Required for S3, S4, S13.
- `docs/architecture/05-deprecated-v1-removals.md` — what was explicitly rejected and why. Read if unsure whether something is a forbidden multi-board abstraction (hard constraint #1).

**Content authoring** (S11 question bank, `backend/data/igcse/*.json`) has its own docs, separate from the scoring architecture above:

- `docs/content/authoring-guide.md` — wording style, vocabulary level, register, the anaphora rule, alternative-question rules, tag-duplication rule, the `authoring:skeleton` → `authoring:check --draft` → `authoring:check` workflow, and the draft trap.
- `docs/content/corpus-matrix.md` — the 10-set / 150-item corpus plan: topic-area pair coverage, role-play/topic-slot balance, time-frame templates, rare-structure placement, scenario archetypes.

Treat the architecture as the design source of truth and the roadmap as the execution order.

Do not work on a subphase until its roadmap dependencies have been completed.

---

## Project constraints

1. **Cambridge IGCSE French (0520) only.**
   Do not introduce board abstractions, generic rubric engines, or future-proofing for other exam boards.

2. **Everything must be sourced.**
   Rubric criteria, mark ranges, and grade boundaries must come from official Cambridge documentation. Anything uncertain must be marked `UNVALIDATED`.

3. **Follow the three-layer architecture.**
   - Layer 1: deterministic evidence extraction
   - Layer 2: constrained LLM judgement
   - Layer 3: deterministic guardrails

   Do not replace this with purely deterministic scoring or unrestricted LLM scoring.

4. **Follow the roadmap.**
   Do not implement future subphases early.

5. **Never assume validation data exists.**
   Corpus availability is determined by the roadmap checkpoints.

6. **Calibration and validation datasets must remain separate.**

---

## Workflow

Every subphase follows two separate sessions:

1. **Planning**
   - Read the architecture and roadmap.
   - Produce an implementation plan only.
   - No code.

2. **Implementation**
   - Begin only after the plan has been approved.
