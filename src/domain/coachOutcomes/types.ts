// ── Coach move types shared by the coach brain and its outcome log ──────────────
//
// The canonical list of coach move kinds and the structured evidence a move
// cites. They live here (pure, no app imports) so the outcome log
// (outcomeLog.ts) can reason about moves without importing the service layer;
// services/coach/coachBrain.ts re-exports them.

export type CoachMoveKind =
  | 'first_steps'
  | 'fix_mistake'
  | 'exam_sim'
  | 'role_play'
  /** Learn questions that want an opinion and a reason — the two-part habit role-play tasks need. */
  | 'two_part_answers'
  /** A Coached Practice exam (commentary after every answer; does not count, ADR-0007). */
  | 'coached_exam'
  | 'develop_answers'
  | 'weak_skill'
  | 'review'
  | 'new_topic'
  | 'keep_going';

export type CoachExamAreaKey = 'rolePlay' | 'communication' | 'qualityOfLanguage';

/**
 * The numbers a move's `why` sentence is built from, as data. Only what the
 * move actually cited is present. Read-only copies of marks the learner has
 * already seen — nothing here is a new mark.
 */
export interface CoachMoveEvidence {
  /** The skill the move targets: mastery 0–1 and how many observations it rests on (null when the coach had no belief yet). */
  skill?: { id: string; mastery: number | null; evidenceCount: number | null; trend: string | null };
  /** The weak exam area the move cites: the last mark/max and the share it was judged on. */
  examArea?: { key: CoachExamAreaKey; mark: number; max: number; share: number; basis: 'latest' | 'recent' };
  /** The latest counted Exam Sim total out of 40 (null before the first). Exam Sim moves only. */
  examTotal?: number | null;
  /** The topic the move routes to: its running average /10 (null before a scored answer) and sessions so far. */
  topic?: { key: string; averageScore: number | null; sessionsCompleted: number };
  /** Spaced-review answers due in that topic. Review moves only. */
  dueCount?: number;
  /** The lost-marks reason (domain/coachLosses/) the move's `why` leads with: its code, area and marks below the maximum. */
  lostReason?: { code: string; area: CoachExamAreaKey; marksBelowMax: number };
}
