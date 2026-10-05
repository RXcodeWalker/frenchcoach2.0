/**
 * Version pin for the fairness rules: any change to a threshold or word list
 * in FAIRNESS_CONFIG fails here until EXAM_PRONUNCIATION_VERSION is bumped
 * and FAIRNESS_CONFIG_HASH updated in the same commit (plan §2).
 */
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { FAIRNESS_CONFIG } from '../fairness';
import { EXAM_PRONUNCIATION_VERSION, FAIRNESS_CONFIG_HASH } from '../version';

describe('exam pronunciation fairness version pin', () => {
  it('EXAM_PRONUNCIATION_VERSION is exam-pronunciation-fairness-v1', () => {
    expect(EXAM_PRONUNCIATION_VERSION).toBe('exam-pronunciation-fairness-v1');
  });

  it('FAIRNESS_CONFIG matches the pinned hash', () => {
    const hash = createHash('sha256').update(JSON.stringify(FAIRNESS_CONFIG)).digest('hex');
    expect(
      hash,
      `FAIRNESS_CONFIG changed — bump EXAM_PRONUNCIATION_VERSION (currently "${EXAM_PRONUNCIATION_VERSION}") and update FAIRNESS_CONFIG_HASH`,
    ).toBe(FAIRNESS_CONFIG_HASH);
  });
});
