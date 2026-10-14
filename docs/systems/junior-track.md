# Junior track

A separate, mark-free speaking-practice track for learners in Grades 4–7 (roughly ages 9–12, A1 and
below). Why it is separate from the Cambridge 0520 work:
`docs/decisions/0011-junior-track-is-separate-from-0520.md`. This page is the specification; the code
and its tests are the current behavior. It is **§-numbered and live — never renumber a section**
(cite as `junior-track §N`).

**Status: specified, not built.** Implementation proceeds in batches (content bank → pure logic →
UI → Whisper fallback → playtest gate → scale-up). Nothing here is shipped until its batch lands.

## Purpose

The goal for these learners is narrow: **say one or two simple sentences accurately and pronounce
them clearly.** Learn's loop (one open question, a wait for an AI report, a long report, a new page)
does not work for a 9–12-year-old at A1. Junior replaces it with a short spoken conversation with a
character, **Léo** (placeholder name), over a closed question bank whose answers the app already
knows. Checking is deterministic, instant and free: **no LLM call per turn.**

The primary risk is the recogniser failing on children's voices, quiet speakers and iPads. That is
the main way this product fails, not an edge case, and §2, §4 and §6 are designed around it.

## §1 Mission format

The learner taps a theme on a picture map (the pilot has *Moi* and *Les couleurs*; later *Les
animaux, Ma famille, La nourriture, L'école, Le sport, La météo*…). Léo runs a **mission** as a chat
on **one screen**: no page change and no report between questions.

Turn order, about 6–7 turns:

1. **Warm-up** — "Dis « Bonjour Léo » pour me réveiller !" (§2).
2. **4–5 question turns** (§3).
3. **"Et toi ?"** — the learner asks Léo the question; Léo's reply is funny or surprising (§7).

**First mission ever:** a 20-second guided demo precedes the warm-up. Léo points at the pictures,
then the sentence frame, then the mic, with no reading required. It is shown once (`junior.demoSeen`).

## §2 Warm-up and recogniser fallback

The warm-up is **always accepted**: Léo "wakes up" whatever happens. It does three jobs: teaches the
mic button, checks the mic, and tests the recogniser on this device. It uses the mic level
(`useMicLevel`) and the transcript:

| Mic heard sound? | Transcript usable? | What happens |
|---|---|---|
| yes | yes | Web Speech is used for the rest of the mission |
| yes | no | This device switches to the **Whisper** path for the rest of the mission |
| no | — | A short icon hint ("Check your mic 🎙"), then one more try. The mission carries on whatever happens next |

Whisper is also used when Web Speech is missing (iPad Safari) or returns nothing for a turn. Whisper
is **never biased with the expected sentence** — that would produce dishonest "got it"s. The
Whisper path uses `/api/transcribe` with `purpose=junior` (its own quota feature); it arrives in a
later batch, and until then the table's second row degrades to the existing recorder path.

## §3 Pick, then Say

Each question turn:

1. Léo asks the question aloud. The French text and a picture are shown.
2. The learner **taps a picture** to choose their answer (🔵 🔴 🟢). This removes the hardest A1
   barrier, remembering the word.
3. A **sentence frame** fills in with the chosen word: "J'aime le **bleu**." A two-sentence turn
   stacks two frames.
4. The learner **taps the mic** and says it.

Because the learner chose the word, **the app knows the exact target sentence.**

## §4 Mic interaction

- **Tap once to start.** Recording stops on its own after silence, or on a second tap. There is no
  hold-to-talk.
- The button is **≥ 72 px** and **pulses while listening**.
- A short **"Léo is listening"** cue (Léo's ear and a glow) shows before capture opens; capture
  starts at the same moment, so the first word is never cut off.
- **Kid silence timeout:** children pause mid-sentence. `useRecording` runs Web Speech in
  `continuous` mode and only stops when told to, so Junior adds its own end-of-speech rule on
  `useMicLevel`: stop after about 2.5 s of quiet once speech has started, with about a 12 s hard
  limit per turn. These are constants in **one file** and are tuned at the playtest (see "Playtest gate" below); this page does not restate their final values.
- **One live capture at a time.** Repeated taps never start overlapping recordings;
  `useRecording`'s generation guard (see `CLAUDE.md`) covers this, and Junior adds its own test that
  rapid taps leave exactly one live capture.
- Junior reuses `useRecording` and `SpeakingConsentGate` unchanged; the existing under-13 gate keeps
  applying as it does on every other screen (`docs/systems/child-safety-consent.md`). Junior does not
  design its own consent model.

## §5 Scaffold ladder

Each sentence **pattern** (e.g. `j-aime-le-X`, `j-ai-N-ans`) has a three-step ladder, stored per
learner:

| Step | What the learner sees | Moves up after |
|---|---|---|
| **Echo** | Learner **still chooses the picture first**; Léo then says *their chosen* sentence; learner repeats | 2 "got it" turns |
| **Frame** | Picture choice + sentence frame, no model audio first | 3 "got it" turns |
| **Free** | Question + pictures, no frame; a "help" button shows the frame | — |

- **Moving up is visible and celebrated.** Léo says one line ("Tu n'as plus besoin d'aide pour
  « J'aime… » !"), driven by a `levelledUp` event.
- **Moving down is silent.** Two misses at a step quietly drop the learner one step; no event, no
  line.

## §6 Answer outcomes

The transcript is normalised and compared with the target sentence's **key words** (the chosen word
plus the pattern's core words), plus a short list of accepted variants. Three outcomes:

- **Got it** — all key words heard. Léo celebrates; a sticker pops.
- **Almost** — some key words heard. Léo says the sentence once, the learner repeats once, and the
  mission moves on.
- **None** — nothing usable heard. Léo looks curious ("hmm?") and the learner gets one more go.

Rules:

- **Guaranteed progress.** After **2 "none" results on the same turn** there is never a third ask.
  Léo says "On le dit ensemble !", plays the model sentence, and the mission moves on. The turn is
  **recorded honestly as "none"** and never upgraded to "got it".
- **Free step.** An answer matching a pattern with **any** word from that theme's vocabulary counts
  as "got it".
- **English look-alikes never count.** "blue" (or a recogniser spelling like "blou") is not "bleu".
  Matching uses the French form only; these cases are in the golden table.
- Matching reuses `phraseHeard` / `quoteHeard` from `src/domain/learn/feedback/fixMatch.ts`.
  `compareRetake.ts` shows the same "report what was heard, never a verdict" approach.

## §7 Léo

- **Five animated states: listening, happy, celebrating, curious ("hmm?"), thinking.** These are the
  per-turn feedback. The one line of text is optional decoration, never the main signal — a learner
  who cannot read it yet still knows how they did. Animation is reduced-motion friendly.
- **Voice is pre-recorded audio** for the pilot: every question, model sentence and fixed reaction
  line. Browser text-to-speech (`src/services/tts/ttsService.ts`) is only the fallback, and only when
  it has a **French** voice. **An English voice never reads French.** Where neither recorded audio
  nor a French voice exists, the text simply has no 🔊. If no French browser voice exists and a line
  has no recorded file, the French text shows with a 🔊 that plays the recorded file.
- **"Et toi ?"** — the learner asks Léo; Léo's answer is funny or surprising ("Ma couleur préférée ?
  Le rose… à pois verts !"). This turn **always counts as complete**, even when the match was only
  "almost".

## §8 Interface language

- **Buttons and instructions:** English or icon-only.
- **Praise words:** a small fixed French set the learner picks up over time: *Super !, Bravo !,
  Génial !, Encore ?*
- **Every French line** can be tapped to hear it, and has a hidden English helper behind a "?" button.

## §9 Feedback caps

**No marks, bands, grades, scores or numbers anywhere** in Junior feedback.

- **Per turn:** Léo's reaction (§7) plus **at most 1 line**. No score, no number, no red ✗.
- **End-of-mission Postcard, exactly 3 items, no more than 4 lines in total:**
  - ⭐ **You said it great** — the **target sentence** the learner was aiming for, **never the raw
    transcript**, plus a ▶ that plays the learner's own recording.
  - 🎯 **Practise this one** — an "almost" sentence with 🔊 Léo / 🎙 You side by side and one more
    try. This is v1's "listen and compare" pronunciation help; the words that were heard light up as
    chips. **No pronunciation verdict** — there are no recordings of children to test against yet.
  - 🏅 **The sticker.**

Postcard edge cases (each a `postcard.ts` test):

| Mission result | Postcard shows |
|---|---|
| No "got it" turn | ⭐ becomes "**Great try!**" with the best "almost" turn |
| No "almost" turn (all got it) | 🎯 becomes "**Challenge: say it without help**", using the mission's hardest pattern |
| Every turn "none" | "**You finished!**" + the sticker + one sentence to listen to. Never empty, never apologetic |

## §10 Rewards and replay

- **A sticker rewards finishing a mission, never accuracy.** An all-"none" mission earns the same
  sticker as an all-"got it" one. By construction `rewards.ts`'s input never includes outcomes, and a
  test asserts the equal-sticker case.
- **Each theme has a set of about 6 stickers.** Replaying a theme's mission earns the next sticker in
  its set. When the set is complete, further replays earn a **gold** version.
- **A complete set unlocks something visible:** a new Léo outfit or a background.
- No duels, leagues or rankings on the Junior home.
- **Interruptions.** A learner who leaves mid-mission (bell, parent, battery) can **resume from the
  last finished turn for up to 24 h**. A started but unfinished mission earns no sticker and shows
  **no "you lost it" message**: after 24 h it is quietly dropped.
- Junior writes **no** `Session`, XP event, topic mastery, Learn evidence or IGCSE data. Its state
  lives in `AppContext`'s single reducer (Core Rule 4) under an account-scoped key, like `notebook`.
  The local `outcomeTally` (got/almost/none counts) exists only for the playtest readout on a
  dev-only route; there are no analytics events for Junior.

## §11 Content rules

- **Never ask the learner's gender.**
- **Gendered adjectives are avoided in the pilot;** where unavoidable, both forms (e.g. grand/grande)
  are accepted variants.
- **Sentences are at most 8 words.**
- Every slot word has an image and an article, and article/gender agreement holds; every question has
  1–2 frames, a model answer and a hidden English helper; every Léo line has an audio-file id.
  These are enforced by `juniorBankLint.ts` (Batch 1), modelled on `src/data/learnBankLint.ts`.
- **French accuracy needs a human check.** A French teacher reviews the pilot sentences and accepted
  variants before release.

## §12 Visual tone

For 9–12: **playful but not babyish** — missions, stickers and a cool Léo; not cartoon animals and
nursery colours. The 12-year-old is the harder audience to keep, so design for them and keep it
simple enough for the 9-year-old. Colour comes from role tokens only (the Learn light-contrast
rules; see `CLAUDE.md`).

## Why no AI per turn

Deliberate: **speed** (a child will not wait 3–4 s after every sentence), **cost** (about 6 turns per
mission × many learners), **predictability** (no model-written text goes in front of children) and
**fit** (the closed bank already holds everything the feedback needs). AI may be added later for the
Free step only, if the playtest shows the matcher is too narrow.

## Playtest gate

Before content scale-up, 3–5 real children play the two pilot themes; the group must include at least
one 9-year-old and one 12-year-old. Per child, record the none rate and almost rate (from
`outcomeTally`), whether they finished missions without adult help, and whether the 12-year-old found
it "babyish" (in their words). Thresholds, fixed **before** the playtest:

- **none > 25 % of turns** → the recogniser or the warm-up/Whisper path needs work; fix that before
  adding content.
- **almost > 40 % of turns** → the matcher is too strict or the sentences are too long.
- **The 12-year-old says "babyish"** → revise the visual tone before scaling.

The result is logged in `verification-log.md`; this page never claims the gate passed.

## Out of scope for v1 (gated)

- **Pronunciation verdicts and tips** (e.g. "practise the *ou* in *rouge*") only after a calibration
  passes on real recordings of children aged 9–12, using Azure *scripted* mode (Junior knows the
  target sentence — the exam freeform design lacked exactly that). Same release discipline as
  `docs/systems/exam-pronunciation.md`, logged in `verification-log.md`.
- **"Teach Léo" missions:** Léo gets something wrong on purpose and the learner corrects him.
