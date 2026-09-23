// @vitest-environment jsdom
/**
 * Fix step B, driven through the real ExamMode scoring effect (not just the
 * pure machine): a scoring server that keeps answering a coded 500 must
 * reach the error screen in well under 20s — never the old 10-15 min of
 * "Still working…" 202 polling. Enters via the reload-resume path (a pending
 * score marker + stored transcript), which starts in WaitingForScore, so the
 * sequence is: GET 404 -> POST 500 -> 3s -> POST 500 -> 10s -> POST 500 ->
 * FailedTerminal.
 */
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, cleanup, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import structGolden from '../../domain/igcse/stt/__tests__/fixtures/structurally-complete.golden.json';
import type { SessionTranscript } from '../../domain/igcse/stt/types';

const TRANSCRIPT = structGolden as unknown as SessionTranscript;

vi.mock('../../context/AppContext', () => ({
  useApp: () => ({ state: { sessions: [], achievements: [] }, dispatch: vi.fn() }),
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ consentStatus: 'granted' }),
}));
vi.mock('../../services/telemetry/telemetryService', () => ({
  track: vi.fn(),
  captureError: vi.fn(),
}));
vi.mock('../../services/exam/localTranscriptStore', () => ({
  saveStoredTranscript: vi.fn(),
  getStoredTranscript: vi.fn(() => TRANSCRIPT),
  getPendingScoreSessionId: vi.fn(() => TRANSCRIPT.sessionId),
  setPendingScoreSessionId: vi.fn(),
  clearPendingScoreSessionId: vi.fn(),
  getRunningSession: vi.fn(() => null),
  saveRunningSession: vi.fn(),
  clearRunningSession: vi.fn(),
}));
vi.mock('../../data/exam/bank/loader', () => ({
  getOriginalQuestionSet: vi.fn(async () => undefined),
  getAuthoredQuestionSet: vi.fn(async () => undefined),
  listPublishedQuestionSetIdsWithRetry: vi.fn(async () => []),
  listPublishedQuestionSetsWithRetry: vi.fn(async () => ({ sets: [], source: 'fixture' })),
  getOfflineAuthoredSets: vi.fn(() => []),
}));

const submitMock = vi.fn();
const pollMock = vi.fn();
vi.mock('../../services/exam/scoringApiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/exam/scoringApiClient')>();
  return {
    ...actual,
    pingScoringServiceHealth: vi.fn(),
    submitForScoring: (...args: unknown[]) => submitMock(...args),
    pollScoreStatus: (...args: unknown[]) => pollMock(...args),
  };
});

import { ExamMode } from '../ExamMode';
import { ScoringApiError } from '../../services/exam/scoringApiClient';
import { SERVER_FAILED_TERMINAL_REASON } from '../../services/exam/examScoringMachine';

/** Advance fake time, then let the effect -> timer -> promise -> setState chain settle. */
async function advance(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
  for (let i = 0; i < 5; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  submitMock.mockReset();
  pollMock.mockReset();
  pollMock.mockResolvedValue({ status: 'not_found' });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('ExamMode scoring — coded 500s (fix step B)', () => {
  it('re-POSTs with 3s/10s backoff and shows the error screen within 20s, never polling a 202 window', async () => {
    submitMock.mockRejectedValue(new ScoringApiError('scoring failed', 500, 'judge_unavailable'));

    render(
      <MemoryRouter>
        <ExamMode />
      </MemoryRouter>,
    );

    // Resume -> WaitingForScore -> GET 404 -> Submitting attempt 2 -> POST 500.
    await advance(0);
    expect(pollMock).toHaveBeenCalledTimes(1);
    expect(submitMock).toHaveBeenCalledTimes(1);

    // Backing off before attempt 3: the retry copy is on screen, no POST yet.
    expect(screen.getByText('Retrying (attempt 3 of 3)')).toBeTruthy();
    await advance(9_900);
    expect(submitMock).toHaveBeenCalledTimes(1);
    await advance(100);
    expect(submitMock).toHaveBeenCalledTimes(2);

    // Attempt 3 was the last one: straight to the error screen.
    expect(screen.getByText(SERVER_FAILED_TERMINAL_REASON)).toBeTruthy();
    expect(pollMock).toHaveBeenCalledTimes(1);
  });

  it('from a fresh first attempt: 500 -> 3s -> 500 -> 10s -> 500 -> error, 13s of backoff in total', async () => {
    // Resume reaches the error screen first (attempts 2 and 3); the manual
    // RETRY below then exercises a full run from attempt 1.
    submitMock.mockRejectedValue(new ScoringApiError('scoring failed', 500, 'judge_invalid_output'));

    render(
      <MemoryRouter>
        <ExamMode />
      </MemoryRouter>,
    );
    await advance(0);
    await advance(10_000);
    expect(screen.getByText(SERVER_FAILED_TERMINAL_REASON)).toBeTruthy();

    // Manual "Retry Scoring" starts over at attempt 1 and runs all three.
    submitMock.mockClear();
    const retry = screen.getByRole('button', { name: /retry/i });
    await act(async () => {
      retry.click();
    });
    await advance(0);
    expect(submitMock).toHaveBeenCalledTimes(1);
    await advance(3_000);
    expect(submitMock).toHaveBeenCalledTimes(2);
    await advance(10_000);
    expect(submitMock).toHaveBeenCalledTimes(3);
    expect(screen.getByText(SERVER_FAILED_TERMINAL_REASON)).toBeTruthy();
  });

  it('an uncoded 5xx is still ambiguous: it polls instead of re-POSTing', async () => {
    submitMock.mockRejectedValue(new ScoringApiError('Bad Gateway', 502));
    pollMock
      .mockResolvedValueOnce({ status: 'not_found' }) // resume GET -> Submitting attempt 2
      .mockResolvedValue({ status: 'in_progress' });

    render(
      <MemoryRouter>
        <ExamMode />
      </MemoryRouter>,
    );
    await advance(0);
    expect(submitMock).toHaveBeenCalledTimes(1);
    await advance(0);
    // Ambiguous -> WaitingForScore -> GET (202) -> Recovering.
    expect(pollMock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('Still working…')).toBeTruthy();
    expect(submitMock).toHaveBeenCalledTimes(1);
  });
});
