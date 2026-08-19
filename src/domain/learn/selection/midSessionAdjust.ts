// ── midSessionAdjust — docs §8.4. Pure: bounded, safe, at most one adjustment
// per session, replacement-only (never changes targetCount), never touches
// answered or review slots. ──────────────────────────────────────────────────
//
// docs §8.4 specifies the ease/raise trigger as "score < 5" / "score >= 8" OR
// "zero demands met" / "all measurable demands met" respectively. The demand
// clause requires evaluateDemandSatisfaction (§9.3) to be wired into the real
// grading path against resolved Question.demands — that wiring is Stage 8
// ("AI grading + the trust boundary"), which comes after this stage, and
// Question.demands is not yet populated on any runtime question object. This
// module therefore implements the score-only half of the trigger; the demand
// clause is deferred to Stage 8, where real per-attempt demand-satisfaction
// data will exist to extend detectDirection().

import type { ActiveSession, Question, SessionQuestion } from '../../../types';
import type { CognitiveDemand } from '../demand/types';
import { selectQuestions } from './selectQuestions';
import type { SessionSlot } from './types';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';

const MIN_QUESTION_INDEX_FOR_ADJUST = 2; // "never before question 3" (1-indexed) == currentIndex >= 2
const EASE_STREAK = 2;
const RAISE_STREAK = 3;
const EASE_SCORE_THRESHOLD = 5;
const RAISE_SCORE_THRESHOLD = 8;
const BAND_EASE_SHIFT = 1.0;

export type MidSessionDirection = 'ease' | 'raise';

export interface MidSessionAdjustArgs {
  session: ActiveSession;
  /** This topic's candidate pool — same pool the original selection drew from (docs §8.3: never cross-topic). */
  pool: Question[];
  seenIds: Set<string>;
  focusSkillIds: string[];
  activeDemandProblem: CognitiveDemand | null;
  beliefSnapshot: EvidenceBeliefSnapshot | null;
  /** Guards the "at most one per session" rule — caller tracks this across the session lifetime. */
  alreadyAdjustedThisSession: boolean;
}

export interface MidSessionAdjustResult {
  /** The session with any eligible pending, non-review slots replaced. Identical (===) to the input session when no-op. */
  session: ActiveSession;
  /** True only when at least one slot actually changed — callers must not toast when this is false. */
  changed: boolean;
  direction: MidSessionDirection | null;
}

/** Completed main-attempt scores in session order, most recent last. Follow-up attempts aren't separate SessionQuestions, so this reads bestScore per completed question — consistent with how SessionSummary/topic mastery already treat bestScore as "this question's real result". */
function recentMainScores(session: ActiveSession): number[] {
  return session.questions
    .slice(0, session.currentIndex)
    .filter((sq) => sq.status === 'completed')
    .map((sq) => sq.bestScore)
    .filter((score): score is number => score !== null);
}

function lastNConsecutive(scores: number[], n: number, predicate: (score: number) => boolean): boolean {
  if (scores.length < n) return false;
  return scores.slice(-n).every(predicate);
}

function detectDirection(session: ActiveSession): MidSessionDirection | null {
  const scores = recentMainScores(session);
  if (lastNConsecutive(scores, EASE_STREAK, (s) => s < EASE_SCORE_THRESHOLD)) return 'ease';
  if (lastNConsecutive(scores, RAISE_STREAK, (s) => s >= RAISE_SCORE_THRESHOLD)) return 'raise';
  return null;
}

function easedBand(band: SessionSlot['band']): SessionSlot['band'] {
  if (!band) return band;
  return { lo: band.lo - BAND_EASE_SHIFT, hi: band.hi - BAND_EASE_SHIFT };
}

/** Slots eligible for replacement: pending, strictly after currentIndex, never the review slot (docs §8.4). */
function eligibleIndices(session: ActiveSession): number[] {
  return session.questions
    .map((sq, i) => ({ sq, i }))
    .filter(({ sq, i }) => i > session.currentIndex && sq.status === 'pending' && !sq.isReview)
    .map(({ i }) => i);
}

function fillSlot(
  slot: SessionSlot,
  chosenIds: Set<string>,
  args: MidSessionAdjustArgs,
): Question | null {
  const { selected } = selectQuestions(
    {
      pool: args.pool,
      slots: [slot],
      chosenIds,
      seenIds: args.seenIds,
      focusSkillIds: args.focusSkillIds,
      activeDemandProblem: args.activeDemandProblem,
      getReviewQuestion: () => null, // review slots are never eligible for mid-session replacement
    },
    { beliefSnapshot: args.beliefSnapshot },
  );
  return selected.length > 0 ? selected[0].question : null;
}

function replacementSessionQuestion(question: Question, slotType: SessionQuestion['slotType'], slotBand: SessionQuestion['slotBand']): SessionQuestion {
  return {
    question,
    status: 'pending',
    attempts: [],
    bestScore: null,
    savedVocab: [],
    isReview: false,
    slotType,
    slotBand,
  };
}

/**
 * docs §8.4. Pure. At most one adjustment per session (`alreadyAdjustedThisSession`
 * guards this — callers must persist that flag once `changed` comes back true),
 * never before question 3 (currentIndex >= 2, 0-indexed), never replaces an
 * answered or review slot, never changes targetCount (replacement only, same
 * length array).
 *
 * - ease: every eligible remaining 'stretch' slot becomes 'target' (band
 *   dropped per the target band-shift rule below); every eligible remaining
 *   'target' slot's band drops by 1.0.
 * - raise: exactly one eligible remaining 'target' slot becomes 'stretch'
 *   (subject to §8.1's provenance rule — selectQuestions' fillStretchSlot
 *   already enforces "no trusted candidate -> downgrade to target", so a
 *   raise attempt that finds nothing trusted silently keeps the slot at
 *   'target' rather than forcing an inferred question into stretch).
 *
 * Slots without a tracked `slotType` (legacy-path sessions, or any question
 * predating this field) are left untouched — there's nothing to adjust.
 * If a slot's adjusted band yields no candidate, that slot is left as-is
 * (§8.4 fallback). If no slot actually changed, this is a true no-op:
 * `changed: false` and `session` is returned unchanged (===), so callers
 * know never to fire the toast for a change that didn't happen.
 */
export function midSessionAdjust(args: MidSessionAdjustArgs): MidSessionAdjustResult {
  const { session, alreadyAdjustedThisSession } = args;

  if (alreadyAdjustedThisSession || session.currentIndex < MIN_QUESTION_INDEX_FOR_ADJUST) {
    return { session, changed: false, direction: null };
  }

  const direction = detectDirection(session);
  if (!direction) {
    return { session, changed: false, direction: null };
  }

  const eligible = eligibleIndices(session);

  const raiseTargetIndex = direction === 'raise'
    ? eligible.find((i) => session.questions[i].slotType === 'target') ?? null
    : null;

  const chosenIds = new Set<string>(args.seenIds);
  for (const sq of session.questions) chosenIds.add(sq.question.id);

  const updatedQuestions: SessionQuestion[] = [...session.questions];
  let changed = false;

  for (const i of eligible) {
    const sq = session.questions[i];
    const slotType = sq.slotType;
    if (!slotType) continue; // no tracked slot metadata -> nothing to adjust (legacy path)

    let desiredSlot: SessionSlot | null = null;

    if (direction === 'ease') {
      if (slotType === 'stretch') {
        desiredSlot = { type: 'target', band: sq.slotBand ?? null };
      } else if (slotType === 'target') {
        desiredSlot = { type: 'target', band: easedBand(sq.slotBand ?? null) };
      } else {
        continue; // warmup/choice bands are untouched by the ease rule (§8.4)
      }
    } else {
      if (i !== raiseTargetIndex) continue; // raise only touches the one chosen target slot
      desiredSlot = { type: 'stretch', band: sq.slotBand ?? null };
    }

    const replacement = fillSlot(desiredSlot, chosenIds, args);
    if (!replacement || replacement.id === sq.question.id) {
      continue; // no candidate fits the adjusted band, or the pick is unchanged -> leave as-is (§8.4 fallback)
    }

    chosenIds.delete(sq.question.id);
    chosenIds.add(replacement.id);

    updatedQuestions[i] = replacementSessionQuestion(replacement, desiredSlot.type, desiredSlot.band);
    changed = true;
  }

  if (!changed) {
    return { session, changed: false, direction: null };
  }

  return {
    session: { ...session, questions: updatedQuestions },
    changed: true,
    direction,
  };
}
