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

## Production reality checks (ship-readiness Phase 0)

The ship-readiness roadmap's Phase 0 asks five questions the repo can't answer on its own. What
the code confirms is recorded here; the dashboard / live-service findings are filled in against
production and then treated as the record. **Last repo pass: 2026-09-09.**

### What the repo confirms (verified 2026-09-09)

- **The committed `dist/` build has the scoring path dead-code-eliminated.**
  `src/services/exam/scoringApiClient.ts:18` resolves `SCORING_API_BASE` from
  `import.meta.env.VITE_SCORING_API_URL ?? ''`. In the committed `dist/assets/index-*.js`,
  `submitForScoring` and `pollScoreStatus` are both minified to
  `function(){throw new oc("Scoring service is not configured (VITE_SCORING_API_URL unset)")}` —
  i.e. the last local build ran with the var unset. This says nothing about Vercel's build, but
  it does mean any build shipped without the var makes exam scoring throw synchronously inside
  `submitForScoring` (a hard fail, not an infinite spinner — the spinner-hang failure mode is
  the separate no-deadline polling bug in `ExamMode.tsx`).
- **`.env.local` sets only** `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` —
  no `VITE_SCORING_API_URL`, no `VITE_SENTRY_DSN`.
- **`.env.example`** ships `VITE_SCORING_API_URL=` empty, commented "Empty/unset means ExamMode
  shows no marks."
- **`render.yaml` `french-scoring`** declares `GEMINI_API_KEY`, `GEMINI_MODEL`, `GROQ_API_KEY`,
  `GROQ_MODEL`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `CORS_ORIGINS` (all `sync: false`) and
  `SCORING_DEBUG='1'`. It does **not** declare `VITE_API_URL`.
- **`CORS_ORIGINS` unset ⇒ reflect every origin.** `server/index.ts:83` —
  `cors({ origin: CORS_ORIGINS.length > 0 ? CORS_ORIGINS : true })`.
- **`VITE_API_URL` unset in the scoring service ⇒ `http://localhost:8000`.**
  `server/resolveQuestionSet.ts`. In production this means published question sets never
  resolve from the content API, so every set falls back to the in-repo fixture. Since the exam
  overhaul's fix step A (2026-09-23) the server's offline registry is the same 10-set
  `src/data/exam/bank/fixtures/index.ts` the browser uses (previously only
  `original-practice-001`, so sets 002–010 400'd). Fixture ↔ backend-JSON hash parity is
  checked by `npx tsx scripts/authoring/checkFixtureParity.ts <backend>/data/igcse`; drift
  would 409.
- **Judge model IDs are now env-driven everywhere (Phase 2.1, resolved).** Node's
  `scripts/scoring/providers/geminiJudge.ts`/`groqJudge.ts` read `process.env.GEMINI_MODEL` /
  `GROQ_MODEL` (falling back to `gemini-2.5-flash-lite` / `openai/gpt-oss-120b` only when
  unset; the Groq default was `llama-3.3-70b-versatile` until 2026-09-23, which Groq has
  retired, so the fallback was dead wherever `GROQ_MODEL` was unset. `main.py` records
  `gemini-2.5-flash-lite` as retired for new keys too, so set `GEMINI_MODEL` explicitly), matching `backend/main.py`'s existing `GEMINI_MODEL`/`GROQ_MODEL` pattern;
  `render.yaml`'s `french-scoring` service now declares both as `sync: false` envVars.
  `backend/exam_controller.py` and `backend/scenario_generator.py` were also migrated onto the
  same two env vars (previously hardcoded `llama-3.3-70b-versatile` / `gemini-2.0-flash` /
  `gemini-1.5-flash`, ignoring `main.py`'s overrides). Verify whichever literal is currently the
  fallback default is still a live model ID before relying on the fallback in prod —
  `/health` (see below) now surfaces a `model_not_found`-shaped failure without inference cost.
  `backend/evaluator_service.py` still hardcodes dead IDs — unreached from `src/`, out of scope
  (slated for deletion under Phase 6.1).
- **`/health` on the Node scoring service now probes provider model IDs without paying for
  inference (Phase 2.1).** `server/index.ts` calls `groqClient.models.retrieve(model)` /
  `geminiClient.models.get({ model })` — metadata-only SDK calls, not `generateContent`/
  `chat.completions.create` — cached 60s on success / 5s on failure
  (`server/healthProbe.ts`), mirroring `backend/main.py`'s `_probe_groq`/`_probe_gemini` cache
  shape without that endpoint's per-poll paid-inference cost (a residual issue on the FastAPI
  side, not fixed here — out of scope for this Node-service change).
- **FastAPI has no IaC.** Its env is Render-dashboard-only. `backend/README.md` documents the
  start command as `uvicorn main:app --host 0.0.0.0 --port $PORT` — no `--proxy-headers` /
  `--forwarded-allow-ips`, so slowapi's `get_remote_address` sees Render's edge IP and every
  user shares one rate-limit bucket. **Still open** (phase-3-plan-tidy-widget.md §3, §4 step 4):
  fixing this requires confirming Render's actual proxy topology first — not verifiable from
  code — before setting `--forwarded-allow-ips`; the recommended default once confirmed is
  `127.0.0.1` (the typical single-hop PaaS edge-connects-as-local-peer model), not `'*'`. Per-user
  AI-cost quota (Phase 3, `consume_ai_quota`) is unaffected by this bug — it keys off the
  JWT-verified `user_id`, not IP — but any rate limiting on a still-unauthenticated route (e.g.
  `/api/exam/*`) is effectively a single global limit across all anonymous users until this lands.
- **`POST /api/admin/roles` now needs a two-key handshake (Phase 1.2).** It grants the `admin`
  role only when **both** `ADMIN_SETUP_ENABLED=true` **and** a matching `ADMIN_SETUP_SECRET` are
  set; otherwise it 404s (not 403 — the route is not advertised). Previously it was gated on the
  secret alone, so setting `ADMIN_SETUP_SECRET` at all made it a live unauthenticated
  admin-grant path. Both vars still stay unset in prod once the first admin is seeded — the code
  change is defence-in-depth on top of that.
- **FastAPI interactive docs are OFF by default (Phase 1.2).** `/docs`, `/redoc`, `/openapi.json`
  return 404 unless `ENABLE_API_DOCS=true` (intended for staging only). `GET /metrics` is now
  `Depends(require_admin)` — it returns 401/403 (or 503 if `SUPABASE_JWT_SECRET` is unset) rather
  than serving the `by_endpoint` traffic map anonymously.
- **CORS on FastAPI is an explicit origin list, no wildcard fallback.** `backend/main.py:143-153`
  reads `CORS_ORIGINS` (comma-separated, trailing slashes stripped), defaulting to
  `localhost:5173,localhost:3000,frenchcoach.vercel.app,french.beyondthebasics.me`. Unlike the
  Node `server/` (which reflects every origin when `CORS_ORIGINS` is unset), this is safe as-is.
- **`backend/evaluator_service.py:217,235` is the one remaining hardcoded-model-ID site** — see
  the judge-models entry above; unreached from `src/`, out of scope (Phase 6.1 deletion).

### To verify against production and record here

| # | Check | Where | Finding |
|---|---|---|---|
| 1 | `VITE_SCORING_API_URL` set, HTTPS? | Vercel → Project → Settings → Environment Variables | ⚠️ **not yet confirmed which Render service it points to** — see "scoring service identity" below |
| 1 | `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` set? | same | ✅ set (2026-09-15) |
| 1 | `VITE_SENTRY_DSN` set? | same | ❌ **not set** — Sentry is not receiving prod errors (2026-09-15) |
| 2 | `french-scoring`: `CORS_ORIGINS` = the real frontend origin(s), no trailing slash? | Render → `french-scoring` → Environment | ⚠️ see "scoring service identity" below |
| 2 | `french-scoring`: `VITE_API_URL` = the FastAPI host? (else question-set resolution is broken) | same | ⚠️ see "scoring service identity" below |
| 3 | FastAPI service: full env var list + start command — paste into "FastAPI env (captured)" below | Render → FastAPI service → Environment / Settings | ✅ 11 vars captured 2026-09-15, see below; start command not yet captured |
| 3 | FastAPI: `ADMIN_SETUP_SECRET` **and** `ADMIN_SETUP_ENABLED` both **unset**? | same | ✅ neither appears in the captured list (2026-09-15) |
| 3 | FastAPI: `ENABLE_API_DOCS` **unset** in prod? | same | ✅ not in the captured list |
| 3 | FastAPI: `AZURE_SPEECH_KEY` / `AZURE_SPEECH_REGION` present? | same | ✅ both present (2026-09-15) |
| 3 | FastAPI: `SMTP_HOST`/`SMTP_USER`/`SMTP_PASSWORD`/`SMTP_FROM`/`APP_ORIGIN` set? | same | ❌ **none present** — guardian-consent email is on the copy-link fallback in prod |
| 4 | `POST $SCORING/score` with a real JWT — 200 envelope, or 500 "Both judge providers failed"? | curl / probe below | ⛔ **blocked — cannot obtain a JWT**, see "auth is broken" below |
| 5 | Groq / Gemini / Azure consoles — anomalous spend since the backend went public unauthenticated? | provider dashboards | _pending_ |

### ⛔ Auth is broken in production, found 2026-09-15 — blocks item 4 and all manual testing

Both sign-up paths fail end to end. Nothing in either repo can fix this — both are pure Supabase /
Google Cloud dashboard configuration:

- **Email/password sign-up**: the confirmation email never arrives (checked, not in spam).
  `signUp()` (`src/context/AuthContext.tsx:139`) is a bare `supabase.auth.signUp()` — delivery is
  entirely Supabase Auth's email config. Default Supabase SMTP has a very low hourly send cap and
  is commonly spam-filtered. **Fix**: Supabase Dashboard → Authentication → Emails, check
  rate-limit/logs; then set up custom SMTP (Authentication → Settings → SMTP Settings) — **Resend
  is already paid for and wired** (`RESEND_API_KEY`, used by `sendNotifications.ts`), so pointing
  Supabase Auth's SMTP at the same Resend account is the natural fix rather than a new vendor.
- **Google OAuth**: fails with `Error 401: deleted_client` — "The OAuth client was deleted."
  `signInWithOAuth('google')` (`AuthContext.tsx:167`) just calls
  `supabase.auth.signInWithOAuth({ provider: 'google' })`; the Google Cloud OAuth 2.0 Client ID
  that Supabase's Google provider references has been deleted from Google Cloud Console (or the
  whole GCP project was). This **confirms and supersedes** the "External app registrations don't
  exist yet" line in the OAuth section below — one did exist and is now gone. **Fix**: Google
  Cloud Console → APIs & Services → Credentials → new OAuth 2.0 Client ID (Web application,
  authorized redirect URI = `https://<project-ref>.supabase.co/auth/v1/callback`) → paste the new
  Client ID + Secret into Supabase Dashboard → Authentication → Providers → Google.
- **Net effect**: no one can currently create an account or sign in on this deploy. This blocks
  more than Phase 0 item 4 — it blocks manually verifying *any* of the Phase 1–4 work already
  landed. Treat as higher priority than finishing the rest of this checklist.

### ⚠️ Scoring service identity is unresolved — two Render services exist

- **`french-coach-backend`** (`srv-d7k8bl5ckfvc73bh0obg`, Python, repo
  `RXcodeWalker/french-coach-backend`) — the FastAPI `backend/` service. 11 env vars captured,
  see below.
- **`french-scoring-a11-stub`** (`srv-d9d05i57vvec73einlg0`, Node, repo
  `RXcodeWalker/frenchcoach2.0`, `https://french-scoring-a11-stub.onrender.com`) — **not** the
  `french-scoring` name `render.yaml` declares, and carries only 4 env vars: `GEMINI_API_KEY`,
  `GROQ_API_KEY`, `SUPABASE_SERVICE_KEY`, `SUPABASE_URL`. No `CORS_ORIGINS`, no `VITE_API_URL`, no
  `SCORING_DEBUG`, no `GEMINI_MODEL`/`GROQ_MODEL`. The `-a11-stub` name strongly suggests this was
  a throwaway service used to verify the "A11" client-disconnect behavior noted in
  `server/index.ts`'s header docblock, left running rather than the real deploy.

**Resolve before trusting anything else in this section**: check what `VITE_SCORING_API_URL` is
actually set to in Vercel.
- If it points at `french-scoring-a11-stub.onrender.com` (or no other scoring service exists under
  the account), **that stub is production** — it needs `CORS_ORIGINS` and `VITE_API_URL` added
  immediately (right now it reflects every CORS origin per `server/index.ts:83`, and question-set
  resolution falls back to `localhost:8000` per `resolveQuestionSet.ts:20`), and should be
  renamed/redeployed to match `render.yaml`'s `french-scoring` so infra-as-code actually describes
  what's running.
- If it's confirmed unused, delete it — it's a live instance holding real `GEMINI_API_KEY` /
  `GROQ_API_KEY` / `SUPABASE_SERVICE_KEY` values with no CORS restriction and no rate limiting.

### Item 4 — the check that says whether exam mode works at all

Set `SCORING` to the `french-scoring` host and `JWT` to a real Supabase access token (dev
console: `(await supabase.auth.getSession()).data.session.access_token`).

```bash
# (a) Reachability + auth only — judge NOT exercised.
curl -sS -i -X POST "$SCORING/score" \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{}'
# 401            -> JWT rejected
# 400 "invalid transcript" -> service up, auth OK (does not prove scoring works)
# 5xx / no response        -> boot/deploy problem, stop here
```

```bash
# (b) Exercises the exact provider path POST /score uses, with the prod keys.
# Run from the repo root with GEMINI_API_KEY / GROQ_API_KEY exported to the
# values configured on the french-scoring Render service.
npx tsx -e "
import { createJudgeWithFallback } from './scripts/scoring/providers/judgeFactory';
const { judge, getLastCallMetadata } = createJudgeWithFallback();
judge({ prompt: 'Reply with the JSON {\"ok\":true} and nothing else.' })
  .then((r) => console.log('OK', getLastCallMetadata(), r))
  .catch((e) => { console.error('FAIL', e.message); process.exit(1); });
"
# 'FAIL Both judge providers failed. ... model_not_found / not available'
#   -> the DEFAULT_MODEL fallback literals, GEMINI_MODEL/GROQ_MODEL env reads, and
#      render.yaml entries are all in place (Phase 2.1) — a failure here now most
#      likely means the *configured* GEMINI_MODEL/GROQ_MODEL values on Render (or
#      the fallback literals, if unset) are themselves no longer live model IDs.
```

### FastAPI env (captured, 2026-09-15 — `french-coach-backend`, `srv-d7k8bl5ckfvc73bh0obg`)

Start command: not yet captured (Settings tab).

11 variables set: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `CORS_ORIGINS`, `GEMINI_API_KEY`,
`GROQ_API_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_SERVICE_KEY`, `SUPABASE_URL`,
`WHISPER_COMPUTE_TYPE`, `WHISPER_DEVICE`, `WHISPER_MODEL`. Not present: `ADMIN_SETUP_SECRET`,
`ADMIN_SETUP_ENABLED`, `ENABLE_API_DOCS`, `GEMINI_MODEL`, `GROQ_MODEL` (so both ride their code
fallback defaults in prod — re-verify those defaults are still live model IDs), any `SMTP_*` /
`APP_ORIGIN` var, `LOCAL_WHISPER_ENABLED` / `PRONUNCIATION_LOCAL_WHISPER` (local Whisper stays off
by default, consistent with the 512MB-instance constraint). Values themselves are masked in the
dashboard — only presence/absence was checked.

## OAuth — Google provider is broken in production (found 2026-09-15)

`signInWithOAuth` (`src/context/AuthContext.tsx`) and the Google/Microsoft buttons
(`src/screens/Auth.tsx`) are implemented, but two things block treating this as shipped:

- **The Google OAuth Client ID has been deleted from Google Cloud Console** (`Error 401:
  deleted_client` on sign-in attempt, 2026-09-15) — a registration did exist at some point and is
  now gone; see the "Auth is broken" callout above for the fix. Microsoft/Azure AD status is
  unverified — check the same way.
- **The five-case identity-linking behavior has not been verified** against a non-production
  Supabase project (password → OAuth same-email merge, OAuth → OAuth same-email merge,
  unconfirmed-password-signup must NOT silently merge, re-sign-in resolves to the existing
  linked account). `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` passing
  says nothing about this — it needs real-browser round-trips against real consent screens.

Do not treat OAuth sign-in as production-ready until both are done.

## CI

`.github/workflows/` runs four scheduled workflows — none of them run `npm test`,
`npm run typecheck`, or `npm run lint`. **There is no frontend CI.** Test/typecheck/lint
status is only ever known locally, at the time someone runs it — see `guides/development.md`.

- `daily-challenge-seed.yml`, `league-weekly-assignment.yml`, and the reusable
  `scheduled-rpc.yml` they call — a single Supabase RPC invocation per run, no outbound
  network calls beyond that.
- `notifications-streak-and-goal.yml` (Phase 4.3) — hourly, runs
  `scripts/scheduledJobs/sendNotifications.ts` once per notification type (`streak_at_risk`,
  `daily_goal`). This is the first workflow that makes outbound HTTP calls the database can't
  make itself: Web Push (via `web-push`, VAPID-signed) to each user's subscribed devices, and
  Resend (email) as a fallback when every push attempt for a user fails. Reads candidates from
  the `get_notification_candidates` Postgres RPC (service-role only) and claims a
  once-per-user/type/day send attempt via a `notifications_log` upsert before sending — see the
  script's own header for the full at-most-once-attempt design. New secrets (GitHub Actions
  repo secrets, not exposed to the client except `VITE_VAPID_PUBLIC_KEY`):
  `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (Web Push signing) and
  `RESEND_API_KEY` (email fallback), alongside the existing `SUPABASE_URL` /
  `SUPABASE_SERVICE_KEY`. The client half (`src/services/notifications/pushService.ts`,
  `public/sw.js`) needs `VITE_VAPID_PUBLIC_KEY` set wherever the frontend is built (Vercel).
