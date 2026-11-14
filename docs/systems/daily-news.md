# Daily News Flash ("Le Journal")

A short daily news show: one French story a day, written at three levels. The learner hears the
story, spots the changed detail in « Intox ou info ? », then takes part in the day's featured
speaking segment: answering as someone in the story, or arguing both sides of its issue. Review
shows what worked, what to fix and a better version, **with no marks**. This page is the
specification; the code and its tests are the current behavior. It is **§-numbered and live —
never renumber a section** (cite as `daily-news §N`).

Code: `src/data/news/` (stories, segments, types, lint, rotation), `src/features/news/` (player,
progress, word matching) and `src/features/news/show/` (the show: plan, segments, feedback),
`src/screens/DailyNewsFlash.tsx` (route `/daily-news`, Explore tile `daily_news`).

**History.** Until 2026-11-11 the screen fetched one Gemini-written story a day from backend
`GET /api/news/daily` (removed). The first hand-written version (2026-11-11) asked the learner to
answer three questions about the facts and then retell the same facts; on 2026-11-14 the owner
found that repetitive, and that the review's /10 scores, criteria and CEFR level did not belong in a
feature that is not topic-marked. It was rebuilt as the show described here.

## §1 The bank

- **Hand-written, bundled, never generated at runtime** (owner decision 2026-11-11): every line can
  be recorded ahead of time, the feature works offline up to the feedback, and nothing unsuitable
  can reach a child.
- A story is a `NewsStory` in `src/data/news/editions/*.ts`: three levels, `a2` / `b1` / `b2`,
  shown as Easier / Standard / Harder. Each level has its own headline, sentences (`fr` + `en`),
  glossary and 3 listening questions (`check`, kept for the planned weekly quiz, §10).
- Its show segments (§7) and links (§11) are a `NewsEditionSegments` entry with the same id in
  `src/data/news/segments/*.ts`. `src/data/news/index.ts` joins the two into the `NewsEdition`s the
  show plays; a story without segments is left out, and the lint fails on it.
- **Stories are evergreen and kid-safe**: science, space, sport, culture, environment, animals,
  tech, food, people, travel, festivals. No war, crime, disasters, illness or politics, and no
  dates that go stale ("yesterday" is fine, "on 3 March 2026" is not).
- `src/data/news/newsBankLint.ts` (run by its test, so a violation fails `npm test`) holds the
  contract:
  - limits per level (a2 3–5 sentences ≤ 45 words; b1 4–6 sentences ≤ 65 words; b2 4–7
    sentences ≤ 85 words); model answers ≤ 30 / 40 / 50 words
  - every glossary entry appears in that level's story; check answers and sentence indexes are valid
  - the segment rules in §7
  - `examArea` is A–E; `learnTopic` is a core Learn topic
  - straight apostrophes, no control characters (content-authoring §12–13), and a banned-word
    list over every French field, segments included
  - ids are kebab-case and unique; pin dates are unique; at least 7 unpinned editions
  - every story has segments, and every segments entry a story
- `reviewed: false` until a French speaker has checked every level, segments included. Unreviewed
  editions still run (otherwise the bank would be empty); the lint lists them as warnings. **All
  28 launch editions and their segments were drafted by Claude and are unreviewed.**

## §2 Rotation

`editionForDay(day, bank)` (`rotation.ts`): pure and deterministic, the same on every device.

- `day` is the learner's **local** calendar day (`lib/localDay.ts`), so the edition changes at the
  learner's midnight.
- An edition with `pinDate: 'MM-DD'` runs on that day every year and never otherwise (Chandeleur
  02-02, poisson d'avril 04-01, Fête de la musique 06-21, 14 juillet 07-14).
- Every other day runs the unpinned editions in bank order (§9), so a story repeats only after the
  whole rotation (24 stories at launch).

## §3 The flow

`Listen → Intox ou info → <today's segment> → Review` (`StepTrack`).

1. **Les titres (listen).** Words to know (glossary chips: tap for the English), then the player
   (§5). The transcript is locked until one full listen (or immediately if the device can't play
   French); opening it is free. The level can be changed only on this step, which also says what
   today's segment is (« Tu es l'apiculteur… »).
2. **Intox ou info ?** Henri reads the story again with one sentence swapped for a version with
   one detail changed. The learner picks which detail changed (3 English options; the first pick
   counts), then sees the fake line struck through beside the real one, with ▶ for the real one.
3. **Today's segment** (§7), recorded turn by turn (`SegmentTurns`): Henri asks each prompt, the
   learner records, sees what was heard, then says it again or moves on. A turn can be skipped.
4. **Review.** Feedback with no marks (§8); "Story words you used" (the glossary words the learner
   reused, matched deterministically by `newsMatch.ts`); every prompt with what the learner said
   (▶ their own recording, local only) beside a model answer; the story's links (§11); the
   story's other segment as practice; "Start the show again", a harder level, Done.

## §4 Score, XP and history

- **XP once per edition-day, for the featured segment** (§7): `Session.contentId` =
  `news:<editionId>:<YYYY-MM-DD>`. The first finished featured segment with a new `contentId` goes
  through `awardXP` → `ADD_SESSION`. A replay of the featured segment is recorded with
  `recordSession` only: it stays in the history but earns no XP and doesn't touch
  `sessions_count`. A **practice** segment (the story's other one) writes no Session and no XP; it
  still gets feedback. A segment with no answered turn writes nothing. The same story on a later
  rotation day is a new edition-day. There is no XP penalty anywhere.
- `Session.score` is the **participation score** `showScore` (`show/showPlan.ts`) =
  10 × (0.3 · Intox ou info right + 0.7 · turns answered / turns). It drives XP only and is never
  shown on this screen: it rewards taking part, never the quality of the French (§8).
- When feedback exists, the featured attempt also goes to `observeAttempt` (mode `daily-news`).
- **History is keyed on the day, never the edition id** (`finishedDays` in `newsProgress.ts` reads
  the `<YYYY-MM-DD>` at the end of the key). Adding or reordering editions moves the rotation for
  past days; keying on the day means it never takes a learner's ticks or streak away. Keep the key
  format.
- `contentId` is stored locally (`StoredSession`) and **not synced**. On a second device the same
  edition-day can earn XP once more; this is accepted.

## §5 Audio

`useBroadcast` plays the story **one sentence at a time** through
`TTS.speak(sentence, { recorded: true })`: Henri's Azure recording from the `tts-audio` bucket,
falling back to the browser voice only when it is French (recorded-voices plan). A run id drops
the rest of a story on stop, replay or unmount. Normal / Slower = rate 0.9 / 0.68 (recordings
play at 1× / 0.75×). A line that ends in under 150 ms made no sound, so the player marks audio
unavailable and unlocks the transcript. Intox ou info uses its own `useBroadcast` over the story
with the fake sentence swapped in.

The "Record voices" catalogue (`scripts/tts/collectLines.ts`, source `news`) holds every sentence
of every level plus every line Henri says in the show: the fake sentence, the interview questions
and the debate question (≈ 50k characters; `catalogueCoverage.test.ts` checks both). **New or
edited stories or segments need a "Record voices" run**; until then those lines play in the browser
voice. The show's prompts took the full catalogue to ≈ 521k characters, so the owner raised
`BUDGET_LIMIT_CHARS` from 500k to 545k (2026-11-14) and records the new lines over the following
month(s): the catalogue is now larger than one Azure F0 month.

The level choice is stored on `STORAGE_KEYS.newsLevel` (identity-scoped). The default comes from
the Learn marking level: A1/A2 → a2, Exam standard/B1 → b1, B2 → b2.

## §6 Streak and archive

Both are derived from `getSessionHistory()`; there is no store of their own (Core Rule 4).

- **News streak**: consecutive local days finished **on that day**, ending today (a session's
  `date` falls on the day in its key). If today isn't done yet the count ends at yesterday, so the
  morning never shows a broken streak.
- **Week strip**: the last seven days' editions, done or not, today ringed.
- **Archive**: the last 14 days (`ARCHIVE_DAYS`), opened with `/daily-news?day=YYYY-MM-DD`. Any
  other `day` value opens today. An archive day earns XP once (catching up) and ticks its day in
  the week strip, but never mends the streak.

## §7 Segments

The featured segment depends on the weekday (`FEATURED_BY_WEEKDAY` in `show/showPlan.ts`):

| Day | Planned segment | Built |
|---|---|---|
| Mon, Thu, Sun | L'interview | yes |
| Tue, Sat | Pour ou contre | yes |
| Wed | Le journaliste, c'est toi | not yet — L'interview stands in |
| Fri | Et après ? | not yet — Pour ou contre stands in |

- **« Intox ou info ? »** (every day; `fake`): one sentence index, the changed sentence (fr + en),
  3 English options naming a detail, the right one. Lint: a valid sentence, different from the
  real one; 3 different options; a valid answer.
- **L'interview** (`interview`): the learner **is** someone in the story (`role`, second person:
  « Tu es la capitaine de l'équipe. »). Henri, the journalist, asks 3 prompts, each with a `kind`
  (`describe` / `past` / `future` / `opinion`), 2–3 French starters and a model answer in role.
  Lint: 3 prompts ending « ? » (or « . » for « Racontez-nous… »); at least one `past` at every
  level and one `future` at B1/B2 — the exam's tenses.
- **Pour ou contre** (`debate`): the story's issue as a question (`motion`, ending « ? »); the
  learner argues for, then against, each with 2–3 starters and a model. Henri asks the motion once.
- Each segment makes **one** feedback call at the end (§8), and no AI call per turn.
- **Le journaliste, c'est toi** (planned): 3 English goals (« Find out *when*… »); the learner asks
  a French question; a deterministic check looks for the right question word
  (`data/questionWords/words.ts`); a right question gets Henri's authored answer.
- **Et après ?** (planned): predict what happens next, then hear the authored "what happened next";
  on a multi-day story (§9) the next part opens with what the learner predicted.

## §8 Feedback without marks

- `show/segmentFeedback.ts` calls the ordinary `getAIFeedback(…, inputMode 'speech')`. It sends no
  `marking`, so it charges `feedback` (guests included), never Learn's daily answers. The scenario
  and the prompts go in `question.text` (the only question field the backend reads, ≤ 2,000
  characters); the answers are joined into one transcript, so every quote the feedback filter
  keeps is the learner's own. No audio is sent (several turns; the backend would re-transcribe
  only one). **No backend change** was needed.
- `show/NewsCoachFeedback.tsx` shows the opening line, What worked, the first two fixes
  (`coachPoints.ts`'s `whatWorkedGroup` / `selectCoachFixes`, through `FeedbackPointList`) and
  "Say it better" (`BeforeAfterDiff`). **It never reads `scores` or `cefrLevel`**: no number,
  criterion or level is shown (a screen test fails on a digit, "/10" or a CEFR label in it).
- If feedback fails (offline, signed out, quota), Review says so and still shows the answers and
  the model answers.

## §9 Rotation, pinned days and multi-day stories

- `rotationIndex(day)` = days since the epoch minus the pinned days before `day`, so **a pinned day
  never swallows a rotation edition**: the story due that day runs the next day (pinned by a test).
- Rotation order is bank order (`NEWS_STORIES`), so the parts of a multi-day story, kept adjacent in
  the bank, run on consecutive days.
- Multi-day stories (planned): `arc: { id, part, total }` on the story; the day before a next part
  features Et après ?.

## §10 Sunday cards (planned, not built)

- **Le quiz de la semaine**: 7 `check` questions from the last 7 days' editions at the learner's
  level, each with ▶ replay. XP once a week, `contentId news-quiz:<sunday>` (never counts toward the
  streak).
- **Mon journal**: report a real piece of news from the learner's own week. One feedback call; XP
  once a week, `news-journal:<sunday>`.

## §11 Links

- Each edition has an IGCSE `examArea` (A–E, syllabus topic areas) and an optional core
  `learnTopic`. Review shows « Exam topic area D: The world of work » and « Practise Jobs in
  Learn → » (`/learn?topic=…`), the link only when `topicFromDeepLink` would open that topic
  (visible, unlocked).
- Planned: a Question Detective link after a journalist mix-up, and a weekly "news words" set in
  Rapid Fire and Word Drop.

## Out of scope / not built

- No Home teaser: Home's advice is the single coach brief (`coachBrain.ts`), so adding one is a
  coach-brief change.
- Junior news is a separate mission in the Junior track (junior-track spec), not this screen.
- Glossary words are not spoken (only sentences and the show's prompts are catalogued).
