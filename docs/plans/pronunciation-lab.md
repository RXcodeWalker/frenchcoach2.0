# Pronunciation Lab: implementation plan

Status: **Stages 1–3 built** (2026-10-28); Stages 4–7 not started. Owner decisions (2026-10-28): D1 drop, D2 yes (Stage 4b), D4 no XP, D5 no 0–100 number. D3: 30 Lab takes per account per day; Azure monthly cap = the F0 free allowance.

Stage 1 (frontend only; no backend change, no UI, nothing reads the flag yet):
- `src/domain/pronunciation/lab/`: `wordStates.ts` (`buildLabTake` → per-word state on the target sentence, "N of M clear"
  counts, `drillVerdict`), `soundFamilies.ts` (12 families, `IPA_TO_FAMILY`, `wordFamilyObservations`, `familyStatuses`),
  `graphemes.ts` (French spelling → expected phonemes), `textFeatures.ts` (`watchOutFor`, `tokenizeSentence`),
  `focusWords.ts`, `takeFamilies.ts` (`takeObservations` — what `labStore` should keep per take), `takeCompare.ts`,
  `clipWindows.ts`, `thresholds.ts` (`LAB_THRESHOLDS_VERSION`, hash-pinned), `types.ts`. Pure: ESLint block +
  `labIsolation.test.ts`. `tips.ts` (§4) was built in Stage 2.
- `src/features/pronunciation/audio/clipPlayer.ts` (promoted `playClip.ts`; the exam imports it back; adds whole-recording
  play and a 0.5–1.5 rate) and `nativeVoice.ts` (`playNative`: recording → French browser voice → `'unavailable'`).
- Flag `pronunciationLab: 'coming-soon'`.

Stage 2 (frontend only; no backend change — `/api/pronunciation` already accepts `source=lab`):
- `src/features/pronunciation/LabPractice.tsx` — the §3.2 flow. With `pronunciationLab` live, Learn's practice step
  (`Learn.tsx`, same eligibility and once-per-session budget as Say-It-Again) renders it instead of `SayItAgainCard`;
  flag off is exactly the old card (the rollback). Try it on any device with `?ff_pronunciationLab=live` (persisted to
  localStorage; `?ff_pronunciationLab=coming-soon` undoes it).
  - **Listen:** the sentence (each word taps to play alone; `watchOutFor` letters dotted-underlined), ▶ Listen, ▶ Slowly (0.75).
  - **Say it / Compare:** one take → `assessPronunciation({ mode: 'scripted', source: 'pronunciation_lab' })` →
    `buildLabTake` → "N of M words clear", word chips (glyph + role-token tint; label in the chip's accessible name and
    the always-visible legend), tap a word = ▶ You (that word's `clipWindow` of this take's in-memory blob) then ▶ Native
    (`wordPlayTexts`: liaison group first), ▶ Play both (whole take, then the native sentence). A refused take (not Azure,
    couldn't assess) shows the words plain, "Listen back", and a notice — never states.
  - **Focus:** `chooseFocusWords` (≤ 2; `emphasis: 'offer'` → a secondary "Practise it" button, `'suggest'` → primary);
    per word: family name + `tipFor`, ▶ Hear it slowly, ▶ Your take, record the word alone (scripted, target = the
    normalised word) → `drillVerdict` → Clear / Almost / Try again; then "Say the whole sentence again" and first vs best
    ("First take 4 → best 6 of 6 words clear").
  - Caps per sitting (product decisions, not thresholds — `labPracticeState.ts`): `MAX_SENTENCE_TAKES` 4,
    `MAX_WORD_TAKES` 3 per focus word. The D3 30-a-day account allowance is still Stage 7.
  - Never a trap: Done is always on screen; mic unavailable / nothing captured / check failed / too short / no word check
    are notices; consent (`ConsentRequiredError`) and sign-in (`AuthRequiredError`) end the flow with Continue. The record
    controls are wrapped in `SpeakingConsentGate` (Say-It-Again's weren't).
  - No XP, Session, mastery, review, evidence (`pron:*` bridge not used) or storage writes; recordings are blobs in a ref.
- `labPracticeState.ts` (pure reducer: steps, caps, never-trap rules) and `labCopy.ts` (all wording: state labels,
  legend, headline, first-vs-best, notices, drill verdicts, focus lead) — tested on their own.
- `domain/pronunciation/lab/tips.ts` — `SOUND_TIPS` (all 12 families: name, mouth tip, 4–6 examples, minimal pair or
  null) and `tipFor(family, word)` (U vs OU picks the half the word spells; null family → `GENERAL_TIP`). Tests check
  every scored-family example really contains its family per `graphemes.ts`.
- `domain/pronunciation/lab/textFeatures.ts` gained `wordPlayTexts(sentence, tokenIndex)`.
- `features/recording/LevelBars.tsx` — the `record` motion, moved out of `screens/learn/RecordingPanel.tsx` (which imports it).
- Analytics (§8): `lab_opened {entry: 'learn_feedback'}`, `lab_take {words_clear, words_total, take_index}`
  (breadcrumb-only), `lab_focus_word_used {verdict}` (once per focus word, first drill result).
  `ear_training_round` and `monthly_check_done` are declared by Stages 5–6. `practice_step_shown` still fires from
  Learn; `practice_step_completed` does not fire from the Lab (its pass/no-verdict outcome is Say-It-Again's score rule).
- `lightContrast.test.ts` now scans `src/features/pronunciation/` (no allowlist entry); `labDesignRules.test.ts` bans
  text under 12px, hover motion, pulses, gradients, glows.

Stage 3 (frontend only; **no backend change** — D1 needs none: the freeform path in `routers/pronunciation.py` stays,
it is simply no longer called by Learn while the flag is live):
- `src/features/pronunciation/HowItSounded.tsx` — the §3.1 card. With `pronunciationLab` live, `FeedbackExperience`
  (coach view) renders it in place of the fenced Azure / legacy block (`howItSounded` prop; Learn passes it only while the
  flag is live, so flag off is exactly the old cards — the rollback). Sections: **Listen back** (▶ Your answer = the answer's
  in-memory recording via `playClip`; ▶ Native = `improved_answer || rephrase` via `playNative`; one "Slow (0.75×)" toggle,
  `aria-pressed`, applies to both), **Flow** (`labCopy.flowLine`: "Smooth — no long pauses." / "N pause(s) over 2 seconds —
  try linking your ideas with et, mais, parce que."), **Watch out for** (`watchOutFor(sentence)`, ≤ 3 chips, each plays
  its `playText` and names its family from `SOUND_TIPS`), **Practise it** (primary; opens `<LabPractice entry="how_it_sounded">`
  in place of the card — the feedback screen stays mounted, Done returns to the card). No number, score, sub-score or
  coloured word; no `/api/pronunciation` call.
- **D1 applied:** `Learn.tsx`'s per-answer freeform `assessPronunciation` is skipped while the flag is live — the IIFE keeps the
  blob in `answerBlob` state and returns before the request (pinned by `learnFreeformGate.test.ts`). Examiner-voice
  answers get no card and no request either. Flag off still sends freeform exactly as before.
- Opening the Lab from the card counts as the question's practice step when that step would have been offered
  (`extraTurnBudget.consumePractice`), so Continue doesn't offer the same sentence again; otherwise the follow-up is untouched.
- Flow is `features/pronunciation/audio/answerPauses.ts`'s `measureAnswerPauses(blob)`: `normalizeToWav16kMono`
  (max 180 s) → `readWavPcm16Mono` → exam `trimSilence(...).pauses` (internal pauses only). Best effort: null (no line) on
  no speech / too short / decode failure. `readWavPcm16Mono` moved from `services/exam/pronunciation/measureExamAudio.ts`
  to `domain/pronunciation/audioNormalizer.ts` (re-exported from the old place; no exam hash involved).
- `lab_opened.entry` is now `'learn_feedback' | 'how_it_sounded'`. `labCopy.NATIVE_UNAVAILABLE` is shared by both screens.
- **Not done in Stage 3, by the plan's own rule:** the three old cards (`AzurePronunciationCard`, `PronunciationCard`,
  `PronunciationHeatMap`), their lightContrast allowlist entries and the `lint:pronunciation-*` fence are deleted only **when
  the flag is removed** (after the §7 gate). They are still the flag-off path. When removing the flag: delete them, the fence,
  the allowlist names, Learn's freeform IIFE + `pronunciationResult`/`pronunciationStatus` state and props, and
  `SayItAgainCard`; keep the backend freeform path (exam feature).
- No real-device run: covered by jsdom tests with mocked audio (`HowItSounded.test.tsx`, `answerPauses.test.ts`,
  `FeedbackExperience.test.tsx`).

What the next stages need to know:
- **Stage 3** is built (above). Any new place that opens the Lab adds a value to `LabOpenedProps.entry` in
  `telemetryService.ts` (closed enum) and to `LabPractice`'s `entry` prop type.
- **Stage 4**: "How it sounded" asks ▶ Native for the corrected sentence as written (an AI sentence → Stage 4b's cached
  endpoint is what will give it a recording) and for `watchOutFor`'s `playText` strings (already the lexicon's strings).
- **Stage 5** (Lab home): `LabPractice` is self-contained (no Learn state), so the home's "Practise a sentence" can
  reuse it as is; take history for `labStore` should come from `takeObservations(take)` — add an `onTake` callback
  prop to `LabPractice` then (none exists yet, on purpose: Stage 2 stores nothing).
- **Stage 4**: the strings ▶ Native asks for are the sentence as written, `wordPlayTexts` (normalised word / liaison
  group), the focus word's normalised text (slow), and `SOUND_TIPS` examples/minimal pairs as written.
- **Stage 7**: the Lab charges nothing beyond the existing `/api/pronunciation` metering today. When the allowance lands,
  map its 429 to a new `LabNotice` (the flow must still never trap).
- No real-device run yet: the flow was exercised in headless Chromium with a fake microphone and a mocked
  `/api/pronunciation` (screenshots, not committed), not against live Azure. The §7 gate is still the owner's.
- **fr-FR Azure returns phoneme accuracies but empty phoneme names** (all 1,799 phonemes in the calibration fixtures), so
  §4's "IPA phoneme → family" can't read Azure's names. `graphemes.ts` predicts each word's phonemes from its spelling and
  `soundFamilies.ts` attributes a phoneme only when the counts match and every matching reading agrees on that position
  (else one word-level observation if the word has exactly one family, else nothing). Agreement with real Azure counts is
  0.94 (`__tests__/fixtures/azureFrPhonemeCounts.json`, floor 0.90 in the test). In the owner's recordings Azure sometimes
  scores a nasal vowel as two segments with a low second one (a sounded n); that reading is allowed and counts for the nasal.
- `buildLabTake` requires `assessment.mode === 'scripted'` on the response and `provider === 'azure'`; anything else is all
  `unknown`. Stage 2 must send `mode: 'scripted'` and `usageSource: 'lab'`.
- `playText` from `watchOutFor`/`soundFeatures` is the normalised lowercase word (or "les enfants"); `voiceKey` hashes case,
  so Stage 4's lexicon must record exactly those strings.
- `clipPlayer.playClip` now resolves when cut off by another clip or `stopClip()` (before, its promise never settled), so
  "play You then Native" can be sequenced; `playNative` stops "▶ You" itself. Stage 2 should call `stopClip`/`stopNative`
  on unmount.
- `clipWindow` takes the upload's trim map when the Lab trims silence before upload (Say-It-Again doesn't today); without
  one, Azure offsets are used as recording time.
- `focusWords` returns `emphasis: 'offer'` for one low word in an otherwise clear take — the UI should offer, not insist.
Branch: `claude/nifty-edison-xhbf2a` (both repos).

## 1. Why the current feature isn't useful (diagnosis, not taste)

Owner's report: "Some places show green, some yellow. I'm not sure how to use it."
That confusion is correct. The feature has a measurement problem first and a UI problem second.

**1.1 The colours on a Learn answer can't mean what they look like they mean.**
Learn calls `/api/pronunciation` in **freeform** mode (`Learn.tsx` ~l.731). In freeform the backend
uses *Whisper's transcript of the same audio* as the reference text, then asks Azure "how well did
this audio match that text". If you say *tu* when you meant *tout*, Whisper writes *tu* and Azure
scores a good *tu*. The exam calibration measured exactly this: **0 of 9 deliberate word swaps
caught** (`docs/systems/exam-pronunciation.md`, "Real errors"). No threshold fixes it; the system
never sees the word you intended. So green/amber/red on a Learn answer is mostly acoustic
confidence noise on whatever you happened to say. Freeform also has no completeness and no
skipped/extra words (`data/phonology/fr.json`).

**1.2 The UI gives numbers without a next step.**
`AzurePronunciationCard` shows a 0–100 ring, three sub-scores (Accuracy / Fluency / Completeness —
completeness is always "—" in freeform), coloured words with no legend (90/60 thresholds,
`UNVALIDATED`), IPA strings learners can't read (`/t u/`), a "Drill: …" line with no record
button, and phoneme detail only behind a tap nobody discovers. Text is 8–10 px, colours are raw
Tailwind (`#4ade80`, `bg-slate-800`) — it's the one block still fenced out of the Design System v2
and Batch 5 lint (`lint:pronunciation-start/end`).

**1.3 The one honest measurement we have is buried.**
Say-It-Again (`SayItAgainCard`) is **scripted**: it gives Azure the real target sentence, so
skipped words, completeness and per-phoneme accuracy *are* meaningful. But it only shows "Score: 72"
and moves on. There's no listening back, no comparison, no word practice.

**1.4 The practice surface is hidden.** `AccentAnalyzer` (drills, shadowing) sits behind launch scope.

**Design principle that follows:** *only judge pronunciation against a sentence the learner was
trying to say.* Free answers get listening and rhythm tools, not word verdicts. Word verdicts live in
the Lab, where the target is known.

## 2. Goal

A **Pronunciation Lab**: listen → say it → hear yourself next to a native speaker, word by word →
practise the one or two words that matter → see real progress on the sounds that are hard for you.
Intuitive with no instructions, honest (no verdict the measurement can't support), and aesthetic
(Design System v2 tokens, named motions only).

Non-goals: any mark, band or grade (Learn/exam marking untouched); anything under
`src/domain/igcse/`, `scripts/scoring/`, `server/`; the exam pronunciation feature (stays as is,
§10 lists a later link-up); Junior track.

## 3. The learner experience

### 3.1 On a Learn answer (replaces `AzurePronunciationCard` and `PronunciationCard`)

A single card, **"How it sounded"**:

1. **Listen back** — ▶ *Your answer* (the learner's own recording) and ▶ *Native* (the corrected
   sentence read aloud), each with a 0.75× toggle. Hearing yourself straight after a native read is
   the single most useful thing, and it costs nothing.
2. **Flow** — one plain sentence from browser-measured pauses (reuse `examPronunciation/trim.ts`'s
   pause statistics, which don't need Azure): "Smooth — no long pauses" / "2 pauses over 2 seconds —
   try linking your ideas with *et*, *mais*, *parce que*". Descriptive, never a level.
3. **Watch out for** — up to 3 sound features *in the target sentence*, found by rules on the text
   (not a verdict on the learner): liaison (*les‿enfants*), nasal vowels (*enfant*, *vin*), silent
   final letters (*petit*), French R, *u* vs *ou*, *é/è*, elision. Each chip plays the word.
4. **Practise it →** primary button opens the Lab on this sentence (§3.2). This is where the
   learner gets real word feedback.

No 0–100 ring, no sub-scores, no coloured words on a free answer.

### 3.2 The Lab practice flow (replaces `SayItAgainCard`; also the core of the standalone Lab)

One sentence at a time, four steps shown as a small stepper:

| Step | What the learner does | What they see |
|---|---|---|
| **1. Listen** | Taps ▶ (normal / slow). Taps any word to hear it alone. | The sentence, large; tricky features underlined subtly (same rules as 3.1). |
| **2. Say it** | Records (existing recorder + waveform). | "Listening…" → "Checking…". |
| **3. Compare** | Taps any word: plays **You** then **Native** for that word. ▶ *Play both* plays whole-sentence A/B. | Each word gets one of four labelled states (§5.1) with an icon *and* a word, never colour alone. Headline: **"9 of 11 words clear"** — not a 0–100 number. A legend is always visible. |
| **4. Focus** | Up to 2 focus words (lowest, reliable ones). For each: hear it slowly, see a learner-readable tip ("*ou* — round your lips like *oo* in *food*"), record the word alone, get Clear / Almost / Try again. Then "Say the whole sentence again". | First take vs best take for this sentence ("7 → 10 words clear"). |

Exits are always available ("Done", "Next sentence"). Same never-trap rules as Say-It-Again today
(mic denied, analysis failed, consent-required → move on).

### 3.3 Lab home (inside Learn — no launch-scope change)

Route `/learn/sounds` (not under any `HIDDEN_PATH_PREFIXES`), reached from the Learn hub and from
3.1/3.2:

- **Your sounds** — the 12 sound families (§5.2) as a grid: *Clear / Getting there / Needs work /
  Not enough data yet*, from Lab takes only. Tap one → its guide.
- **Sound guide** — per family: what it is in plain English, mouth tip, 4–6 example words with
  native audio, one minimal pair.
- **Ear training** — minimal-pair listening game (*tu* or *tout*? *vin* or *vent*? *dessus* or
  *dessous*?). Listen-only: zero Azure cost, and hearing a contrast comes before producing it.
- **Tricky words** — every word that was "Practise this" twice, as a deck with spaced review
  (re-surfaces in the Lab until it's Clear twice in a row on different days).
- **Monthly check** — the same 5 benchmark sentences each month (covering all families). This is
  the only honest progress line: comparing scores across *different* sentences mostly measures
  sentence difficulty, so a trend chart over random practice would mislead.
- **Practise a sentence** — pick from the learner's recent corrected answers, Learn model answers,
  or the guide's examples.

### 3.4 Progress screen

One card, **"Your French sounds"**: two strongest families, two to work on, monthly-check trend
(only once ≥ 2 checks exist), link to `/learn/sounds`. No numbers on the card except the
monthly-check "words clear" counts.

## 4. Architecture

```
src/domain/pronunciation/lab/          (pure, tested; no React, no I/O)
  wordStates.ts      scripted Azure word → clear | almost | practise | missed | extra | unknown
  soundFamilies.ts   12 families; IPA phoneme → family; text rules for "watch out for" features
  focusWords.ts      choose ≤2 focus words (reliable + lowest + family not already focused)
  takeCompare.ts     first take vs best take; per-word improvement
  clipWindows.ts     word offset/duration → padded playback window (reuses examPronunciation logic)
  tips.ts            family → learner-readable tip + example words (static authored French)
  thresholds.ts      every cut-off, all UNVALIDATED until §7 passes; one version constant

src/features/pronunciation/
  audio/clipPlayer.ts      one Web Audio player (promote features/exam/pronunciation/playClip.ts;
                           exam imports it back) — play blob segment, playbackRate, stop on new play
  audio/nativeVoice.ts     word/sentence → recorded file (voiceKey) → browser French voice → none
  LabPractice.tsx          the §3.2 flow (used by Learn feedback and the Lab home)
  HowItSounded.tsx         the §3.1 card
  SoundsHome.tsx, SoundGuide.tsx, EarTraining.tsx, TrickyWords.tsx, MonthlyCheck.tsx
  labStore.ts              local history (per take: words + families, no audio), ring-buffered
```

Rules:
- **Scripted mode only for word states.** `wordStates.ts` refuses a freeform result (returns all
  `unknown`), so no future call site can put colours back on a free answer.
- **Audio never leaves the device except the existing `/api/pronunciation` upload**; recordings stay
  in memory (object URLs revoked on unmount), never stored, synced or sent to analytics.
- **Reuse, don't copy:** `normalizeToWav16kMono`, `assessPronunciation`, `useAudioBlobRecorder` /
  `TakeRecorder`, `voiceKey`, `trim.ts`'s pause statistics. Moving `playClip.ts`/`trim.ts` must not
  change `EXAM_PRONUNCIATION_VERSION`'s hash; if it would, import them in place instead.
- **Lab data is separate from Learn data:** no `Session`, mastery, SM-2 review, `bestScore` or Learn
  evidence writes. The existing `pron:*` evidence bridge may receive Lab takes (it never reaches the
  belief snapshot). The tricky-words deck has its own small scheduler.
- **Design System v2:** role tokens only, Bricolage, ≥ 12 px text, the eight named motions
  (`record` for recording, `correct` for a word turning Clear, `fill` for the stepper). The new
  files must pass `lightContrast.test.ts` *without* an allowlist entry; the three old cards and the
  `lint:pronunciation-*` fence are deleted with them.
- **Feature flag** `pronunciationLab` (`featureFlags.ts`): off = today's cards (rollback).

### 4.1 Backend (french-coach-backend)

- Scripted mode already returns per-word offsets, error types and per-phoneme accuracy — no new
  provider work.
- **Per-account Lab allowance**: new `ai_quota_limits` row `pronunciation_lab` (migration first —
  FK), charged per scripted take from the Lab with source `lab`; a failed analysis releases it.
  Read-only `GET /api/pronunciation/allowance` for the UI ("12 checks left today").
- Optional: return per-phoneme offsets so the Lab can underline the exact letters (Azure provides
  them); only if Stage 2 shows word-level isn't enough.
- If §9 D1 is "drop": Learn stops sending freeform requests; the freeform code path stays for the
  exam feature.

### 4.2 Native audio

Owner rule today: Azure TTS is never called at play time; only static authored French is recorded.
- **Stage 4 extends the recorded catalogue** (`scripts/tts/collectLines.ts`) with: every Learn model
  answer, a **word lexicon** (every distinct word in model answers + guide examples + benchmark
  sentences, a few thousand words, well under the F0 character allowance — verify before running),
  and minimal pairs. Words in an AI-corrected sentence are then mostly covered word-by-word.
- An AI-corrected *sentence* has no recording → browser French voice, else silence with
  "Native audio isn't available on this device". That's the weakest point of the whole Lab; §9 D2
  proposes a fix.
- Isolated-word recordings lose liaison. The sentence player is always the source for liaison
  features; a word chip that is part of a liaison plays the two-word group if recorded.

## 5. Measurement rules

### 5.1 Word states (scripted only)

| State | Shown as | Rule (thresholds UNVALIDATED) |
|---|---|---|
| Clear | ✓ "Clear" | accuracy ≥ 80, not mis-pronounced |
| Almost | ~ "Almost" | 60–79 |
| Practise | ● "Practise this" | < 60 or `mispronounced` |
| Missed | — "Not heard" | `skipped` |
| Extra | + "Extra word" | `extra` (shown between words, not on one) |
| Unknown | plain | no accuracy, or word near a chunk seam |

Fairness guards (the owner's learners are strongly accented): at most **2** focus words per take;
"Practise" never appears on a word whose phonemes are all ≥ Almost; copy says "worth practising",
never "wrong"; one low word in an otherwise Clear take is offered, not insisted on.

### 5.2 Sound families

R (*rouge*), U vs OU, nasal AN/EN, nasal ON, nasal IN/UN, É vs È, EU/ŒU, silent finals, liaison,
elision/*h muet*, GN/ILL, OI/OIN. A family's status needs ≥ 6 scored phonemes over ≥ 2 days before
it leaves "Not enough data yet". Mapping from Azure's IPA phonemes is a static table with tests.
Liaison/elision are text features only (Azure doesn't score them; the capability matrix marks
liaison `inferred`) — they appear in guides and "watch out for", never in "Your sounds".

## 6. Stages

Run order 1 → 2 → 3 → 4 → 4b → 5 → 6 → 7; Stage 7 may ship with Stage 2. Stage 4b (§9 D2): cached Azure TTS endpoint for AI-corrected sentences, BE + FE, size M.
Each stage: typecheck, the touched tests, lint, then commit + push. Frontend stages also run the
full `npm test` (backend present).

| Stage | Scope | Repo | Size | Model, effort |
|---|---|---|---|---|
| **1. Foundations** | `domain/pronunciation/lab/*` with tests (word states, families + IPA table, text rules, focus words, take compare, clip windows), `clipPlayer` promotion, `nativeVoice`, flag. No UI. | FE | M | Opus 5.5, high |
| **2. Lab practice flow** | `LabPractice` replaces `SayItAgainCard` behind the flag; first/best take; focus-word drill; analytics (§8). | FE | L | Opus 5.5, high |
| **3. "How it sounded"** | New Learn answer card; delete the three old cards + allowlist/fence when the flag is removed; D1 applied. | FE (+BE if D1 = drop) | M | Opus 5.5, medium |
| **4. Native audio coverage** | Catalogue model answers, lexicon, minimal pairs; `catalogueCoverage` test extended; one recording run. | FE + workflow | S | Sonnet 5.5, medium (4b endpoint: Opus 5.5, high) |
| **5. Lab home** | `/learn/sounds`: Your sounds, guide, ear training, tricky words, practise a sentence; `labStore`. Learn hub entry. | FE | L | Opus 5.5, high |
| **6. Progress + monthly check** | Benchmark sentences, monthly check, Progress card. | FE | M | Sonnet 5.5, high |
| **7. Allowance** | `pronunciation_lab` quota row + allowance endpoint + UI counter. Can ship with Stage 2 if usage is a worry. | BE + FE | S | Sonnet 5.5, medium |
| **Gate** | §7 calibration before the flag goes `live` for everyone. | owner + FE | — | Opus 5.5, high |

Later, optional: intonation overlay (pitch contour of You vs Native, drawn only, no verdict);
"practise the words from your exam" link from the exam report into the Lab.

## 7. Calibration gate (must pass before `live`)

The exam calibration failed because freeform can't see the intended word. Scripted mode can — but
that is a hypothesis until measured. Reuse the existing calibration tooling with `mode: scripted`:

- **Detection:** the owner reads 20 Lab sentences once correctly and once with one deliberate swap
  (*vin/vent*, *tu/tout*, *dessus/dessous*, *beau/bon*…). Pass: ≥ 80 % of swapped words land in
  Practise/Not heard.
- **Fairness:** 20 correct readings by accented speakers (including Indian-accented French, the real
  users) plus the existing Common Voice sets. Pass: ≤ 1 false "Practise" per 20 sentences.
- Thresholds in `thresholds.ts` may move to pass; each move is a version bump, logged in
  `verification-log.md`. If it can't pass, the Lab ships with listening, ear training and
  first-vs-best only, and word states stay hidden.

## 8. Analytics, cost and limits

- Events (declared in `TelemetryEvent` + `DECLARED_PROPS`): `lab_opened {entry}`,
  `lab_take {words_clear, words_total, take_index}` (breadcrumb-only — per-take volume),
  `lab_focus_word_used`, `ear_training_round {correct, total}`, `monthly_check_done`. No words, no
  transcripts, no audio.
- **Azure F0 is the binding constraint.** Every Lab take spends Azure seconds (~3–8 s each,
  metered by the existing ledger and capped by `azure_speech_budget.cap_seconds`). Rough budget: 30
  takes a day ≈ 2.5 min per active learner a day. Check current Azure F0 limits and paid pricing
  before setting the cap. Dropping freeform analysis of every Learn answer (D1) frees the largest
  share of today's usage (every recorded Learn answer is analysed today).
- Signed-out learners: listening, sound guide and ear training work; recording takes ask to sign in
  (same as today).

## 9. Owner decisions (D1, D2, D4, D5 decided 2026-10-28 as recommended; D3 = 30 takes/day, cap at F0 allowance)

- **D1 — Free Learn answers: drop Azure word analysis?** *Recommended: yes.* It can't detect real
  errors (§1.1), confuses learners, and costs the most Azure time. Keep listen-back + flow + "watch
  out for" + Practise. Alternative: keep the call only to show nothing but its fluency number
  (weak value for the cost).
- **D2 — Natural voice for AI-corrected sentences.** Browser voices are robotic or missing on many
  devices, which undercuts "hear the correct version". Option: a small backend endpoint that
  synthesises a sentence once with Azure TTS and caches it in the `tts-audio` bucket (write-through,
  per-account daily cap; the F0 TTS allowance is large). This reverses the "never call Azure at
  play time" rule for this one use. *Recommended: yes, as Stage 4b.* Alternative: practise model
  answers (always recorded) by default and corrected answers second.
- **D3 — Daily Lab allowance** (takes per account per day) and the Azure monthly cap / paid tier.
- **D4 — XP for the Lab.** *Recommended: none in v1* (no reward tied to a score that isn't
  calibrated yet); revisit after §7.
- **D5 — Show any 0–100 number?** *Recommended: no.* "9 of 11 words clear" is understandable and
  honest; a 0–100 number invites comparison across sentences of different difficulty.
