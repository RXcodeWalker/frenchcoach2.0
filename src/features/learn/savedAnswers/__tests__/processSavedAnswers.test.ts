import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryBackend, listSavedAnswers, saveAnswer, setSavedAnswerBackend } from '../../../../services/offline/savedAnswers';
import { processSavedAnswers } from '../processSavedAnswers';
import type { AnswerTranscription } from '../../answerTranscription';

const save = (questionId: string, at: string) =>
  saveAnswer(
    {
      scope: 'user-1',
      questionId,
      topicKey: 'school',
      questionText: `Question ${questionId}`,
      durationSec: 10,
      audio: new Blob([new Uint8Array([1])], { type: 'audio/webm' }),
    },
    new Date(at),
  );

const whisper = (text: string): AnswerTranscription => ({ primaryText: text, secondaryText: '', source: 'whisper', fallbackReason: null });
const fallback = (reason: AnswerTranscription['fallbackReason']): AnswerTranscription => ({ primaryText: '', secondaryText: '', source: 'live-captions', fallbackReason: reason });

beforeEach(() => setSavedAnswerBackend(memoryBackend()));
afterEach(() => setSavedAnswerBackend(null));

describe('processSavedAnswers — the upload once back online', () => {
  it('transcribes waiting answers oldest first, with the question as context and no captions', async () => {
    await save('b', '2026-11-03T11:00:00Z');
    await save('a', '2026-11-03T10:00:00Z');
    const transcribe = vi.fn(async ({ questionText }: { questionText: string }) => whisper(`réponse à ${questionText}`));
    const result = await processSavedAnswers('user-1', { transcribe, isOnline: () => true });
    expect(result).toEqual({ transcribed: 2, unclear: 0, stoppedBy: 'done' });
    expect(transcribe.mock.calls.map((c) => c[0].questionText)).toEqual(['Question a', 'Question b']);
    expect(transcribe.mock.calls[0][0]).toMatchObject({ liveText: '', earlierAnswers: [] });
    const items = await listSavedAnswers('user-1');
    expect(items.map((i) => [i.status, i.transcript])).toEqual([
      ['ready', 'réponse à Question a'],
      ['ready', 'réponse à Question b'],
    ]);
  });

  it('marks a recording with no readable speech as unclear', async () => {
    await save('a', '2026-11-03T10:00:00Z');
    await processSavedAnswers('user-1', { transcribe: async () => fallback('asr-rejected'), isOnline: () => true });
    expect((await listSavedAnswers('user-1'))[0].status).toBe('unclear');
  });

  it.each(['asr-failed', 'asr-timeout', 'quota', 'consent'] as const)('leaves it waiting and stops on %s', async (reason) => {
    await save('a', '2026-11-03T10:00:00Z');
    await save('b', '2026-11-03T11:00:00Z');
    const transcribe = vi.fn(async () => fallback(reason));
    const result = await processSavedAnswers('user-1', { transcribe, isOnline: () => true });
    expect(result.stoppedBy).toBe('failed');
    expect(transcribe).toHaveBeenCalledTimes(1);
    const items = await listSavedAnswers('user-1');
    expect(items.map((i) => i.status)).toEqual(['waiting', 'waiting']);
    expect(items[0].uploadAttempts).toBe(1);
  });

  it('treats a thrown error as a failed upload', async () => {
    await save('a', '2026-11-03T10:00:00Z');
    const result = await processSavedAnswers('user-1', { transcribe: async () => { throw new Error('boom'); }, isOnline: () => true });
    expect(result.stoppedBy).toBe('failed');
    expect((await listSavedAnswers('user-1'))[0].status).toBe('waiting');
  });

  it('does nothing while offline', async () => {
    await save('a', '2026-11-03T10:00:00Z');
    const transcribe = vi.fn();
    const result = await processSavedAnswers('user-1', { transcribe, isOnline: () => false });
    expect(result.stoppedBy).toBe('offline');
    expect(transcribe).not.toHaveBeenCalled();
  });

  it('skips answers already transcribed, and runs once at a time', async () => {
    await save('a', '2026-11-03T10:00:00Z');
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const transcribe = vi.fn(async () => { await gate; return whisper('Bonjour'); });
    const first = processSavedAnswers('user-1', { transcribe, isOnline: () => true });
    const second = processSavedAnswers('user-1', { transcribe, isOnline: () => true });
    expect(second).toBe(first);
    release();
    await first;
    await processSavedAnswers('user-1', { transcribe, isOnline: () => true });
    expect(transcribe).toHaveBeenCalledTimes(1);
  });
});
