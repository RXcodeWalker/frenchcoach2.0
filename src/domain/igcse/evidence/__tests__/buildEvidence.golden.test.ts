import { describe, expect, it } from 'vitest';
import { EVIDENCE_GOLDEN_TRANSCRIPT } from './fixtures';
import { buildEvidenceSubset } from '../buildEvidence';

describe('buildEvidenceSubset golden regression', () => {
  it('matches expected deterministic evidence shape for golden transcript', () => {
    expect(buildEvidenceSubset(EVIDENCE_GOLDEN_TRANSCRIPT)).toEqual({
      timeFrameAlignmentByQuestion: [
        {
          questionId: 'topic1:q1',
          expectedTimeFrame: 'past',
          detectedTimeFrame: 'past',
          alignment: 'aligned',
        },
        {
          questionId: 'topic1:q2',
          expectedTimeFrame: 'future',
          detectedTimeFrame: 'future',
          alignment: 'aligned',
        },
        {
          questionId: 'topic2:q1',
          expectedTimeFrame: 'conditional',
          detectedTimeFrame: 'conditional',
          alignment: 'aligned',
        },
        {
          questionId: 'topic2:q2',
          expectedTimeFrame: 'present',
          detectedTimeFrame: 'present',
          alignment: 'aligned',
        },
      ],
      responseCountsByQuestion: [
        { questionId: 'rolePlay:t1', wordCount: 2, responseCount: 1 },
        { questionId: 'rolePlay:t2', wordCount: 8, responseCount: 1 },
        { questionId: 'rolePlay:t3', wordCount: 9, responseCount: 1 },
        { questionId: 'rolePlay:t4', wordCount: 3, responseCount: 1 },
        { questionId: 'rolePlay:t5', wordCount: 6, responseCount: 1 },
        { questionId: 'topic1:q1', wordCount: 7, responseCount: 1 },
        { questionId: 'topic1:q2', wordCount: 4, responseCount: 1 },
        { questionId: 'topic2:q1', wordCount: 6, responseCount: 1 },
        { questionId: 'topic2:q2', wordCount: 11, responseCount: 1 },
      ],
      fillerDensityByQuestion: [
        { questionId: 'rolePlay:t1', fillerCount: 0, wordCount: 2, density: 0 },
        { questionId: 'rolePlay:t2', fillerCount: 0, wordCount: 8, density: 0 },
        { questionId: 'rolePlay:t3', fillerCount: 1, wordCount: 9, density: 0.1111111111111111 },
        { questionId: 'rolePlay:t4', fillerCount: 0, wordCount: 3, density: 0 },
        { questionId: 'rolePlay:t5', fillerCount: 0, wordCount: 6, density: 0 },
        { questionId: 'topic1:q1', fillerCount: 0, wordCount: 7, density: 0 },
        { questionId: 'topic1:q2', fillerCount: 0, wordCount: 4, density: 0 },
        { questionId: 'topic2:q1', fillerCount: 0, wordCount: 6, density: 0 },
        { questionId: 'topic2:q2', fillerCount: 1, wordCount: 11, density: 0.09090909090909091 },
      ],
      rolePlayPartsByTask: [
        { taskId: 't1', partsExpected: 1, partsAddressed: 1 },
        { taskId: 't2', partsExpected: 2, partsAddressed: 2 },
        { taskId: 't3', partsExpected: 1, partsAddressed: 1 },
        { taskId: 't4', partsExpected: 1, partsAddressed: 1 },
        { taskId: 't5', partsExpected: 1, partsAddressed: 1 },
      ],
    });
  });
});
