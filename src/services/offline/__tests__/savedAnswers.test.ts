import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_SAVED_ANSWERS,
  SavedAnswersFullError,
  deleteSavedAnswer,
  deleteSavedAnswersFor,
  getSavedAnswer,
  listSavedAnswers,
  memoryBackend,
  saveAnswer,
  savedAnswerBlob,
  setSavedAnswerBackend,
  subscribeSavedAnswers,
  updateSavedAnswer,
} from '../savedAnswers';

const answer = (scope = 'user-1', questionId = 'sch_1') => ({
  scope,
  questionId,
  topicKey: 'school',
  questionText: 'Comment est ton collège ?',
  durationSec: 12,
  audio: new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' }),
});

beforeEach(() => setSavedAnswerBackend(memoryBackend()));
afterEach(() => setSavedAnswerBackend(null));

describe('saved answers (offline Learn recordings)', () => {
  it('keeps the recording and waits for a connection', async () => {
    const saved = await saveAnswer(answer(), new Date('2026-11-03T10:00:00Z'));
    expect(saved.status).toBe('waiting');
    expect(saved.transcript).toBeNull();
    expect(saved.recordedAt).toBe('2026-11-03T10:00:00.000Z');
    const blob = savedAnswerBlob(saved);
    expect(blob.type).toBe('audio/webm');
    expect(new Uint8Array(await blob.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3, 4]));
  });

  it('lists one account’s answers only, oldest first', async () => {
    await saveAnswer(answer('user-1', 'b'), new Date('2026-11-03T11:00:00Z'));
    await saveAnswer(answer('user-1', 'a'), new Date('2026-11-03T10:00:00Z'));
    await saveAnswer(answer('guest', 'c'), new Date('2026-11-03T09:00:00Z'));
    expect((await listSavedAnswers('user-1')).map((a) => a.questionId)).toEqual(['a', 'b']);
    expect((await listSavedAnswers('guest')).map((a) => a.questionId)).toEqual(['c']);
  });

  it('never hands one account another account’s answer', async () => {
    const saved = await saveAnswer(answer('user-1'));
    expect(await getSavedAnswer(saved.id, 'user-2')).toBeNull();
    expect((await getSavedAnswer(saved.id, 'user-1'))?.id).toBe(saved.id);
  });

  it(`holds at most ${MAX_SAVED_ANSWERS} per account`, async () => {
    for (let i = 0; i < MAX_SAVED_ANSWERS; i++) await saveAnswer(answer('user-1', `q${i}`));
    await expect(saveAnswer(answer('user-1'))).rejects.toBeInstanceOf(SavedAnswersFullError);
    await expect(saveAnswer(answer('user-2'))).resolves.toBeTruthy();
  });

  it('updates, deletes and tells listeners', async () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSavedAnswers(listener);
    const saved = await saveAnswer(answer());
    await updateSavedAnswer(saved.id, { status: 'ready', transcript: 'Mon collège est grand.' });
    expect((await getSavedAnswer(saved.id, 'user-1'))?.transcript).toBe('Mon collège est grand.');
    await deleteSavedAnswer(saved.id);
    expect(await listSavedAnswers('user-1')).toEqual([]);
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
  });

  it('deletes everything for an account (account deletion)', async () => {
    await saveAnswer(answer('user-1', 'a'));
    await saveAnswer(answer('user-1', 'b'));
    await saveAnswer(answer('user-2', 'c'));
    await deleteSavedAnswersFor('user-1');
    expect(await listSavedAnswers('user-1')).toEqual([]);
    expect(await listSavedAnswers('user-2')).toHaveLength(1);
  });

  it('reads as empty when storage fails, never throws to the screen', async () => {
    setSavedAnswerBackend({
      put: () => Promise.reject(new Error('quota')),
      get: () => Promise.reject(new Error('blocked')),
      all: () => Promise.reject(new Error('blocked')),
      delete: () => Promise.reject(new Error('blocked')),
    });
    expect(await listSavedAnswers('user-1')).toEqual([]);
    expect(await getSavedAnswer('x', 'user-1')).toBeNull();
  });
});
