import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  resolveQuestionSet,
  resolveAndVerifyQuestionSet,
  QuestionSetNotFoundError,
  QuestionSetHashMismatchError,
} from '../resolveQuestionSet';
import { toSessionQuestionSet } from '../../src/data/exam/bank/adapter';
import { ORIGINAL_PRACTICE_001 } from '../../src/data/exam/bank/fixtures/original-practice-001';
import { OFFLINE_FIXTURES } from '../../src/data/exam/bank/fixtures';
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

  it('resolves every one of the 10 bundled sets offline, not just 001', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network down'))) as unknown as typeof fetch;

    const ids = Object.keys(OFFLINE_FIXTURES);
    expect(ids).toHaveLength(10);
    for (const id of ids) {
      const resolved = await resolveQuestionSet(id);
      expect(resolved).toEqual(toSessionQuestionSet(OFFLINE_FIXTURES[id]));
    }
  });

  it('falls back to the fixture when the content API answers non-OK (e.g. 429 rate limit)', async () => {
    global.fetch = vi.fn(async () => new Response('slow down', { status: 429 })) as unknown as typeof fetch;

    const resolved = await resolveQuestionSet('original-practice-007');
    expect(resolved).toEqual(toSessionQuestionSet(OFFLINE_FIXTURES['original-practice-007']));
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

  it('hash-verifies sets 002–010 offline against their own hashes', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network down'))) as unknown as typeof fetch;

    for (const id of Object.keys(OFFLINE_FIXTURES).filter((i) => i !== ORIGINAL_PRACTICE_001.questionSetId)) {
      const expected = await hashQuestionSet(toSessionQuestionSet(OFFLINE_FIXTURES[id]));
      await expect(resolveAndVerifyQuestionSet(id, expected)).resolves.toBeDefined();
    }
  });

  it('throws QuestionSetHashMismatchError when the declared hash does not match', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('network down'))) as unknown as typeof fetch;

    await expect(
      resolveAndVerifyQuestionSet(ORIGINAL_PRACTICE_001.questionSetId, '0'.repeat(64)),
    ).rejects.toThrow(QuestionSetHashMismatchError);
  });

  it('Batch 6: accepts the FIXTURE hash even when the remote answers with different content (mid-deploy window)', async () => {
    // The remote is reachable but serves a different (already-updated) revision
    // than the fixture the candidate actually ran their attempt against.
    const differentRemote = {
      ...ORIGINAL_PRACTICE_001,
      content: {
        ...ORIGINAL_PRACTICE_001.content,
        rolePlay: { ...ORIGINAL_PRACTICE_001.content.rolePlay, setup: 'Une scène différente.' },
      },
    };
    global.fetch = vi.fn(async () => new Response(JSON.stringify(differentRemote), { status: 200 })) as unknown as typeof fetch;

    const fixtureHash = await hashQuestionSet(toSessionQuestionSet(ORIGINAL_PRACTICE_001));
    const resolved = await resolveAndVerifyQuestionSet(ORIGINAL_PRACTICE_001.questionSetId, fixtureHash);
    expect(resolved).toEqual(toSessionQuestionSet(ORIGINAL_PRACTICE_001));
  });

  it('Batch 6: accepts the REMOTE hash even when the fixture is a stale revision', async () => {
    const differentRemote = {
      ...ORIGINAL_PRACTICE_001,
      content: {
        ...ORIGINAL_PRACTICE_001.content,
        rolePlay: { ...ORIGINAL_PRACTICE_001.content.rolePlay, setup: 'Une scène différente, mais valide.' },
      },
    };
    global.fetch = vi.fn(async () => new Response(JSON.stringify(differentRemote), { status: 200 })) as unknown as typeof fetch;

    const remoteHash = await hashQuestionSet(toSessionQuestionSet(differentRemote));
    const resolved = await resolveAndVerifyQuestionSet(ORIGINAL_PRACTICE_001.questionSetId, remoteHash);
    expect(resolved).toEqual(toSessionQuestionSet(differentRemote));
  });

  it('Batch 6: still throws QuestionSetHashMismatchError when neither candidate matches', async () => {
    global.fetch = vi.fn(async () => new Response(JSON.stringify(ORIGINAL_PRACTICE_001), { status: 200 })) as unknown as typeof fetch;

    await expect(
      resolveAndVerifyQuestionSet(ORIGINAL_PRACTICE_001.questionSetId, '0'.repeat(64)),
    ).rejects.toThrow(QuestionSetHashMismatchError);
  });
});
