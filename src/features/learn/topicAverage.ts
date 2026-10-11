// ── Topic mastery running average — Learn overhaul Batch 1c. Pure. ─────────────
//
// `averageScore` is a per-session mean of each completed question's bestScore,
// weighted by the number of sessions that contributed a real score. A session
// with no real score (Examiner voice, a guest past the free tries, offline) has
// nothing to add, so it never moves the average and never fabricates a 0.
//
// Legacy entries are repaired at read time only (no storage migration, no
// marker): an average of exactly 0 with no scored session behind it was
// always the fabricated default, never a real result — tier-0/1 answers are
// unscored (responseTier.ts), so a graded average can't be exactly 0. Legacy
// non-zero averages that a fake 0 already deflated can't be repaired
// deterministically and are left as they are.

import { averageRealScores } from '../../domain/scoring';
import type { TopicMasteryEntry } from '../../types';

const MASTERY_AVERAGE = 7.5;
const MASTERY_MIN_QUESTIONS = 10;

/** Read-time repair: a fabricated 0 with no scored session reads as "no average". */
export function normalizeTopicMastery(entry: TopicMasteryEntry): TopicMasteryEntry {
  if (entry.averageScore === 0 && !((entry.scoredSessionsCompleted ?? 0) > 0)) {
    return { ...entry, averageScore: null };
  }
  return entry;
}

export function normalizeTopicMasteryAll(all: Record<string, TopicMasteryEntry>): Record<string, TopicMasteryEntry> {
  const out: Record<string, TopicMasteryEntry> = {};
  for (const [key, entry] of Object.entries(all)) out[key] = normalizeTopicMastery(entry);
  return out;
}

export interface FinishedTopicSession {
  topicKey: string;
  /** bestScore of each completed question; null = unscored. */
  completedScores: (number | null)[];
  answeredIds: string[];
  now: string;
}

/** The topic entry after one finished session, and whether it just became mastered. */
export function nextTopicMastery(
  existing: TopicMasteryEntry | undefined,
  session: FinishedTopicSession,
): { entry: TopicMasteryEntry; justMastered: boolean } {
  const prior = existing ? normalizeTopicMastery(existing) : undefined;
  const allAnswered = Array.from(new Set([...(prior?.uniqueQuestionsAnswered ?? []), ...session.answeredIds]));
  const sessionAvg = averageRealScores(session.completedScores);

  const priorAvg = prior?.averageScore ?? null;
  // Weight by scoredSessionsCompleted, not sessionsCompleted — an unscored
  // session must not dilute the denominator (A6). Entries written before that
  // field existed fall back to sessionsCompleted, unless their average reads
  // as "no average", in which case no scored session stands behind it.
  const priorScoredSessions = priorAvg === null ? 0 : (prior?.scoredSessionsCompleted ?? prior?.sessionsCompleted ?? 0);

  const averageScore = sessionAvg === null
    ? priorAvg
    : priorAvg !== null && priorScoredSessions > 0
    ? (priorAvg * priorScoredSessions + sessionAvg) / (priorScoredSessions + 1)
    : sessionAvg;

  const wasMastered = prior?.mastered ?? false;
  const nowMastered = !wasMastered && averageScore !== null && averageScore >= MASTERY_AVERAGE && allAnswered.length >= MASTERY_MIN_QUESTIONS;

  const entry: TopicMasteryEntry = {
    topicKey: session.topicKey,
    sessionsCompleted: (prior?.sessionsCompleted ?? 0) + 1,
    scoredSessionsCompleted: priorScoredSessions + (sessionAvg === null ? 0 : 1),
    uniqueQuestionsAnswered: allAnswered,
    averageScore,
    lastSessionAt: session.now,
    mastered: wasMastered || nowMastered,
    masteredAt: nowMastered ? session.now : prior?.masteredAt,
    badge: (wasMastered || nowMastered) ? 'gold' : undefined,
  };
  return { entry, justMastered: nowMastered };
}
