// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useExamCorrectionsRail } from '../turnFeedback';
import { AuthRequiredError } from '../../../lib/authToken';
import type { ConductLogEntry } from '../../../domain/igcse/session/types';
import type { ExaminerFeedback } from '../../coaching/examinerFeedback';

const { getExaminerFeedback } = vi.hoisted(() => ({ getExaminerFeedback: vi.fn() }));
vi.mock('../../api/apiClient', () => ({ getExaminerFeedback }));

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
  currentDescriptorCommentary: [{ claim: 'Uses a simple present tense verb', quote: "j'aime le sport" }],
  improvementCommentary: [],
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
    );
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
