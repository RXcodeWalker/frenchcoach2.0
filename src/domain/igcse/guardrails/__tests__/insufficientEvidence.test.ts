import { describe, expect, it } from 'vitest';
import { buildEvidenceSubset } from '../../evidence/buildEvidence';
import { checkInsufficientEvidence } from '../insufficientEvidence';
import {
  CLEAN_NO_TIMING_TRANSCRIPT,
  LOW_DURATION_TRANSCRIPT,
  LOW_WORD_COUNT_TRANSCRIPT,
  MIXED_TYPED_SPEECH_TRANSCRIPT,
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

  it('W1: does not trip the duration sub-check on a mixed speech/text session — low combined duration is explained by typed turns, not insufficient speaking', () => {
    const evidence = buildEvidenceSubset(MIXED_TYPED_SPEECH_TRANSCRIPT);
    const totals = evidence.topicConversationDurationByConversation.reduce(
      (acc, c) => ({
        durationS: acc.durationS + c.candidateSpeakingDurationS,
        wordCount: acc.wordCount + c.candidateWordCount,
        typedTurnCount: acc.typedTurnCount + c.typedTurnCount,
      }),
      { durationS: 0, wordCount: 0, typedTurnCount: 0 },
    );
    // Sanity-check the fixture actually exercises the hazard: low duration
    // (would have tripped the old, typed-blind check), sufficient words, and
    // at least one typed turn.
    expect(totals.durationS).toBeGreaterThan(0);
    expect(totals.durationS).toBeLessThan(240);
    expect(totals.wordCount).toBeGreaterThanOrEqual(200);
    expect(totals.typedTurnCount).toBeGreaterThan(0);

    const triggers = checkInsufficientEvidence(evidence);
    expect(triggers).toEqual([]);
  });
});
