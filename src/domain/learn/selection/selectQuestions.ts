// ── selectQuestions — docs §8.3. Fill order, escalation ladder, dedupe. ────────

import type { Question } from '../../../types';
import { fnv1a } from '../../../services/coach/evidenceProjection';
import { deriveDemandScore } from '../demand/deriveDemandLevel';
import { demandNodeId } from '../demand/nodeId';
import { scoreCandidate } from './scoreCandidate';
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

function explanationFor(slot: SlotType, question: Question): string {
  switch (slot) {
    case 'warmup':
      return 'A comfortable question to start with a win.';
    case 'review':
      return 'A question you found tricky before — worth another try.';
    case 'stretch':
      return "A question that pushes you a bit beyond today's level.";
    case 'target':
      return question.demands
        ? `Right at your level: ${question.demands.cognitiveDemand}.`
        : 'Right at your level.';
    case 'choice':
      return 'A change of pace to keep things varied.';
  }
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
 * slot. `withinBand` filters the pool at each rung; rung order:
 *   1. widen band ±1.0
 *   2. drop bandFit (rank on remaining terms — implemented as band: null)
 *   3. allow seen questions
 *   4. allow questions without `demands`
 * Rung 5 (return fewer) is the caller's responsibility once this returns null.
 */
function fillNonStretchSlot(
  pool: Question[],
  slot: SessionSlot,
  args: SelectQuestionsArgs,
  usedCognitiveDemands: Set<string>,
  snapshot: EvidenceBeliefSnapshot | null,
): Question | null {
  const { focusSkillIds, activeDemandProblem, seenIds, chosenIds } = args;
  const available = pool.filter((q) => !chosenIds.has(q.id));

  const withDemands = available.filter((q) => !!q.demands);
  const unseenWithDemands = withDemands.filter((q) => !seenIds.has(q.id));

  // Rung 0 (band as planned).
  let hit = pickBest(unseenWithDemands, slot, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
  if (hit) return hit;

  // Rung 1: widen the band by +-1.0.
  if (slot.band) {
    const widened: SessionSlot = { ...slot, band: widenBand(slot.band, 1.0) };
    hit = pickBest(unseenWithDemands, widened, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
    if (hit) return hit;
  }

  // Rung 2: drop the bandFit term entirely (band: null makes scoreCandidate's
  // bandFit contribute its neutral 1.0 for every candidate equally, which is
  // equivalent to ranking on the remaining terms only).
  const noBand: SessionSlot = { ...slot, band: null };
  hit = pickBest(unseenWithDemands, noBand, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
  if (hit) return hit;

  // Rung 3: allow the historical seen set back in.
  hit = pickBest(withDemands, noBand, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
  if (hit) return hit;

  // Rung 4: allow questions without demands (bandFit omitted for them by scoreCandidate).
  hit = pickBest(available, noBand, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
  return hit;
}

/**
 * docs §8.3. `stretch` may only be filled by non-inferred, demand-bearing
 * questions. If none fit even after widening, the slot downgrades to
 * `target` and re-enters the normal ladder (docs §8.1).
 */
function fillStretchSlot(
  pool: Question[],
  slot: SessionSlot,
  args: SelectQuestionsArgs,
  usedCognitiveDemands: Set<string>,
  snapshot: EvidenceBeliefSnapshot | null,
): { question: Question; slotType: SlotType } | null {
  const { focusSkillIds, activeDemandProblem, seenIds, chosenIds } = args;
  const trusted = pool.filter(
    (q) => !chosenIds.has(q.id) && !seenIds.has(q.id) && q.demands && q.demands.provenance !== 'inferred',
  );

  let hit = pickBest(trusted, slot, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
  if (hit) return { question: hit, slotType: 'stretch' };

  if (slot.band) {
    const widened: SessionSlot = { ...slot, band: widenBand(slot.band, 1.0) };
    hit = pickBest(trusted, widened, focusSkillIds, activeDemandProblem, seenIds, usedCognitiveDemands, snapshot);
    if (hit) return { question: hit, slotType: 'stretch' };
  }

  // No trusted candidate fits even widened -> downgrade to target, re-run
  // the full non-stretch ladder (which may itself fall back to seen/no-demand
  // questions, per §8.3).
  const targetSlot: SessionSlot = { type: 'target', band: slot.band };
  const downgraded = fillNonStretchSlot(pool, targetSlot, args, usedCognitiveDemands, snapshot);
  return downgraded ? { question: downgraded, slotType: 'target' } : null;
}

export interface SelectQuestionsExtraArgs {
  beliefSnapshot: EvidenceBeliefSnapshot | null;
}

/**
 * docs §8.3. Fills slots in FILL_ORDER, never duplicating, never throwing,
 * never padding with a repeat. Returns fewer than requested (rung 5) rather
 * than force a bad pick, and sets `targetCount` to the actual length reached.
 */
export function selectQuestions(
  args: SelectQuestionsArgs,
  extra: SelectQuestionsExtraArgs = { beliefSnapshot: null },
): { selected: SelectedQuestion[]; targetCount: number } {
  const { pool, slots, getReviewQuestion } = args;
  const chosenIds = new Set(args.chosenIds);
  const usedCognitiveDemands = new Set<string>();
  const selected: SelectedQuestion[] = [];

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
        if (!reviewQuestion) continue; // no eligible review question -> slot simply not filled (§8.3)
        chosenIds.add(reviewQuestion.id);
        if (reviewQuestion.demands) usedCognitiveDemands.add(reviewQuestion.demands.cognitiveDemand);
        selected.push({ question: reviewQuestion, slot: 'review', reason: { slot: 'review', explanation: explanationFor('review', reviewQuestion) } });
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
          reason: { slot: result.slotType, explanation: explanationFor(result.slotType, result.question) },
        });
        continue;
      }

      const question = fillNonStretchSlot(pool, slot, { ...args, chosenIds }, usedCognitiveDemands, extra.beliefSnapshot);
      if (!question) continue; // rung 5: skip this slot rather than duplicate or throw
      chosenIds.add(question.id);
      if (question.demands) usedCognitiveDemands.add(question.demands.cognitiveDemand);
      selected.push({ question, slot: slotType, reason: { slot: slotType, explanation: explanationFor(slotType, question) } });
    }
  }

  return { selected, targetCount: selected.length };
}
