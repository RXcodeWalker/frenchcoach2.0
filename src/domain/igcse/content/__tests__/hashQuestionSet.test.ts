/**
 * Canonicalization/hash tests (architecture doc §3.5.1, §9). Verifies
 * hashQuestionSet reproduces every hex in canonicalization-vectors.json —
 * the same file the Python seed script's implementation is asserted against
 * in backend CI, so a drift in either language fails CI before any seed.
 */

import { describe, expect, it } from 'vitest';
import { canonicalizeQuestionSet, hashQuestionSet } from '../hashQuestionSet';
import type { SessionQuestionSet } from '../../session/types';
import vectors from './canonicalization-vectors.json';

describe('hashQuestionSet canonicalization parity (TS side)', () => {
  for (const vector of vectors as unknown as { name: string; input: SessionQuestionSet; sha256: string }[]) {
    it(`reproduces the expected hash for vector "${vector.name}"`, async () => {
      const actual = await hashQuestionSet(vector.input);
      expect(actual).toBe(vector.sha256);
    });
  }

  it('NFC-folds a combining sequence to hash identically to the precomposed form', async () => {
    const combining = vectors.find((v) => v.name === 'nfc-fold-combining')!;
    const precomposed = vectors.find((v) => v.name === 'nfc-fold-precomposed')!;
    expect(combining.sha256).toBe(precomposed.sha256);
  });

  it('does NOT over-normalize: curly vs straight apostrophe hash differently', async () => {
    const curly = vectors.find((v) => v.name === 'apostrophe-curly')!;
    const straight = vectors.find((v) => v.name === 'apostrophe-straight')!;
    expect(curly.sha256).not.toBe(straight.sha256);
  });

  it('is stable across repeated runs on the same input', async () => {
    const set = (vectors.find((v) => v.name === 'full-fifteen-question-set')! as unknown as { input: SessionQuestionSet }).input;
    const h1 = await hashQuestionSet(set);
    const h2 = await hashQuestionSet(set);
    expect(h1).toBe(h2);
  });

  it('produces a canonical-bytes snapshot on a fixed input', () => {
    const set: SessionQuestionSet = {
      questionSetId: 'snapshot-set',
      questions: [
        { questionId: 'q1', part: 'topic1', mainText: 'Bonjour', alternativeTexts: ['Salut'], partsExpected: 1, topicArea: 'A', expectedTimeFrame: 'present' },
      ],
      furtherQuestions: { topic1: ['a', 'b'], topic2: ['c', 'd'] },
    };
    const bytes = canonicalizeQuestionSet(set);
    const text = new TextDecoder().decode(bytes);
    expect(text).toBe(
      [
        'question-bank-v1',
        'snapshot-set',
        ['q1', 'topic1', 'Bonjour', 'Salut', '1', '', 'present', 'A'].join(String.fromCharCode(0x1f)),
        'a',
        'b',
        'c',
        'd',
      ].join(String.fromCharCode(0x1e)),
    );
  });
});
