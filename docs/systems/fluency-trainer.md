# Fluency trainer

The learner-facing reader of Learn's speaking log, plus a timed-repetition drill. Live
specification: sections are cited in code as `fluency-trainer §N`, so **never renumber them**.

- Flag: `fluencyTrainer` (`live`; rollback `coming-soon` hides both routes and the Progress card).
- Routes: `/fluency` (the view) and `/fluency/drill` (the 4-3-2 drill), both in `MainLayout`.
- Entry points: Explore's "Fluency Trainer" tile (Insights & Plan, id `fluency_trainer`) and
  Progress's "Your speaking flow" card (a link only).
- Cost: **no AI call, no backend call, no quota.** Measurement is on the device; words come
  from the browser's live captions.

## §1 What it is, and what it is not

It measures **flow**: how fast someone speaks and how often and how long they stop. It never
judges whether the French was right, and it is **not a mark, band, level or grade**.
Every screen that shows a number also shows two notes (`fluencyCopy.ts`):

- `FLOW_NOT_A_GRADE`: "This measures flow, not French… It is not a mark…"
- `UNVALIDATED_NOTE`: the measures are early estimates and haven't been checked against examiners,
  so "watch your own trend, not the exact numbers."

There is no target speed, no norm and no comparison with other learners. No sourced figure for
IGCSE speaking rate exists, so the learner is only ever compared with themselves.

## §2 The fluency view (`/fluency`)

Reads Learn's speaking log (`services/fluency/speakingLog.ts`) through **one** module,
`features/fluency/flowSource.ts`. That file is the only trainer entry in the log's privacy
allow-list (`speakingLogPrivacy.test.ts`). The numbers come from the pure
`domain/fluency/fluencyProfile.ts`:

- **Eligible samples**: current `SPEECH_METRICS_VERSION` only (a definition change must not
  read as progress), and at least `MIN_SPEAKING_SPAN_S` (3 s) from first word to last.
- **Right now**: the median of the latest `TREND_WINDOW` (10) answers for speed (words a
  minute over the speaking span), pauses a minute (silences ≥ 0.5 s), words between pauses,
  longest pause and time to start. It uses a median so one bad take can't swing it.
- **Trend**: the latest answers against the same number before them, each side up to 10, shown
  only when both sides have `MIN_TREND_SAMPLES` (5). A difference counts only past `FLOW_CHANGE` (§4).
- **Speed by topic**: topics with at least `MIN_TOPIC_SAMPLES` (3) answers. When two or more
  qualify, the slowest becomes the drill suggestion. The copy says slower isn't worse French.
- A missing value (no words heard) is a dash, never a zero, and is left off the chart.

### §2.3 The chart

Speed per answer, the latest `SERIES_MAX` (30). One series, so there is no legend box: the title
names it. Columns use only role tokens, and the newest column is the only direct label. Each
column has a native tooltip, and the same numbers are in a screen-reader table. Answers where no
words were heard are left out of the chart.

## §3 The 4-3-2 drill (`/fluency/drill`)

The same answer three times in shrinking time: **60 s, 45 s, 30 s** (`DRILL_ROUNDS_S`). This is
Nation's 4/3/2 technique scaled down to an IGCSE answer. Saying it again lowers the planning load,
so the effort can go into flow.

### §3.1 Choosing the question

First come the Learn questions this learner already answered out loud (from the speaking log,
most recent first, no follow-ups, up to 4). Then any topic with at least 5 Learn questions gives
a random question at difficulty ≤ 2, so the time pressure lands on flow, not on finding ideas.
`?topic=` preselects a topic (the view's suggestion and "Drill" buttons use it).

### §3.2 A round

The flow is the pure reducer `features/fluency/drillMachine.ts`:
`countdown (3 s) → recording → measuring → review`.

- Recording is `useRecording(blocked)` inside `SpeakingConsentGate`. A `pending` guardian-consent
  account cannot record. The hook also silences sound effects and holds the wake lock.
- Each round stops by itself at its limit. Stop, Space or Escape/Back ends it early, and Back
  while recording is handled, never navigated.
- The recording is decoded and measured **in memory** with the same path as the speaking log:
  `measureAnswerSpeech` → the exam pronunciation silence gate (`trim.ts`) → `summarizeSpeech`.
  The audio is then dropped and never uploaded.
- Outcomes: `ok`; `noSpeech` (the gate heard nothing); `tooShort` (under `MIN_SPEAKING_SPAN_S`);
  `unmeasured` (decode failed). Only `ok` stores the round. Every other outcome must be recorded
  again, and **a failed round is never stored as a zero**.
- From round 2 on, the review compares with round 1. Leaving early ("See what changed") keeps the
  rounds already measured.
- Without live captions (Firefox, or offline) words can't be counted, so the drill measures pauses
  only and says so.

### §3.3 The summary

`summarizeDrill` compares the first and last measured rounds on the four measures. The headline is
`smoother`, `mixed`, `same`, `lessSmooth` or `notEnough`. If the last round said less than
`KEPT_WORDS_WARN` (60 %) of the first round's words, it says the speed may only come from saying
less ("keep every point and just say it faster").

### §3.4 The first-take trend

The drill's real test is whether the **first, unrehearsed** round gets smoother over weeks.
`firstTakeTrend` compares the median 60-second-round speed of the latest drills with the drills
before them (up to 5 each), once both sides have `MIN_DRILLS_FOR_TREND` (3).

## §4 Change cut-offs (UNVALIDATED)

`domain/fluency/flowMeasures.ts`'s `FLOW_CHANGE`: a difference counts only when it clears **both**
an absolute and a relative floor (speed 8 wpm and 10 %; pauses a minute 1.5 and 20 %; words between
pauses 1 and 15 %; longest pause 0.5 s and 20 %). Anything smaller is "about the same". These are
product heuristics that have not been checked against real recordings. A change is a
`FLOW_MEASURES_VERSION` bump; changing the drill is a `DRILL_VERSION` bump.

## §5 Data and isolation

- **Drill records** (`services/fluency/drillStore.ts`, key `frenchCoach_fluencyDrills`): per
  account, on this device only, at most 200. They hold ids, round limits and the `SpeechMetrics`
  numbers, **never audio, a transcript or question text**. Removed by `deleteMyAccount()`. Only the
  store, the storage registry, account deletion and the two trainer screens may name it
  (`drillStorePrivacy.test.ts`).
- **No sync yet.** `speaking_samples` accepts only `surface = 'learn'` (a CHECK). Drill rounds are
  deliberately rushed retellings and must not enter Learn's trend. A cloud copy needs its own table
  (a backend migration).
- The trainer writes no XP, Session, mastery, review, evidence, learner-model or coach state, sends
  no analytics event (page views only) and makes no AI or backend call. The scored pipeline and
  Junior never import it. All of this is pinned by `fluencyIsolation.test.ts`, which also holds the
  UI to Design System v2 (role tokens only, no text under 12 px, no glow, gradients or looping motion).

## §6 Copy

All strings are in `features/fluency/fluencyCopy.ts`. `fluencyCopy.test.ts` fails if any string
other than `FLOW_NOT_A_GRADE` names a mark, grade, band, score, CEFR level, pass/fail, "wrong" or
"native". A slower round is described plainly ("slower", "more pauses"), never as a mistake, and
`lessSmooth` is shown in neutral ink, not the correction colour.
