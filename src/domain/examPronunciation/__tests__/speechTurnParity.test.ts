/**
 * The scored pipeline keeps its own copy of the speech-turn predicate (it may
 * not import this feature). This is the only place the two are compared.
 */
import { describe, expect, it } from 'vitest';
import { isBatchAsrTurn } from '../../igcse/session/recognition';
import type { ConductLogCandidateEntry, ConductLogEntry } from '../../igcse/session/types';
import { isSpeechTurn } from '../segment';

const base: ConductLogCandidateEntry = {
  kind: 'candidate', seq: 2, startS: 0, endS: 3, part: 'topic1', questionId: 'q1',
  transcript: 'Je mange', wordCount: 2, requestedRepeat: false, relevant: true,
};

const CASES: ConductLogEntry[] = [
  base,
  { ...base, intent: 'answer' },
  { ...base, inputMode: 'speech' },
  { ...base, inputMode: 'text' },
  { ...base, requestedRepeat: true },
  { ...base, intent: 'repeat_request' },
  { ...base, intent: 'clarification_request' },
  { ...base, intent: 'non_french' },
  { ...base, intent: 'dont_know' },
  { ...base, transcript: '' },
  { ...base, transcript: '  \n ' },
  { kind: 'examiner', seq: 1, atS: 0, part: 'topic1', action: 'READ_MAIN', questionId: 'q1', variant: 'main', text: 'Q', trigger: 'scripted' },
];

describe('isBatchAsrTurn agrees with isSpeechTurn', () => {
  it.each(CASES.map((c, i) => [i, c] as const))('case %i', (_i, entry) => {
    expect(isBatchAsrTurn(entry)).toBe(isSpeechTurn(entry));
  });
});
