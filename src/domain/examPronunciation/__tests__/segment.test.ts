import { describe, it, expect } from 'vitest';
import { segmentSpeechTurns, isSpeechTurn, PRONUNCIATION_PARTS } from '../segment';
import type { ConductLogEntry } from '../../igcse/session/types';
import type { SessionPart } from '../../igcse/stt/types';

let seq = 0;
function examiner(part: SessionPart, text = 'Question ?'): ConductLogEntry {
  seq += 1;
  return {
    kind: 'examiner', seq, atS: seq, part, action: 'READ_MAIN', questionId: 'q', variant: 'main', text,
    trigger: 'scripted',
  };
}
function candidate(
  part: SessionPart,
  overrides: Partial<Extract<ConductLogEntry, { kind: 'candidate' }>> = {},
): ConductLogEntry {
  seq += 1;
  return {
    kind: 'candidate', seq, startS: seq, endS: seq + 1, part, questionId: 'q',
    transcript: 'Je vais au collège', wordCount: 4, requestedRepeat: false, relevant: true,
    ...overrides,
  };
}

describe('segmentSpeechTurns', () => {
  it('groups candidate speech turns by part in conversation order, keyed by seq', () => {
    seq = 0;
    const entries = [
      examiner('rolePlay'), candidate('rolePlay'),
      examiner('rolePlay'), candidate('rolePlay', { transcript: 'Oui, bien sûr' }),
      examiner('topic1'), candidate('topic1'),
      examiner('topic2'), candidate('topic2'),
    ];
    const result = segmentSpeechTurns(entries);
    expect(result.rolePlay.map((t) => t.turnKey)).toEqual([2, 4]);
    expect(result.topic1.map((t) => t.turnKey)).toEqual([6]);
    expect(result.topic2.map((t) => t.turnKey)).toEqual([8]);
    expect(result.rolePlay[1].transcript).toBe('Oui, bien sûr');
    expect(result.rolePlay[0].part).toBe('rolePlay');
  });

  it('always returns all three parts, even when a part has no turns', () => {
    const result = segmentSpeechTurns([]);
    expect(Object.keys(result).sort()).toEqual([...PRONUNCIATION_PARTS].sort());
    expect(result.rolePlay).toEqual([]);
  });

  it('excludes typed turns (they have no audio)', () => {
    seq = 0;
    const result = segmentSpeechTurns([examiner('topic1'), candidate('topic1', { inputMode: 'text' })]);
    expect(result.topic1).toEqual([]);
  });

  it('keeps turns whose inputMode is explicitly speech or absent', () => {
    seq = 0;
    const result = segmentSpeechTurns([
      candidate('topic1', { inputMode: 'speech' }),
      candidate('topic1'),
    ]);
    expect(result.topic1).toHaveLength(2);
  });

  it('excludes repeat requests, clarification requests, "je ne sais pas" and non-French turns', () => {
    seq = 0;
    const result = segmentSpeechTurns([
      candidate('topic1', { requestedRepeat: true }),
      candidate('topic1', { intent: 'repeat_request' }),
      candidate('topic1', { intent: 'clarification_request' }),
      candidate('topic1', { intent: 'dont_know' }),
      candidate('topic1', { intent: 'non_french' }),
      candidate('topic1', { intent: 'answer' }),
    ]);
    expect(result.topic1.map((t) => t.turnKey)).toEqual([6]);
  });

  it('excludes silent / blank skipped turns', () => {
    seq = 0;
    const result = segmentSpeechTurns([
      candidate('topic2', { transcript: '', wordCount: 0, relevant: false }),
      candidate('topic2', { transcript: '   ' }),
    ]);
    expect(result.topic2).toEqual([]);
  });

  it('never includes examiner entries', () => {
    seq = 0;
    const entries = [examiner('rolePlay')];
    expect(isSpeechTurn(entries[0])).toBe(false);
    expect(segmentSpeechTurns(entries).rolePlay).toEqual([]);
  });

  it('does not mutate its input', () => {
    seq = 0;
    const entries = [examiner('topic1'), candidate('topic1')];
    const snapshot = JSON.stringify(entries);
    segmentSpeechTurns(entries);
    expect(JSON.stringify(entries)).toBe(snapshot);
  });
});
