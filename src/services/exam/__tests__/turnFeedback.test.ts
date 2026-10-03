// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { resolveRailPrompt, useExamCorrectionsRail } from '../turnFeedback';
import { AuthRequiredError } from '../../../lib/authToken';
import type { ConductLogEntry } from '../../../domain/igcse/session/types';
import type { ExaminerFeedback } from '../../coaching/examinerFeedback';

const { getExaminerFeedback } = vi.hoisted(() => ({ getExaminerFeedback: vi.fn() }));
vi.mock('../../api/apiClient', () => ({
  getExaminerFeedback,
  isExaminerQuotaExceededError: (err: unknown) => err instanceof Error && err.name === 'ExaminerQuotaExceededError',
}));

function quotaError(): Error {
  const err = new Error("You've used today's AI feedback allowance.");
  err.name = 'ExaminerQuotaExceededError';
  return err;
}

afterEach(() => {
  vi.clearAllMocks();
});

function examinerEntry(seq: number, text: string): ConductLogEntry {
  return {
    kind: 'examiner',
    seq,
    atS: seq,
    part: 'topic1',
    action: 'READ_MAIN',
    questionId: 'q1',
    variant: 'main',
    text,
    trigger: 'scripted',
  };
}

function extensionEntry(seq: number, text: string, overrides: Partial<ConductLogEntry> = {}): ConductLogEntry {
  return { ...examinerEntry(seq, text), action: 'EXTENSION_PROMPT', variant: null, ...overrides } as ConductLogEntry;
}

function candidateEntry(seq: number, transcript: string, overrides: Partial<ConductLogEntry> = {}): ConductLogEntry {
  return {
    kind: 'candidate',
    seq,
    startS: seq,
    endS: seq + 1,
    part: 'topic1',
    questionId: 'q1',
    transcript,
    wordCount: transcript.trim().split(/\s+/).filter(Boolean).length,
    requestedRepeat: false,
    relevant: true,
    ...overrides,
  } as ConductLogEntry;
}

const okFeedback: ExaminerFeedback = {
  profile: 'rail',
  turnKind: 'topic',
  errors: [{ quote: "j'aime le sport", correction: "j'aime le sport", category: 'other' }],
};

describe('useExamCorrectionsRail', () => {
  it('Exam Sim (coached=false) makes zero calls, even with a real candidate turn present', () => {
    const entries = [examinerEntry(1, 'Question?'), candidateEntry(2, "J'aime le sport parce que c'est amusant.")];
    const { result } = renderHook(() => useExamCorrectionsRail(entries, false));

    expect(getExaminerFeedback).not.toHaveBeenCalled();
    expect(result.current.entries).toEqual([]);
  });

  it('coached mode fires a call for a real candidate turn and resolves to done', async () => {
    getExaminerFeedback.mockResolvedValue(okFeedback);
    const entries = [examinerEntry(1, 'Question?'), candidateEntry(2, "J'aime le sport parce que c'est amusant.")];
    const { result } = renderHook(() => useExamCorrectionsRail(entries, true));

    await waitFor(() => expect(result.current.entries).toHaveLength(1));
    await waitFor(() => expect(result.current.entries[0].status).toBe('done'));
    expect(result.current.entries[0].result).toEqual(okFeedback);
    expect(getExaminerFeedback).toHaveBeenCalledTimes(1);
    expect(getExaminerFeedback).toHaveBeenCalledWith(
      "J'aime le sport parce que c'est amusant.",
      expect.objectContaining({ text: 'Question?' }),
      expect.anything(),
      { profile: 'rail', turnKind: 'topic', inputMode: 'speech' },
    );
  });

  it('a role-play turn is sent as turnKind rolePlay, with the scenario setup', async () => {
    getExaminerFeedback.mockResolvedValue(okFeedback);
    const entries = [
      { ...examinerEntry(1, 'Bonjour. Je peux vous aider ?'), part: 'rolePlay' } as ConductLogEntry,
      candidateEntry(2, "Je voudrais réserver une table pour quatre personnes.", { part: 'rolePlay' }),
    ];
    renderHook(() => useExamCorrectionsRail(entries, true, { rolePlaySetup: 'Vous êtes au restaurant.' }));

    await waitFor(() => expect(getExaminerFeedback).toHaveBeenCalledTimes(1));
    expect(getExaminerFeedback.mock.calls[0][3]).toEqual({
      profile: 'rail',
      turnKind: 'rolePlay',
      inputMode: 'speech',
      rolePlaySetup: 'Vous êtes au restaurant.',
    });
  });

  it('a topic turn never carries the role-play setup', async () => {
    getExaminerFeedback.mockResolvedValue(okFeedback);
    const entries = [examinerEntry(1, 'Question?'), candidateEntry(2, "J'aime le sport parce que c'est amusant.")];
    renderHook(() => useExamCorrectionsRail(entries, true, { rolePlaySetup: 'Vous êtes au restaurant.' }));

    await waitFor(() => expect(getExaminerFeedback).toHaveBeenCalledTimes(1));
    expect(getExaminerFeedback.mock.calls[0][3]).not.toHaveProperty('rolePlaySetup');
  });

  it('a typed turn is sent with inputMode text', async () => {
    getExaminerFeedback.mockResolvedValue(okFeedback);
    const entries = [
      examinerEntry(1, 'Question?'),
      candidateEntry(2, "J'aime le sport parce que c'est amusant.", { inputMode: 'text' }),
    ];
    renderHook(() => useExamCorrectionsRail(entries, true));

    await waitFor(() => expect(getExaminerFeedback).toHaveBeenCalledTimes(1));
    expect(getExaminerFeedback.mock.calls[0][3]).toMatchObject({ inputMode: 'text' });
  });

  it('an extension answer is sent with the question it extends as context', async () => {
    getExaminerFeedback.mockResolvedValue(okFeedback);
    const entries = [
      examinerEntry(1, 'Tu as un animal ?'),
      candidateEntry(2, "Oui, j'ai un chien qui s'appelle Max."),
      extensionEntry(3, 'Donne-moi plus de détails.'),
      candidateEntry(4, "Il est très gentil et il aime jouer dans le jardin."),
    ];
    renderHook(() => useExamCorrectionsRail(entries, true));

    await waitFor(() => expect(getExaminerFeedback).toHaveBeenCalledTimes(2));
    const call = getExaminerFeedback.mock.calls[1];
    expect(call[1]).toEqual(expect.objectContaining({ text: 'Donne-moi plus de détails.' }));
    expect(call[3]).toMatchObject({ contextQuestion: 'Tu as un animal ?' });
  });

  it('retry re-sends exactly the same context', async () => {
    // Turn 2 resolves; turn 4 (the extension answer) fails, then succeeds on retry.
    getExaminerFeedback.mockResolvedValueOnce(okFeedback);
    getExaminerFeedback.mockRejectedValueOnce(new Error('API /api/feedback/v3 → 503'));
    const entries = [
      examinerEntry(1, 'Tu as un animal ?'),
      candidateEntry(2, "Oui, j'ai un chien qui s'appelle Max.", { inputMode: 'text' }),
      extensionEntry(3, 'Donne-moi plus de détails.'),
      candidateEntry(4, 'Il est très gentil et il aime jouer dans le jardin.', { inputMode: 'text' }),
    ];
    const { result } = renderHook(() => useExamCorrectionsRail(entries, true));
    await waitFor(() => expect(result.current.entries.find((e) => e.turnKey === 4)?.status).toBe('failed'));
    const firstContext = getExaminerFeedback.mock.calls[1][3];

    getExaminerFeedback.mockResolvedValueOnce(okFeedback);
    act(() => {
      result.current.retry(4);
    });
    await waitFor(() => expect(getExaminerFeedback).toHaveBeenCalledTimes(3));
    expect(getExaminerFeedback.mock.calls[2][3]).toEqual(firstContext);
  });

  it('quota exhausted: one quiet state, no failed card, and no further calls', async () => {
    getExaminerFeedback.mockRejectedValue(quotaError());
    const first = [examinerEntry(1, 'Question?'), candidateEntry(2, "J'aime le sport parce que c'est amusant.")];
    const { result, rerender } = renderHook(({ entries: e }) => useExamCorrectionsRail(e, true), {
      initialProps: { entries: first },
    });

    await waitFor(() => expect(result.current.disabledReason).toBe('quota-exhausted'));
    expect(result.current.entries).toEqual([]);

    rerender({
      entries: [...first, examinerEntry(3, 'Et après ?'), candidateEntry(4, 'Après je regarde la télé avec ma famille.')],
    });
    expect(getExaminerFeedback).toHaveBeenCalledTimes(1);
    expect(result.current.entries).toEqual([]);
  });

  it('tier gate: a <=3-word turn never spends a call', () => {
    const entries = [examinerEntry(1, 'Question?'), candidateEntry(2, 'Oui bien')];
    const { result } = renderHook(() => useExamCorrectionsRail(entries, true));

    expect(getExaminerFeedback).not.toHaveBeenCalled();
    expect(result.current.entries).toEqual([]);
  });

  it('a repeat-request turn never spends a call', () => {
    const entries = [
      examinerEntry(1, 'Question?'),
      candidateEntry(2, 'Pouvez-vous répéter la question, s’il vous plaît ?', { requestedRepeat: true }),
    ];
    const { result } = renderHook(() => useExamCorrectionsRail(entries, true));

    expect(getExaminerFeedback).not.toHaveBeenCalled();
    expect(result.current.entries).toEqual([]);
  });

  it('guest/expired session degrades quietly instead of showing a failed card', async () => {
    getExaminerFeedback.mockRejectedValue(new AuthRequiredError());
    const entries = [examinerEntry(1, 'Question?'), candidateEntry(2, "J'aime le sport parce que c'est amusant.")];
    const { result } = renderHook(() => useExamCorrectionsRail(entries, true));

    await waitFor(() => expect(result.current.disabledReason).toBe('signed-out'));
    expect(result.current.entries).toEqual([]);
  });

  it('a non-auth failure shows a failed card, and retry re-fires the call', async () => {
    getExaminerFeedback.mockRejectedValueOnce(new Error('API /api/feedback/v3 → 503'));
    const entries = [examinerEntry(1, 'Question?'), candidateEntry(2, "J'aime le sport parce que c'est amusant.")];
    const { result } = renderHook(() => useExamCorrectionsRail(entries, true));

    await waitFor(() => expect(result.current.entries[0]?.status).toBe('failed'));

    getExaminerFeedback.mockResolvedValueOnce(okFeedback);
    act(() => {
      result.current.retry(2);
    });
    expect(result.current.entries[0].status).toBe('pending');

    await waitFor(() => expect(result.current.entries[0].status).toBe('done'));
    expect(getExaminerFeedback).toHaveBeenCalledTimes(2);
  });

  it('each new candidate turn is only ever requested once, even across re-renders', async () => {
    getExaminerFeedback.mockResolvedValue(okFeedback);
    const entries = [examinerEntry(1, 'Question?'), candidateEntry(2, "J'aime le sport parce que c'est amusant.")];
    const { result, rerender } = renderHook(({ entries: e }) => useExamCorrectionsRail(e, true), {
      initialProps: { entries },
    });

    await waitFor(() => expect(result.current.entries[0]?.status).toBe('done'));
    rerender({ entries: [...entries] });
    rerender({ entries: [...entries] });

    expect(getExaminerFeedback).toHaveBeenCalledTimes(1);
  });
});


describe('resolveRailPrompt (the question and context sent with a turn)', () => {
  const ex = (seq: number, action: string, text: string, overrides: Record<string, unknown> = {}) =>
    ({ ...examinerEntry(seq, text), action, ...overrides }) as ConductLogEntry;

  it('an ordinary answer is sent with the question it answered and no context', () => {
    const entries = [ex(1, 'READ_MAIN', 'Que fais-tu le weekend ?'), candidateEntry(2, 'Je joue au foot avec mes amis.')];
    expect(resolveRailPrompt(entries, 1)).toEqual({ question: 'Que fais-tu le weekend ?' });
  });

  it('a further question is complete in itself: no context', () => {
    const entries = [
      ex(1, 'READ_MAIN', 'Que fais-tu le weekend ?'),
      candidateEntry(2, 'Je joue au foot avec mes amis.'),
      ex(3, 'FURTHER_QUESTION', "Que penses-tu de l'uniforme scolaire ?", { questionId: null, variant: null }),
      candidateEntry(4, "Je pense que c'est une bonne idée."),
    ];
    expect(resolveRailPrompt(entries, 3)).toEqual({ question: "Que penses-tu de l'uniforme scolaire ?" });
  });

  it('an extension carries every main/alternative text of its question, including part 2, in log order', () => {
    const entries = [
      ex(1, 'READ_MAIN', 'Tu as un animal ?'),
      candidateEntry(2, 'Oui.'),
      ex(3, 'READ_MAIN', "Comment s'appelle-t-il ?"),
      candidateEntry(4, "Il s'appelle Max, c'est un chien."),
      ex(5, 'EXTENSION_PROMPT', 'Donne-moi plus de détails.'),
      candidateEntry(6, 'Il est très gentil et il aime jouer.'),
    ];
    expect(resolveRailPrompt(entries, 5)).toEqual({
      question: 'Donne-moi plus de détails.',
      contextQuestion: "Tu as un animal ? Comment s'appelle-t-il ?",
    });
  });

  it('an extension includes the alternative question, and ignores other questions and the other topic', () => {
    const entries = [
      ex(1, 'READ_MAIN', 'Question un ?', { questionId: 'q1', part: 'topic1' }),
      ex(2, 'READ_MAIN', 'Question deux ?', { questionId: 'q2', part: 'topic1' }),
      ex(3, 'READ_MAIN', 'Autre topic, même id ?', { questionId: 'q2', part: 'topic2' }),
      ex(4, 'READ_ALTERNATIVE', 'Version autre de deux ?', { questionId: 'q2', part: 'topic2', variant: 'alternative' }),
      ex(5, 'EXTENSION_PROMPT', 'Explique-moi un peu plus.', { questionId: 'q2', part: 'topic2' }),
      candidateEntry(6, 'Parce que je trouve ça intéressant.'),
    ];
    expect(resolveRailPrompt(entries, 5)).toEqual({
      question: 'Explique-moi un peu plus.',
      contextQuestion: 'Autre topic, même id ? Version autre de deux ?',
    });
  });

  it('skips REPEAT and TRANSITION lines, so a repeated extension is still an extension', () => {
    const entries = [
      ex(1, 'READ_MAIN', 'Tu as un animal ?'),
      candidateEntry(2, 'Oui, un chien.'),
      ex(3, 'EXTENSION_PROMPT', 'Donne-moi plus de détails.'),
      candidateEntry(4, 'Pardon ?', { requestedRepeat: true }),
      ex(5, 'REPEAT', 'Donne-moi plus de détails.'),
      candidateEntry(6, 'Il est très gentil et il aime jouer.'),
    ];
    expect(resolveRailPrompt(entries, 5)).toEqual({
      question: 'Donne-moi plus de détails.',
      contextQuestion: 'Tu as un animal ?',
    });
  });

  it('a TRANSITION before an answer is skipped in favour of the question it introduced', () => {
    const entries = [
      ex(1, 'TRANSITION', 'Passons à la suite.'),
      ex(2, 'READ_MAIN', 'Que fais-tu le weekend ?'),
      candidateEntry(3, 'Je joue au foot avec mes amis.'),
    ];
    expect(resolveRailPrompt(entries, 2)).toEqual({ question: 'Que fais-tu le weekend ?' });
  });

  it('returns an empty question when no examiner line precedes the answer', () => {
    expect(resolveRailPrompt([candidateEntry(1, 'Bonjour tout le monde ici.')], 0)).toEqual({ question: '' });
  });
});
