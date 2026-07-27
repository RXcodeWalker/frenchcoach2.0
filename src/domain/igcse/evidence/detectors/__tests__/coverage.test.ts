import { describe, expect, it } from 'vitest';
import { coverageDetector } from '../coverage';
import { LEGACY_DETECTORS } from '../../framework/legacyDetectors';
import { PHASE3_DETECTORS } from '../../framework/phase3Detectors';
import { DetectorRegistry } from '../../framework/registry';
import { runDetectors } from '../../framework/runner';
import { oneResponseTranscript } from './fixtures';
import type { SessionQuestionSet } from '../../../session/types';

const FULL_FLEET = [...LEGACY_DETECTORS, ...PHASE3_DETECTORS];

function questionSet(mainText: string): SessionQuestionSet {
  return {
    questionSetId: 'qs-1',
    questions: [
      { questionId: 'q1', part: 'topic1', mainText, alternativeTexts: [] },
    ],
    furtherQuestions: { topic1: ['', ''], topic2: ['', ''] },
  };
}

describe('coverage detector', () => {
  it('returns empty when no question set is supplied (graceful degrade, not a failure)', () => {
    const transcript = oneResponseTranscript('je joue au foot');
    const registry = new DetectorRegistry(FULL_FLEET);
    const result = runDetectors(registry, { transcript, questionSet: null });
    const coverageRun = result.detectorRuns.find((r) => r.detectorId === 'coverage');
    expect(coverageRun?.state).toBe('success');
    expect(result.observations.filter((o) => o.detectorId === 'coverage')).toEqual([]);
  });

  it('flags content-word overlap between response and question prompt', () => {
    const transcript = oneResponseTranscript("j'aime jouer au football avec mes amis");
    const registry = new DetectorRegistry(FULL_FLEET);
    const result = runDetectors(registry, {
      transcript,
      questionSet: questionSet('Est-ce que tu aimes jouer au football ?'),
    });
    const hits = result.observations.filter((o) => o.detectorId === 'coverage');
    expect(hits.some((o) => o.value === 'football')).toBe(true);
  });

  it('does not flag rolePlay units (topic conversations only)', () => {
    expect(coverageDetector.dependsOn).toEqual(['tokenize']);
  });
});
