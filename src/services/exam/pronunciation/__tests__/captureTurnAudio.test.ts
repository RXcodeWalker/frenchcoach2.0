import { describe, it, expect, beforeEach, vi } from 'vitest';
import { captureTurnAudio } from '../captureTurnAudio';
import { getTurnAudio, getTurnAudioKeys, clearAllExamAudio } from '../examAudioStore';
import type { ConductLogEntry } from '../../../../domain/igcse/session/types';

const blob = () => new Blob([new Uint8Array(8)], { type: 'audio/webm' });

function examiner(seq: number): ConductLogEntry {
  return {
    kind: 'examiner', seq, atS: seq, part: 'topic1', action: 'READ_MAIN', questionId: 'q', variant: 'main',
    text: 'Que fais-tu ?', trigger: 'scripted',
  };
}
function candidate(seq: number, overrides: Partial<Extract<ConductLogEntry, { kind: 'candidate' }>> = {}): ConductLogEntry {
  return {
    kind: 'candidate', seq, startS: seq, endS: seq + 1, part: 'topic1', questionId: 'q',
    transcript: 'Je joue au football', wordCount: 4, requestedRepeat: false, relevant: true,
    ...overrides,
  };
}

describe('captureTurnAudio', () => {
  beforeEach(() => clearAllExamAudio());

  it('stores the blob under the last candidate entry\'s seq, even with examiner entries after it', async () => {
    const b = blob();
    // submitTurn appends the candidate entry and then the examiner's next action.
    const entries = [examiner(1), candidate(2), examiner(3)];
    await captureTurnAudio('s1', entries, Promise.resolve(b));
    expect(getTurnAudioKeys('s1')).toEqual([2]);
    expect(getTurnAudio('s1', 2)).toBe(b);
  });

  it('keys each turn separately across a session', async () => {
    const a = blob(), b = blob();
    await captureTurnAudio('s1', [examiner(1), candidate(2), examiner(3)], Promise.resolve(a));
    await captureTurnAudio('s1', [examiner(1), candidate(2), examiner(3), candidate(4), examiner(5)], Promise.resolve(b));
    expect(getTurnAudio('s1', 2)).toBe(a);
    expect(getTurnAudio('s1', 4)).toBe(b);
  });

  it('stores nothing for a typed turn', async () => {
    await captureTurnAudio('s1', [examiner(1), candidate(2, { inputMode: 'text' })], Promise.resolve(blob()));
    expect(getTurnAudioKeys('s1')).toEqual([]);
  });

  it('stores nothing for a repeat request or a non-answer intent', async () => {
    await captureTurnAudio('s1', [candidate(2, { requestedRepeat: true })], Promise.resolve(blob()));
    await captureTurnAudio('s1', [candidate(4, { intent: 'repeat_request' })], Promise.resolve(blob()));
    await captureTurnAudio('s1', [candidate(6, { intent: 'dont_know' })], Promise.resolve(blob()));
    expect(getTurnAudioKeys('s1')).toEqual([]);
  });

  it('stores nothing when the log has no candidate entry yet (greeting reply is never logged)', async () => {
    await captureTurnAudio('s1', [examiner(1)], Promise.resolve(blob()));
    await captureTurnAudio('s1', [], Promise.resolve(blob()));
    expect(getTurnAudioKeys('s1')).toEqual([]);
  });

  it('stores nothing when there was no recording (denied mic → null blob)', async () => {
    await captureTurnAudio('s1', [candidate(2)], Promise.resolve(null));
    expect(getTurnAudioKeys('s1')).toEqual([]);
  });

  it('never rejects when the blob promise rejects', async () => {
    await expect(
      captureTurnAudio('s1', [candidate(2)], Promise.reject(new Error('recorder died'))),
    ).resolves.toBeUndefined();
    expect(getTurnAudioKeys('s1')).toEqual([]);
  });

  it('returns synchronously — the store is filled only when the blob promise settles', async () => {
    let release!: (b: Blob) => void;
    const pending = new Promise<Blob>((resolve) => { release = resolve; });
    const done = captureTurnAudio('s1', [candidate(2)], pending);
    expect(getTurnAudioKeys('s1')).toEqual([]);
    release(blob());
    await done;
    expect(getTurnAudioKeys('s1')).toEqual([2]);
  });

  describe('onStored (hook for the exam batch ASR)', () => {
    it('is called once with the turn key, the blob and the live captions after the blob is stored', async () => {
      const b = blob();
      const seen: Array<{ turnKey: number; blob: Blob; liveText: string }> = [];
      await captureTurnAudio('s1', [examiner(1), candidate(2), examiner(3)], Promise.resolve(b), (t) => {
        expect(getTurnAudio('s1', 2)).toBe(b); // already stored when the hook runs
        seen.push(t);
      });
      expect(seen).toEqual([{ turnKey: 2, blob: b, liveText: 'Je joue au football' }]);
    });

    it('is not called for typed or non-answer turns, an empty blob, a null blob or a failed recording', async () => {
      const hook = vi.fn();
      await captureTurnAudio('s1', [candidate(2, { inputMode: 'text' })], Promise.resolve(blob()), hook);
      await captureTurnAudio('s1', [candidate(4, { intent: 'dont_know' })], Promise.resolve(blob()), hook);
      await captureTurnAudio('s1', [candidate(6)], Promise.resolve(new Blob([])), hook);
      await captureTurnAudio('s1', [candidate(8)], Promise.resolve(null), hook);
      await captureTurnAudio('s1', [candidate(10)], Promise.reject(new Error('mic gone')), hook);
      expect(hook).not.toHaveBeenCalled();
    });
  });
});
