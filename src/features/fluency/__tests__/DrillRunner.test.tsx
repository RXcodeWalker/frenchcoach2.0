// @vitest-environment jsdom
//
// fluency-trainer §3.2: a whole drill with a fake microphone — three rounds,
// each measured on this device, a silent round offered again (never stored),
// and the finished record handed over as numbers only.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { DrillRecord } from '../../../domain/fluency/drill432';

const micLevel = { attach: vi.fn(), detach: vi.fn(), subscribe: () => () => {}, level: () => 0 };
const recorder = {
  isRecording: false,
  sttSupported: true,
  micLevel,
  start: vi.fn(),
  stop: vi.fn(async () => 'je vais au collège en bus et j’aime les maths'),
  audioBlobPromise: vi.fn(async () => new Blob(['x'])),
};
vi.mock('../../recording/useRecording', () => ({ useRecording: () => recorder }));
vi.mock('../../recording/LevelBars', () => ({ LevelBars: () => null }));
vi.mock('../../../context/AuthContext', () => ({ useAuth: () => ({ consentStatus: 'unknown' }) }));
vi.mock('../../../components/SpeakingConsentGate', () => ({ SpeakingConsentGate: ({ children }: { children: unknown }) => children }));

const speech = vi.fn();
vi.mock('../../pronunciation/audio/answerSpeech', () => ({ measureAnswerSpeech: (...a: unknown[]) => speech(...a) }));

import { DrillRunner } from '../DrillRunner';

const spoken = (spanS: number, pauses: number[]) => ({
  hasSpeech: true,
  rawS: spanS + 1,
  internalPausesS: pauses,
  leadingSilenceS: 0.8,
  speechSpanS: spanS,
  pauses: { pausesOver2s: pauses.filter((p) => p >= 2).length, longestPauseS: Math.max(0, ...pauses) },
});

beforeEach(() => {
  speech.mockReset();
  recorder.start.mockClear();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
});
afterEach(cleanup);

async function recordRound() {
  fireEvent.click(screen.getByRole('button', { name: /Start speaking/ }));
  await waitFor(() => expect(screen.getByTestId('drill-stop')).toBeTruthy());
  await act(async () => { fireEvent.click(screen.getByTestId('drill-stop')); });
  await waitFor(() => expect(screen.getByTestId('drill-review')).toBeTruthy());
}

describe('DrillRunner', () => {
  it('runs three rounds and hands over a numbers-only record', async () => {
    speech
      .mockResolvedValueOnce(spoken(20, [0.8, 1.2, 0.6, 2.4, 0.7]))
      .mockResolvedValueOnce(spoken(12, [0.6, 0.9]))
      .mockResolvedValueOnce(spoken(8, [0.5]));
    const onFinished = vi.fn<(r: DrillRecord) => void>();
    render(<MemoryRouter><DrillRunner question={{ id: 'sch_1', text: 'Comment vas-tu au collège ?', topicKey: 'school' }} onFinished={onFinished} /></MemoryRouter>);

    expect(screen.getByTestId('drill-countdown')).toBeTruthy();
    await recordRound();
    expect(screen.getByTestId('drill-round-numbers')).toBeTruthy();
    fireEvent.click(screen.getByTestId('drill-next'));

    await recordRound();
    // From round 2 on, the review compares with round 1.
    expect(screen.getByText(/60-second round compared with your 45-second round/)).toBeTruthy();
    fireEvent.click(screen.getByTestId('drill-next'));

    await recordRound();
    fireEvent.click(screen.getByTestId('drill-next'));

    await waitFor(() => expect(onFinished).toHaveBeenCalledTimes(1));
    const record = onFinished.mock.calls[0][0];
    expect(record.rounds.map((r) => r.limitS)).toEqual([60, 45, 30]);
    expect(record.rounds.every((r) => r.stoppedEarly)).toBe(true);
    expect(record.questionId).toBe('sch_1');
    expect(JSON.stringify(record)).not.toMatch(/collège|maths/); // no text kept
    expect(recorder.start).toHaveBeenCalledTimes(3);
  });

  it('a round under three seconds of speech is too short to count', async () => {
    speech.mockResolvedValueOnce(spoken(2, []));
    render(<MemoryRouter><DrillRunner question={{ id: null, text: 'Parle de ton collège.', topicKey: null }} onFinished={vi.fn()} /></MemoryRouter>);
    await recordRound();
    expect(screen.getByTestId('drill-review').getAttribute('data-outcome')).toBe('tooShort');
    expect(screen.queryByTestId('drill-next')).toBeNull();
  });

  it('a silent round must be recorded again and is never stored', async () => {
    speech
      .mockResolvedValueOnce({ ...spoken(0, []), hasSpeech: false })
      .mockResolvedValueOnce(spoken(20, [0.8]));
    render(<MemoryRouter><DrillRunner question={{ id: null, text: 'Parle de ta famille.', topicKey: null }} onFinished={vi.fn()} /></MemoryRouter>);

    await recordRound();
    expect(screen.getByTestId('drill-review').getAttribute('data-outcome')).toBe('noSpeech');
    expect(screen.queryByTestId('drill-next')).toBeNull();
    fireEvent.click(screen.getByTestId('drill-retry'));

    await recordRound();
    expect(screen.getByTestId('drill-review').getAttribute('data-outcome')).toBe('ok');
  });
});
