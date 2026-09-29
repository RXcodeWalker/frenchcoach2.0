# Development

Commands, what each does and doesn't cover, the three test suites, and the Assessment-Engine
change procedure. No hard-coded pass/fail counts — establish the baseline by running the commands,
not by trusting a number written here.

## Commands

```bash
npm run dev                # Vite dev server
npm run build               # production build (Vite + SEO prerender + sitemap)
npm run typecheck           # tsc --noEmit -p tsconfig.app.json — src/ only
npm run typecheck:scripts   # tsc --noEmit -p tsconfig.scripts.json — scripts/ + src/
npm run typecheck:server    # tsc --noEmit -p tsconfig.server.json — server/ only
npm run lint                # eslint .
npm test                    # vitest run
npm run test:watch          # vitest watch mode
```

`typecheck`, `typecheck:scripts`, and `typecheck:server` are three separate `tsc` invocations
against three separate `tsconfig*.json` files with different `include` scopes — running
`typecheck` alone does not check `server/` or `scripts/`. Run all three when a change touches more
than one surface.

```bash
npm run score:golden                     # deterministic scoring regression (no LLM/network) — run
                                          # after any change to evidence/judgement/guardrails/envelope/rubric
npm run authoring:check                  # content gate: validate + pattern lint + per-set lint + cross-set corpus check
npm run authoring:check -- --draft       # same, minus the "not-approved" error (work-in-progress sets)
npm run authoring:skeleton -- <NN>       # emit a pre-tagged question-set skeleton
npm run authoring:review-sheet -- <NN>   # render one set as readable Markdown for reviewers (--all, --glosses <file>)
npm run authoring:status                 # review-tier counts + corpus coverage
npm run authoring:generate               # regenerate src/data/exam/bank/fixtures/ from backend/data/igcse/*.json (never hand-edit)
npm run authoring:parity                 # every fixture hashes identically to its backend JSON
npx tsx scripts/authoring/originalityCheck.ts <TN-text>   # local-only; the notes text must live outside both repos (ADR 0008)
npm run roleplay:check                   # validate roleplay scenario registry (graph/meta/deck)
npm run learn:check                      # validate src/data/learn/demands/*.json against the question bank
```

Other CLIs exist under `scripts/scoring/` (`score:batch`, `score:inspect`, `score:review`) and
`scripts/stt/` (`stt:ingest`) for validation work outside the everyday loop — read each script's
own header comment before using it.

```bash
npm run judge:check                      # real-judge harness (0520 Phase 1 Batch 2) — see below
npm run judge:check -- --case weak       # one fixture only
npm run judge:check -- --runs 5          # more runs per fixture (default 3)
npm run judge:check -- --provider groq   # Groq instead of Gemini (needs GROQ_API_KEY)
```

`judge:check` (`scripts/scoring/judgeCheck.ts`) runs the real `buildEvidenceProfile` → both L2
judge calls → `runGuardrails` path against a **live** judge — Gemini by default, needs
`GEMINI_API_KEY` — over 16 fixtures in `scripts/scoring/judgeCheck/fixtures/*.json`: the 8 verbatim
pre-change-experiment transcripts (`weak`, `middling-original`, `strong`, `borderline`,
`very-short`, `split-a-strong-comm-poor-grammar`, `split-b-accurate-minimal`, `middling-rewritten`)
plus their `-reconstructed` counterparts (the earlier, hand-iterated Batch-2 stand-ins, kept for
continuity, reported only, never gated). Four of the 8 verbatim fixtures carry a pass-bar `expect`
block (`weak`, `strong`, the two split cases) that must hold in every run, not just one; every
`-reconstructed` fixture and the other 4 verbatim ones are reported only. It costs money, needs a
key, and is nondeterministic, so it is **not run in CI** — `scripts/scoring/judgeCheck/__tests__/fixtures.test.ts`
is the CI-safe part (fixture validity + the pure pass-bar evaluator against a fake judge). It paces
requests and retries `RESOURCE_EXHAUSTED` (free-tier rate limit) with the server's own backoff,
uncounted against the per-call judgement retry; a `JudgementValidationError` gets up to 2 retries
per call kind (3 attempts total, same `MAX_JUDGE_ATTEMPTS` policy as `scoreAttempt.ts`, raised from
1 retry in the 2026-09-27 reliability follow-up) and is printed, never silently masked. It writes a
JSON report to `data/reports/judge-check/` (gitignored) with token usage and an estimated Gemini
cost.

```bash
npm run e2e:exam            # Playwright: drives the exam UI against a fake, no-credentials
                             # scoring service (scripts/e2e/fakeScoringServer.ts) — no Supabase,
                             # no Gemini/Groq key needed. Real speech input is faked
                             # (e2e/fixtures/fakeSpeechRecognition.js); Daily Challenge/Duel's own
                             # Supabase-backed start/submit RPCs are NOT exercised, only that
                             # ExamMode forces Exam Sim once such a run begins — see
                             # e2e/exam.spec.ts's own header and verification-log.md's 2026-09-26
                             # entry for what is and isn't covered.
```

## The three test suites

This repo's testing is genuinely three disjoint suites with three separate invocations and three
different infrastructure requirements — don't assume passing one says anything about the others.

1. **vitest** (`npm test`) — this repo, `src/`/`scripts/`/`server/`. **CI covers only the exam
   surface**: `.github/workflows/ci.yml` runs typecheck, lint and the `src/data/exam`,
   `src/domain/igcse`, `src/services/exam`, `src/screens/exam` suites (plus `authoring:check` /
   `authoring:parity`). The full `npm test` is not in CI because `learn/demand/__tests__/infer.test.ts`
   fails on a Learn question (`ani_21`); everything else passes with `backend/` present.
2. **pytest** (`backend/tests/`) — the separate `backend/` repo. Has its own CI
   (`backend/.github/workflows/ci.yml`): byte-compiles all Python sources, installs
   `requirements.txt`, runs `pytest tests/ -q` on every push/PR to that repo.
3. **Supabase RPC tests** (`backend/supabase/tests/*.test.mjs`, 8 files) — the executable spec of
   the privileged RPC contracts (see `docs/systems/data-model.md`). There is no `package.json` and
   no CI for this suite; it's meant to be run one file at a time against a **local**
   `npx supabase start` stack, never the hosted project. This is the only coverage the privileged
   RPCs have — if you change an RPC in `backend/supabase/migrations/`, run the matching test file
   locally before assuming the change is safe.

## Assessment-Engine change procedure

Changes under `src/domain/igcse/`, `server/`, `scripts/scoring/`, or `scripts/stt/` are
higher-risk than a normal change: there are no architecture docs to consult (see
`docs/systems/assessment-engine.md` for what exists instead). `CLAUDE.md`'s own workflow section
states the procedure in full — plan first and get it confirmed before touching `evidence/`,
`judgement/`, `guardrails/`, `envelope/`, or `rubric.ts`; don't infer validation/calibration
strategy, rubric weights, or rollout order from memory of deleted docs, ask instead; and append
what you did and verified to `verification-log.md` on completion. This guide doesn't restate that
procedure a second time — follow `CLAUDE.md`'s version.

In practice this means: after any change to a pipeline stage, run `npm run score:golden` and
check whether a golden test's *shape* changed (a signal of behavior change, not just a fixture to
refresh) before running the broader `npm test`.
