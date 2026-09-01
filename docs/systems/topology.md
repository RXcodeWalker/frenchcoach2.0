# Topology

The three runtime surfaces, how they deploy, and the environment variables that wire them
together. This is the map to read before touching anything cross-surface.

## The three surfaces

1. **`src/`** — the React (Vite) frontend. Static build, deployed to Vercel.
2. **`server/`** — a Node web service that hosts the Cambridge scoring API. It imports
   `scoreAttempt` from `scripts/scoring/scoreAttempt.ts` directly (`batchScore.ts`'s CLI is the
   only other caller). Its entry point, `server/index.ts`, documents its own 8-step request
   handler in a header docblock — read that, don't restate it here. Deployed by `render.yaml` as
   the `french-scoring` service.
3. **`backend/`** — a **separate git repository** (own remote, own `.gitignore`; listed in this
   repo's root `.gitignore`) running FastAPI. It handles general coaching feedback, transcription,
   and exam endpoints — **not** Cambridge scoring (see `assessment-engine.md` for why one of its
   modules, `evaluator_service.py`, is legacy and unreached). Deployed separately to Render,
   dashboard-managed (see below).

These never call each other directly. The frontend is the only thing that talks to both.

## Deploy wiring

- **`render.yaml`** (repo root) defines exactly one service: `french-scoring` (Node,
  `env: node`), built with `npm run build:server`, started with `npm run start:server`, health
  check at `/health`. It does **not** define the FastAPI service.
- **The FastAPI service has no IaC in either repo.** It is dashboard-configured in Render.
  `backend/README.md`'s "Render" section documents its start command
  (`uvicorn main:app --host 0.0.0.0 --port $PORT`) as prose — that file is the only place this
  command exists in either repo.
- **`vercel.json`** (repo root) proxies the frontend's `/api/*` and `/health` requests to the
  FastAPI service's Render host, plus SPA-fallback rewrites for the admin routes. This is how the
  browser reaches `backend/` same-origin, avoiding CORS.
- The scoring service (`french-scoring`) is reached directly by the browser via
  `VITE_SCORING_API_URL` — it is not proxied through `vercel.json`.

## Environment variables

- Root `.env.example` covers the frontend and `server/` (Node scoring service) variables and is
  in good shape.
- `backend/.env.example` is missing several variables that `backend/main.py` reads at runtime:
  `ADMIN_SETUP_SECRET`, `PRONUNCIATION_LOCAL_WHISPER` (the older, endpoint-scoped sibling of the
  documented `LOCAL_WHISPER_ENABLED`), `GROQ_MODEL`, `GROQ_REASONING_EFFORT`, and
  `GEMINI_PROBE_TIMEOUT_SEC`. If you add code that depends on one of these, don't assume a
  deployed environment has it set — check, and consider adding it to the example file as part of
  that change.

### `VITE_SCORING_API_URL` — no fallback

`src/services/exam/scoringApiClient.ts` reads `VITE_SCORING_API_URL`. If it's unset:
- The health ping (`pingScoringServiceHealth`) silently no-ops.
- `submitForScoring` and `pollScoreStatus` both throw `ScoringApiError` — there is no fallback
  scorer. Exam scoring hard-fails and `ExamMode.tsx` shows no marks.

**Whether `VITE_SCORING_API_URL` is set in production Vercel cannot be verified from either
repo.** If you're debugging a report of exam scoring not working in production, check the Vercel
project's environment variables directly rather than assuming.

## CI

`.github/workflows/` currently runs three workflows, all scheduled Supabase RPC invocations
(`daily-challenge-seed.yml`, `league-weekly-assignment.yml`, and the reusable
`scheduled-rpc.yml` they call) — none of them run `npm test`, `npm run typecheck`, or
`npm run lint`. **There is no frontend CI.** Test/typecheck/lint status is only ever known
locally, at the time someone runs it — see `guides/development.md`.
