# Exam pronunciation analysis

Opt-in, feedback-only pronunciation analysis for Cambridge 0520 exam attempts. Why it is built this
way, and the rules it must keep: `docs/decisions/0010-pronunciation-evidence-is-post-hoc-mark-free-and-gated.md`
(and, for the one-way boundary it extends, 0009). This page is the specification; the code and its
tests are the current behavior.

**Release status: closed.** The feature is built and dark for learners. Every threshold is
`UNVALIDATED`, and the calibration that would validate them (below) has **not been run**. Until it
has, `EXAM_PRONUNCIATION_ACCESS` stays `off` or `admin`.

## What the candidate sees

- **Exam Sim:** nothing during the test. The results page gets a **Pronunciation** section *after*
  the marks and the examiner report (`ExamResults.tsx`), never inside either. One "Analyse my
  pronunciation" button; parts fill in as they finish. Exam Sim never shows a card mid-exam.
- **Coached:** when a part ends (role play, topic 1) one card appears in the rail, up to 2 words and
  1 pattern, **never a number**. Topic 2's marker is recorded at completion; its analysis is reached
  from the report section (the rail is unmounted when the exam ends). The report reuses stored
  results; nothing is re-analysed.
- **The report section:** the candidate's transcript by part with reported words highlighted; tap a
  word for *You* (sliced from the in-memory recording, ~120 ms padding) and *Model* (browser TTS,
  hidden without a French voice); the top 2–3 sound patterns (each needs ≥2 distinct words, up to 3
  of the candidate's own words, labelled *inferred*); one descriptive fluency sentence from pause
  statistics and the existing filler counter (never a level); a link to `/accent-analyzer`.
- **States, each one sentence and never blocking** (`src/features/exam/pronunciation/messages.ts`):
  `idle`, `running`, `done`, `failed` (with retry), `budget_exhausted`, `daily_cap`,
  `consent_required` (renders `GuardianConsentNotice`), `no_audio`, `signed_out`, `not_enabled`.
- Nothing is analysed automatically. The only call made without a tap is the read-only GET of
  already-stored rows when the report opens.

## Fairness rules

Deterministic, in `src/domain/examPronunciation/fairness.ts`; every number and word list is in
`FAIRNESS_CONFIG`, whose hash is pinned by `EXAM_PRONUNCIATION_VERSION` (`version.ts`). The axis is
comprehensibility, not nativeness (TN p.12; no band mentions accent). A word is **reported** only if
all hold:

1. Azure marked it `mispronounced` and its accuracy is below the floor (mid-range scores are where
   accent lives).
2. Its inferred category is meaning-carrying — nasal vs oral vowel, minimal-pair vowel quality,
   a pronounced silent ending that changes the form, an obligatory distinguishing liaison. French R,
   stress, rhythm and vowel colour are **never** reported (any word containing an *r* is
   suppressed). An uncategorised word is reported only below the very-low floor and at the minimum
   length. Categories are orthographic and labelled *inferred*: fr-FR Azure returns no phoneme names.
3. **Both recognisers agree** (the exam transcript and Whisper's reference, aligned by the backend).
   With one recogniser (no Web Speech, so the exam transcript *is* Whisper) only the very-low floor
   applies and the result is marked lower-confidence.
4. The signal is clean: not near a chunk seam, not clipped, SNR and Azure confidence above their
   floors, not a very short word, a number, a proper noun or a loanword.
5. A sound pattern needs ≥2 distinct words.

Suppressed words and reasons are stored for calibration and never displayed. Accuracy, offsets and
reasons live in the stored evidence only; display types carry no score.

## Data and API

- **Table `exam_pronunciation_evidence`** (backend migration `20261005100000`). One row per analysed
  candidate turn, unique on `(user_id, session_id, turn_key, assessor_version)`. Holds the part, the
  word-level Azure results with offsets, the aligned exam-transcript word and recogniser agreement,
  recognition-trust suppression reasons, `raw_s`/`trimmed_s`, `fairness_version`. No overall score.
  FK `user_id → profiles(id) ON DELETE CASCADE` (same as `session_transcripts`/`scoring_envelopes`),
  so account deletion and guardian revocation erase it; RLS select-own, service-role insert only;
  included in `export_my_data`. The row is the cache.
- **`POST /api/exam/pronunciation`** (`backend/routers/exam_pronunciation.py`), **one turn per
  request**, multipart: `session_id`, `part`, `turn_key`, a 16 kHz mono WAV, `exam_transcript`. In
  order: access mode → `verify_supabase_jwt` (no guests) → `require_speaking_consent` → cache →
  daily quota (`exam_pronunciation`, key `exam-pron:{session}:{part}`, charged on a cache miss, so
  every turn of a part replays one grant) → Azure-seconds reservation → Whisper → Azure freeform,
  chunked past the 30 s REST limit at `AZURE_SPEECH_MAX_CONCURRENCY` → settle, store, return.
  `budget_exhausted` is a 200 status, not an error. On failure the part grant is released only if no
  turn of that part is stored.
- **`GET /api/exam/pronunciation?session_id=`** returns stored turns only and never analyses.
- **Who can read or write.** `user_id` comes only from the verified JWT `sub` and is never accepted
  from the request; every lookup, insert and the uniqueness key include it, and the GET filters in
  code (service-role client), not by RLS. Another user sending the same `session_id` gets separate
  rows. There is no server-side session record before scoring, so a client can add junk rows only to
  its own evidence, at its own quota cost; calibration therefore counts a row only if its
  `exam_transcript` matches a candidate utterance in that user's envelope `transcriptSnapshot` — a
  join-time filter, because Coached evidence predates any envelope.
- **Client** (`src/services/exam/pronunciation/client.ts`): normalise to 16 kHz mono WAV → trim
  silence (`trim.ts`: edges, internal silence capped at 600 ms, pause stats taken *before* trimming;
  Azure's fluency score is ignored because trimming inflates it) → sequential per-turn POSTs with a
  60 s timeout and one retry (free-plan cold start). A retry sends only turns with no stored result.
  Part-level patterns and highlights are computed client-side from stored turns.
- **What is sent:** candidate speech turns that have a recording; never examiner TTS, typed turns or
  the greeting reply. A turn with no blob is `no_audio`; a part with none has its button disabled.
  Conduct-log `startS`/`endS` are skewed late (stamped after `stop()` and `/interpret`), so clip
  slicing uses Azure's in-clip offsets, not the log.

## Cost and metering

Mechanisms exist; **no numeric cap is set**. `azure_speech_budget.cap_seconds` is NULL (unlimited)
until the owner runs one `UPDATE`; the `exam_pronunciation` daily row is seeded at 1000 only because
an unseeded feature 503s every call (FK), not as a real limit. The `azure_speech_usage` ledger
(`source` is a closed set: `exam`, `learn`, `lab`, `shadowing`, and the now-unused `repair`) and a
structured log line per call make real usage visible; `GET /api/admin/azure-usage` summarises it.
Under the free tier Azure still stops at its own monthly limit, which maps to `budget_exhausted`.
The server re-measures seconds from the WAV header and that figure is authoritative; the client logs
`exam_pronunciation_audio_measured` (`rawS`, `trimmedS`) before any call. **Cost and capacity
(`seconds per exam × price`, `(cap − Learn seconds) / seconds per exam`) are not yet computed** — they
need real exam traffic through the ledger first. Azure retention was verified against Microsoft's
documentation: the request uses the base REST endpoint with no `storeAudio`, so audio is not kept
(`tests/test_azure_client_request.py` asserts it); Groq's retention was not checked.

## Privacy

| Data | Where | Kept |
|---|---|---|
| Recordings | browser memory only (`examAudioStore.ts`) | until leaving results, a new attempt, sign-out, tab close, or 60 min idle |
| Uploaded WAV | backend memory/temp file; Azure and Groq in transit | the request only |
| Evidence | `exam_pronunciation_evidence` | for life; cascades on profile delete; exported |
| Usage ledger | `azure_speech_usage` (no content; `user_id` `ON DELETE SET NULL`) | until a purge policy is chosen (no pg_cron; an ops script) |

Evidence rows for Coached sessions abandoned before scoring are harmless orphans, swept by the same
ops script. A reopened report says "recording not kept".

## Release gate

`EXAM_PRONUNCIATION_ACCESS` (backend; `off` | `admin` | `all`, default `off`) is authoritative and
checked first; `admin` uses the JWT `app_metadata.role === 'admin'`, anyone else gets 403
`not_enabled`. The client UI renders only for an admin or `VITE_EXAM_PRONUNCIATION_PUBLIC=1`, never
for a `pending` account.

`all` is allowed only when **both** hold, recorded in `verification-log.md`:

1. **Calibration has passed** with the thresholds in `FAIRNESS_CONFIG`.
2. **Migration `20261003113100_revoke_guardian_consent_by_token.sql` is applied to production**
   (`docs/systems/child-safety-consent.md`). Without it guardian revocation — and so erasure of the
   evidence — is unavailable.

If calibration moves a threshold, bump `EXAM_PRONUNCIATION_VERSION` (and
`EXAM_PRONUNCIATION_ASSESSOR_VERSION` if the backend logic changed) and re-run it.

### Calibration (not yet run)

Three fixed audio sets: (1) clear French, (2) a strong but understandable accent, (3) genuinely
unclear words (minimal-pair swaps). Rules: no under-13 voices, everyone recorded consents, no
Teacher's-Notes-derived scripts. **No such corpus is assumed to exist.** Intended sources: sets 1–2
from Mozilla Common Voice French (CC0, adult speakers; accent metadata picks clear vs accented;
accepting the dataset terms is required); set 3 is a short script of minimal-pair sentences
(*tu/tout*, *vin/vent*, *ils ont/ils sont*) read once correctly and once with the swap, by a
consenting adult or a person 13 or over, never an under-13 voice.

CI replays recorded Azure JSON responses as fixtures (CI never calls Azure) and passes only if set 1
yields **0 reported words**, set 2 **0 accent-only reports**, set 3 **reports the swapped words**.
`backend/scripts/probe_exam_pronunciation.py` is meant to re-record the responses live. Neither it nor
the fixtures exist yet, and the ledger's `source` check has no `probe` value (the original plan assumed
one), so the script needs either a migration adding it or an unmetered path; decide that when it is
written.

## Structural guarantees

Where the "cannot change a mark" property is enforced, so a change here knows what to run:
`scoredPipelineBoundary.test.ts` (no exemptions), `dataIsolation.test.ts`, `types.test.ts` (no mark
field in display types), `marksUnchanged.test.ts`, `versionsUnchanged.test.ts`, two ESLint
`no-restricted-imports` blocks, and `npm run score:golden` showing no diff. Display strings pass the
shared mark/band filter in `src/domain/examFeedback/shared/`. Nothing under `src/domain/igcse/` changes
for this feature, so no engine `version.ts` bump is due and `session-engine-v4` is unchanged.

## Known gaps

- Intonation cannot be measured for fr-FR (prosody and phoneme names are en-US only in Azure), so
  nothing here claims to assess it; the report says nothing about it.
- "You" playback (Web Audio) has no automated test of its own, and no one has yet heard a clip.
- The deployed Vercel proxy's timeout and body limits for external rewrites were not verified; the
  one-turn-per-request design avoids depending on them.
- Several Azure facts are assumed, not verified (F0's monthly hours, behaviour at the limit, S0
  pricing, the quota-exceeded response shape); see `verification-log.md`.
- Anything that scales the FastAPI service beyond one instance with one worker invalidates the
  Azure semaphore: `docs/systems/topology.md`.
