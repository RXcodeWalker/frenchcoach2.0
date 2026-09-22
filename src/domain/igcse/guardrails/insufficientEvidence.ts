/**
 * Guardrail — insufficient-evidence duration (see docs/systems/assessment-engine.md
 * for the three-layer pipeline this guardrail belongs to). If combined
 * topic-conversation candidate material is below threshold, this fires so a
 * future phase can widen uncertainty on Communication + QoL. Role-play-only
 * material is out of scope.
 *
 * Missing-timing edge case: candidateSpeakingDurationS is 0 whenever no turn
 * carries candidateResponseDurationS (hand-authored transcripts with no
 * timing source) — see evidence/types.ts. Absence is not a penalty, so the
 * duration sub-check only applies when total duration > 0; the word-count
 * sub-check always applies. This prevents every hand-authored fixture from
 * tripping the guardrail on a 0-second false signal.
 *
 * W1 mixed speech/text edge case: a typed turn contributes real wordCount but
 * necessarily zero candidateResponseDurationS (there was nothing to time), so
 * a session that mixes typed and spoken turns under-reports combined duration
 * relative to `minCombinedDurationS` — a threshold implicitly calibrated for
 * an all-spoken session. Left alone, that under-report would spuriously trip
 * the duration sub-check even when word count is ample. So the duration
 * sub-check only applies when EVERY topic-conversation turn was spoken
 * (typedTurnCount === 0 combined) — the same "duration isn't a trustworthy
 * signal here" reasoning as the missing-timing case above, generalized to
 * "partly missing because it was typed, not spoken". The word-count sub-check
 * still always applies and is what a typed turn's evidence is judged on.
 */

import { DEFAULT_DURATION_CONFIG } from './config';
import type { EvidenceProfileSubset } from '../evidence/types';
import type { GuardrailTrigger, InsufficientEvidenceDurationConfig } from './types';

export function checkInsufficientEvidence(
  evidence: EvidenceProfileSubset,
  config: InsufficientEvidenceDurationConfig = DEFAULT_DURATION_CONFIG,
): GuardrailTrigger[] {
  const totals = evidence.topicConversationDurationByConversation.reduce(
    (acc, conv) => ({
      durationS: acc.durationS + conv.candidateSpeakingDurationS,
      wordCount: acc.wordCount + conv.candidateWordCount,
      typedTurnCount: acc.typedTurnCount + conv.typedTurnCount,
    }),
    { durationS: 0, wordCount: 0, typedTurnCount: 0 },
  );

  const durationInsufficient =
    totals.typedTurnCount === 0 && totals.durationS > 0 && totals.durationS < config.minCombinedDurationS;
  const wordCountInsufficient = totals.wordCount < config.minCombinedWordCount;

  if (!durationInsufficient && !wordCountInsufficient) {
    return [];
  }

  return [
    {
      id: 'insufficient_evidence_duration',
      message: `Combined topic-conversation candidate material below threshold (durationS=${totals.durationS}, wordCount=${totals.wordCount})`,
      durationInsufficient,
      wordCountInsufficient,
      totalDurationS: totals.durationS,
      totalWordCount: totals.wordCount,
      config,
    },
  ];
}
