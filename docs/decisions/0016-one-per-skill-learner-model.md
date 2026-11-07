# 0016 — One per-skill learner model: decayed Beta sufficient statistics, readers moved one flag at a time

Date: 2026-11-05
Status: Accepted

## Decision

1. **One closed skill registry** (`src/domain/learnerModel/skills.ts`) names every skill:
   - the 22 coach skill-graph ids;
   - the five `demand:*` nodes;
   - the three 0520 exam areas.

   Question structures are tags that practise skills, never skills themselves. The direction is
   explicit, and every structure maps to at least one skill or is listed with a reason.
2. **The estimator is a decayed Beta–Bernoulli per skill, stored as sufficient statistics.** It uses the
   evidence reducer's own weights, half-life and read-out formulas. The reliability gate applies to the
   base weight at ingest, never after decay.
3. **One observation per answer.** Learn evidence is converted once, by a listener on the evidence log.
   A counted Exam Sim attempt adds its three area marks; nothing else about an exam does. Topic mastery
   is only a one-time prior. A review answer is the Learn answer, weighted up when it is a pass after a
   gap.
4. **State is an AppContext slice; the reducer is the only writer.** It syncs as the `learner_state`
   key `skill_model`, as a per-device conflict-free map. Each device writes only its own bucket, the
   merge keeps each device's latest bucket and the earliest legacy bucket, and readers sum the buckets.
5. **Readers move one at a time, each behind its own flag** (`learnerModelCoach`, `learnerModelLearn`,
   `learnerModelProgress`; sync behind `learnerModelSync`). Each has a seeded old-vs-new simulation test
   pinning agreement, every intended divergence, and the invariants.
6. **The scored pipeline never sees the model**, and the model never changes a mark. The model reads
   only `Session.examMarks` of counted attempts.

## Why

Four stores answered "is this learner weak at X", and the coach, Learn and Progress each read a
different one. Progress's "Grammar to work on" therefore disagreed with the coach, and Learn's ability
silently returned to cold start after ≈ 11 days because the reducer's gate ran after decay.

One model with the same maths makes the shadow comparison exact. Any difference between old and new is
then a named design change, not noise. Moving readers behind separate flags keeps each switch
reversible and owner-controlled.

## Rejected

- **IRT (1PL/2PL per skill).** 820 of 828 item tags are model-inferred and uncalibrated, a learner gives
  about 3 answers a day, and there is no cross-learner response corpus (Core rule 5). The parameters
  cannot be identified. Difficulty keeps entering through `deriveAbility`'s demand anchors.
- **Replaying the evidence log on read** (today's approach). The log is capped at 150 events, so a heavy
  user forgets within days, and a cross-device union of logs cannot be deduplicated cheaply.
- **Syncing raw evidence events into the model's key.** It is larger, carries transcripts, and would
  duplicate `coachSync`.
- **Folding stale devices into a shared archive bucket.** Two devices folding different sets cannot be
  merged without double counting. Stale buckets are dropped instead; at a 14-day half-life they are
  near zero anyway.
- **Feeding envelope Quality-of-Language errors into grammar skills.** Deferred to an owner decision.
- **Switching readers in one release.** Rejected for reversibility.

## Consequences

- The model records for every learner now (shadow writes); no reader changes until its flag is live.
- `skill_model` cannot sync until backend migration `20261106100000` is applied in production.
- Pre-model history held only by a device that bootstrapped later is lost, never double counted.
- Deleting the old belief projection, the diagnostic `SkillProfile` reads and the hand-written
  skill → structure table is a later owner decision, once every reader is live.

Spec: `docs/systems/learner-model.md`.
