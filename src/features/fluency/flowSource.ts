/**
 * The fluency trainer's ONE reader of Learn's speaking log (fluency-trainer §2).
 * Every other trainer file gets the samples from here, so the log's privacy
 * allow-list (`speakingLogPrivacy.test.ts`) names a single new file.
 * Read only: the trainer never writes, edits or syncs the log.
 */

import { getSpeakingLog } from '../../services/fluency/speakingLog';
import type { FlowSample } from '../../domain/fluency/fluencyProfile';

/** Learn's spoken answers, oldest first. */
export function loadFlowSamples(): FlowSample[] {
  return getSpeakingLog();
}

/**
 * Learn questions this learner answered out loud, most recent first, without
 * repeats or follow-ups (a follow-up's id is its base question's, so the main
 * question is what the drill asks again).
 */
export function recentSpokenQuestionIds(limit = 4): string[] {
  const seen = new Set<string>();
  const ids: string[] = [];
  for (const s of [...getSpeakingLog()].reverse()) {
    if (s.followUp || seen.has(s.questionId)) continue;
    seen.add(s.questionId);
    ids.push(s.questionId);
    if (ids.length >= limit) break;
  }
  return ids;
}
