# Recorded voices (Denise / Henri): implementation plan

Status: **Stage 1 built** (key, catalogue, recording script, workflow; 2026-10-23); Stage 2 (owner setup) next.
Plan written on `claude/eager-cray-y6f0f4`; Stage 1 on `claude/hopeful-wright-lcoe38` (frontend repo only).
Owner decisions are final unless marked *open*.

## 1. Goal and scope

Replace the robotic browser voice with **pre-recorded Azure Neural voices** for every *fixed* French
line the app speaks. Each line is recorded once per voice, stored as an MP3 in Supabase Storage,
and played from there. Azure is **never** called at play time.

| In scope (plays a recording) | Out of scope (unchanged, browser voice) |
|---|---|
| Exam examiner: greeting, role-play setup, role-play tasks, topic questions and their parts, alternatives, further questions, extension prompts, transitions, topic announcements, "role play finished" | Junior track / Léo (`leoVoice.ts`), never touched |
| Learn question text (`QuestionCard`) | Learn teacher feedback (`SpeakButton`) and any English speech |
| Listening Mode `audioText` | AI-generated French: SayItAgain, AzurePronunciationCard, ExamPronunciationSection words, SpeedSpeaking answers |
| Shadowing phrases (`SHADOWING_PHRASES`) | StoryMode / VisualNovelView / Roleplay (AI-written lines) |
| Flashcards **only if** their text comes from a static source (check `FlashcardDeck.tsx`; skip if dynamic) | The 4 screens that bypass the voice service (Stage 6, optional) |

Owner decisions:
- **Update 2026-10-24 (supersedes the voice bullets below):** Henri only, no Denise and no voice
  picker for now. Normal speaking rate (no `-5%`), with a 250 ms pause at sentence ends instead of
  Azure's long default. `VOICE_KEY_VERSION` is `v2`; the `v1/` test files in the bucket are unused
  and can be deleted. Stage 4 shrinks to the docs (nothing to pick with one voice).
- Voices: **Denise** (`fr-FR-DeniseNeural`, default) and **Henri** (`fr-FR-HenriNeural`).
  The user picks in Profile → Settings, with a quick toggle on the exam start screen.
- **Guests hear recordings too.** A play costs no Azure money, only Supabase egress.
- No live text-to-speech, no backend changes, no database migration in v1.
  (Render's free tier sleeps, so a live path would be slow or fail.)

## 2. Free-tier budget check (verified 2026-10-23)

| Service | Plan | Usage by this feature |
|---|---|---|
| Azure Speech | F0 (free) | ~150k characters, once (exam ~16k + Learn 45k + Listening/Shadowing, ×2 voices). F0 text-to-speech allows 500k characters/month and ~20 requests/min, so the script throttles to ≤18/min. |
| Supabase "French Coach" | Free | ~60 MB of 1 GB storage (currently 0 used). Egress ≈30 KB per play, so 5 GB ≈150k plays/month. Files are immutable and browser-cached. |
| GitHub Actions | Free | One ~2 h run for the first recording; later runs record only new lines (minutes). |
| Render / Vercel | Free / Hobby | Not used by this feature. |

## 3. Architecture

```
scripts/tts/recordVoices.ts ──(collect lines)──> catalogue
        │  for each (voice, line) not already in bucket:
        └─> Azure TTS REST ──mp3──> Supabase Storage  tts-audio/<v>/<voice>/<hash>.mp3  (public)

App: TTS.speak(text, { recorded: true }) / speakExaminerText(text, gen, { recorded: true })
        └─> voiceKey(text, voice) ─> https://<supabase>/storage/v1/object/public/tts-audio/...
              ├─ plays → done
              └─ 404 / error / 3 s without starting → browser voice (only if it has a French voice)
```

**The one invariant that matters:** the script and the app compute the **same key from the same
text**. Both import one shared pure module (`src/services/tts/voiceKey.ts`). If they ever disagree,
every recording is silently unused and nothing errors, so the key format is pinned by a test vector.

## 4. Stage 1: shared key + line catalogue + recording script + workflow

**Model: Opus 5.5, high. Solo.**

### 4.1 `src/services/tts/voiceKey.ts` (pure, no DOM, no `import.meta.env`)
```ts
export const VOICE_KEY_VERSION = 'v1';          // bump ⇒ everything is re-recorded
export const RECORDED_VOICES = { denise: 'fr-FR-DeniseNeural', henri: 'fr-FR-HenriNeural' } as const;
export type RecordedVoiceId = keyof typeof RECORDED_VOICES;
export const TTS_BUCKET = 'tts-audio';
export function normalizeSpokenText(text: string): string  // NFC;     \t \n → ' '; collapse spaces; trim
export async function voiceObjectPath(text: string, voice: RecordedVoiceId): Promise<string>
  // `${VOICE_KEY_VERSION}/${voice}/${sha256hex(`${VOICE_KEY_VERSION}|${voice}|${normalized}`).slice(0,32)}.mp3`
  // use globalThis.crypto.subtle (exists in browsers and Node ≥ 20), so there is one code path
export function recordedVoiceUrl(supabaseUrl: string, path: string): string
  // `${supabaseUrl}/storage/v1/object/public/${TTS_BUCKET}/${path}`
```
Do **not** change apostrophes or punctuation in the normaliser: they affect pronunciation and the
text Azure receives.

### 4.2 Move constants out of components
`GREETING_TEXT` is exported from `src/screens/ExamMode.tsx`, so a Node script can't import it
without React. Move it to `src/screens/exam/examAnnouncements.ts` (next to `ROLE_PLAY_FINISHED_TEXT`
and `topicAnnouncementText`) and re-import it in `ExamMode.tsx`. The text must not change.

### 4.3 `scripts/tts/collectLines.ts`: the catalogue
`collectLines(): { text: string; source: 'exam'|'learn'|'listening'|'shadowing'|'flashcards' }[]`,
deduplicated by `normalizeSpokenText`. Sources:
- **Exam:** every set in `src/data/exam/bank/fixtures/index.ts`. Include the role-play `setup`, every
  role-play task text (and every part, if tasks are multi-part), every topic question and **each
  part** of a two-part question, every `alternativeTexts` entry, further questions, and
  `topicAnnouncementText('topic1'|'topic2', title)` for each set's titles. Also include
  `GREETING_TEXT`, `ROLE_PLAY_FINISHED_TEXT`, `AUTHORIZED_EXTENSION_PROMPTS`, `TRANSITION_MARKERS`,
  and **every other fixed string `conductEngine.ts` can put in `action.text`** (repeat prompts,
  closings and so on: read the file, export them rather than copying them).
- **Learn:** `question.text` for every question in `src/data/questions.ts` (the field `QuestionCard` speaks).
- **Listening:** every `audioText` in `src/data/listeningQuestions`.
- **Shadowing:** every `french` in `src/data/shadowingPhrases`.
- **Flashcards:** only if static (see §1).

### 4.4 Catalogue coverage test (the guard against silent misses)
`scripts/tts/__tests__/catalogueCoverage.test.ts` (or under `src/` if vitest doesn't include
`scripts/`; check `vitest.config`):
1. For **each** fixture set, drive the conduct engine through a whole session in both modes
   (`sim`, `coached`), reusing the harness in `src/domain/igcse/session/__tests__/`
   (`conductRules0520.test.ts` / `scoreEndToEnd.test.ts`). Include runs that trigger a repeat, an
   extension prompt and an alternative. Assert that **every non-empty `action.text` is in the
   catalogue** after normalisation.
2. Assert that `GREETING_TEXT`, `ROLE_PLAY_FINISHED_TEXT` and both topic announcements per set are in the catalogue.
3. Assert that the Learn count equals the number of questions in `questions.ts`.

If the engine composes text the catalogue can't predict (for example, quoting the candidate),
exclude it explicitly. That line falls back to the browser voice, and the test must list it as an
allowed exception with a comment.

### 4.5 `scripts/tts/recordVoices.ts`
- Run as `npm run voices:record -- [--dry-run] [--limit N] [--voices denise,henri]`
  (add the script to `package.json` and make sure `tsconfig.scripts.json` covers it).
- Env: `AZURE_SPEECH_KEY`, `AZURE_SPEECH_REGION`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (the name the
  repo's existing secrets use; `SUPABASE_SERVICE_ROLE_KEY` is accepted as an alias).
  Fail fast with a clear message if any is missing (not needed for `--dry-run`).
- **Bucket:** if `tts-audio` is missing, create it as **public**, with `allowed_mime_types: ['audio/mpeg']`
  and `file_size_limit: 1048576`.
- **Skip existing:** list `tts-audio/v1/<voice>/` (paginate the Storage list API) and record only missing paths.
- **Budget guard:** sum the characters to record. If it is above 450,000, abort unless `--allow-over`.
- **Azure call:** `POST https://${region}.tts.speech.microsoft.com/cognitiveservices/v1` with headers
  `Ocp-Apim-Subscription-Key`, `Content-Type: application/ssml+xml`,
  `X-Microsoft-OutputFormat: audio-24khz-48kbitrate-mono-mp3` and `User-Agent: french-coach-voices`. Body:
  `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="fr-FR"><voice name="${voiceName}"><prosody rate="-5%">${xmlEscape(text)}</prosody></voice></speak>`.
  `xmlEscape` handles `& < > " '`. **Send the original text, not the normalised text** (the
  normalised text is only used for the key). The `-5%` is a pacing choice, UNVALIDATED.
- **Throttle** to ≥3.4 s between Azure requests (≤18/min). On 429/5xx, honour `Retry-After`, else
  back off 5 s/15 s/45 s, up to 3 retries. A 401/403 aborts the whole run.
- Reject an Azure response smaller than 1 KB or one that isn't `audio/mpeg`; count it as failed.
- **Upload:** `POST ${SUPABASE_URL}/storage/v1/object/tts-audio/${path}` with `Authorization: Bearer <service key>`,
  `Content-Type: audio/mpeg`, `cache-control: 31536000` and `x-upsert: false`.
  (The files are content-addressed, so a path's content never changes.)
- **Output:** a progress line every 25 items, then a summary: `recorded / skipped (exists) / failed / characters sent`.
  List failures with source and the first 40 characters of the text. Exit 1 if anything failed.
  Re-running is safe and resumes where it stopped.
- `--dry-run` prints per-source and per-voice counts and characters, makes no network calls, and needs no secrets.
- Never log secrets. Logging line text is fine: it is authored content.

### 4.6 `.github/workflows/record-voices.yml`
- `on: workflow_dispatch` with inputs `dry_run` (boolean, default true) and `limit` (string, default '').
- `timeout-minutes: 300`, Node 20, `npm ci`, then `npm run voices:record` with the inputs.
- Secrets: reuse the Supabase secret names that `notifications-streak-and-goal.yml` already uses if
  they exist. Add `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`.
- `concurrency: record-voices` so two runs never overlap.

### 4.7 Tests for Stage 1
- `voiceKey.test.ts`: normalisation cases (NBSP, narrow NBSP, double spaces, newlines, NFD→NFC).
  **Pinned vector:** the exact path for `('Bonjour ! Comment ça va ? Es-tu prêt ? On va commencer.', 'denise')`.
  Changing it requires bumping `VOICE_KEY_VERSION`, with a comment saying so.
- `recordVoices` unit tests with mocked `fetch`: an existing path is skipped, XML is escaped
  (`<voice>` in the text arrives escaped), 429 retries, 401 aborts, the budget guard trips, and `--dry-run` makes no network call.
- The coverage test from §4.4.

**Done when:** typecheck (`typecheck`, `typecheck:scripts`), lint and `npm test` are green;
`--dry-run` prints a sensible total (~2,200 items, ~150k characters); and a `--limit 5` real run
(by the owner, Stage 2) produces 10 playable MP3s.

## 5. Stage 2: owner setup (no code)
1. GitHub → frenchcoach2.0 → Settings → Secrets and variables → Actions → add `AZURE_SPEECH_KEY`,
   `AZURE_SPEECH_REGION` (and `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` if they're not there; the
   notifications workflow already uses those two).
2. Actions → "Record voices" → Run with `dry_run=true`, then check the totals.
3. Run with `dry_run=false`, `limit=5`. Open 2 file URLs from Supabase Storage and listen.
4. Run with `dry_run=false` and no limit (~2 h). Expect `failed: 0`. Supabase storage should show ~60 MB.

## 6. Stage 3: playback core
**Model: Opus 5.5, high. Solo.** (Exam turn-taking lives here.)

### 6.1 `src/services/tts/recordedVoice.ts`
- `recordedVoicesEnabled()`: `import.meta.env.VITE_RECORDED_VOICES === '1'` **and** `VITE_SUPABASE_URL` is set.
- `setRecordedVoice(id: RecordedVoiceId)` / `getRecordedVoice()`: module state, default `'denise'`.
- **One shared `HTMLAudioElement`**, created lazily (only one sound at a time across the app).
- `playRecorded(text, { rate? }): Promise<'played' | 'missing' | 'stopped'>`
  - It builds the URL with `voiceObjectPath` + `recordedVoiceUrl`.
  - A session-level `missing: Set<string>` of paths that 404'd/errored makes later calls return `'missing'` immediately.
  - It sets `audio.src` and `audio.playbackRate = rate ? clamp(rate / 0.9, 0.5, 1.0) : 1`
    (0.9 is `ttsService`'s default browser rate), with `preservesPitch = true`.
  - It resolves `'played'` on `ended`. On `error`, or if no `playing` event arrives within **3 s**, it
    marks the path missing and resolves `'missing'`. If `play()` rejects with `NotAllowedError`
    (autoplay), it resolves `'missing'` but does **not** mark the path missing.
  - A new `playRecorded` or `stopRecorded()` cuts off the current one, which resolves `'stopped'`.
- `stopRecorded()`.
- `primeRecordedAudio()`: called inside a user gesture. It plays a tiny silent MP3 data-URI on the
  shared element (unlocks iOS Safari). Best-effort, never throws, runs once.
- Start/end hooks so `ttsService`'s `onStateChange` callbacks fire for recordings too.

### 6.2 `ttsService.ts`
- `speak(text, options & { recorded?: boolean })`.
  - If `recorded && recordedVoicesEnabled()`: `stop()` the browser voice, then `playRecorded`.
    `'played'`/`'stopped'` → resolve.
  - `'missing'` → the browser path, **but only if `hasFrenchVoice()`**. Otherwise resolve silently
    (never read French with an English voice in recorded mode).
  - Without `recorded`, the behaviour is **byte-for-byte unchanged**.
- `stop()` also calls `stopRecorded()`. `isSpeaking()` is true while a recording plays.
- New `canSpeakFrench(recorded = false)`: returns `hasFrenchVoice() || (recorded && recordedVoicesEnabled())`.
  Use it only in the opted-in screens that currently hide 🔊 when there's no French voice (Shadowing).

### 6.3 `examinerVoice.ts`
- `speakExaminerText(text, issuedGeneration?, opts?: { recorded?: boolean })`. Keep the existing
  muted, empty and generation checks first.
  - With `recorded` and enabled: `const r = await playRecorded(text)`. Then if
    `gen !== generation || muted` return; if `r !== 'missing'` return; else fall through to the
    existing browser path **only if `hasFrenchVoice()`** (today's non-recorded path speaks even
    without a French voice; leave that path as it is, and apply the French-only rule just to the
    recorded fallback).
  - It never rejects, as today.
- `stopExaminerVoice()` also calls `stopRecorded()`. `setExaminerVoiceMuted(true)` already calls stop.
- `primeExaminerVoice()` also calls `primeRecordedAudio()`.
- Pass `{ recorded: true }` at: `simulationSession.ts:177`, every `speakExaminerText` call in
  `ExamMode.tsx` (greeting, setup, announcements, role-play finished), and `ExamTurnBubble.tsx`'s replay.
  **Do not** pass it from `StoryMode.tsx` or `VisualNovelView.tsx`.

### 6.4 Opt-in call sites (`recorded: true`)
`QuestionCard.tsx` (question text), `ListeningMode.tsx` (both calls), `ShadowingPanel.tsx` (phrase
playback; keep its `rate`), `FlashcardDeck.tsx` (only if catalogued). Change nothing else.
`leoVoice.ts` and `SpeakButton.tsx` stay untouched: they never pass `recorded`, so they stay on the browser voice.

### 6.5 Tests for Stage 3
- `recordedVoice.test.ts` (fake `Audio`): played; 404 → missing and cached as missing; 3 s timeout
  → missing; autoplay rejection → missing but not cached; stop mid-play → `'stopped'`; a second
  call cuts off the first; playbackRate mapping.
- `ttsService` tests: flag off → identical to today; recorded + missing + no French voice → silent
  (no `speechSynthesis.speak`); recorded + missing + French voice → browser speaks; `stop()` stops audio.
- `examinerVoice` tests: `stopExaminerVoice()` during a recording resolves and nothing plays after;
  a stale generation never falls through to the browser voice; muted → no audio element touched.
- The existing `leoVoice.neverEnglish.test.ts` and `examinerVoice.test.ts` still pass unchanged.

## 7. Stage 4: voice preference and UI
**Model: Sonnet 5.5, medium. Batched (state + two screens + docs).**

- `AppState.frenchVoice: RecordedVoiceId` (default `'denise'`). Action `SET_FRENCH_VOICE`.
  Device-scoped key `frenchVoice: 'frenchCoach_frenchVoice'` in `STORAGE_KEYS`; add it to the
  device-scoped list in `storage.ts` (next to `aiEngine`). The reducer writes it via `storageSetRaw`
  exactly like `SET_AI_ENGINE`. Cross-tab sync works like `aiEngine` (`AppContext.tsx` ~l.760).
  Validate the stored value (an unknown value → `'denise'`).
- An effect in the provider: `useEffect(() => setRecordedVoice(state.frenchVoice), [state.frenchVoice])`.
- **Profile → Settings** (near Dark Mode, `Profile.tsx` ~l.559): a "French voice" row with a
  Denise | Henri segmented control and a ▶ preview that calls
  `TTS.speak(GREETING_TEXT, { recorded: true })` from the click. Render it only when
  `recordedVoicesEnabled()`. Visible to guests too.
- **Exam start** (`src/screens/exam/ExamSelect.tsx`): a small "Examiner voice: Denise | Henri"
  toggle below the Sim/Coached toggle, dispatching the same action. Shown in both modes when enabled.
  It reveals no exam content (exam-conduct §4 still holds).
- Use role tokens for colours (no raw Tailwind colour scales; see the token rules in CLAUDE.md).
- Tests: reducer + persistence + bad-value fallback (`appReducer.test.ts`); Profile and ExamSelect
  render/hide with the flag and dispatch on click (extend `ExamSelect.test.tsx`).
- Docs, in the same commit:
  - **CLAUDE.md Known Traps:** a new bullet. Recorded voices are content-addressed MP3s in the
    public Supabase bucket `tts-audio`, keyed by `voiceKey.ts` (`VOICE_KEY_VERSION`; a bump
    re-records everything). Playback is opt-in per call site (`recorded: true`), never live Azure,
    falls back to the browser voice only when it is French, and Junior/`SpeakButton` never opt in.
    New authored French lines need a "Record voices" run, and the catalogue coverage test fails if
    the exam engine can say a line the catalogue lacks.
  - **`docs/systems/topology.md`:** the bucket, the workflow, the secrets and `VITE_RECORDED_VOICES`.
  - **`docs/guides/content-authoring.md`:** after editing exam/Learn/Listening/Shadowing text, run
    "Record voices" (until then, the new line uses the browser voice).

## 8. Review gate
**Opus 5.5, fresh session, `/code-review high`** over Stages 1+3+4. Point it at:
key parity between the script and the app, catalogue completeness, generation/stop races in
`examinerVoice`, the no-English-fallback rule, and that the flag-off path is unchanged.

## 9. Stage 5: owner live test
Set `VITE_RECORDED_VOICES=1` in Vercel (Production) and redeploy. Then, signed in **and** as a guest:
one full Exam Sim, one Coached exam, one Learn session, Listening, and Shadowing at slow speed.
Switch Denise↔Henri. Expect: the voice starts within ~0.5 s, no overlap between examiner lines,
the mic opens after the line ends, and AI-written lines still use the browser voice.
**Rollback:** set the flag to `0` and redeploy.

## 10. Stage 6 (optional): remaining screens + ADR
**Sonnet 5.5, medium. Batched.**
- Move `VocabListView`, `SentenceRebuilder`, `AccentAnalyzer` and `DailyNewsFlash` onto `TTS.speak`.
  Opt in with `recorded: true` only where their text is static, and add those sources to the
  catalogue. Daily News: split into sentences, and stop/play state must survive.
- ADR `docs/decisions/0013-recorded-voices-not-live-tts.md`: why pre-recorded over live (free-tier
  Render sleeps, cost, latency), why Azure (French quality, child voice for later, free tier), why
  guests are included, and why no consent gate (no learner audio is involved).

## 11. Known limits (accepted)
- Free Supabase pauses after ~7 days with no activity. The app then falls back to the browser voice.
- AI-generated French stays on the browser voice until a live path exists (needs a non-sleeping backend).
- A line edited after recording plays in the browser voice until the next "Record voices" run.
