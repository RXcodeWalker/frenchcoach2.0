// ── selectQuestions — docs §8.3. Fill order, escalation ladder, dedupe. ────────

import type { Question } from '../../../types';
import { fnv1a } from '../../../services/coach/evidenceProjection';
import { deriveDemandScore, demandScoreToLevel } from '../demand/deriveDemandLevel';
import { demandNodeId } from '../demand/nodeId';
import { scoreCandidate } from './scoreCandidate';
import { explainSelection } from './explainSelection';
import { bandFor } from './planSlots';
import type {
  SelectedQuestion,
  SelectionCandidate,
  SelectQuestionsArgs,
  SessionSlot,
  SlotType,
} from './types';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';

// docs §8.3 — fixed fill order, hardest constraint first. Deliberately NOT the
// same order planSlots returns its array in (warmup, review, target, stretch,
// choice) — that's presentation/allocation order, this is fill priority.
const FILL_ORDER: SlotType[] = ['review', 'stretch', 'target', 'warmup', 'choice'];

function widenBand(band: { lo: number; hi: number }, amount: number): { lo: number; hi: number } {
  return { lo: band.lo - amount, hi: band.hi + amount };
}

const LEVEL_RANK = { A1: 0, A2: 1, B1: 2, B2: 3 } as const;

/** Top of the `target` band (T−0.5 … T+0.5) — docs §8.1. */
const TARGET_BAND_TOP = 0.5;

/** At or below today's level: no harder than the target band's top, and no higher a displayed level than today's target. */
function atOrBelowLevel(score: number, targetLevel: number): boolean {
  return (
    score <= targetLevel + TARGET_BAND_TOP &&
    LEVEL_RANK[demandScoreToLevel(score)] <= LEVEL_RANK[demandScoreToLevel(targetLevel)]
  );
}

/**
 * docs §8.3 hard ceiling, applied at every ladder rung. bandFit is a soft score
 * term, so without it a slot could be filled by any question in the topic (an
 * "Easier" session once got a B2 question, a beginner's warm-up a B1 one).
 * - `choice` may range up to its own band's top (T+1.5) — unless the session
 *   is held to its level (`holdToLevel`, the "Easier" aim);
 * - every other non-stretch slot is held at or below today's level
 *   (`atOrBelowLevel`), so a "Pitched at A1" target never shows an A2 badge.
 * Without a target level the slot's own band top is the ceiling.
 */
function underCeiling(score: number, slot: SessionSlot, args: SelectQuestionsArgs): boolean {
  const { targetLevel } = args;
  if (targetLevel === undefined) return slot.band ? score <= slot.band.hi : true;
  if (slot.type === 'choice' && !args.holdToLevel) return score <= bandFor('choice', targetLevel)!.hi;
  return atOrBelowLevel(score, targetLevel);
}

/**
 * A stretch pick is above today's level, no higher than `slot.band.hi`, and
 * never more than one displayed level above today's (A1 → A2, A2 → B1): a
 * step up, never a leap.
 */
function fitsStretch(score: number, slot: SessionSlot, targetLevel: number | undefined): boolean {
  if (!slot.band) return false;
  if (targetLevel === undefined) return score >= slot.band.lo && score <= slot.band.hi;
  return (
    !atOrBelowLevel(score, targetLevel) &&
    score <= slot.band.hi &&
    LEVEL_RANK[demandScoreToLevel(score)] <= LEVEL_RANK[demandScoreToLevel(targetLevel)] + 1
  );
}

function scoreOf(q: Question): number | null {
  return q.demands ? deriveDemandScore(q.demands) : null;
}

/** A pick and the docs §8.3 ladder rung that produced it. */
interface RungHit {
  question: Question;
  rung: number;
}

function reasonFor(slot: SlotType, question: Question, rung: number, targetLevel: number | null) {
  return {
    slot,
    explanation: explainSelection({
      slot,
      rung,
      questionLevel: question.demands ? deriveDemandScore(question.demands) : null,
      targetLevel,
    }),
  };
}

function buildCandidate(
  question: Question,
  seenIds: Set<string>,
  usedCognitiveDemands: Set<string>,
  snapshot: EvidenceBeliefSnapshot | null,
): SelectionCandidate {
  const demands = question.demands;
  let demandNodeConfidence: number | null = null;
  if (demands && snapshot?.demands) {
    const belief = snapshot.demands[demandNodeId(demands.cognitiveDemand)];
    demandNodeConfidence = belief ? belief.confidence : null;
  }
  return {
    question,
    demandNodeConfidence,
    seen: seenIds.has(question.id),
    cognitiveDemandUsedThisSession: demands ? usedCognitiveDemands.has(demands.cognitiveDemand) : false,
  };
}

/**
 * docs §8.3. Ranks candidates by (score desc, fnv1a(id) asc) for determinism
 * and returns the single best, or null if the pool is empty.
 */
function pickBest(
  pool: Question[],
  slot: SessionSlot,
  focusSkillIds: string[],
  activeDemandProblem: SelectQuestionsArgs['activeDemandProblem'],
  seenIds: Set<string>,
  usedCognitiveDemands: Set<string>,
  snapshot: EvidenceBeliefSnapshot | null,
): Question | null {
  if (pool.length === 0) return null;

  const ranked = pool
    .map((q) => {
      const candidate = buildCandidate(q, seenIds, usedCognitiveDemands, snapshot);
      const demandScore = q.demands ? deriveDemandScore(q.demands) : null;
      const score = scoreCandidate({ candidate, slot, focusSkillIds, activeDemandProblem }, demandScore);
      return { q, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return fnv1a(a.q.id) < fnv1a(b.q.id) ? -1 : 1;
    });

  return ranked.length > 0 ? ranked[0].q : null;
}

/**
 * docs §8.3 escalation ladder for a single non-review, non-stretch-eligible
 * slot. Every rung with demand-bearing questions only sees those under the
 * hard ceiling (`underCeiling`); rung order:
 *   1. widen band ±1.0
 *   2. drop bandFit (rank on remaining terms — implemented as band: null)
 *   3. allow seen questions
 *   4. allow questions without `demands`
 *   5. nothing left under the ceiling: the easiest question left (unseen first)
 * Rung 6 (return fewer) is the caller's responsibility once this returns null.
 * Returns the rung that produced the pick, for "Why this question?" (Batch 1d).
 */
function fillNonStretchSlot(
  pool: Question[],
  slot: SessionSlot,
  args: SelectQuestionsArgs,
  usedCognitiveDemands: Set<string>,
  snapshot: EvidenceBeliefSnapshot | null,
): RungHit | null {
  const { focusSkillIds, activeDemandProblem, seenIds, chosenIds } = args;
  const available = pool.filter((q) => !chosenIds.has(q.id));

  const allWithDemands = available.filter((q) => !!q.demands);
  const withDemands = allWithDemands.filter((q) => underCeiling(deriveDemandScore(q.demands!), slot, args));
  const unseenWithDemands = withDemands.filter((q) => !seenIds.has(q.id));

  // Rung 0 (band as planned).
  let hit = pickBest(unseenWithDemands, slot, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
  if (hit) return { question: hit, rung: 0 };

  // Rung 1: widen the band by +-1.0.
  if (slot.band) {
    const widened: SessionSlot = { ...slot, band: widenBand(slot.band, 1.0) };
    hit = pickBest(unseenWithDemands, widened, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
    if (hit) return { question: hit, rung: 1 };
  }

  // Rung 2: drop the bandFit term entirely (band: null makes scoreCandidate's
  // bandFit contribute its neutral 1.0 for every candidate equally, which is
  // equivalent to ranking on the remaining terms only).
  const noBand: SessionSlot = { ...slot, band: null };
  hit = pickBest(unseenWithDemands, noBand, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
  if (hit) return { question: hit, rung: 2 };

  // Rung 3: allow the historical seen set back in.
  hit = pickBest(withDemands, noBand, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
  if (hit) return { question: hit, rung: 3 };

  // Rung 4: allow questions without demands (bandFit omitted for them by scoreCandidate).
  hit = pickBest(available.filter((q) => !q.demands), noBand, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
  if (hit) return { question: hit, rung: 4 };

  // Rung 5: every question left is above the ceiling — take the easiest, never a
  // harder one, unseen before seen, ties by fnv1a(id) for determinism.
  const easiest = [...allWithDemands].sort((a, b) => {
    const diff = deriveDemandScore(a.demands!) - deriveDemandScore(b.demands!);
    if (diff !== 0) return diff;
    const seenDiff = Number(seenIds.has(a.id)) - Number(seenIds.has(b.id));
    if (seenDiff !== 0) return seenDiff;
    return fnv1a(a.id) < fnv1a(b.id) ? -1 : 1;
  })[0];
  return easiest ? { question: easiest, rung: 5 } : null;
}

/**
 * docs §8.3. `stretch` may only be filled by a non-inferred, demand-bearing,
 * unseen question that is above today's level, inside the stretch band (or
 * the band widened by 1.0) and at most one level up (`fitsStretch`) — a step
 * above, never a leap (a beginner's stretch was once a B2 question). If none fits, the slot
 * downgrades to `target` and re-enters the normal ladder (docs §8.1) under the
 * *target* band — "the session simply has no stretch that day" — never the
 * stretch band relabelled as target (Learn overhaul Batch 1d).
 */
function fillStretchSlot(
  pool: Question[],
  slot: SessionSlot,
  args: SelectQuestionsArgs,
  usedCognitiveDemands: Set<string>,
  snapshot: EvidenceBeliefSnapshot | null,
): (RungHit & { slotType: SlotType }) | null {
  const { focusSkillIds, activeDemandProblem, seenIds, chosenIds } = args;
  // The stretch band comes from today's target when the caller passes it, so a
  // mid-session raise (which carries the target band) is a real step up too.
  const stretchSlot: SessionSlot = args.targetLevel !== undefined
    ? { type: 'stretch', band: bandFor('stretch', args.targetLevel) }
    : slot;
  const trusted = pool.filter(
    (q) => !chosenIds.has(q.id) && !seenIds.has(q.id) && q.demands && q.demands.provenance !== 'inferred',
  );
  const fitting = (band: SessionSlot) =>
    trusted.filter((q) => fitsStretch(deriveDemandScore(q.demands!), band, args.targetLevel));

  let hit = pickBest(fitting(stretchSlot), stretchSlot, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
  if (hit) return { question: hit, rung: 0, slotType: 'stretch' };

  // Rung 1: widen the band by ±1.0 (still above today's level, still at most one
  // level up). The bank has gaps (explain sits at 4.0, justify at 6.0), and
  // without this a learner at A2 would never meet a B1 question to climb with.
  if (stretchSlot.band) {
    const widened: SessionSlot = { ...stretchSlot, band: widenBand(stretchSlot.band, 1.0) };
    hit = pickBest(fitting(widened), widened, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
    if (hit) return { question: hit, rung: 1, slotType: 'stretch' };
  }

  // No trusted candidate fits -> downgrade to target, re-run the full
  // non-stretch ladder (which may itself fall back to seen/no-demand
  // questions, per §8.3). The target band comes from today's target when the
  // caller passes it; otherwise the slot's own band is kept (midSessionAdjust's
  // raise slot already carries the target band).
  const targetBand = args.targetLevel !== undefined ? bandFor('target', args.targetLevel) : slot.band;
  const targetSlot: SessionSlot = { type: 'target', band: targetBand };
  const downgraded = fillNonStretchSlot(pool, targetSlot, args, usedCognitiveDemands, snapshot);
  return downgraded ? { ...downgraded, slotType: 'target' } : null;
}

/** docs §8.3 — the order a session is asked in: start easy, end on the stretch. */
const PRESENTATION_RANK: Record<SlotType, number> = { warmup: 0, review: 1, target: 2, choice: 3, stretch: 4 };

/**
 * docs §8.3. Fill order (hardest constraint first) is not the order a learner
 * should meet the questions in: sorts by slot (warm-up → review → target →
 * choice → stretch), then easiest first within a slot type. Stable; questions
 * without demands keep their place among their slot type.
 */
export function presentationOrder(selected: SelectedQuestion[]): SelectedQuestion[] {
  return selected
    .map((s, i) => ({ s, i }))
    .sort((a, b) => {
      const rank = PRESENTATION_RANK[a.s.slot] - PRESENTATION_RANK[b.s.slot];
      if (rank !== 0) return rank;
      const sa = scoreOf(a.s.question);
      const sb = scoreOf(b.s.question);
      if (sa !== null && sb !== null && sa !== sb) return sa - sb;
      return a.i - b.i;
    })
    .map(({ s }) => s);
}

export interface SelectQuestionsExtraArgs {
  beliefSnapshot: EvidenceBeliefSnapshot | null;
}

/**
 * docs §8.3. Fills slots in FILL_ORDER, never duplicating, never throwing,
 * never padding with a repeat. An unfilled review slot is backfilled with a target slot. Returns fewer than requested (rung 6) rather
 * than force a bad pick, and sets `targetCount` to the actual length reached.
 */
export function selectQuestions(
  args: SelectQuestionsArgs,
  extra: SelectQuestionsExtraArgs = { beliefSnapshot: null },
): { selected: SelectedQuestion[]; targetCount: number } {
  const { pool, slots, getReviewQuestion } = args;
  const targetLevel = args.targetLevel ?? null;
  const chosenIds = new Set(args.chosenIds);
  const usedCognitiveDemands = new Set<string>();
  const selected: SelectedQuestion[] = [];
  // docs §8.3 (question-levels batch): a review slot with nothing due is backfilled
  // with a `target` slot, so the session is as long as the learner asked.
  let unfilledReviewSlots = 0;

  const bySlotType = new Map<SlotType, SessionSlot[]>();
  for (const slot of slots) {
    const arr = bySlotType.get(slot.type) ?? [];
    arr.push(slot);
    bySlotType.set(slot.type, arr);
  }

  for (const slotType of FILL_ORDER) {
    const slotsOfType = bySlotType.get(slotType) ?? [];
    for (const slot of slotsOfType) {
      if (slotType === 'review') {
        const reviewQuestion = getReviewQuestion(chosenIds);
        if (!reviewQuestion) {
          unfilledReviewSlots += 1; // backfilled below, after every planned slot has had first pick
          continue;
        }
        chosenIds.add(reviewQuestion.id);
        if (reviewQuestion.demands) usedCognitiveDemands.add(reviewQuestion.demands.cognitiveDemand);
        selected.push({ question: reviewQuestion, slot: 'review', rung: 0, reason: reasonFor('review', reviewQuestion, 0, targetLevel) });
        continue;
      }

      if (slotType === 'stretch') {
        const result = fillStretchSlot(pool, slot, { ...args, chosenIds }, usedCognitiveDemands, extra.beliefSnapshot);
        if (!result) continue;
        chosenIds.add(result.question.id);
        if (result.question.demands) usedCognitiveDemands.add(result.question.demands.cognitiveDemand);
        selected.push({
          question: result.question,
          slot: result.slotType,
          rung: result.rung,
          reason: reasonFor(result.slotType, result.question, result.rung, targetLevel),
        });
        continue;
      }

      const hit = fillNonStretchSlot(pool, slot, { ...args, chosenIds }, usedCognitiveDemands, extra.beliefSnapshot);
      if (!hit) continue; // rung 6: skip this slot rather than duplicate or throw
      const { question, rung } = hit;
      chosenIds.add(question.id);
      if (question.demands) usedCognitiveDemands.add(question.demands.cognitiveDemand);
      selected.push({ question, slot: slotType, rung, reason: reasonFor(slotType, question, rung, targetLevel) });
    }
  }

  // Backfill: each unfilled review slot becomes a `target` slot under today's target
  // band (the same band a planned target slot has; none when the caller passed no
  // target level and there is no planned target slot to borrow it from). It runs last,
  // so a planned slot is never starved by it, and it draws from the same `pool` — a
  // filtered session is never padded with non-matching questions. When the pool is
  // exhausted the session is still shorter (rung 6).
  if (unfilledReviewSlots > 0) {
    const plannedTarget = slots.find((s) => s.type === 'target');
    const band = targetLevel !== null ? bandFor('target', targetLevel) : (plannedTarget?.band ?? null);
    for (let i = 0; i < unfilledReviewSlots; i++) {
      const slot: SessionSlot = { type: 'target', band };
      const hit = fillNonStretchSlot(pool, slot, { ...args, chosenIds }, usedCognitiveDemands, extra.beliefSnapshot);
      if (!hit) break;
      const { question, rung } = hit;
      chosenIds.add(question.id);
      if (question.demands) usedCognitiveDemands.add(question.demands.cognitiveDemand);
      selected.push({ question, slot: 'target', rung, reason: reasonFor('target', question, rung, targetLevel) });
    }
  }

  return { selected, targetCount: selected.length };
}
