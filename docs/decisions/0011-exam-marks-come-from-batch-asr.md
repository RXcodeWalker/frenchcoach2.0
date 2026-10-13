# 0011 — Exam marks are read from batch ASR, with the live captions as a recorded fallback

Date: 2026-10-13
Status: Accepted. Implemented in stages: items 1–6 (stage 5), item 7 (stage 6 — see the amendment
at the end).

## Context

Exam Sim and Coached marks were computed from Chrome's live captions (`useRecording`, one
alternative, no confidence). They autocorrect, cannot be re-run, and misread fast, mumbled and
accented speech, which is exactly the speech this app exists to teach. The student's real errors are
what the marker needs to see, so the transcript has to be as faithful as we can make it.

## Decision

1. **Spoken answers are marked from Whisper's reading of the recording** (Groq, model from
   `GROQ_WHISPER_MODEL`), with the question as context. The live captions stay: they drive the
   examiner's turn-taking and the ConductLog (the replay record, never rewritten), and they are the
   second opinion on each answer.
2. **Each answer carries a `recognition` record** on the SessionTranscript (`session-transcript-v2`):
   the batch reading (text, model, hash of the context prompt, Whisper's segments), the live
   captions, which one was `selected`, and a `fallbackReason` when it was the captions. The schema
   enforces that `Utterance.text` is exactly the selected reading, so "what was marked" is never
   ambiguous. A typed Coached correction drops the record.
3. **A fallback is never silent.** Reasons: `no-audio`, `asr-failed`, `asr-timeout`, `asr-rejected`,
   `consent`, `quota`. The review and results screens say "N answers were marked from live captions".
   `asr-rejected` (no speech detected, the prompt echoed back, or an empty reading when the captions
   heard words) uses thresholds marked `UNVALIDATED`, to be set from the STT benchmark.
4. **It is a background job with a deadline.** At most two requests in flight, a 429 `Retry-After` is
   honoured, and `finishSession` waits about 45 s before falling back per answer. A transcription
   problem can degrade accuracy; it cannot stop an exam or a score.
5. **Kill switch:** `VITE_EXAM_BATCH_ASR=0` marks from the live captions exactly as before, with no
   `recognition` records, without redeploying the scorer.
6. **Privacy changes and is stated:** every spoken exam turn is now uploaded automatically (it used
   to leave the browser only on the opt-in pronunciation tap). `/api/transcribe` already refuses a
   `pending` under-13 account (fallback `consent`); Groq is an existing named subprocessor. See
   `docs/systems/child-safety-consent.md`. Word confidence (`exp(avgLogprob)`) is `UNVALIDATED` and
   has no effect on a mark.
7. **Decided, not yet applied:** spellings that sound the same are never penalised (Category A:
   silent endings, et/est, a/à, ou/où, ces/ses/c'est/s'est), with context choosing the spelling;
   audible but accent-confusable pairs (Category B: un/en, ont/sont, le/les, du/de, …) get the
   benefit of the doubt where the two recognisers disagree or only one is available, are counted when
   both agree on the wrong word, and are still reported as "this might have been *X*". Clearly
   different words: Whisper wins and the error can count. The tables exist (`stt/homophones/`,
   `HOMOPHONE_TABLE_VERSION`) and are not yet consulted by the scorer.

## Consequences

- `SESSION_ENGINE_VERSION` → `session-engine-v5`, `STT_SCHEMA_VERSION` → `session-transcript-v2`,
  `STT_ASSEMBLER_VERSION` → `stt-assembler-v2`. Items 1–6 change *which text* is scored, not the
  evidence detectors, judge prompt, guardrails, rubric or envelope schema, so those versions and the
  golden envelopes are unchanged. ADR 0010's "versions stay frozen" guard
  (`versionsUnchanged.test.ts`) moved with the session-engine version: it exists to catch
  pronunciation work reaching the scorer, and this change is not pronunciation work.
- A mid-exam resume snapshot from before the deploy is discarded (the engine version differs).
- A resumed attempt has no recordings for the turns before the reload (audio lives in browser
  memory), so those turns are `no-audio` fallbacks.
- Cost: one Groq transcription per spoken exam turn, charged to `exam_turn_transcribe`
  (150/day, about six exams); Learn has its own `learn_transcribe` row.
- A stored v1 transcript still parses (upcast to v2 with no `recognition`), so a regrade of an old
  attempt reads exactly what it read before.

## Amendment — item 7 applied (transcription-accuracy stage 6, 2026-10-13)

The scorer now consults `stt/homophones/` (`HOMOPHONE_TABLE_VERSION`, recorded in every envelope):

- **Category A is respelled before the judge reads the answer** (`stt/project/spokenText.ts`), on
  spoken answers only. A residual Category A "error" the judge still lists is excused as
  `inaudible` (`judgement/homophoneErrors.ts`; liaison is checked against the answer's next word).
- **Category B gets the benefit of the doubt only where nothing confirms the word**: where the two
  recognisers disagreed on it, or on every such word of an answer only one recogniser read (a
  live-captions fallback, a pre-v2 transcript, a recording). The judge sees an "Uncertain words"
  line and a rule; an error it still lists on such a word is excused as `ambiguousNear`. Both
  recognisers agreeing on the wrong word → it counts. Clearly different words → the batch reading
  stands and the error can count.
- **Excused errors leave the counted list, and the QoL call is re-asked once** with them listed as
  "Not errors"; the re-run's mark is kept. Guardrails never raise a mark: a failed re-ask keeps the
  first mark and raises `homophone_penalty_unresolved` instead. Excused errors are kept in the
  envelope (`excusedErrors`, with reason and pair ids) so the feedback can still say "this might have
  been *X*; make sure you say it" — never a silent excuse.
- Versions: `detectors-v0.7`, `scoring-prompt-v0.7`, `guardrails-v0.7`, `envelope-v0.5`.

Not in this amendment (later stage): the post-marking report's Category B notes, the respelled
display text, and rebuilding `examFeedback/shared/spellingOnly.ts` on the same tables.
