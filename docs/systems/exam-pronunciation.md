# Exam pronunciation analysis

Opt-in, feedback-only pronunciation analysis for Cambridge 0520 exam attempts. Why it is built this
way, and the rules it must keep: `docs/decisions/0010-pronunciation-evidence-is-post-hoc-mark-free-and-gated.md`
(and, for the one-way boundary it extends, 0009). This page is the specification; the code and its
tests are the current behavior.

**Release status: closed.** The feature is built and dark for learners. Every threshold is
`UNVALIDATED`, and the calibration that would validate them (below) has **not passed**: sets 1 and an
interim set 2 are recorded and clean, set 3 and the learner-accent set 2 are not. Until it
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
(`source` is a closed set: `exam`, `learn`, `lab`, `shadowing`, `probe` for calibration runs, and the now-unused `repair`) and a
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

### Calibration (partly run: sets 1 and interim 2)

Three fixed audio sets: (1) clear French, (2) a strong but understandable accent, (3) genuinely
unclear words (minimal-pair swaps). Rules: no under-13 voices, everyone recorded consents, no
Teacher's-Notes-derived scripts. **No such corpus is assumed to exist.** Sources: sets 1–2 from
Mozilla Common Voice French (CC0, adult speakers, via the Mozilla Data Collective; accepting the
dataset terms is required); set 3 is `scripts/examPronunciation/set3Selection.json` — nine
minimal-pair sentences, each read once normally and once with one deliberate swap, by a consenting
adult or a person 13 or over, never an under-13 voice. Every set-3 target word is one the fairness
rules can report (no *r*, ≥3 letters, a meaning-carrying category).

**Pipeline** (the audio is never committed; only Azure's JSON is):

1. `npm run pronunciation:calibration:select-cv -- --tsv … --set clear|accented …` picks Common
   Voice clips from `validated.tsv` (≥2 up-votes, 0 down-votes, one clip per speaker, no `teens` or
   unknown age, seeded and reproducible).
2. `npm run pronunciation:calibration:prepare -- --clips <selection.json> --out <dir>` decodes with
   ffmpeg, then trims and measures every clip with `prepareDecodedTurn` — the exact function the exam
   client uses — and writes the WAVs plus `manifest.json`.
3. `python backend/scripts/probe_exam_pronunciation.py --manifest <dir>/manifest.json` (live; needs
   `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION`/`GROQ_API_KEY`) runs the production Whisper call, the
   route's chunk plan and the production Azure request, and writes
   `backend/tests/fixtures/exam_pronunciation_calibration/<set>/<clipId>.json`: Whisper's output,
   the chunks, Azure's raw JSON, and the evidence they replay to
   (`services/pronunciation/calibration_replay.py`). Calls are metered in the ledger as source
   `probe` (migration `20261006090000`) when `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` are set, otherwise
   unmetered with a printed warning.
4. `npm run pronunciation:calibration:report` prints the verdict (exit 0 only on `pass`).

**CI never calls Azure.** Backend `tests/test_exam_pronunciation_calibration_replay.py` re-derives
each fixture's evidence from its raw JSON (so an assessor change fails until the fixtures are
re-recorded and `EXAM_PRONUNCIATION_ASSESSOR_VERSION` bumped). Frontend
`scripts/examPronunciation/calibration.test.ts` runs the current fairness rules over the stored
evidence once any fixture exists. Pass criteria (`calibration.ts`):

- **clear:** 0 reported words. Set 3's *correct* readings are held to this rule too.
- **accented:** 0 accent-only reports. A report is accent-only unless a human confirmed the speaker
  said a different word (`knownMisreadings` on the clip).
- **unclear:** every swapped word reported, and no other word reported in a swap reading.

The last two refinements are stricter than the plan's wording, never looser. A set passes only with
≥1 assessed clip; a clip Whisper could not hear is listed, never counted as clean. The status is
`not_run` / `incomplete` / `fail` / `pass`; only `pass` satisfies release condition 1. The report also
lists the swapped words caught (their accuracy shows the margin under the floor) and the *near
misses*: words in clear/accented clips suppressed only by an accuracy floor — that is the threshold
check.

**Known limits of the calibration itself:**

- `examTranscript` is the sentence the speaker read, an idealised second recogniser. Real Web Speech
  disagrees with Whisper more often, which in production only suppresses more.
- Decoding uses ffmpeg rather than the browser's `OfflineAudioContext`. Everything after decoding is
  the production code.
- **Freeform mode cannot see a clean substitution.** Azure grades the audio against Whisper's
  transcript of it, so a cleanly pronounced *tout* where *tu* was meant is likely transcribed and
  scored as a good *tout*. Set 3 can only pass on swaps that stay ambiguous enough for Whisper to
  keep the intended word. If set 3 fails that way, the finding is "the feature does not catch clean
  swaps", not "lower the floor"; lowering it would trade accent fairness for it.

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
