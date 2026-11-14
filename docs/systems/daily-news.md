# Daily News Flash ("Le Journal")

A short daily listening-and-speaking show: one French news story a day, written at three levels.
The learner listens, answers three comprehension questions, presents the story as a news anchor,
optionally gives an opinion, then sees which facts they reported. This page is the
specification; the code and its tests are the current behavior. It is **§-numbered and live —
never renumber a section** (cite as `daily-news §N`).

Code: `src/data/news/` (bank, types, lint, rotation), `src/features/news/` (player, steps, pure
helpers), `src/screens/DailyNewsFlash.tsx` (route `/daily-news`, Explore tile `daily_news`).

**Replaced on 2026-11-11.** The old screen fetched one Gemini-written story a day from backend
`GET /api/news/daily`, read it with the browser voice and scored keyword substrings. That
endpoint's prompt constant was never defined, so in production it served the same hard-coded
fallback story (with no translation) every day. The endpoint has been removed from the backend
repo.

## §1 The bank

- **Hand-written, bundled, never generated at runtime** (owner decision 2026-11-11): every line can
  be recorded ahead of time, the feature works offline up to the report, and nothing unsuitable
  can reach a child.
- One `NewsEdition` (`src/data/news/types.ts`) = one story at three levels, `a2` / `b1` / `b2`,
  shown as Easier / Standard / Harder. Each level has its own headline, sentences (`fr` + `en`),
  glossary, 3–4 facts, 3 comprehension questions, an opinion prompt, 2–3 sentence starters and a
  model retelling.
- **Stories are evergreen and kid-safe**: science, space, sport, culture, environment, animals,
  tech, food, people, travel, festivals. No war, crime, disasters, illness or politics, and no
  dates that go stale ("yesterday" is fine, "on 3 March 2026" is not).
- `src/data/news/newsBankLint.ts` (run by its test, so a violation fails `npm test`) holds the
  contract:
  - limits per level (a2 3–5 sentences ≤ 45 words; b1 4–6 sentences ≤ 65 words; b2 4–7
    sentences ≤ 85 words)
  - every glossary entry and every fact cue appears in that level's story
  - every fact has at least 2 cue groups (§3)
  - the model retelling covers every fact
  - check answers and sentence indexes are valid
  - straight apostrophes, no control characters (content-authoring §12–13)
  - a banned-word list
  - ids are kebab-case and unique; pin dates are unique
  - at least 7 unpinned editions
- `reviewed: false` until a French speaker has checked every level. Unreviewed editions still run
  (otherwise the bank would be empty); the lint lists them as warnings. **All 28 launch editions
  were drafted by Claude and are unreviewed.**

## §2 Rotation

`editionForDay(day, bank)` (`rotation.ts`): pure and deterministic, the same on every device.

- `day` is the learner's **local** calendar day (`lib/localDay.ts`), so the edition changes at the
  learner's midnight.
- An edition with `pinDate: 'MM-DD'` runs on that day every year and never otherwise (Chandeleur
  02-02, poisson d'avril 04-01, Fête de la musique 06-21, 14 juillet 07-14).
- Every other day takes days-since-epoch modulo the unpinned list, so a story repeats only after
  the whole rotation (24 stories at launch).

## §3 The flow

`Listen → Check → Report (+ Your take) → Review` (`StepTrack`).

1. **Listen.** Words to know (glossary chips: tap for the English), then the player (§5). The
   transcript is locked until one full listen (or immediately if the device can't play French).
   Opening it is free; a report done without it gets an "Ear-only" badge. The level can be
   changed only on this step.
2. **Check.** Three listening questions, in English (they test the ear, not reading), marked
   instantly. The first answer counts. A miss offers the sentence that holds the answer.
3. **Report.** The learner presents the story ("Bonsoir, voici les infos…"). The fact checklist
   lights a slot as each fact is heard in the live transcript; the facts' English stays hidden
   unless the learner asks for a hint.
4. **Your take (optional).** An authored opinion question with sentence starters, as a second
   recording. It is skippable.
5. **Review.**
   - Facts reported (X of N), with the French sentence and ▶ replay for each fact missed.
   - Listening check score, XP or "Practice run · no XP", and the Ear-only badge.
   - "Watch your broadcast": the learner's own recording under a TV-style lower third, local
     only.
   - The story in French and English, with missed-fact sentences highlighted, and the model
     retelling.
   - Language feedback.

**Fact matching** (`features/news/matchFacts.ts`) is deterministic, with no AI call. Both sides
are normalised: case, accents, apostrophes and hyphens are folded, and digits are spelled out in
French (the recogniser writes « 28 » for « vingt-huit »). A fact is covered when **every** cue
group has at least one alternative as a whole word (`recycl*` = prefix). Because each fact needs
two or more groups, listing keywords never covers facts (pinned by a test). Facts are matched on
the report only, not the opinion.

**Language feedback** is the normal `getAIFeedback` call (Learn's `feedback` quota, guests
included) on report + opinion, with the level's French `modelRetell` as the model answer and its
glossary as key vocabulary. If it fails (offline, signed out, quota), Review says so; it never
shows placeholder scores.

## §4 Score, XP and history

- `newsScore` = 10 × (½ · check correct / 3 + ½ · facts covered / facts). It is `Session.score`
  for this mode; the AI feedback's own scores are never overwritten.
- **XP once per edition-day**: `Session.contentId` = `news:<editionId>:<YYYY-MM-DD>`. The first
  finished report with a new `contentId` goes through `awardXP` → `ADD_SESSION`. A retry, or a
  second level of the same day, is recorded with `recordSession` only: it stays in the history
  but earns no XP and doesn't touch `sessions_count`. The same story on a later rotation day is a
  new edition-day. There is no XP penalty anywhere (the old −5 XP transcript charge is gone).
- When feedback exists, the attempt also goes to `observeAttempt` (mode `daily-news`).
- `contentId` is stored locally (`StoredSession`) and **not synced**. On a second device the same
  edition-day can earn XP once more; this is accepted.

## §5 Audio

`useBroadcast` plays the story **one sentence at a time** through
`TTS.speak(sentence, { recorded: true })`: Henri's Azure recording from the `tts-audio` bucket,
falling back to the browser voice only when it is French (recorded-voices plan). A run id drops
the rest of a story on stop, replay or unmount. Normal / Slower = rate 0.9 / 0.68 (recordings
play at 1× / 0.75×). A line that ends in under 150 ms made no sound, so the player marks audio
unavailable and unlocks the transcript.

Every sentence of every level is in the "Record voices" catalogue (`scripts/tts/collectLines.ts`,
source `news`, ≈ 28k characters; `catalogueCoverage.test.ts` checks it). **New or edited stories
need a "Record voices" run**; until then those lines play in the browser voice. Adding the bank
took the full catalogue to ≈ 498k characters, so `BUDGET_LIMIT_CHARS` went from 480k to 500k
(2026-11-11).

The level choice is stored on `STORAGE_KEYS.newsLevel` (identity-scoped). The default comes from
the Learn marking level: A1/A2 → a2, Exam standard/B1 → b1, B2 → b2.

## §6 Streak and archive

Both are derived from `getSessionHistory()`; there is no store of their own (Core Rule 4).

- **News streak**: consecutive local days whose own edition-day has a finished report, ending
  today. If today isn't done yet the count ends at yesterday, so the morning never shows a broken
  streak.
- **Week strip**: the last seven days' editions, done or not, today ringed.
- **Archive**: the last 14 days (`ARCHIVE_DAYS`), opened with `/daily-news?day=YYYY-MM-DD`. Any
  other `day` value opens today. An archive day earns XP once (catching up) but never counts
  toward the streak, because only a day's own edition on that day counts.

## Out of scope / not built

- No Home teaser: Home's advice is the single coach brief (`coachBrain.ts`), so adding one is a
  coach-brief change.
- Junior news is a separate mission in the Junior track (junior-track spec), not this screen.
- Glossary words are not spoken (only sentences are catalogued).
