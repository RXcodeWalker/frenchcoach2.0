import { describe, expect, it } from 'vitest';
import { buildEvidenceSubset } from '../../evidence/buildEvidence';
import { checkInsufficientEvidence } from '../insufficientEvidence';
import {
  CLEAN_NO_TIMING_TRANSCRIPT,
  LOW_DURATION_TRANSCRIPT,
  LOW_WORD_COUNT_TRANSCRIPT,
} from './synthetic';

describe('checkInsufficientEvidence', () => {
  it('fires on low word count with no timing (word sub-check only)', () => {
    const evidence = buildEvidenceSubset(LOW_WORD_COUNT_TRANSCRIPT);
    const triggers = checkInsufficientEvidence(evidence);

    expect(triggers.length).toBe(1);
    expect(triggers[0]).toMatchObject({
      id: 'insufficient_evidence_duration',
      durationInsufficient: false,
      wordCountInsufficient: true,
    });
  });

  it('fires on low duration with sufficient word count (duration sub-check only)', () => {
    const evidence = buildEvidenceSubset(LOW_DURATION_TRANSCRIPT);
    const triggers = checkInsufficientEvidence(evidence);

    expect(triggers.length).toBe(1);
    expect(triggers[0]).toMatchObject({
      id: 'insufficient_evidence_duration',
      durationInsufficient: true,
      wordCountInsufficient: false,
    });
  });

  it('stays silent on a normal-length transcript', () => {
    const evidence = buildEvidenceSubset(CLEAN_NO_TIMING_TRANSCRIPT);
    const triggers = checkInsufficientEvidence(evidence);
    expect(triggers).toEqual([]);
  });

  it('does not trip the duration sub-check when timing is entirely absent (0s is not a penalty)', () => {
    const evidence = buildEvidenceSubset(CLEAN_NO_TIMING_TRANSCRIPT);
    const totalDuration = evidence.topicConversationDurationByConversation.reduce(
      (sum, c) => sum + c.candidateSpeakingDurationS,
      0,
    );
    expect(totalDuration).toBe(0);

    const triggers = checkInsufficientEvidence(evidence);
    expect(triggers).toEqual([]);
  });
});
