# Achievements

Live specification for the achievements on Profile (`src/data/achievements.ts`,
display in `src/features/profile/achievementDisplay.ts`, context built by
`src/services/coach/achievementContextBuilder.ts`). Owner request 2026-11-05:
"make the achievements sensible from the learner's point of view."

## §1 What an achievement is for

An achievement tells a learner **"you did something that matters for your exam"**
and gives them a next goal they can see. It is not a second XP bar. Each one
must pass three questions:

1. **Can the learner tell exactly what to do?** The description is one plain
   action with a number ("Practise on 10 different days"), never an internal
   metric ("avg mastery ≥ 0.6") or a word that means something else in the app
   (a Session is one answer, so never "complete 5 sessions").
2. **Is it honest?** No achievement claims a level or grade the app does not
   measure (the old "Niveau B2" was 60% average grammar mastery, not B2).
   Score achievements read only counted answers: Exam standard or harder in
   Learn (learn-marking §8.2), and Exam Sim attempts that count toward progress
   (ADR 0007) — never Coached, typed, resumed or early-start exams.
3. **Does it reward something we want more of?** Developed answers, coming back,
   fixing a repeated mistake, beating your own past — not grinding.

## §2 Design rules

| Rule | Why | How it shows |
|---|---|---|
| Early wins come fast | The first few minutes decide whether a learner returns | `premier_pas` on the first answer, `curieux` after 3 topics |
| Habits never punish a break | Streak loss is the most common reason learners quit; a badge that resets teaches "one missed day ruins it" | Streaks stop at 7 days; the long habit badges (`regulier` 10, `fidele` 30) count **days**, gaps allowed |
| Compare to your own past | Absolute scores reward the already-strong and discourage the rest | `en_progres` (+2 on a repeated question, larger than marking noise), `remontee` (beat your last Exam Sim), `probleme_resolu` |
| Reward what examiners reward | Achievements shape behaviour, so aim them at the exam | `developpe` (a 40-word answer), `autocorrection` (repairing a slip) |
| Few surprises | Hidden badges delight only if most goals are visible | At most one in five is hidden: `perfectionniste`, `autocorrection`, `le_retour` |
| Nothing taken away | Losing an earned badge feels worse than never getting it | Ids are permanent; a dropped achievement is `retired` (no rule, shown only to learners who earned it) |
| Every visible badge is reachable | Four badges once shipped impossible to earn | `achievementReachability.test.ts`: a witness context per visible badge and a live producer for every signal it reads |

## §3 The set

Order here is the rule order (a prerequisite always comes first). Profile shows the
grid under these groups (`ACHIEVEMENT_GROUPS` in `achievementDisplay.ts`: Getting
started, Habit, Speaking, Getting better, Exam, Explore), each with its own
"N of M" — small, finishable sets rather than one long wall. Collapsed, each group
shows its first two tiles (unlocked first, then the closest to unlocking).

| Group | Id | Name | Unlocks when | Hidden |
|---|---|---|---|---|
| Start | `premier_pas` | Premier pas | First answer | |
| Start | `curieux` | Curieux | 3 different Learn topics | |
| Habit | `triple_jour` | Triple jour | 3-day streak | |
| Habit | `semaine_parfaite` | Semaine parfaite | 7-day streak | |
| Habit | `regulier` | Régulier | 10 different practice days | |
| Habit | `fidele` | Fidèle | 30 different practice days | |
| Habit | `dix_sessions` | Habitué | 10 answers | |
| Habit | `marathonien` | Marathonien | 50 answers | |
| Habit | `expert` | Expert | 1,500 XP (Advanced level) | |
| Habit | `bete_de_mode` | Bête de mode | 7,000 XP (Beast Mode) | |
| Speaking | `developpe` | Développé | One answer of 40+ words (not a whole exam) | |
| Speaking | `fluent` | Très bien | A counted 8/10 | |
| Speaking | `perfectionniste` | Perfectionniste | A counted 10/10 | yes |
| Speaking | `autocorrection` | Je me reprends | Feedback credited a self-correction | yes |
| Growth | `en_progres` | En progrès | A repeated Learn question beat its first try by 2+ | |
| Growth | `probleme_resolu` | Problème résolu | A tracked repeated mistake resolved | |
| Growth | `drill_master` | Drill master | 5 coach drills taken | |
| Growth | `grammaire_maitrisee` | Grammaire maîtrisée | One grammar point at 80% mastery | |
| Growth | `niveau_b2` | Bases solides | Average grammar mastery 60% | |
| Growth | `le_retour` | Le retour | Practising after 7+ days away | yes |
| Exam | `examinateur` | Examinateur | Any exam attempt | |
| Exam | `grand_oral` | Grand oral | A counted Exam Sim | |
| Exam | `remontee` | Remontée | A counted Exam Sim beat the one before | |
| Explore | `explorateur` | Explorateur | First role-play answer | |
| Explore | `causeur` | Causeur | 5 different role plays | |
| Explore | `polyglotte` | Polyglotte | 8 different Learn topics | |
| — | `cinq_sessions` | Assidu | Retired (filler between 1 and 10 answers) | — |

Thirteen ids gate Shop items server-side (`shop_items.requirement`,
shop-economy §6): `triple_jour`, `examinateur`, `causeur`,
`grammaire_maitrisee`, `probleme_resolu`, `niveau_b2`, `bete_de_mode`,
`semaine_parfaite`, `expert`, `grand_oral`, `fluent`, `perfectionniste`,
`drill_master`. Their names, wording and rules may change; the ids may not.

## §4 Changing the set

- Never rename or reuse an id that a learner may hold for a different meaning
  without checking §3's history; never delete one — retire it.
- A new signal is derived from stored history in `achievementHistoryCounts`
  (so Profile's progress bars read exactly what the rule reads), or passed by
  the orchestrator for a per-answer fact (`selfCorrected`).
- A new visible achievement needs a witness and a producer in
  `achievementReachability.test.ts`, and its numbers as named constants in
  `achievements.ts`.
- Nothing from the games that award nothing (Rapid Fire, Word Drop, Boss
  Battles, Sentence Rebuilder, Emoji Master) or from Junior may feed an
  achievement: those surfaces write no app state by owner decision.
- Second take and the notebook are practice-only and write no app state; they
  must not unlock anything.
