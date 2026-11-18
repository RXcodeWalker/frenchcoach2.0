// ── Coach outcome log: storage half ──────────────────────────────────────────────
//
// Reads and writes the pure log (domain/coachOutcomes/outcomeLog.ts) under the
// account-scoped `coachOutcomeLog` key. Home calls recordCoachMoveShown once a
// move has been on screen for a moment, with the same CoachInput the brief was
// decided from.
//
// LOCAL ONLY: not synced (learner_state's key list is a database CHECK, so a new
// key is a backend migration — not done yet), never sent in a request body, no
// analytics event. Removed by deleteMyAccount(). Ids and numbers only.

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { examTotalOutOf40 } from '../../features/progress/progressSummary';
import {
  parseOutcomeLog,
  stepOutcomeLog,
  type CoachOutcomeLog,
  type OutcomeObservation,
  type OutcomeSession,
} from '../../domain/coachOutcomes/outcomeLog';
import type { StoredSession } from '../analytics/analyticsService';
import type { CoachInput, CoachMove } from './coachBrain';

export function readCoachOutcomeLog(): CoachOutcomeLog {
  return parseOutcomeLog(storageGet<unknown>(STORAGE_KEYS.coachOutcomeLog, null));
}

function toOutcomeSession(s: StoredSession): OutcomeSession {
  return {
    id: s.id,
    date: s.date,
    mode: s.mode,
    topicKey: s.topicKey,
    ...(s.practiceOnly !== undefined ? { practiceOnly: s.practiceOnly } : {}),
    examTotal: s.mode === 'exam' ? examTotalOutOf40(s) : null,
    ...(s.examMarks ? { examMarks: s.examMarks } : {}),
  };
}

/** The observation the log settles against, from the coach's own input. */
export function observationFromCoachInput(input: CoachInput, now: number): OutcomeObservation {
  return {
    now,
    sessions: input.sessions.map(toOutcomeSession),
    skills: input.skills,
    topicStats: input.topicStats,
  };
}

/** Home showed `move`: settle follows/outcomes, then log the show. Never throws. */
export function recordCoachMoveShown(move: CoachMove | null, input: CoachInput, now: number = Date.now()): void {
  try {
    const before = readCoachOutcomeLog();
    const after = stepOutcomeLog(before, move, observationFromCoachInput(input, now));
    if (after !== before) storageSet(STORAGE_KEYS.coachOutcomeLog, after);
  } catch {
    // The log is bookkeeping; Home works without it.
  }
}
