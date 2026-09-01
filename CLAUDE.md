# CLAUDE.md

Guidance for Claude Code working in this repository. Keep this file lean — if something can be discovered from the code or from `docs/`, it doesn't belong here.

## What This Is

A French speaking-practice app for IGCSE/A-Level learners (Vite + React + TypeScript frontend, localStorage-first state). Users record spoken French, get AI feedback, earn XP, and track skill mastery. The project is mid-rewrite of its **Cambridge IGCSE French (0520) speaking scorer** — the "Assessment Engine" — replacing older ad hoc scoring logic with a single audited, three-layer pipeline.

## Three Runtime Surfaces — Don't Conflate Them

1. **`src/`** (this repo) — the React frontend.
2. **`server/`** (this repo, separate deploy) — a Node service that hosts the **Cambridge scoring API**. It imports `scoreAttempt` from `scripts/scoring/scoreAttempt.ts` directly. Deployed per `render.yaml` (`french-scoring` service).
3. **`backend/`** — a **separate git repository** (own remote, own `.gitignore`, listed in this repo's root `.gitignore`) running FastAPI. It handles general coaching feedback, transcription, and exam endpoints — **not** Cambridge scoring. Before editing it, run `git -C backend status` (expect clean) and `git -C backend push` after committing there; this repo's history is no safety net for `backend/` changes. Vercel proxies `/api/*` to the deployed FastAPI service (see `vercel.json`); the scoring service is a separate Render host.

`backend/evaluator_service.py` *does* contain a second, unsourced Python rubric — it is legacy and unreached from `src/` (zero callers), not a design intent. See `docs/decisions/0003-node-engine-is-the-authoritative-scorer.md` for the evidence; don't "fix" its rubric to match `rubric.ts`, that's out of scope for any documentation or normal feature change.

Full topology (deploy wiring, env vars, known unknowns): `docs/systems/topology.md`.

## Core Architectural Rules

1. **Cambridge IGCSE French (0520) only.** No generic rubric engine, no `ExamBoard` abstraction, no multi-board future-proofing. This is referenced in code as "hard-constraint #1" (see `src/domain/igcse/rubric.ts`). See `docs/decisions/0001-cambridge-0520-only.md`.
2. **Three-layer scoring pipeline, never collapsed:** deterministic evidence extraction (`evidence/`) → constrained LLM judgement (`judgement/`) → deterministic guardrails (`guardrails/`) → persisted `ScoringEnvelope` (`envelope/`). Don't replace with pure-deterministic or unrestricted-LLM scoring. See `docs/decisions/0002-three-layer-scoring-pipeline.md` and `docs/systems/assessment-engine.md`.
3. **Every rubric number is sourced.** Mark ranges, band descriptors, and thresholds must trace to official Cambridge documentation — check `src/domain/igcse/rubric.ts`'s own source comments (it cites the specific Teacher/Examiner Notes booklet). Anything uncertain is marked `UNVALIDATED`, not guessed.
4. **All frontend app state flows through `AppContext`'s single reducer** + the three localStorage services. Don't introduce parallel state stores for existing app data.
5. **Calibration and validation datasets stay separate**, and validation-corpus availability is never assumed. Ask before assuming any graded/held-out corpus exists rather than inferring it from code.
6. **Learn-mode examiner-voice practice feedback never emits a mark, band, or grade.** See `docs/decisions/0005-examiner-feedback-emits-no-marks.md`.

## Documentation map

- `docs/README.md` — the full map, authority model, and citation decoder.
- `docs/systems/` — how the app fits together and what it must do: `topology.md`, `assessment-engine.md`, `data-model.md` (Supabase), `shop-economy.md`, `learn-adaptive-difficulty.md`. The latter two are live specifications (not plans) with `§`-numbered sections cited across the codebase — never renumber their sections.
- `docs/guides/` — how to do a recurring task: `content-authoring.md`, `corpus-matrix.md`, `learn-demands.md`, `development.md` (commands, test suites, Assessment-Engine change procedure).
- `docs/decisions/` — ADRs, append-only, the authority for "why is it this way."
- `docs/archive/` — historical only, authoritative for nothing.
- `verification-log.md` (repo root) — append-only Assessment Engine audit trail: what was verified, when. Never evidence that something is *currently* true.

### Citation decoder

Some source comments cite design documents that no longer exist (`docs/architecture/NN-*.md`, `roadmap.md`, `S0`–`S17`) or were never committed. Where the rule mattered it has been restated inline or captured in `docs/decisions/`. Any remaining such citation is historical: it records that a decision was made, not what it was. Do not reconstruct these documents, including from git history — use the code, its tests, and `docs/decisions/`; if the rationale isn't there, ask.

**Exception:** a bare `docs §N` in `src/domain/learn/**` refers to `docs/systems/learn-adaptive-difficulty.md`; a bare `Shop plan §N` (or `docs §N` in shop/economy code) refers to `docs/systems/shop-economy.md`. Both are live specs — do not "repair" them.

## Source of Truth

| Question | Look here |
|---|---|
| Assessment Engine design/rationale | `docs/systems/assessment-engine.md` + the relevant ADR |
| Current scoring pipeline behavior | `src/domain/igcse/` itself, and its `__tests__/` (especially golden-transcript regressions) |
| What's actually been verified so far | `verification-log.md` (repo root) — append here, don't just claim a gate passed |
| Content wording/register/authoring rules | `docs/guides/content-authoring.md`, `docs/guides/corpus-matrix.md` |
| Runtime topology, deploy wiring, env vars | `docs/systems/topology.md` |
| Current runtime behavior of anything else | The code. `README.md` describes intent, not necessarily current state. |

## Development Workflow

**General app changes:** inspect the relevant screen/service and its existing contracts → implement the smallest correct change → `npm run typecheck` + `npm test` for touched areas → `npm run lint` → review the diff → **update `CLAUDE.md` in the same session if the change makes a claim in it stale or incomplete**, then update `README.md`/other docs if documented behavior changed.

**Assessment Engine changes** (`src/domain/igcse/`, `server/`, `scripts/scoring/`, `scripts/stt/`): higher-risk than a normal change — see `src/domain/igcse/CLAUDE.md` and `docs/guides/development.md`'s Assessment-Engine change procedure before touching `evidence/`, `judgement/`, `guardrails/`, `envelope/`, or `rubric.ts`.

Full command list, the three test suites, and what each command does/doesn't cover: `docs/guides/development.md`.

## Keeping This File Current

`CLAUDE.md` is only useful if it matches the repo. **Before ending any implementation task, check whether it made one of these true, and if so, edit the relevant section in the same session — don't defer it:**

- A new runtime surface, or a change to how the three existing ones relate → update **Three Runtime Surfaces** and `docs/systems/topology.md`.
- A new invariant you had to introduce or enforce (a new "don't do X" you'd want the next session to know) → add it to **Core Architectural Rules** or **Known Traps**, not just the commit message.
- A doc `CLAUDE.md` points to (in **Source of Truth** or **Documentation map**) is added, moved, or deleted → update the pointer.
- A canonical-implementation claim in **Known Traps** turns out to be wrong (you find a second XP formula, a "dead code" path that's now wired up, etc.) → correct it, don't leave it for a future audit.
- A `docs/` move or reorganization → update **Documentation map** to match.

If none of these apply, don't touch `CLAUDE.md` — a diff here on every change is as bad as a stale file. When in doubt about whether something is "almost every session" material versus a one-off detail, leave it out; over-including degrades the file faster than under-including does.

## Validation Commands

```bash
npm run dev                              # Vite dev server
npm run build                            # production build
npm run typecheck                        # tsc --noEmit, tsconfig.app.json (src/ only)
npm run lint                             # ESLint
npm test                                 # vitest run (repo-wide)
```

Full command list including `score:golden`, `authoring:check`, `learn:check`, `roleplay:check`, `typecheck:scripts`, `typecheck:server`, and the three-suite test story: `docs/guides/development.md`.

## Known Traps

- **"Feedback restructure" (Phase 2.5) was never implemented.** No flag, no code. If older docs or discussion reference it, treat that as describing work that doesn't exist in this codebase.
- **Don't confuse `backend/data/igcse/*.json` (question-bank content) with `src/domain/igcse/` (scoring engine code).** The former is validated by `npm run authoring:check`; the latter is the actual rubric/evidence/judgement/guardrail pipeline and lives in this repo, not `backend/`.
- **The canonical XP formula is `src/domain/xp.ts`'s `computeXPGain`**, not `progressionService.ts` (which calls it). Similarly, the canonical color-to-score mapping is `src/domain/scoring.ts`. Both have been duplicated informally elsewhere in the past — if you find a second implementation, that's drift, not a second source of truth.
- **`src/services/supabase/` is not dead code.** Auth, sync, social, shop, league, and duel features are all wired through Supabase — check for existing usage before assuming a feature needs new plumbing.
- **There are three IGCSE scorers, only one authoritative.** See `docs/decisions/0003-node-engine-is-the-authoritative-scorer.md`.
