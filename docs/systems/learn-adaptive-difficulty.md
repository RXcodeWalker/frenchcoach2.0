# Learn Adaptive Difficulty

> **This is a live specification, not a plan.** Its `§`-numbered sections are cited by
> ~183 sites across the codebase, including shipped UI copy, seven `UNVALIDATED` threshold
> definitions, and a cross-repo trust boundary. **Do not renumber sections.** Any
> "Stage"/"rev" narration below is historical context from when this was authored as an
> implementation plan — it does not indicate the document itself is stale.

> Checked into the repo during Stage 10 (2026-08-20). This document existed only as
> conversational input to Stages 1–9's implementation sessions and was never saved —
> unlike the IGCSE scoring engine, which has `docs/architecture/roadmap.md` as its
> single source of truth. This file closes that gap and is now the durable record,
> including the Stage 8b amendment below (found and fixed during Stage 10).

## Context

Learn is the core practice loop: pick topic → pick difficulty → pick length → answer N
questions by voice → get AI feedback → earn XP. The goal is to make Learn genuinely
adaptive, so it can answer *"what is the most useful French speaking question this learner
should answer next?"* — and, above all, so the learner **trusts** the level they are graded at.

**Decisions taken (user):** backend changes in scope; the difficulty control becomes
*measured level + Aim offset*; all 428 questions get inferred demands plus a review queue;
mid-session adjustment is bounded **and must tell the user when it happens**.

---

## 0. Corrections from the rev-1 review

Rev 1 made five claims that are **false or unsafe**. Each is verified below and fixed in place.

| # | Rev-1 claim | Verified reality | Fix |
|---|---|---|---|
| C1 | "L1 deterministic detectors win for evidence" | `diagnosticEngine.ts:238-300` detectors are **presence-reliable, absence-unreliable**. `hasPastOrFuture` only matches `-er` passé composé + 4 imperfect + 6 future forms — it misses `je suis allé`, `j'ai pris/fait/vu`. `hasSubjunctive` is a 9-form list. **`hasConditional` (`:240`) is outright broken**: `/\b(ais\|ait\|aient\|ions\|iez)\b/` requires a word boundary before `ais`, so it never matches `j'irais`. | L1 becomes **asymmetric** (§9.3): it may assert `met` and `not_attempted`, never `failed` from absence. Absence → `unknown` → **no evidence emitted**. |
| C2 | "append `demand:*` to the existing language event — no extra events" (implied by "no new engine") | `evidenceProjection.ts:288-305`: `result.success` is a **single event-level scalar** (`!anyNodeFailed`) applied by the reducer to *every* id in `targetNodeIds`. Riding along would force demand outcome = grammar outcome. | Demand evidence is a **separate event**. Which forces C3. |
| C3 | (unstated) | `coachStorage.ts:18` `MAX_EVIDENCE_EVENTS = 100`, log is `slice(-100)`, and `rebuildBeliefSnapshot` replays it. A third event per attempt **shrinks the effective grammar history from ~50 attempts to ~33** — a regression to existing coaching. | Raise to **150** (preserves the *attempt* horizon, not the event count); demand events omit the transcript to bound growth. |
| C4 | "no `REDUCER_VERSION` bump needed" | Reduction math is indeed unchanged, but the **snapshot shape** changes, and `coachStorage.ts:53` gates on `reducerVersion === REDUCER_VERSION`. Stale snapshots would silently lack `demands`. | Bump to `evidence-v4`. `REDUCER_FIXTURE_HASH` is unchanged; only the explicit `expect(REDUCER_VERSION).toBe('evidence-v3')` literal in `beliefReducer.version-pin.test.ts:141` updates. |
| C5 | "reuse the existing admin surface for the review queue" | `QuestionList.tsx` bulk-edit is real, but it edits the **Supabase `questions` table**, which Learn never reads — Learn reads the static `src/data/questions.ts`, and `contentClient.isSupabaseAvailable()` (`contentClient.ts:57`) **returns `false` unconditionally**. | Review is **file-based** via `npm run learn:check` + a local review script. No Supabase involvement. |
| C6 | "reuse `MidSessionToast`" | It exists (`src/screens/learn/MidSessionToast.tsx`, used at `Learn.tsx:957`) but is a hardcoded *"Halfway there!"* progress toast with props `{show, questionsCompleted, targetCount, avgScore}` and a fixed `Zap` icon. It also shares `fixed top-20 right-4 z-50` with `StreakToast` — they can already collide. | **Generalise** it (variant/title/body), preserve the halfway behaviour, and add a precedence rule so a difficulty notice never stacks with the other two. |

Claims that **did** verify: `SessionBlend` percentages have no consumer; `targetDifficulty`
has zero writers; `pron:*` isolation works via `const def = SKILL_DEFS[nodeId]; if (!def) continue;`
(`beliefReducer.ts:303-304`) — so `demand:*` is excluded from `skills` **automatically, with no
filtering code**; the reducer is fully generic over node ids (`emptyBeliefState(nodeId)`,
`:185`/`:219`); the review pool behaves as described; feature flags resolve as described;
`backend/` is a separate repo per CLAUDE.md.

**No IRT, no second belief engine, no new framework.** Everything below reuses
`beliefReducer`'s existing Beta-Bernoulli fold, the existing `EvidenceReliability` weighting,
the existing `SKILL_EDGES` prerequisite philosophy, and the existing `hashQuestionSet` /
`resolveQuestionSet` content-identity pattern.

---

## 1. Current Learn architecture (verified)

State machine in one component, `src/screens/Learn.tsx` (1229 lines):
`topics → session_start → question → recording → confirm → feedback → session_summary`.

```
SessionStartScreen.tsx:252  → Learn.tsx:185  startSession
  → decisionEngine.getDailyPlan / recommendationEngine.getActiveRecommendation  (:188-201)
  → sessionBuilder.ts:97 buildSessionQuestions          ← THE ONLY LIVE SELECTOR
       → questions.ts:9247 getTopicQuestions            ← static in-file bank
       → difficultyConfig.ts:100 preferredFirst         ← provably inert (§3.1)
       → sessionBuilder.ts:58 applyDifficultyDistribution  ← fixed 60/30/10
       → reviewPool.ts:102 getEligibleReviewQuestion    ← 1 slot, flag-gated
useRecording.ts:99 start → MediaRecorder + Web Speech API (fr-FR) + 1s timer
Learn.tsx:430 evaluateTranscript
       → [coach]    apiClient.ts:551 streamFeedback → POST /api/feedback/stream
       → catch →    apiClient.ts:317 getAIFeedback  → POST /api/feedback/v3
Learn.tsx:256 _finalizeAnswer → sessionOrchestrator.ts:60 orchestrateAttempt (9 steps)
Learn.tsx:796 handleFeedbackComplete → :714 advanceQuestion → :826 endSession
```

Facts that constrain the design:

- **The question list is fixed at session start** (`Learn.tsx:207-237`); nothing re-selects today.
- **Transcription is browser Web Speech API only**; Learn passes `audioBlob: undefined`
  everywhere, so server Whisper and the multimodal branch are dead for Learn.
- **The belief engine is good and stays untouched**: weighted Beta-Bernoulli, Laplace (1,1)
  prior, `mastery = α/(α+β)`, 14-day half-life,
  `weight = min(reliability × evaluatorCap, 0.80) × sourceWeight × recency`,
  `MIN_RELIABLE_WEIGHT = 0.15`, `confidence = 1 − 1/(1+0.30·W)`.
- **`hasSuccessSignal` already gives us "unknown"**: `beliefReducer.ts:212` skips the α/β
  update entirely when an event has neither `result.success` nor `result.score`. §9.3 exploits
  this rather than adding machinery.
- A prerequisite graph already exists (`SKILL_EDGES`, `isSkillReady`, `applyReadinessSubstitution`).

---

## 2. Current difficulty architecture (verified)

Nine things are called "difficulty" or "level". Six matter here:

| # | Concept | Location | Means | Persisted | → AI | → Coach | → Selection |
|---|---|---|---|---|---|---|---|
| 1 | `Question.difficulty: 1\|2\|3` | `types/index.ts:88` | content abstractness (documented only on the dead `QuestionV2`) | bank + Postgres | ⚠️ sent, dropped | ✗ | ✗ fixed 60/30/10 |
| 2 | `DifficultyTier` | `types/index.ts:382`, `utils/difficultyConfig.ts:4` | **the learner's chosen target** — the only proficiency control | `localStorage['frenchCoach_difficulty']` | ✗ as prose | ✗ | ✗ (§3.1) |
| 3 | `CEFRLevel` + `QuestionV2.supportedLevels` | `types/questions.ts:3,61` | content CEFR | ✗ | ✗ | ✗ | ✗ dead |
| 4 | exam-bank `Difficulty` | `data/exam/bank/types.ts:25` | IGCSE authoring metadata, **separate engine**, "never a rubric signal" | JSON | ✗ stripped by `adapter.ts:16-27` | ✗ | display only |
| 5 | `feedback.cefrLevel` | `types/index.ts:132` | AI's per-answer guess | ✗ cloud-synced | produced by AI | narrative text only | ✗ |
| 6 | `CoachProfile.cefr.estimate` | `types/coach.ts:50` | learner CEFR estimate | localStorage | ✗ | ✗ | ✗ |

No placement test; no server-side proficiency record. The default `intermediate`/A2 applies to
everyone who never opens the picker.

---

## 3. Current weaknesses, ranked by impact

### 3.1 — CRITICAL — the chosen difficulty changes *zero* questions
`preferredFirst(pool, tier)` partitions by difficulty; `sessionBuilder.ts:139-144` immediately
re-sorts the whole array by `a.difficulty - b.difficulty`, destroying the partition; then
`applyDifficultyDistribution` (`:58`) re-buckets by the same key with a hard-coded
**60/30/10** regardless of tier. Since step 3 buckets on what step 1 partitioned on, and order
within a bucket is unchanged, `preferredFirst` **cannot alter the output**. "Expert 🏆 B2" and
"Beginner 🌱 A1" produce an identical list.

### 3.2 — CRITICAL — the AI never learns what the question demanded
The client sends `{ id, text, topicKey, difficulty, modelAnswer, keyVocab }`
(`apiClient.ts:372-390`, `:564-582`). `backend/main.py:2812-2816` keeps only `.text`;
`FeedbackRequest.question` is typed `str` (`:470`). `build_user_prompt` (`:1805-1820`) emits
`QUESTION (French): {req.question}` and nothing else question-derived. Only 3 of 5
`difficultyContext` fields are rendered.

### 3.3 — CRITICAL — difficulty never enters the evidence layer
`EvidenceContext.targetDifficulty` (`types/evidence.ts:39`) has **zero writers and zero
readers**. `evidenceProjection.ts:331-338` has `args.question.difficulty` in scope and drops it.
The Beta model therefore cannot represent *"they can do this, but only when it's easy."*

### 3.4 — HIGH — the coach's `SessionBlend` is computed and ignored
`decisionEngine.ts:226-243` varies `warmup/review/target/stretch/choice` by action type.
`sessionBuilder.ts:115` reads only `focusSkillIds`. The five percentages have no consumer.

### 3.5 — HIGH — question metadata is regex-inferred at runtime, unvalidated, self-confirming
`questionMetadata.ts` infers `grammarFocus` from the **model answer's** surface forms;
`supportedLevels` is a pure restatement of `difficulty`; the `isPastPaper` branch is dead
(`grep -c` → 0); `levelsCurated: false` for 100% of questions forever. No validation exists.

### 3.6 — HIGH — the multi-dimensional selector is dead code
`sessionBuilder.ts:302-406` (`buildSession`) has zero call sites; `contentClient` is only
reachable from it and its Supabase path is hard-disabled; `EvaluationContext`/`targetLevel`
has zero references.

### 3.7 — HIGH — `CoachProfile.cefr` is circular and inflationary
`coachProfileService.ts:162-168`: `deriveCEFR(avgScore)` → `≥9.0 C1 … ≥4.0 A2`. But `avgScore`
comes from grading against the tier the learner chose, and the beginner rubric says *"correct
present-tense sentences … are sufficient for a strong score."* Pick Beginner → score high → be
told C1. The estimate is then read by nothing. `MasteryJourney.tsx:14-22` maps XP straight to
CEFR; `progress/TimelineItem.tsx:126` renders a hardcoded `'B2'`.

### 3.8 ⚠️ HIGH (new, from review) — the deterministic detectors are weaker than they look
`diagnosticEngine.ts:238-300`. Presence detection is sound (closed marker lists); **absence
detection is not**, and `hasConditional` (`:240`) never fires at all (C1). Anything built on
"the detector said no" would manufacture false failures. This reshapes §9.3 entirely.

### 3.9 MEDIUM — the one place tier bites is a penalty-only gate
`detectAvoidance` applies the learner's *self-declared* target with no notion of what the
question invited: an Expert-tier learner is flagged for missing the subjunctive on a question
that never asked for one.

### 3.10 MEDIUM — the offline evaluator ignores difficulty (`coachService.ts:725`)

### 3.11 MEDIUM — the bank is lopsided; the advanced topics are empty
**428 questions** (109 d1 / 209 d2 / 110 d3), 16 topics. 8 core topics carry 41–77 each.
**The 8 "advanced" topics carry exactly 1 question each** (7 of them d3).
`DAILY_CHALLENGES` is an untyped, zero-consumer dead export (15 entries, 8 verbatim duplicates).

### 3.12 LOW — smaller confirmed bugs found en route
`streamFeedback` never sends `enginePreference` in the body while the backend reads
`payload["model"]` — **the engine selector is inert on the default streaming path**
(`apiClient.ts:564-582` vs `main.py:2999`) · re-evaluate grades `recording.transcript` not the
confirmed transcript (`Learn.tsx:644`) · "Random Question" ignores `visibleTopics`
(`TopicGrid.tsx:83`) · `SessionSummary`'s XP tile shows the un-boosted figure ·
`ActiveSession.totalWords` never written · `full_topic` has no UI control · two different
`CEFRLevel` unions share a name.

---

## 4. Product diagnosis

Four severed wires, all on one axis — **difficulty is never carried forward as data.**

```
USER PROFILE ────────► SESSION TARGET ────────► QUESTION SELECTION   §3.1
QUESTION DEMANDS ────────► AI EVALUATION                          §3.2
AI EVALUATION ──────────► EVIDENCE SIGNALS                       §3.3
COACH INTERPRETATION ────────► NEXT QUESTION SELECTION            §3.4
```

The UI offers four levels with confident CEFR labels; behind them the learner gets the same
questions, a grade whose only level-awareness is a prose paragraph, and then a C1 badge earned
by picking Beginner (§3.7). Restoring trust needs three things, and they are the design's spine:

1. The level visibly changes **what you are asked**.
2. Grading references **this question's demands**, resolved from a source the client cannot forge.
3. Every level claim is **derived from evidence and shown with its confidence** — and when
   evidence is thin, the app says so instead of asserting a band.

---

## 5. Target architecture

Two ideas do the work.

**(a) Demands, not a difficulty number.** A question carries a validated description of what it
requires the learner to *do*; a pure function turns that into `demandScore` (0–10) and a display
`demandLevel`. Authors never assert a level — so mislabelling is detectable.

**(b) A second belief *namespace*, not a second belief engine.** Demand mastery lives in
`demand:*` nodes folded by the **same** `beliefReducer`, following the `pron:*` precedent.
`snapshot.skills` stays byte-identical.

```
      QuestionDemands ──deriveDemandScore()───► demandScore 0–10
              │ (resolved server-side by questionId + demandsVersion — §9.2)
              ▼
 LearnerAbility ───► SessionTarget ───► SLOT PLAN ───► SELECTOR ───► Question + SelectionReason
  (§6 formula)      (+ Aim offset)   (SessionBlend)     ▲                    │
        ▲                                               │ coach focus /      ▼
        │                                               │ activeProblem / review pool
        │                                                                TRANSCRIPT
        │              ────────────────────────────────────────────────────┤
        │              ▼                                                      ▼
        │   L1 evaluateDemandSatisfaction()          L2 AI grading (demands in prompt)
        │      ASYMMETRIC: met / not_attempted / unknown       prose + scores
        │              │                                                │
        │              │  L3: L1 met|not_attempted are authoritative;   │
        │              │      unknown → LLM read at reduced reliability;│
        │              │      disagreement → telemetry ──────────────────
        │              ▼
        │   EvidenceEvent (separate, targetNodeIds: ['demand:justify'])
        │   context: { targetDifficulty, questionDemandLevel, questionDemandScore, demandProvenance }
        │              │
        └──── beliefReducer (unchanged math) ───► skills (byte-identical) + demand:* states
                                                         │
                              projectDemandBeliefs() ────┴───► snapshot.demands (NEW)
                                                                │
                                          midSessionAdjust() ────  (bounded, user-notified)
```

The three-layer shape mirrors the audited IGCSE architecture without importing it — that engine
is exam scoring, lives in `src/domain/igcse/`, runs offline-only in `scripts/scoring/`, and must
stay separate (CLAUDE.md hard constraint #1). An architectural guard test enforces no import.

---

## 6. Difficulty model — fully specified

| Concept | Scale | Owner |
|---|---|---|
| Question demand | `demandScore` 0–10 → `demandLevel` A1–B2 | the question |
| Learner ability | `abilityScore` 0–10 + `overallConfidence` 0–1 + per-demand mastery | the learner |
| Aim | `−1.0 / 0 / +1.0` | the learner (UI), replaces `DifficultyTier` |
| Session target | `clamp(abilityScore + aim, 0, 10)` | the session |

### 6.1 Anchors

Each `CognitiveDemand` has a fixed anchor — the `demandScore` a learner who has *mastered* that
demand can be expected to handle:

```
describe 2.0 · explain 4.0 · justify 6.0 · compare 6.5 · hypothesize 8.0
```

They form a natural prerequisite order, mirroring the existing `SKILL_EDGES` philosophy.

### 6.2 `deriveAbility(snapshot)` — the exact deterministic formula

```
MIN_DEMAND_CONFIDENCE = 0.20   // below this a node contributes nothing
RELIABLE_CONFIDENCE   = 0.50   // below this a node cannot cap or floor
MASTERY_WEAK          = 0.40
MASTERY_STRONG        = 0.75
SPREAD                = 3.0

// 1. Per-demand evidence point
for each d in the 5 demands:
    b = snapshot.demands['demand:' + d]
    if b is absent or b.confidence < MIN_DEMAND_CONFIDENCE:  skip d
    evidence_d = anchor(d) − (1 − b.mastery) × SPREAD        // clamp 0..10
    w_d        = b.confidence

// 2. Confidence-weighted mean
if Σ w_d == 0:  return coldStart()                            // §6.4
raw = Σ (w_d × evidence_d) / Σ w_d

// 3. Prerequisite CAP — a reliably weak LOW demand bounds everything above it
weakest = the d with the LOWEST anchor among { d : w_d ≥ RELIABLE_CONFIDENCE and mastery_d < MASTERY_WEAK }
cap     = weakest ? anchor(weakest) + 0.5 : +∞

// 4. FLOOR — a reliably strong HIGH demand prevents underestimation
strongest = the d with the HIGHEST anchor among { d : w_d ≥ RELIABLE_CONFIDENCE and mastery_d ≥ MASTERY_STRONG }
floor     = strongest ? anchor(strongest) − 0.5 : −∞

// 5. Combine. CAP WINS on conflict — conservatism.
abilityScore    = clamp(min(max(raw, floor), cap), 0, 10)
overallConfidence = clamp(Σ over all 5 demands of confidence_d / 5, 0, 1)   // absent counts 0
measuredAnswers   = Σ over demand:* nodes of rawEvidenceCount
```

**Why cap-wins.** A reliably weak `describe` (anchor 2.0) alongside a strong `hypothesize`
reading is far more likely to be noise in the latter than genuine B2 ability. The strong demand
is not discarded — it stays visible in `snapshot.demands` and still pulls selection upward via
`demandCoverageGap`. This is the "average must not hide a critical weakness" requirement, and it
is directionally consistent with `isSkillReady`'s existing prerequisite gate.

**Load-bearing implementation note (added Stage 10):** the cap/floor logic above can only ever
bind on a demand node whose `mastery` has genuinely moved away from the 0.5 Laplace prior. Under
a *pure* L1 pipeline (§9.3), no code path sets `result.success: false` on a `demand:*` node —
`not_attempted` is avoidance-only, `unknown` emits nothing. Mastery could therefore never fall
below 0.5, permanently disabling the cap. **This gap was found and fixed as Stage 8b — see the
amendment at the end of this document.**

Decay is inherited free: every `mastery` and `confidence` already comes from the
14-day-half-life fold. No separate decay term.

### 6.3 Ability → displayed level, and the confidence gate

```
demandScoreToLevel:  <3.0 A1 · <5.0 A2 · <7.5 B1 · ≥7.5 B2
```

Display is **gated on `overallConfidence`** — the app never shows a precise band it has not earned:

| `overallConfidence` | UI |
|---|---|
| `< 0.25` | **No band.** *"Still getting to know your level."* |
| `0.25 – 0.50` | *"Around B1"* + a low-confidence indicator |
| `> 0.50` | *"B1"* plainly |

The supporting caption is **`measuredAnswers`**, which is directly available as
`Σ rawEvidenceCount` over `demand:*` nodes. Rev 1's *"based on your last 12 answers"* was not
supportable (events decay and the log is capped) — the honest string is
**"from N answers we could measure"**.

### 6.4 Cold start and migration (existing users)

Historical evidence contains **no `demand:*` nodes**, so demand beliefs start empty for everyone.
That is correct and must be handled explicitly:

```
coldStart():
    seed = migrated old tier → beginner 2.5 · intermediate 4.5 · advanced 6.5 · expert 8.0
           (absent → 4.5, matching today's default)
    return { abilityScore: seed, overallConfidence: 0, measuredAnswers: 0, source: 'seeded' }
```

- `frenchCoach_difficulty` is **read once** and mapped to the nearest `Aim` (`beginner` →
  Comfortable, `expert` → Push, otherwise Balanced) plus the seed score, then the key is left in
  place for one release for rollback safety.
- With `overallConfidence: 0` the UI shows **no band** (§6.3). The seed silently shapes question
  selection but is never presented as a measurement.
- Old evidence **cannot** contribute to demand ability — it has no demand nodes. Stated in the
  UI as *"still getting to know your level"*, not hidden.
- The seed decays out naturally: as soon as any demand node clears `MIN_DEMAND_CONFIDENCE`, the
  weighted mean takes over and the seed is no longer consulted.

### 6.5 Ability movement guards

Ability rises only when: `overallConfidence ≥ 0.5` **and** the rise is supported by ≥3 distinct
questions **and** ≥2 distinct sessions at or above the new level **and** at most one sub-band per
3 sessions. Falls are ungated (safety) but bounded by `MAX_EVENT_WEIGHT = 0.80` and the prior.
All constants live in `src/domain/learn/ability/thresholds.ts` marked `UNVALIDATED`, following
the existing `practiceThresholds.ts` convention.

---

## 7. Question model

```ts
// src/domain/learn/demand/types.ts
export type CognitiveDemand = 'describe' | 'explain' | 'justify' | 'compare' | 'hypothesize';
export type DemandTimeFrame = 'present' | 'past' | 'future' | 'conditional';
export type ResponseLoad    = 'short' | 'developed' | 'extended';   // ~15 / ~40 / ~70+ words
export type LexicalReach    = 'everyday' | 'topical' | 'abstract';
export type LearnStructure =
  | 'opinion' | 'justification' | 'comparison' | 'negation'
  | 'perfect' | 'imperfect' | 'near-future' | 'simple-future' | 'conditional' | 'subjunctive';
export type DemandProvenance = 'inferred' | 'reviewed' | 'authored';

export interface QuestionDemands {
  cognitiveDemand: CognitiveDemand;
  timeFrames: DemandTimeFrame[];          // ≥1
  structures: LearnStructure[];
  responseLoad: ResponseLoad;
  lexicalReach: LexicalReach;
  /** English. What a complete answer MUST contain. Prompt material for L2 ONLY — never L1-checked. */
  sufficientAnswer: string;
  provenance: DemandProvenance;
  inferenceConfidence?: number;           // present only when provenance === 'inferred'
}
```

`demandLevel` is **not a field** — it is `demandScoreToLevel(deriveDemandScore(demands))`:

```
base        describe 2.0 · explain 4.0 · justify 6.0 · compare 6.5 · hypothesize 8.0
+1.0        timeFrames includes 'conditional'
+0.5        ≥3 distinct timeFrames
+0.75       responseLoad === 'extended'    (−0.75 if 'short')
+0.25 each  structures in {subjunctive, conditional, comparison}, cap +0.75
+0.25       lexicalReach === 'abstract'    — capped; cannot alone lift a question above B1
clamp 0–10
```

The lexical cap is the **false-difficulty guard**: obscure vocabulary can nudge within a band,
never manufacture a B2.

`Question` gains one optional field, `demands?: QuestionDemands`, so all 428 existing records
stay valid and every current call site compiles unchanged.

---

## 8. Adaptive selection — fully specified

### 8.1 Slot plan (finally consumes `SessionBlend`)

`planSlots(sessionBlend, sessionTarget, count)` allocates by the blend percentages
(`decisionEngine.ts:226-243`, currently discarded), largest-remainder rounding for determinism:

| Slot | Band | Purpose |
|---|---|---|
| `warmup` | `T−2.5 … T−1.0` | start with a win |
| `review` | band ignored | filled from `reviewPool.getEligibleReviewQuestion` |
| `target` | `T−0.5 … T+0.5` | the working level |
| `stretch` | `T+0.75 … T+2.0` | deliberate challenge |
| `choice` | `T−1.5 … T+1.5` | variety / coverage |

**Stretch rule (resolves the rev-1 contradiction).** Sessions of ≥5 questions **plan** at least
one stretch slot. A stretch slot may only be filled by a question with
`provenance !== 'inferred'`. **If no trusted candidate fits the stretch band, the slot is
downgraded to `target`** and the session simply has no stretch that day. One unambiguous rule;
the quota never forces an inappropriate challenge, and the system never deliberately challenges
a learner on a guessed label.

*Consequence, stated plainly:* until review produces non-inferred questions there is **no
stretch and no upward adaptation**. A first review batch is therefore a **blocking prerequisite**
for the flag flip (§16 Stage 9).

Sessions of `single` (1 question) get a single `target` slot; `full_topic` has no UI entry point
and is left on the legacy path.

### 8.2 Candidate scoring — every term defined

```
score(q, slot) = 3.0·bandFit + 2.0·coachFocusMatch + 1.5·demandCoverageGap
               + 1.0·exposureFreshness + 0.5·provenanceTrust − 1.0·sessionRepetition
```

```
bandFit(s,[lo,hi]) = 1                        if lo ≤ s ≤ hi
                   = max(0, 1 − (lo−s)/2.0)   if s < lo
                   = max(0, 1 − (s−hi)/2.0)   if s > hi
coachFocusMatch(q) = 1 if q.demands.structures ∩ focusSkillIds ≠ ∅, or q.cognitiveDemand
                       matches an active demand problem; else 0
demandCoverageGap(q) = 1 − confidence(demand node of q.cognitiveDemand)    // absent → 1.0
exposureFreshness(q) = 1.0 if unseen, else 0.2
provenanceTrust(q)   = authored 1.0 · reviewed 0.7 · inferred 0.3
sessionRepetition(q) = 1 if q.cognitiveDemand already used this session, else 0
```

**`exposureFreshness` is binary on purpose.** `TopicMasteryEntry.uniqueQuestionsAnswered`
(`types/index.ts:645`) is a `string[]` with **no timestamps**, so "seen 7 days ago" vs "seen 6
months ago" is not derivable. Rev 1's graded recency was unimplementable. The
"come back to this" case is already handled with real timestamps by the review pool.

Every term is in `[0,1]` and weights are fixed, so `score ∈ [−1.0, 8.0]`. **No normalisation.**
Ties break by `(score desc, fnv1a(q.id) asc)` — reusing the FNV-1a helper already in
`evidenceProjection.ts` — so selection is fully reproducible in tests.

### 8.3 Fill order, exhaustion, and duplicates

Slots are filled in a **fixed order**, hardest constraint first, so the outcome is deterministic:
`review → stretch → target → warmup → choice`.

Candidate pool per slot: questions of **this topic only** (no cross-topic borrowing — that would
break topic mastery and the learner's explicit choice), carrying `demands`, minus a `chosenIds`
`Set<string>` threaded through the whole fill.

Escalation ladder when nothing scores above zero:

1. Widen the band by ±1.0, retry.
2. Drop the `bandFit` term; rank on the remaining terms.
3. Allow questions in the historical `seen` set.
4. Allow questions **without** `demands` (legacy path, `demandScore` treated as unavailable —
   `bandFit` omitted).
5. **Return fewer questions than requested**, and set `targetCount` to the actual length.
   Never duplicate, never throw, never pad with a repeat.

Questions lacking `demands` never occupy a `stretch` slot (they cannot be shown to be a stretch).

### 8.4 Mid-session adjustment — bounded, safe, and announced

`midSessionAdjust(session, history)` — pure, **at most one per session**, never before question 3.

- **Ease** — 2 consecutive attempts with score < 5 *or* zero demands met → remaining `stretch`
  slots become `target`; remaining `target` bands drop 1.0.
- **Raise** — 3 consecutive attempts with score ≥ 8 *and* all measurable demands met → one
  remaining `target` slot becomes `stretch` (subject to the §8.1 provenance rule).

Verified constraints against the real state machine (`Learn.tsx:207-237`, `:366-403`, `:714`):

- Only entries with `status === 'pending'` **and index > `currentIndex`** may be replaced.
  Answered entries carry `attempts` / `bestScore` that `SessionSummary` and topic mastery read.
- **`targetCount` never changes** — replacement only, same length, so `SessionProgressBar` stays honest.
- The review slot (`isReview === true`) is **never** replaced — the 24h + 1-session review
  contract must not be undone.
- The same `chosenIds` set (present + already-answered ids) is threaded through, so no duplicate
  and no re-presentation of an answered question.
- `topicKey` is unchanged.
- **Fallback:** if a slot's adjusted band yields no candidate, that slot is left as-is. If **no**
  slot actually changed, the adjustment is a no-op and **the toast does not fire** — the app never
  announces a change that did not happen.

**Notification (user requirement).** `MidSessionToast` is **generalised** — it gains
`variant: 'progress' | 'difficulty-up' | 'difficulty-down'` with title/body, preserving the
existing "Halfway there!" behaviour and its props. Because `MidSessionToast` and `StreakToast`
share `fixed top-20 right-4 z-50` and can already collide, a single precedence rule is added:
**at most one toast is shown at a time; a difficulty notice outranks progress and streak**, and
the suppressed one is dropped rather than queued (a stale "halfway" message helps no one).

> ⬇️ *Easing off — the next few questions sit right at your level.*
> ⬆️ *Stepping up — adding a question that pushes you a bit.*

---

## 9. AI grading integration

### 9.1 The trust boundary — the client cannot declare its own demands

The client must not be able to say *"this question only requires 'describe', grade me
accordingly."* Reusing the existing `hashQuestionSet` / `server/resolveQuestionSet.ts` pattern
(backend-published source, in-repo fallback, **hash-guarded**):

1. `src/data/learn/demands/*.json` is the source of truth (checked in, reviewed via `learn:check`).
2. A build step emits `src/data/learn/demandsManifest.ts` = `{ demandsVersion, byQuestionId }`,
   where `demandsVersion` is a SHA-256 of the canonicalised corpus.
3. **The same JSON files are copied into `backend/data/learn/`** and loaded at startup into a
   dict keyed by `questionId`, with the backend computing its own hash the same way.
4. The client sends **`questionId` + `demandsVersion` only — never the demand fields.**
5. The backend resolves demands from its own copy. On unknown id **or** version mismatch it
   **omits the demands section entirely** and returns `demandsResolved: false`.
6. The client, on `demandsResolved: false`, records evidence at reduced `assessmentConfidence`
   and shows nothing that claims demand-awareness.

Backward compatible in both directions: an old client sends no `demandsVersion` → no section →
today's behaviour; a new client against an old backend gets `demandsResolved: false` and degrades
honestly. A CI check asserts the two corpora hash identically.

### 9.2 What the backend renders (`backend/main.py`)

`_extract_question_text` (`:2812`) keeps a structured question (str-accepting shim retained for
`/api/feedback` and `/v2`). `build_user_prompt` (`:1726-1820`) gains, before `difficulty_section`:

```
QUESTION DEMANDS
- What the learner must do: justify an opinion with at least two supporting reasons
- Time frames the question invites: present, past
- Structures it invites: opinion, justification
- Expected developed answer: about 40-70 words
- Demand level: B1   |   Learner's session target: B1

DETERMINISTIC SIGNALS (already measured — do not contradict these)
- justification markers: present    - connectors: absent    - word count: 34
- past tense: not measurable

A complete answer must: state a preference, give two distinct reasons, and refer to a
past experience.
```

`SYSTEM_PROMPT` (`:1396-1503`) gains four **optional** response fields:
`answered_the_question`, `demands_met`, `demands_missed`, `difficulty_fit`.
A `LEARN_PROMPT_VERSION` constant is added and snapshot-asserted, mirroring
`SCORING_PROMPT_VERSION`'s discipline (`judgement/prompt.ts:126-135`) and extending the existing
`backend/tests/test_difficulty_context.py`.

`difficultyConfig.coachingRubric` — the four hand-written paragraphs — is **retired**: it is
exactly the "grade this as B2" instruction the brief calls insufficient. `coachingTone` stays.

Per CLAUDE.md: verify `git -C backend status` is clean first; commit and push `backend/` separately.

### 9.3 L1 is **asymmetric** — the correction that matters most

Rev 1 said "L1 wins". Verified (§3.8), the detectors are presence-reliable and
absence-unreliable, and one is broken. So `evaluateDemandSatisfaction` returns **three** states:

| State | When | Evidence effect |
|---|---|---|
| `met` | a closed-list marker was **found** (`hasJustification`, `hasOpinion`, `hasConnectors`, `hasPerspective`, `hasSubjunctive`, `hasPastOrFuture`) or `wordCount` clears the `responseLoad` threshold | authoritative success |
| `not_attempted` | `wordCount < 0.4 ×` the `responseLoad` minimum | authoritative — **records avoidance, never failure** |
| `unknown` | no marker found, and the detector cannot rule the demand out | **no evidence emitted at all (L1 alone) — see Stage 8b amendment for the L2 gap-fill** |

Classification of what the existing detectors can and cannot establish:

| Requirement | Presence | Absence | Verdict |
|---|---|---|---|
| word count / `responseLoad` | exact | exact | **both directions authoritative** |
| justification markers | reliable | *unreliable* — one can justify without `parce que` | `met` or `unknown` |
| opinion markers | reliable | fairly reliable | `met` or `unknown` |
| connectors, perspective | reliable | reliable (closed discourse-marker sets) | `met` or `unknown` |
| past/future tense | reliable | **unreliable** — misses `être`-auxiliary and irregular participles | `met` or `unknown` |
| subjunctive | reliable | **unreliable** — 9-form list | `met` or `unknown` |
| conditional | **broken** (`:240`) | broken | `unknown` until fixed |
| *"at least two distinct reasons"* and every other countable/semantic clause in `sufficientAnswer` | — | — | **never L1-checked** |

Therefore **`sufficientAnswer` is prompt material for L2 only** — it is never turned into a
deterministic verdict. Rev 1 implied otherwise; that was unsound.

**How `unknown` produces no evidence, with zero new machinery.** `beliefReducer.ts:212` already
skips the α/β update when an event carries neither `result.success` nor `result.score`
(`hasSuccessSignal`). So an all-`unknown` attempt simply emits **no demand event**, and a mixed
attempt emits one carrying only the resolved demands. This is the existing gate, used as designed.

**L2 fills only the gaps.** Where L1 says `unknown` and the LLM asserts a demand outcome, that
outcome may be recorded — as a *separate, lower-reliability* contribution
(`evaluator: 'llm'` already caps at 0.85, with `assessmentConfidence` further reduced). It can
never override an L1 `met`/`not_attempted`. Disagreements emit
`demand_judgement_disagreement` telemetry — the calibration signal for a later pass.

> **Stage 10 amendment:** this paragraph describes the *intended* design. As originally
> implemented in Stage 8, `buildDemandEvidence` (`evidenceProjection.ts`) had no code path
> realizing it at all — `unknown` unconditionally returned `[]`. Fixed as Stage 8b; see the
> amendment section at the end of this document. The `demand_judgement_disagreement` telemetry
> event itself remains unimplemented (out of scope for 8b, which only needed the gap-fill event
> to exist so §6.2's cap/floor and §11 example C become reachable).

**Bug to fix explicitly and separately:** the `hasConditional` regex at
`diagnosticEngine.ts:240` never matches. It currently feeds `detectAvoidance` — real evidence,
so fixing it is a behaviour change and gets its own commit and test, not a silent ride-along.

---

## 10. Coach integration

| Layer | Change |
|---|---|
| **Evidence** | `EvidenceContext` gains `targetDifficulty` (finally populated), `questionDemandLevel`, `questionDemandScore`, `demandProvenance`, `demandsResolved`. A **separate** event per attempt (forced by C2) carries `targetNodeIds: ['demand:justify', …]` with its own `result.success` from L1. `reliability.taskValidity` scales with provenance (authored 1.0 / reviewed 0.85 / inferred 0.6) and drops further when `demandsResolved === false`. The event omits `observation.transcript` (the language event already stores it) to bound log growth. |
| **Log capacity** | `MAX_EVIDENCE_EVENTS` 100 → **150**, preserving the ~50-attempt horizon that today's 100 gives at 2 events/attempt (C3). |
| **Beliefs** | `beliefReducer` folds `demand:*` with the **same** math, unchanged. `projectEvidenceBeliefSnapshot` already drops them (`SKILL_DEFS[nodeId]` miss at `:303-304`), so `skills` is byte-identical **with no filtering code**. A new pure `projectDemandBeliefs(beliefState)` produces `snapshot.demands`, called from `beliefProjectionService.rebuildBeliefSnapshot`. `REDUCER_VERSION` → `evidence-v4` (C4); `REDUCER_FIXTURE_HASH` unchanged. |
| **Problems** | `interventionService.detectProblem` gains a demand dimension: 2+ failures of the same `CognitiveDemand` in 7 days → `LearningProblem` with `nodeId: 'demand:justify'`. Existing 24h cooldown, severity, and `active→monitoring→resolved` machinery reused unchanged. |
| **Interventions** | Demand problems have no MicroDrill content, so they route to **selection**: `demandCoverageGap` is boosted for that demand and it is pinned into `target` slots for 3 sessions. |
| **Recommendations** | `CoachRecommendation` / `CandidateAction` gain `targetDemand?: CognitiveDemand`. `buildSessionBlend`'s `stretchPct` finally has an effect. |
| **Profile** | `CoachProfile.cefr.estimate` reads `deriveAbility` instead of `deriveCEFR(avgScore)`, killing §3.7's inflation loop. |

Grammar beliefs and demand beliefs live in different namespaces, which is precisely what lets the
coach say *"you slip specifically when asked to justify at B1"* rather than *"you make mistakes"*.

---

## 11. Adaptive behaviour examples

**A — repeated success on easy questions.** Every ≥5-question session plans a stretch slot, so
B1 questions appear (once trusted ones exist). Success there raises `demand:explain`; the §6.5
gates then lift ability one sub-band. *No stuck-too-easy.*

**B — repeated failure on hard questions.** Two sub-5 scores → `midSessionAdjust` eases the
remaining slots and toasts. Between sessions the §6.2 **cap** binds ability to the weak demand's
anchor + 0.5. Warmup slots guarantee a comfortable question next session.

**C — strong grammar, weak justification.** `skills.tense_past` 0.85 vs `demands.justify` 0.35.
Separate namespaces, so the overall target is not lowered wholesale; instead the §6.2 cap holds
ability near `anchor(justify)+0.5 = 6.5`, `demandCoverageGap` pins `justify` into target slots,
and a `demand:justify` problem opens. *The exact distinction the brief asks for.*

> **Stage 10 amendment:** `demands.justify` reaching 0.35 (below the 0.5 Laplace prior) requires
> a Beta-model failure on that node, which only Stage 8b's L2 gap-fill can produce under the
> currently-implemented pipeline — see the amendment section.

**D — one good answer, then several poor ones.** The Laplace (1,1) prior plus
`confidence = 1 − 1/(1+0.30·W)` yields ~0.23 confidence after one event — below both
`RELIABLE_CONFIDENCE` (0.5) and the §6.5 rise gate. No mastery from one success.

**E — a hard question answered well.** The event carries `questionDemandScore: 8.0` against
`targetDifficulty: 'B1'` on `demand:hypothesize` — the **only** way that node gains evidence.
A hard success is structurally more informative than an easy one, with no IRT term invented.

**F — a question mislabelled B2.** Authors cannot assert a level. A `describe` question with
`lexicalReach: 'abstract'` maxes at 2.25 — A1. `level-not-carried-by-vocabulary` warns;
`demand-level-mismatch` errors if a checked-in level disagrees with the derived one.

**G — same score, different demands.** Two 6.25 questions hit `demand:justify` and
`demand:compare` respectively — two independent belief nodes.

**H — a brand-new user.** Zero demand evidence → `coldStart()` seeds from the migrated tier with
`overallConfidence: 0`. The UI shows **no band**, only *"Still getting to know your level."*
Selection still works, driven by the seed.

**I — an all-`unknown` attempt.** Learner answers *"J'aime le sport. C'est bien."* on a `justify`
question: no `parce que`, so justification is `unknown`; word count clears nothing. **No demand
event is emitted** and no belief moves — instead of a fabricated failure.

---

## 12. Question-authoring contract

Modelled on the existing S11 workflow (`docs/guides/content-authoring.md`,
`src/data/exam/bank/{validate,lint,corpusLint}.ts`) — same skeleton → draft → check → gates
discipline, separate types so the exam bank gains no dependency.

`src/data/learn/demands/<topic>.json`, `schemaVersion: 'learn-demands-v1'`, one entry per
question id with the §7 fields plus a `review: { status, reviewedBy, reviewedAt }` block.

**Rules a generating model must follow** (`docs/guides/learn-demands.md`):

1. `cognitiveDemand` describes what the *question wording* forces, not what a good answer could
   optionally include. *"Parle-moi de ton école"* is `describe` even if a strong answer justifies.
2. `timeFrames` lists what the wording **cues** — never tag `past` on a present-tense question
   with no past cue (mirrors exam guide §8).
3. `structures` must be what the text genuinely elicits — answer it yourself in French and check.
4. `sufficientAnswer` is English, 1–2 sentences, with **countable** requirements ("at least two
   reasons"). It is shown verbatim to the grader and is never machine-checked.
5. **Never assert a CEFR level.** To make a question harder, raise the cognitive demand or the
   time frames — not the vocabulary.
6. `responseLoad` must match `cognitiveDemand`: `describe` may be `short`; `justify`, `compare`
   and `hypothesize` never are.

**Deterministic validation** — `npm run learn:check`:

| Rule | Severity | Fires when |
|---|---|---|
| `unknown-question-id` | error | id not in `QUESTIONS` |
| `missing-time-frame` | error | `timeFrames` empty |
| `demand-level-mismatch` | error | a checked-in level ≠ the derived level |
| `short-load-on-high-demand` | error | `justify`/`compare`/`hypothesize` with `responseLoad: 'short'` |
| `sufficient-answer-too-vague` | error | < 8 words, or matches a banned-phrase list |
| `level-not-carried-by-vocabulary` | warn | `lexicalReach: 'abstract'` is the only above-baseline signal |
| `time-frame-not-cued` | warn | a tagged frame has no cue word in the question text |
| `structure-not-elicited` | warn | structure tagged but no matching pattern in the question text |
| `topic-demand-monotony` | warn | a topic covers < 3 distinct `cognitiveDemand` values |
| `not-approved` | error (suppressed by `--draft`) | `review.status !== 'approved'` |
| `corpus-hash-drift` | error | `src/data/learn/` and `backend/data/learn/` hash differently (§9.1) |

Scripts: `learn:skeleton -- <topic>`, `learn:check [--draft]`, `learn:status`, `learn:review`.

---

## 13. Migration of the 428 existing questions

Per the decision: **infer all 428, then review.** Safety comes from inferred labels *weighing
less everywhere*, not from withholding them.

### 13.1 Breaking the circularity (review point 2)

Rev 1 derived `responseLoad` and `lexicalReach` from `difficulty: 1|2|3` — which would have
rebuilt the old labels inside the new system. Both load-bearing dimensions are now derived **from
the question itself**, with `difficulty` demoted to a tie-breaker:

| Field | Primary, question-derived signal | Role of old `difficulty` |
|---|---|---|
| `cognitiveDemand` | interrogative patterns: `Pourquoi` → explain · `à ton avis / penses-tu` → justify · `préfères-tu … ou / compare` → compare · `Si tu` → hypothesize · else describe | none |
| `timeFrames` | cue-word patterns over the question text (same approach as the tested S2 time-frame detector) | none |
| `structures` | `inferGrammarFocus` patterns matched against **`question.text`**, not `modelAnswer` (fixes §3.5) | none |
| `responseLoad` | (a) floor from `cognitiveDemand`; (b) **the `hint` enumerates what to cover** — *"size, subjects, teachers, uniform, facilities"* is 5 countable items: ≥4 → extended, 2–3 → developed, ≤1 → short; (c) multi-goal question text (two interrogatives, "et pourquoi") → +1 step | **tie-breaker only**, when (a) and (b) disagree |
| `lexicalReach` | abstract-noun morphology in the question text (`-tion, -ité, -isme, -ance, -ence`) + a small abstract-topic keyword list | weak corroboration only |
| `sufficientAnswer` | seeded from `question.hint` (English, present on all 428) | none |

`cognitiveDemand` (2.0–8.0) and `timeFrames` (up to +1.5) already dominate `deriveDemandScore`,
while `responseLoad` contributes ±0.75 and `lexicalReach` at most +0.25 — so even residual
`difficulty` influence is bounded by construction.

### 13.2 Four safety valves

1. `reliability.taskValidity` ×0.6 for inferred — guessed labels move beliefs ~40% less.
2. `provenanceTrust` in the selector prefers reviewed/authored.
3. **Stretch slots exclude inferred entirely** (§8.1) — one unambiguous rule.
4. `inferenceConfidence < 0.5` → `cognitiveDemand` falls back to `describe` (the conservative
   floor) and the item is queued for review.

### 13.3 Review, corrected (C5)

The admin surface edits Supabase rows Learn never reads, and `contentClient.isSupabaseAvailable()`
returns `false` unconditionally — so review is **file-based**:

- `npm run learn:review -- --topic school --sort confidence` prints a Markdown sheet
  (mirroring `authoring:review-sheet`) of question text, inferred demands, derived level, and
  confidence, for a human to correct in the JSON.
- Approving flips `provenance: 'inferred' → 'reviewed'` and stamps the `review` block.
- `npm run learn:status` reports the provenance split and demand coverage per topic.

Priority: (a) low-confidence `cognitiveDemand`; (b) anything deriving ≥7.0 (they gate stretch);
(c) the 8 core topics before the advanced ones.

### 13.4 The unusable topics

The 8 advanced topics carry **1 question each** — no metadata fixes that. Put them behind the
existing `coming-soon` feature-flag state until authored, and delete the dead `DAILY_CHALLENGES`
export. Small, honest, separate.

---

## 14. UX changes

**1. Measured level + Aim**, replacing the difficulty grid (`SessionStartScreen.tsx:189-216`):

```
┌────────────────────────────────────────────┐
│ Your level   B1   ─────                  │
│ from 14 answers we could measure         │
│                                          │
│ Today's aim                              │
│ [ Comfortable ]  [ Balanced ]  [ Push ]  │
│                                          │
│ Balanced — mostly at your level, with a  │
│ question or two that stretch you.        │
└────────────────────────────────────────────┘
```

Confidence-gated per §6.3 — below 0.25 the band is replaced by *"Still getting to know your
level"*, which is what every existing user sees on day one (§6.4).

**2. "Why this question"** — a one-line tappable disclosure on `QuestionCard.tsx` from
`SelectionReason.explanation`. Highest trust-per-pixel item in the plan.

**3. Demand chip replaces the difficulty chip** (`QuestionCard.tsx:50-56`, currently just
restating `difficulty` 1/2/3): **`Justify an opinion · present + past · B1`**.

**4. Session summary demand readout** from `snapshot.demands` deltas.

**5. L1/L2 disagreement — one authoritative account (review point 10).**
The learner sees **exactly one** verdict per demand, and it is L1's.
- ✓/✗ chips render **only** for demands L1 resolved to `met` / `not_attempted`.
- Demands L1 marked `unknown` get **no chip at all**. The LLM's prose about them still appears as
  ordinary coaching text, but never as a verdict.
- The LLM's `demands_met` / `demands_missed` arrays are **never rendered** — telemetry / Stage 8b
  gap-fill input only.
- Residual risk, stated not solved: the LLM's free prose could still contradict a chip. Mitigation
  is the `DETERMINISTIC SIGNALS (… do not contradict these)` prompt header (§9.2) plus the
  existing grounding/quality-gate discipline. Disagreement rate is tracked, not assumed zero.

Plus the mid-session toast (§8.4).

**Deliberately not shown:** belief math, selection scores, success probabilities, raw
`demandScore`. And three existing lies are removed: `MasteryJourney.tsx:14-22`'s XP→CEFR ladder,
`progress/TimelineItem.tsx:126`'s hardcoded `'B2'`, and `deriveCEFR(avgScore)`.

---

## 15. Testing strategy

**Unit (pure).** `deriveDemandScore` / `demandScoreToLevel` (table-driven, incl. the lexical cap
and every clamp) · **`deriveAbility`** (cold start, single demand, all five, cap-binds,
floor-binds, **cap-vs-floor conflict**, sparse below `MIN_DEMAND_CONFIDENCE`, `overallConfidence`
arithmetic, `measuredAnswers`) · `evaluateDemandSatisfaction` (**one case per row of the §9.3
table**, including every `unknown`) · `planSlots` (percentages → counts, largest-remainder
determinism, the stretch-plan-then-downgrade rule) · `scoreCandidate` (each term isolated) ·
`selectQuestions` (**every rung of the §8.3 ladder**, no duplicates, returns-fewer case) ·
`midSessionAdjust` (fires once, never before Q3, never touches answered/review slots, no-op →
no toast) · every validator and lint rule with a passing and a failing fixture.

**Contract / regression.**
- `snapshot.skills` byte-identical: the existing `REDUCER_FIXTURE_HASH` must **not** change while
  `REDUCER_VERSION` becomes `evidence-v4`.
- A `pron:*`-style isolation test proving `demand:*` never leaks into `skills`.
- `MAX_EVIDENCE_EVENTS` regression: 50 attempts × 3 events still leaves all 5 demand nodes and
  the grammar nodes present after the `slice(-150)`.
- Corpus hash parity between `src/data/learn/` and `backend/data/learn/` (CI).
- Backend prompt snapshot + `LEARN_PROMPT_VERSION`; `demandsResolved: false` path on
  version mismatch and unknown id.
- `feedbackSchema` accepts responses with and without the four new fields.

**Adaptive-behaviour simulation** — `src/domain/learn/__tests__/adaptiveSimulation.test.ts`.
A `SimulatedLearner` has hidden true ability per `CognitiveDemand`; scores are drawn from a
**seeded** logistic on `trueAbility − demandScore`; L1 outcomes are simulated with the §9.3
asymmetry (including a configurable `unknown` rate). 30 sessions, then assert:

| Scenario | Assertion |
|---|---|
| A succeeds on easy | ability rises ≥1 band within 10 sessions; ≥1 stretch per session **once trusted questions exist** |
| B fails on hard | target falls, never below floor; ≥1 warmup per session; never 3 consecutive above-band |
| C strong grammar / weak justify | ability capped near `anchor(justify)+0.5`; `justify` share of target slots rises |
| D one good then many poor | `demands.explain.mastery` never exceeds 0.7 after the first success; no rise |
| E hard success | `demand:hypothesize` gains evidence only via ≥7.0 questions |
| F mislabelled question | `learn:check` reports `demand-level-mismatch` on a doctored fixture |
| G equal score, different demands | disjoint `targetNodeIds` |
| H gaming (always 5 words) | `sessionTarget` never falls; avoidance accumulates; **no demand failure recorded** |
| I topic confounding | 5 failures in one topic move `TopicMasteryEntry` but move ability < 0.5 |
| **J all-unknown attempts** | 20 attempts where L1 resolves nothing → **zero demand events**, ability unchanged, `overallConfidence` stays 0, UI shows no band |
| **K corpus-only inferred** | with 100% inferred provenance, no stretch slot is ever filled and no session errors |

Seeded RNG, no wall clock, no localStorage.

> **Stage 10 amendment:** scenarios C and I as specified require real Beta-failure evidence on a
> demand node (mastery below the 0.5 prior), which needed Stage 8b's L2 gap-fill to exist before
> this suite could pass honestly. Implemented and verified — see the amendment section.

---

## 16. Implementation plan

All behind `learnAdaptiveDifficulty` in `src/config/featureFlags.ts` (`'coming-soon'` until Stage 10).

**Stage 1 — Demand model (pure).** `src/domain/learn/demand/{types,deriveDemandLevel}.ts`;
optional `Question.demands`. *Tests:* derivation table incl. lexical cap and clamps.
*Accept:* typecheck + tests green, zero runtime change.

**Stage 2 — Authoring contract, validator, lint, scripts.**
`demand/{validate,lint}.ts`, `scripts/authoring/{learnSkeleton,checkLearnDemands,learnReview}.ts`,
`docs/guides/learn-demands.md`, `package.json`. *Tests:* pass+fail fixture per rule.
*Accept:* every rule demonstrably fires; `learn:check --draft` clean on an empty corpus.

**Stage 3 — Inference for all 428 + file-based review tooling.**
`scripts/authoring/inferLearnDemands.ts`, generated `src/data/learn/demands/*.json`.
Implements §13.1 explicitly (no `difficulty` as a primary signal). *Tests:* determinism; a
fixture per inference pattern; an explicit test that `responseLoad` and `lexicalReach` change
when the question text changes but `difficulty` does not. *Accept:* 428/428 carry demands;
`learn:status` reports the split.

**Stage 4 — Asymmetric L1.** `demand/satisfaction.ts`; export the existing detectors from
`diagnosticEngine.ts` **without changing them**. *Tests:* every row of the §9.3 table.
*Accept:* pure; no `failed` state exists in the return type at all.

**Stage 4b — Fix `hasConditional` (separate commit).** `diagnosticEngine.ts:240`.
*Tests:* `j'irais`, `nous ferions`, `ce serait` now match; a regression test on `detectAvoidance`
output. *Accept:* the behaviour change is isolated, reviewed, and attributable.

**Stage 5 — Evidence + beliefs + ability.**
`types/evidence.ts`, `types/beliefs.ts`, `evidenceProjection.ts`, `beliefReducer.ts`
(version bump only), new `projectDemandBeliefs`, `beliefProjectionService.ts`,
`coachStorage.ts` (`MAX_EVIDENCE_EVENTS` → 150), new
`src/domain/learn/ability/{deriveAbility,thresholds}.ts`. *Tests:* `REDUCER_FIXTURE_HASH`
unchanged while version becomes `evidence-v4`; `demand:*` isolation; log-capacity regression; the
full `deriveAbility` suite incl. cap-vs-floor. *Accept:* existing coach tests all still pass.

**Stage 6 — Slot-based selector.** `src/domain/learn/selection/*`; rewrite
`buildSessionQuestions`; **delete** `buildSession`, `EXAM_DISTRIBUTIONS`, `inferCEFRFromProfile`,
`adaptiveScore`, `applyDifficultyDistributionV2`, `preferredFirst`. *Tests:* §15 selector suite;
existing `sessionBuilder.reviewPool.test.ts` must still pass unmodified.
*Accept:* deterministic for a fixed seed; every pick carries a `SelectionReason`.

**Stage 7 — Mid-session adjustment + toast generalisation.**
`midSessionAdjust.ts`, `Learn.tsx`, `MidSessionToast.tsx` (+ the precedence rule).
*Tests:* the §8.4 constraint list, incl. never-replace-answered, never-replace-review,
targetCount stability, and no-op → no toast. *Accept:* the existing "Halfway there!" behaviour
is unchanged when the flag is off.

**Stage 8 — AI grading + the trust boundary.**
`apiClient.ts`, `feedbackSchema.ts`, the demands manifest + build step, `backend/data/learn/`,
`backend/main.py`, `backend/tests/`. Also fixes the `streamFeedback` `enginePreference` omission.
*Tests:* corpus hash parity in CI; `demandsResolved: false` on mismatch and unknown id; prompt
snapshot. *Accept:* backend committed and pushed **separately** after `git -C backend status` is clean.

> **Stage 10 note:** Stage 8's original file list omitted `evidenceProjection.ts` — the file that
> actually needed to *read* `demands_met`/`demands_missed`/`demandsResolved` off `FeedbackV2` and
> turn an `unknown` L1 verdict into a real event. That omission meant §9.3's "L2 fills only the
> gaps" was documented but not implemented. Corrected as **Stage 8b** (see amendment below);
> `evidenceProjection.ts` should be considered part of Stage 8's true file list going forward.

**Stage 9 — Coach integration + first review batch.**
`interventionService.ts`, `recommendationEngine.ts`, `decisionEngine.ts`,
`coachProfileService.ts`, `types/coach.ts`. **Blocking content gate:** review enough questions
per core topic to span the demand ladder, so stretch slots can actually fill (§8.1).
*Tests:* demand-problem detection; **first-ever tests** for `generateDailyPlan` /
`generateRecommendation`. *Accept:* a demand problem opens, routes to selection, resolves; and
`learn:status` shows a non-inferred question above 7.0 in every core topic.

**Stage 10 — UX, simulation, flag flip.**
`SessionStartScreen`, `QuestionCard`, `SessionSummary`, `AppContext` (`SET_DIFFICULTY` →
`SET_AIM` with the §6.4 migration read), `difficultyConfig` → Aim config, `MasteryJourney`,
`TimelineItem`, `featureFlags`, plus the full §15 simulation suite (A–K).
*Accept:* all eleven scenarios pass; flag → `'live'`.

---

## 17. Risk analysis

| Risk | Severity | Mitigation |
|---|---|---|
| **Inferred labels wrong at scale** (428 machine-guessed feeding a learner model) | High | Four valves (§13.2) + circularity broken (§13.1). Degrades toward today's behaviour, never toward confidently-wrong. |
| **No upward adaptation until review lands** — a direct consequence of the stretch/provenance rule | High | Stated openly; made a **blocking gate** on Stage 9 rather than discovered after launch. |
| **L1 false failures** | High — mitigated | Eliminated by construction: `failed` is not a value the L1 return type can take (§9.3). |
| **Belief-snapshot or log regression** | High | `REDUCER_FIXTURE_HASH` pin; `demand:*` isolation test; explicit `MAX_EVIDENCE_EVENTS` capacity test. |
| **Client forging demands** | Med | Resolved server-side by `questionId` + hashed `demandsVersion` (§9.1); client-supplied demand fields are never trusted. |
| **Corpus drift between repos** | Med | CI hash-parity check; `demandsResolved: false` degrades honestly rather than grading against the wrong spec. |
| **Backend partial deploy** | Med | Optional fields + str shim: old backend ⨯ new client and vice versa both work. |
| **Scope creep into the IGCSE engine** (hard constraint #1) | Med | `src/domain/learn/` imports nothing from `src/domain/igcse/`; enforced by a guard test, like `noFeedbackV2InEvidencePath.test.ts`. |
| **Cap-wins hurts a genuinely strong learner** with one weak low demand | Med | Only fires at `confidence ≥ 0.5` and `mastery < 0.40`; the strong demand still drives selection via `demandCoverageGap`; surfaced in the summary so it is explainable rather than mysterious. |
| **Users dislike losing the explicit A1–B2 picker** | Med | Aim preserves agency; the measured level is shown honestly. Flag-reversible. |
| **`decisionEngine` / `recommendationEngine` gain responsibility while untested** | Med | Stage 9 adds their first tests **before** extending them. |
| **`sufficientAnswer` seeded from `hint` is vague** | Med | `sufficient-answer-too-vague` is a blocking error; review prioritises high-demand items. |
| **LLM prose contradicts an L1 chip** | Low, unsolved | Prompt header + grounding discipline; disagreement rate tracked as telemetry, not assumed zero. |
| **Toast collision** | Low | Single-toast precedence rule (§8.4). |
| **Web Speech noise contaminates demand signals** | Low | `signalQuality` already multiplies into event weight; the live `learnTranscriptConfirm` step lets the learner fix the transcript first. |

---

## 18. Files to modify

**New — `src/domain/learn/`**
`demand/{types,deriveDemandLevel,validate,lint,satisfaction}.ts` ·
`ability/{deriveAbility,thresholds}.ts` ·
`selection/{types,planSlots,scoreCandidate,selectQuestions,midSessionAdjust}.ts` ·
`__tests__/adaptiveSimulation.test.ts` + per-module tests

**New — elsewhere**
`scripts/authoring/{inferLearnDemands,learnSkeleton,checkLearnDemands,learnReview}.ts` ·
`src/data/learn/demands/*.json` + generated `demandsManifest.ts` ·
`backend/data/learn/*.json` · `docs/guides/learn-demands.md`

**Modified — selection & session**
`src/utils/sessionBuilder.ts` · `src/utils/difficultyConfig.ts` · `src/screens/Learn.tsx`

**Modified — types**
`src/types/index.ts` · `src/types/evidence.ts` · `src/types/beliefs.ts` · `src/types/coach.ts`

**Modified — coach**
`src/services/coach/evidenceProjection.ts` (**Stage 8 file list correction — see Stage 8b amendment**) ·
`src/services/coach/beliefReducer.ts` ·
`src/services/coach/beliefProjectionService.ts` ·
`src/services/coach/coachStorage.ts` ·
`src/services/coach/interventionService.ts` ·
`src/services/coach/recommendationEngine.ts` ·
`src/services/coach/decisionEngine.ts` ·
`src/services/coach/coachProfileService.ts` ·
`src/services/coaching/diagnosticEngine.ts` (Stage 4b only)

**Modified — API + backend (separate repo)**
`src/services/api/apiClient.ts` ·
`src/services/api/feedbackSchema.ts` ·
`backend/main.py` · `backend/tests/test_difficulty_context.py`

**Modified — UI**
`src/screens/learn/SessionStartScreen.tsx` ·
`src/screens/learn/QuestionCard.tsx` ·
`src/screens/learn/SessionSummary.tsx` ·
`src/screens/learn/MidSessionToast.tsx` ·
`src/screens/MasteryJourney.tsx` ·
`src/screens/progress/TimelineItem.tsx`

**Modified — plumbing**
`src/context/AppContext.tsx` · `src/config/featureFlags.ts` · `package.json` · `CLAUDE.md`

**Deleted**
`buildSession` + `EXAM_DISTRIBUTIONS` + `inferCEFRFromProfile` + `adaptiveScore` +
`applyDifficultyDistributionV2` · `preferredFirst` · `DAILY_CHALLENGES` ·
`EvaluationContext`/`targetLevel`

---

## 19. Verification

1. `npm run typecheck && npm run lint && npm test` green at the end of every stage.
2. `npm run learn:check` clean; `npm run learn:status` shows 428/428 coverage and the
   provenance split; a non-inferred ≥7.0 question exists in every core topic before Stage 10.
3. `npm test -- adaptiveSimulation` — all eleven scenarios A–K.
4. `npm test -- beliefReducer.version-pin` — hash unchanged, version `evidence-v4`.
5. `cd backend && pytest`; `git -C backend status` clean before, committed and pushed after.
6. Manual, `?ff_learnAdaptiveDifficulty=live`: (a) a fresh profile shows *"Still getting to know
   your level"*, no band; (b) Push vs Comfortable produce visibly different questions;
   (c) "why this question" reads sensibly; (d) two deliberate bad answers fire the ease toast
   **and** the question list actually changes; (e) a 5-word answer records no demand failure;
   (f) the feedback panel shows chips only for demands L1 resolved.
7. Flag off → behaviour identical to today.

---

## 20. Verdict

**Implementable — after the rev-1 corrections, not before.** Three of the six defects in §0
would have shipped broken: L1 manufacturing false failures from unreliable absence detection
(C1), demand outcomes being silently forced to equal grammar outcomes (C2), and a 33% shrink of
the existing coaching history (C3). The review was warranted.

What remains is mostly *connection work*. The Beta-Bernoulli fold, the reliability weighting, the
`hasSuccessSignal` gate that gives "unknown" for free, the `SKILL_DEFS`-miss that isolates
namespaced nodes with no code, the prerequisite philosophy, the `SessionBlend`, the review pool,
and the whole validator/lint/gates discipline all already exist and are tested. No IRT, no second
belief engine, no new framework. The genuinely new pieces are small and pure: a demand
vocabulary, one derivation function, one asymmetric satisfaction evaluator, one ability formula,
and a slot-based selector.

The trust property is the part worth defending: **the adaptive loop is driven by deterministic
signals resolved server-side, never by the LLM's own level judgement, and never by an absence a
regex cannot establish.** The model writes prose; the machine moves difficulty, and only when it
can prove it should.

Two honest limits carried forward. **The stretch/provenance rule means there is no upward
adaptation until the first review batch lands** — that is now a blocking gate, not a surprise.
And **the 8 advanced topics cannot be fixed by this plan** — 1 question each is a content
problem; hide them until authored rather than let the selector pretend they are usable.

---

## Amendment: Stage 8b — L2 gap-fill (added during Stage 10, 2026-08-20)

**Where this was found:** while writing §15's `adaptiveSimulation.test.ts` for Stage 10,
scenarios C and I (a demand's mastery falling below the 0.40 `MASTERY_WEAK` threshold / below the
0.5 prior) could not be made to pass against the real, already-shipped Stage 5–9 code — not
because the test was wrong, but because no code path in the shipped implementation could ever
produce that outcome.

**The defect.** `evidenceProjection.ts`'s `buildDemandEvidence` (added in Stage 5, unchanged
through Stage 9) had exactly three paths:

- `verdict === 'unknown'` → `return []` (no event at all)
- `verdict === 'met'` → a language event, `result: { success: true }`
- `verdict === 'not_attempted'` → a behavior event, `result: { avoided: true }`

Nothing, anywhere in this function, ever set `result.success: false` on a `demand:*` node.
`beliefReducer`'s `alpha`/`beta` accumulators (which `mastery = alpha/(alpha+beta)` reads) can
therefore only ever grow `alpha` (via `met`) or stay untouched — `beta` never grows for a demand
node under this pipeline. Since the Laplace prior is `alpha=beta=1` (`mastery = 0.5`), **demand
mastery was architecturally floor-locked at 0.5 and could never fall below it.**

This silently disabled three designed behaviours, none of which had a test catching the gap:

1. §6.2's prerequisite **cap** (`deriveAbility`) — requires `mastery < MASTERY_WEAK (0.40)` on a
   `RELIABLE_CONFIDENCE`-weighted node; unreachable via demand evidence alone.
2. Stage 9's `low_mastery` `LearningProblem` trigger on a `demand:*` node — same threshold, same
   unreachability.
3. §11 example C's own claim (`demands.justify` reaching `0.35`) — internally contradicted the
   shipped code the moment it was written, though nobody had cause to notice until a test tried
   to reproduce it.

**Root cause.** §9.3 specified the fix in prose — *"Where L1 says `unknown` and the LLM asserts a
demand outcome, that outcome may be recorded — as a separate, lower-reliability contribution
(`evaluator: 'llm'`)"* — but §16 Stage 8's file list named only `apiClient.ts`, `feedbackSchema.ts`,
the demands manifest, and `backend/`. It never named `evidenceProjection.ts`, so the one piece of
prose describing the fix had no assigned implementing file, and nobody implemented it.

**The fix.**

1. `types/index.ts` — `FeedbackV2` gains `answered_the_question?`, `demands_met?: string[]`,
   `demands_missed?: string[]`, `difficulty_fit?`, `demandsResolved?: boolean`. These already
   existed on the backend response schema (`feedbackSchema.ts`, added in Stage 8) but were never
   mapped onto the client's own `FeedbackV2` type — a second, smaller instance of the same "field
   exists in the schema, nothing reads it" gap.
2. `services/api/apiClient.ts` — `mergeV2Fields` now carries all five fields from the backend
   response onto `FeedbackV2`.
3. `services/api/feedbackSchema.ts` — added the previously-missing `demandsResolved` field to the
   zod schema (the other four were already declared).
4. `services/coach/evidenceProjection.ts` — `buildDemandEvidence` gained a fourth branch, taken
   only when the `unknown` verdict has already been returned from (never overriding) the `met`
   and `not_attempted` branches above it, AND:
   - `feedback.demandsResolved === true` (an unresolved spec means the LLM was never told what to
     judge against, so its read is meaningless — docs §9.1), AND
   - the question's own `cognitiveDemand` is named in exactly one of `demands_met` /
     `demands_missed` (named in neither → still zero events; named in **both** → contradictory,
     also zero events, never a guess).

   The emitted event: `evidenceType: 'language'`, `targetNodeIds: [demandNodeId]`,
   `result.success` = whichever array named it, `reliability.evaluator: 'llm'` (already capped at
   0.85 by `EVALUATOR_CAPS`), `assessmentConfidence: 0.5` (deliberately below the L1 heuristic
   path's 0.9, so an L2-only read moves belief less per event than a real L1 `met`), `taskValidity`
   still scaled by the question's own `provenance` as before.

**Tests added** (`src/services/coach/__tests__/evidenceProjection.test.ts`, new
`describe('buildEvidence: demand:* events')` block, 12 cases): L1 met/not_attempted paths
unchanged; `unknown` + no `demandsResolved` → zero events; `unknown` + resolved + named in
`demands_missed` → one event, `success: false`, `evaluator: 'llm'`; the mirror for `demands_met`;
L1 `met` is never overridden by a contradicting LLM read for the same demand (and the
`not_attempted` mirror); named in neither array → zero events; named in **both** → zero events;
a question with no `demands` at all → zero events regardless of feedback; and a regression-guard
invariant test asserting 8 repeated L2-gap-fill failures push `demand:justify` mastery below
0.40 — so if this path is ever silently removed again, a test fails immediately instead of the
cap quietly going dead.

**What is still open (deliberately out of scope for 8b).** The `demand_judgement_disagreement`
telemetry event described in §9.3's prose (recording when L1 and L2 would have disagreed, for a
future calibration pass) is not implemented — 8b only needed the gap-fill event itself to exist
so §6.2's cap/floor and §11 example C become reachable, not the telemetry layer around it. Left
for a future stage if pursued.

**Corrected §16 Stage 8 file list:** `evidenceProjection.ts` should be treated as part of Stage
8's scope going forward, not just Stage 5's.
