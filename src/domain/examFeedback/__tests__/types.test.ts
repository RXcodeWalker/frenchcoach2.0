/**
 * The report carries no mark, band, grade, score or total (ADR 0009). The only
 * numeric field is `errorIndex`, an index into the envelope's QoL error list.
 */
import { describe, expect, it } from 'vitest';
import type { ExamFeedbackQolError, ExamFeedbackReport } from '../types';

type DeepContainsNumber<T> = T extends number
  ? true
  : T extends string | boolean | null | undefined
    ? false
    : T extends readonly (infer U)[]
      ? DeepContainsNumber<U>
      : T extends object
        ? { [K in keyof T]: DeepContainsNumber<T[K]> }[keyof T]
        : false;

type WithoutErrorIndex<T> = T extends ExamFeedbackQolError
  ? Omit<T, 'errorIndex'>
  : T extends readonly (infer U)[]
    ? WithoutErrorIndex<U>[]
    : T extends object
      ? { [K in keyof T]: WithoutErrorIndex<T[K]> }
      : T;

// Fails to compile if any report field other than errorIndex becomes numeric.
const NO_NUMERIC_FIELDS: DeepContainsNumber<WithoutErrorIndex<ExamFeedbackReport>> extends false ? true : never = true;

describe('ExamFeedbackReport has no mark field', () => {
  it('type test compiled', () => {
    expect(NO_NUMERIC_FIELDS).toBe(true);
  });

  it('no key is named like a mark, band, grade, score or total', () => {
    const keys = ['feedbackVersion', 'rolePlay', 'tasks', 'taskId', 'reason', 'quote', 'error', 'strengths', 'nextStep', 'communication', 'qualityOfLanguage', 'errors', 'errorIndex', 'source', 'turnId', 'correction', 'category', 'claim', 'ref', 'targetDescriptor', 'targetSource'];
    for (const k of keys) expect(k).not.toMatch(/mark|band|grade|score|total/i);
  });
});
