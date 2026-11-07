# Learner model — one per-skill estimate (specification)

Status: **model live (shadow writes); every reader flag `coming-soon`.** Decision: ADR 0016.
Cited in code as `learner-model §N`. Sections are numbered; **never renumber them.**

The app used to keep four separate "how good is this learner at X" stores, and its readers mixed them:
the evidence beliefs (`beliefReducer.ts`, read by the coach and Learn's ability read), the diagnostic
`SkillProfile` (read by Progress — so Progress and the coach disagreed on which skills were weak), topic
mastery, and counted exam marks. This document specifies the one model that replaces the skill-level
reads, and how each reader moves onto it.

Code: `src/domain/learnerModel/` (pure), `src/services/coach/skillObservations.ts` (the one
conversion from evidence), `src/services/learnerModel/` (storage, bootstrap, the snapshot view),
AppContext's `learnerModel` slice.

## §1 What a skill is

A skill is one entry in the closed registry `src/domain/learnerModel/skills.ts`, nothing else.

| Kind | Ids | Fed by |
|---|---|---|
| `grammar`, `lexis` | the 22 coach skill-graph ids (`SKILL_DEFS`; a test holds them equal) | Learn answers |
| `demand` | `demand:describe|explain|justify|compare|hypothesize` | Learn answers |
| `examArea` | `exam:rolePlay|communication|qualityOfLanguage` | counted Exam Sim marks only |

Ids are kept, never renamed: drills, `SKILL_TO_THEME`, intervention problems and
`TOPIC_SKILL_COVERAGE` key on them.

Every entry is exactly one of:
- **practised by** one or more `LearnStructure` tags (`tense_past` ← `perfect`, `imperfect`);
- **ubiquitous** — any answer can show it (gender, elision, prepositions…), so no structure narrows it;
- **not selectable** — no Learn question can be chosen for it (pronunciation, fluency, the exam areas).

The last two carry a written `reason`.

**Structures are question tags, never skills.** The direction is explicit:
`skill → structures` (`practisedBy`) says where to practise a skill; the generated `STRUCTURE_TO_SKILLS`
says what evidence a question can give. A completeness test requires every `LearnStructure` to map to
at least one skill or appear on the reasoned `UNMAPPED_STRUCTURES` list (empty today).
`justification` maps to `demand:explain`, `demand:justify` and `connectors`.

The registry's language-skill view (`REGISTRY_SKILL_TO_STRUCTURES`) is a strict superset of the
hand-written `skillStructures.ts` table. It agrees on every skill that table names and adds
`connectors` (justification), `contrast` and `confusions` (comparison). The hand-written table stays
the source for every reader whose flag is off. The generated `TOPIC_SKILL_COVERAGE_V2` in
`data/questionIds.ts` is the registry's per-topic count (run `npm run learn:question-ids`).

## §2 The estimator

Per skill, a **decayed Beta–Bernoulli**, kept as sufficient statistics (`SkillStat`):
- decayed success, failure, evidence and avoidance weights;
- a raw answer count;
- a reference time;
- the last ≤ 20 outcomes, for the trend only.

The half-life is 14 days, as before.

At read time every weight is rescaled by `exp(−λ(now − t))`. Then:
- mastery = (1 + s) / (2 + s + f);
- confidence = 1 − 1/(1 + 0.30·W).

Both are the reducer's existing formulas, so shadow parity is exact and measurable
(`learnerModelParity.test.ts`). An observation older than the reference time is added pre-decayed, so
arrival order never changes the result.

**Why not IRT.** 820 of 828 item tags are model-inferred and none are calibrated. A learner gives about
3 Learn answers a day, and there is no cross-learner response corpus (Core rule 5: never assume one). A
1PL/2PL per skill cannot be identified without one.

**Why Beta.** It is conjugate, takes fractional reliability weights, gives honest uncertainty from small
counts and costs O(1) per update. It also reproduces today's maths.

**Where difficulty enters.** Through the existing `deriveAbility` anchors and cap/floor over the demand
nodes. That is the one IRT-like reader, and it is unchanged.

**The gate fix (intended divergence).** The reducer applied `MIN_RELIABLE_WEIGHT` (0.15) *after*
multiplying by recency. As a result, an inferred demand event (base ≈ 0.26) vanished after ≈ 11 days,
and a normal LLM-marked grammar event (≈ 0.48) after ≈ 24 days; Learn's ability then fell back to cold
start. The model gates on the **base** weight at ingest and lets decay run afterwards, so old evidence
fades instead of expiring.

## §3 Evidence sources and weights

There is one observation per answer, and a derived view is never counted twice.

| Source | What the model records | Weight |
|---|---|---|
| Learn answers (coach and examiner voice) | the existing `buildEvidence` / `buildDemandOnlyEvidence` events, converted once by `skillObservations.ts` | the reducer's base weight: reliability × evaluator cap × source weight (inferred ≈ 0.26, reviewed ≈ 0.41) |
| SM-2 review | no extra observation — the review answer *is* the Learn answer | a **pass** on an item that was in the pool and due (eligible for the review slot) after a gap ≥ 6 days counts ×1.25; a fail ×1.0. `UNVALIDATED` |
| Topic mastery | not ongoing evidence (its average is built from the same answers); used once as a **bootstrap prior** for language skills with no evidence | `averageScore/10` as a success rate (`UNVALIDATED`), weighted by the topic's share of questions practising the skill, capped at 1.0 pseudo-count, dated at `lastSessionAt`; raw count stays 0 |
| Exam attempts | only `mode === 'exam' && !practiceOnly && examMarks` (ADR 0007), only the `exam:*` nodes | mark/max as a fractional success, effective n of 2 × 0.6 (the exam source weight) = 1.2. `UNVALIDATED` |

Coached, early-start, resumed and typed attempts add nothing.

**Not included (deferred, owner decision):** mapping envelope Quality-of-Language errors to grammar
skills.

## §4 State, writes and sync

### §4.1 Where it lives

AppState slice `learnerModel`, account-scoped key `frenchCoach_learnerModel`. Its parts:

- **`devices`:** one bucket per browser. A device writes only its own bucket, keyed by the
  device-scoped id in `frenchCoach_learnerModelDevice`.
- **`legacy`:** the bootstrap bucket (§4.5).
- **`seen`:** a bounded idempotency set of observation ids. It is local only and never synced.

`deleteMyAccount()` removes the local copy.

### §4.2 Writes

Every write goes through the reducer:
- `RECORD_SKILL_OBSERVATIONS` is idempotent by observation id. The id is the source event id plus its
  `occurredAt`, or `exam:<sessionId>:<area>`.
- `ADD_SESSION` derives the counted-exam observations itself (`examObservations`), so the
  `practiceOnly` filter lives in one place.
- `HYDRATE_LEARNER_MODEL` replaces the slice from a cloud merge or from another tab's write.

Learn evidence reaches the reducer through **one listener** on `coachStorage.appendEvidenceEvents`,
which AppProvider subscribes to. That catches every existing writer: the orchestrator, the demand-only
path, placement and pronunciation evidence.

Evidence merged in from the cloud (`coachSync`) does not pass through the listener. That is
deliberate: the model syncs on its own key, so another device's answers arrive through that device's
bucket, never twice.

### §4.3 Sync

Sync uses the `learner_state` key `skill_model` only (backend migration `20261106100000` widens the
key CHECK). It sits behind flag `learnerModelSync` until the owner has applied that migration in
production, because a push before then would violate the constraint.

The value is `{ version, devices, legacy }`: decayed numbers and counts only, with no text,
transcripts or event bodies.

How the merge works:
- It keeps each device's latest bucket (by `updatedAt`) and the legacy bucket with the earliest
  cutoff.
- Readers sum the buckets. Decayed sums add, so nothing is counted twice.
- The merge is commutative, associative and idempotent (`merge.test.ts`).
- A malformed or wrong-version cloud value changes nothing.
- The trend string is read from the bucket that saw the skill most recently.

**The device cap (deviation from the plan).** At most 8 device buckets are kept. Over the cap, the
bucket updated longest ago is **dropped**, never folded into a shared archive bucket. Two devices
folding different sets could not be merged without double counting. A bucket that old has decayed to
almost nothing, and a device that returns re-adds its own bucket. This device's own bucket is never
dropped.

### §4.4 Versioning

`LEARNER_MODEL_VERSION` (`learner-model-v1`). A stored slice or cloud value of another version is
ignored, and the model is rebuilt by §4.5. Bump it when the stored shape or the update maths changes.

### §4.5 First run (bootstrap)

When a device has no stored model, it builds the **legacy bucket** with `cutoff = now`, from:
- the local evidence log (≤ 150 events), through the same converter live answers use;
- counted exam sessions from the session history;
- the topic-mastery prior (§3).

Everything replayed is marked seen. Live observations from then on go to the device's own bucket.

Merging keeps the earliest cutoff, so the first device to start the model owns the pre-model history,
and later devices never re-count it. A device bootstrapping before its evidence log was hydrated
simply defers to an earlier legacy bucket when the cloud copy arrives. Pre-model history that only a
later device held is lost, never double counted.

## §5 Readers

These are pure functions in `src/domain/learnerModel/read.ts`, plus one view in
`services/learnerModel/learnerModelViews.ts`. Each returns the shape the existing reader already takes.

- `weakestSkills(model, now, { selectableOnly })`: the coach's rule. Rounded mastery < 0.60 and rounded
  confidence > 0.20, among language skills with decayed weight ≥ 0.5, weakest first, top 5.
- `coachSkillsView`: the `CoachInput.skills` shape.
  - There are no diagnosticEngine fallback entries. The topic prior replaced the fallback, so a skill
    with too little evidence is simply absent.
  - `avoidanceScore` is the share of decayed observations that were avoidance. The old projection's
    ratio was always 1 once any avoidance existed (intended divergence).
- `demandBeliefsView`: the `EvidenceBeliefSnapshot.demands` shape. `deriveAbility` is untouched.
- `examAreaStanding`: per 0520 area, the decayed share of marks across counted attempts, with the
  latest mark and max for display. An area needs decayed weight ≥ 0.2: one attempt (1.2) falls below
  that after ≈ 35 days, the old `EXAM_RESULT_FRESH_DAYS`.
- `focusStructures`: skill ids → question structures, through the registry.
- `learnerModelSnapshot`: the whole model as an `EvidenceBeliefSnapshot` (skills, *selectable*
  weakest, strongest, demands). Learn selection, the daily plan and the Focus Token take it while
  `learnerModelLearn` is live, so one reader never mixes the two models.

## §6 Hard constraints and the tests that hold them

- **Learn marks stay Exam standard.** Observations come from events built from `fb.scores`.
  `markingLevelIndependence.test.ts` asserts the dispatched observations are identical, and non-empty,
  across all five marking levels. Each reader-parity simulation repeats it end to end.
- **Exam evidence never alters a mark.** Nothing under `src/domain/igcse/`, `scripts/scoring/` or
  `server/` may import or name the learner model, and the model never imports the scored pipeline
  (`learnerModel/__tests__/scoredPipelineBoundary.test.ts`). The exam ingest takes
  `Readonly<ExamAreaMarks>` and returns model observations only (a frozen input survives).
- **Local first.** Every write goes through the reducer. Readers outside React read the stored copy,
  which the reducer keeps equal to state. Nothing is a cloud-only source.
- **Sync goes through `learner_state` only**, key `skill_model`.

## §7 What it replaces, what stays, and the rollout

**Replaces**, once each reader's flag is live:

- the snapshot's `skills` / `weakestSkillIds` in `coachBriefInput`, plus its exam-area rule;
- the daily plan's snapshot (hence `focusSkillIds`), the Focus Token's target and `sessionAbility`;
- Progress's `learn.weakSkills` from `skillProfile`;
- the hand-written skill → structure table and `TOPIC_SKILL_COVERAGE`, for those readers.

**Stays:**

- the evidence log and `buildEvidence` (the observation source);
- `interventionService` problems (a recurring *mistake* is a different concept from a weak skill);
- topic mastery's badge rule and the SM-2 scheduler;
- `examSummary` display and `deriveAbility`'s maths;
- achievements on `beliefSnapshot`;
- `roadmapService`, a known third aggregate.

Deleting the old projection is a later phase and an owner decision.

**Rollout phases:**

| Phase | What | Flag | Simulation test |
|---|---|---|---|
| 1 | model, ingest, shadow writes (no reader change) | — | unit + parity tests |
| 2 | sync (`skill_model`) | `learnerModelSync` | `learnerStateSync.test.ts` |
| 3 | shared seeded harness (`__tests__/simulationHarness.ts`); scenarios A–M unchanged | — | `adaptiveSimulation.test.ts` |
| 4 | Home coach | `learnerModelCoach` | `readerParity.coach.test.ts` |
| 5 | Learn ability, focus skills, registry translation | `learnerModelLearn` | `readerParity.learn.test.ts` |
| 6 | Progress "Grammar to work on" | `learnerModelProgress` | `readerParity.progress.test.ts` |

Every reader-parity test asserts three things:

- agreement with the old reader where the design says they agree, with an "it is not vacuous" check;
- each intended divergence, named and pinned;
- the invariants: the marking level changes nothing, and a practice-only exam changes nothing.

The pinned divergences are: the expiry (§2), the 150-event cap (the model never forgets a heavy user's
early answers), review-gap weighting (§3), exam-area evidence across every counted attempt rather than
only the latest, pronunciation and fluency never becoming a Learn focus or "Grammar to work on" item,
and Progress using the coach's threshold (60%, not 75%).

**With `learnerModelCoach` live, the coach's copy changes.** A weak exam area chosen from the model says
"has been your weakest area across your recent Exam Sims (about N% of its marks; X/Y last time)". It
never says "in your last Exam Sim", because the model weighs every counted attempt.

Flags ship `coming-soon`, and switching a reader `live` is the owner's call. To preview one, pass
`?ff_<key>=live` on a screen that reads that flag. The override is only saved when that flag is
resolved while the query is in the URL: `/progress?ff_learnerModelProgress=live`, not Home.
