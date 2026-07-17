import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resolveQuestionSet,
  resolveAndVerifyQuestionSet,
  QuestionSetNotFoundError,
  QuestionSetHashMismatchError,
} from '../resolveQuestionSet';
import { toSessionQuestionSet } from '../../src/data/exam/bank/adapter';
import { ORIGINAL_PRACTICE_001 } from '../../src/data/exam/bank/fixtures/original-practice-001';
import { hashQuestionSet } from '../../src/domain/igcse/content/hashQuestionSet';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('resolveQuestionSet', () => {
  it('falls back to the in-repo fixture when the backend is unreachable', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network down'))) as unknown as typeof fetch;

    const resolved = await resolveQuestionSet(ORIGINAL_PRACTICE_001.questionSetId);
    expect(resolved).toEqual(toSessionQuestionSet(ORIGINAL_PRACTICE_001));
  });

  it('throws QuestionSetNotFoundError for an unknown id with no fixture', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network down'))) as unknown as typeof fetch;

    await expect(resolveQuestionSet('does-not-exist')).rejects.toThrow(QuestionSetNotFoundError);
  });
});

describe('resolveAndVerifyQuestionSet', () => {
  it('resolves when the expected hash matches the resolved set', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network down'))) as unknown as typeof fetch;

    const expected = await hashQuestionSet(toSessionQuestionSet(ORIGINAL_PRACTICE_001));
    const resolved = await resolveAndVerifyQuestionSet(ORIGINAL_PRACTICE_001.questionSetId, expected);
    expect(resolved).toEqual(toSessionQuestionSet(ORIGINAL_PRACTICE_001));
  });

  it('throws QuestionSetHashMismatchError when the declared hash does not match', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network down'))) as unknown as typeof fetch;

    await expect(
      resolveAndVerifyQuestionSet(ORIGINAL_PRACTICE_001.questionSetId, '0'.repeat(64)),
    ).rejects.toThrow(QuestionSetHashMismatchError);
  });
});
