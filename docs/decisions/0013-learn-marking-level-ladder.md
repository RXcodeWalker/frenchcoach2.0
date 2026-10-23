# 0013 — Learn marking levels are a level-blind ladder computed by code

Date: 2026-10-18
Status: Accepted

## Decision

Learn's marking level (A1 · A2 · Exam standard · B1 · B2) changes the score and the feedback through a
**level ladder**, specified in `docs/systems/learn-marking-levels.md`. This record holds the rules that
must not drift.

1. **The model judges rungs; code computes scores.** Per applicable skill the model returns
   yes/no verdicts with quotes. Sub-scores at all five levels, `scores`, `fluency` and `cefrLevel`
   are computed deterministically from those verdicts. The model is never asked for a number
   "measured against" a level.
2. **The learner's marking level is never sent to the backend and never appears in a prompt.** The
   prompt is identical for every learner. The level only selects which precomputed result the app
   displays. Consequently the level cannot change the mistakes, the demand verdicts or the learning
   evidence.
3. **Scores fall A1 ≥ A2 ≥ Exam ≥ B1 ≥ B2 by construction**, with Exam between A2 and B1, and this is
   proven by a property test, not hoped for from model behavior.
4. **The question decides which skills are asked for; the level decides how well.** A ladder never
   asks for a tense, opinion or structure the question does not invite. v6's unsourced "8+ only with
   multiple tenses" rule is removed and not replaced.
5. **`fb.scores` is always the Exam-standard result.** Every existing reader of the score (mastery,
   unlock, SM-2 review, mid-session adjustment, belief evidence, coach profile, sync, notebook offer)
   keeps working unchanged, so picking a marking level never changes what comes next. Only what the
   learner sees and earns (displayed score, "needs" card, bonus XP and gems, score achievements,
   streak, summary) reads the chosen level, and below Exam standard earns no bonus XP or gems.
6. **Learn opts in per request** (`marking: "ladder-v1"`, kill switch `LEARN_LADDER_ENABLED`). Every
   other screen sharing the backend `SYSTEM_PROMPT`, and every old app version, stays on
   `learn-prompt-v6`.
7. **Learn scores are not Cambridge marks.** The ladder is built from the CEFR Companion Volume and
   Cambridge's published descriptors, cited by page; it does not reproduce the 0520 mark scheme, and
   every number with no source (points, weights, caps, thresholds) is `UNVALIDATED`. ADR 0001 is
   unaffected.
8. **Examiner-voice Learn feedback is untouched** and shows no ladder, mark, band or grade (ADR 0005).
9. **Nothing ships until the test protocol passes.** Production stays on `learn-prompt-v6` until every
   gate in `docs/guides/learn-marking-test-protocol.md` passes.

## Why

An earlier approach (`learn-prompt-v7`, never deployed) put the target level in the prompt and asked
for one holistic 0–10 score. A live test showed it did not work: the level moved the score by about
1 point, scores did not reliably fall from A1 to B2, Exam standard scored below B1, the top of the
scale went unused, and some mistakes were reported at one level and not at another. Nothing official
converts "measured against B1" into a number, so the conversion has to be written down and executed by
code. Keeping the level out of the prompt removes the leak that let it change which mistakes were
found, and one call yielding all five scores makes the test a fifth of the cost.

**Alternatives rejected or deferred.** Per-level anchored prompts with worked examples (B): the level
stays in the prompt so leaks remain possible, ordering is not guaranteed, exemplars are unsourced, and
testing costs five times as much. A stronger model on the same prompt (C): adds no conversion and no
guarantee; kept as an optional layer on this design. Two calls — v6 unchanged plus a separate
checklist call (D): doubles calls on a 200k-tokens/day tier and lets the accuracy verdict and the
error list disagree; the **fallback** if this design fails the gate twice.

## Consequences

- A change that puts the marking level into a request body, a prompt, or the model's output schema;
  lets the level alter which mistakes or demand verdicts are reported; or has a non-Learn caller
  receive ladder output, contradicts this decision.
- Exam-standard scores move (good answers rise, weak ones fall slightly) and history is not rescaled;
  new attempts carry `markingVersion: 'ladder-v1'`. Topic averages drift and gems/mastery become
  reachable for strong answers, shifting the economy; `shop-economy.md` and
  `learn-adaptive-difficulty.md` receive appended amendments, never renumbered.
- Fluency is no longer judged in Learn (a transcript cannot show it). Judging it would need audio.
- The side finding that Learn's AI demand evidence has never reached the client (spec §9.2) is fixed
  here only behind a separate, default-off backend switch, after its own simulation and owner sign-off.
- Does not amend 0001, 0002 or 0005; it applies the three-layer pattern of 0002 to Learn and keeps the
  mark-free stance of 0005 for the Examiner style.

## Amendment (2026-10-23): Design D replaces the one-call ladder prompt

The one-call design above was tested twice (`learn-prompt-v8` on 2026-10-19, `learn-prompt-v9` on 2026-10-23) and failed
the gate both times (`verification-log.md`). Its verdicts were close (95% agreement on the second run), but packing
the ladder into v6's own call made each request too big: the cost gate could not be met without cutting v6's output,
and the six-ladder question went over the 8,000 tokens a single Groq on_demand request may ask for (413). The owner
chose the fallback named above, Design D:

- **Two calls.** A `ladder-v1` request is first marked by Learn's v6 feedback call, unchanged. A second, small call at
  temperature 0 (`ladder-check-v1`, later `-v2`) then answers only the rungs and the demand check. Code still turns the
  verdicts into every score; the rungs, points and level-blindness are unchanged.
- **The accuracy-disagreement risk named above is closed by construction.** The checklist is given the errors the
  feedback call found (deduplicated, grounded in the transcript), and Accuracy rungs 3–4 count exactly that list.
- **A failed checklist no longer fails the reply.** The feedback is served without `levelCheck`, which the app already
  shows as "Level marking unavailable — marked at Exam standard" (spec §8.3), and it is not cached.
- **Cost.** About 6,800–8,800 tokens per answer across the two calls (smoke runs, 2026-10-23), against ~6,700 for the
  one-call design; each call is well under the per-request limit. Fewer answers a day fit the 200k free tier, which
  was already too small for real users.
- Everything in **Consequences** above still holds.

