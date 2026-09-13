import { getStats } from '../../services/analytics/analyticsService';
import { LANGUAGE_SUCCESS_SCORE } from '../../domain/scoring';

/** UNVALIDATED product decision, not derived from data (Phase 4 plan §4.5). */
const TOPIC_MASTERY_MIN_SESSIONS = 5;

/** `byTopic[key]` counts every session tagged with this topic and a real
 * score, regardless of mode (Learn practice, exam, story, etc.) — genuine
 * spoken practice on the subject matter, not a Learn-only metric. */
export function isTopicMastered(topicKey: string): boolean {
  const entry = getStats().byTopic[topicKey];
  if (!entry) return false;
  return entry.count >= TOPIC_MASTERY_MIN_SESSIONS && entry.avg >= LANGUAGE_SUCCESS_SCORE;
}

export function isLearnTopicUnlocked(dependencies: readonly string[]): boolean {
  return dependencies.length === 0 || dependencies.every(isTopicMastered);
}
