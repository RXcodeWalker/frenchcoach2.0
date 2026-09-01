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
npm run authoring:check                  # content gate: validate + lint + cross-set corpus check
npm run authoring:check -- --draft       # same, minus the "not-approved" error (work-in-progress sets)
npm run authoring:skeleton -- <NN>       # emit a pre-tagged question-set skeleton
npm run authoring:review-sheet -- <NN>   # render one set as readable Markdown for reviewers
npm run authoring:status                 # review-tier counts + corpus coverage
npm run roleplay:check                   # validate roleplay scenario registry (graph/meta/deck)
npm run learn:check                      # validate src/data/learn/demands/*.json against the question bank
```

Other CLIs exist under `scripts/scoring/` (`score:batch`, `score:inspect`, `score:review`) and
`scripts/stt/` (`stt:ingest`) for validation work outside the everyday loop — read each script's
own header comment before using it.

## The three test suites

This repo's testing is genuinely three disjoint suites with three separate invocations and three
different infrastructure requirements — don't assume passing one says anything about the others.

1. **vitest** (`npm test`) — this repo, `src/`/`scripts/`/`server/`. **No CI wired up for it**;
   `.github/workflows/` currently contains only scheduled Supabase RPC cron jobs
   (`daily-challenge-seed.yml`, `league-weekly-assignment.yml`), none of which run tests, lint, or
   typecheck. The only place this suite's result is known is wherever it was last run locally.
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
