// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../components/TopContextBar', () => ({ TopContextBar: () => <header /> }));
vi.mock('../../services/telemetry/telemetryService', () => ({ track: vi.fn() }));
vi.mock('../../services/shop/useCatalogue', () => ({ useCatalogue: () => [] }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: authUser }) }));
vi.mock('../../context/AppContext', () => ({ useApp: () => ({ state: { profile: { username: 'lea' } }, dispatch: vi.fn() }) }));

const today = vi.fn();
const start = vi.fn();
const answer = vi.fn();
const board = vi.fn();
vi.mock('../../services/dailyChallenge/dailyChallengeService', () => ({
  getDailyChallenge: () => today(),
  startDailyChallenge: () => start(),
  answerDailyChallengeItem: (...a: unknown[]) => answer(...a),
  getDailyChallengeBoard: (...a: unknown[]) => board(...a),
}));

let authUser: { id: string } | null = { id: 'u1' };

import { DailyChallenge } from '../DailyChallenge';
import type { DailyChallengeItem, DailyChallengeState } from '../../features/dailyChallenge/types';

const item = (position: number, over: Partial<DailyChallengeItem> = {}): DailyChallengeItem => ({
  position, english: `Sentence ${position}`, theme: 't', difficulty: 1, wordCount: 2, tiles: ['mange', 'je', 'des'], answer: null, solution: null, ...over,
});
const base: DailyChallengeState = {
  challengeDate: '2026-11-26', resetsAt: '2026-11-27T00:00:00Z', itemCount: 2, participants: 4,
  streak: { current: 0, best: 0 }, run: null, items: [],
};
const running = { status: 'in_progress' as const, startedAt: new Date().toISOString(), deadlineAt: '', finishedAt: null, correctCount: 0, durationMs: null, flagged: false, xpAwarded: 0, rank: null };

function setup() {
  return render(<MemoryRouter><DailyChallenge /></MemoryRouter>);
}

beforeEach(() => {
  authUser = { id: 'u1' };
  [today, start, answer, board].forEach(m => m.mockReset());
  board.mockResolvedValue({ ok: true, board: { challengeDate: '2026-11-26', scope: 'global', total: 0, rows: [] } });
});
afterEach(() => cleanup());

describe('DailyChallenge', () => {
  it('asks a signed-out learner to sign in and calls nothing', async () => {
    authUser = null;
    setup();
    expect(await screen.findByText('Sign in to take part')).toBeTruthy();
    expect(today).not.toHaveBeenCalled();
  });

  it('says "being switched on" before the migration is applied', async () => {
    today.mockResolvedValue({ ok: false, reason: 'not_deployed' });
    setup();
    expect(await screen.findByText(/being switched on/)).toBeTruthy();
  });

  it('plays a run: start, build, check, see the solution, finish', async () => {
    today.mockResolvedValue({ ok: true, state: base });
    start.mockResolvedValue({ ok: true, state: { ...base, run: running, items: [item(0), item(1)] } });
    setup();
    fireEvent.click(await screen.findByTestId('dc-start'));
    await screen.findByText('Sentence 0');
    expect(screen.getByText('Check').closest('button')!.disabled).toBe(true);

    // tap "je" (index 1) then "mange" (index 0)
    fireEvent.click(screen.getByRole('button', { name: 'je' }));
    fireEvent.click(screen.getByRole('button', { name: 'mange' }));
    answer.mockResolvedValueOnce({
      ok: true, repeat: false, expired: false,
      state: { ...base, run: running, items: [item(0, { answer: { tiles: [1, 0], correct: true }, solution: { french: 'Je mange.', explanation: 'Rule.' } }), item(1)] },
    });
    fireEvent.click(screen.getByText('Check'));
    await screen.findByTestId('dc-marked');
    expect(answer).toHaveBeenCalledWith('2026-11-26', 0, [1, 0]);
    expect(screen.getByText('Je mange.')).toBeTruthy();

    fireEvent.click(screen.getByText('Next sentence'));
    await screen.findByText('Sentence 1');
    fireEvent.click(screen.getByRole('button', { name: 'des' }));
    const finished = { ...running, status: 'finished' as const, finishedAt: new Date().toISOString(), correctCount: 1, durationMs: 61_000, xpAwarded: 15, rank: 2 };
    answer.mockResolvedValueOnce({
      ok: true, repeat: false, expired: false,
      state: { ...base, run: finished, items: [
        item(0, { answer: { tiles: [1, 0], correct: true }, solution: { french: 'Je mange.', explanation: '' } }),
        item(1, { answer: { tiles: [2], correct: false }, solution: { french: 'Je mange des pommes.', explanation: '' } }),
      ] },
    });
    fireEvent.click(screen.getByText('Check'));
    await screen.findByText('Not this time');
    fireEvent.click(screen.getByText('See my result'));
    await screen.findByTestId('dc-result');
    expect(screen.getByText('1 of 2 right')).toBeTruthy();
    expect(screen.getByText('+15')).toBeTruthy();
    await waitFor(() => expect(board).toHaveBeenCalledWith('global'));
  });

  it('keeps the words placed when the answer cannot reach the server', async () => {
    today.mockResolvedValue({ ok: true, state: { ...base, run: running, items: [item(0), item(1)] } });
    setup();
    await screen.findByText('Sentence 0');
    fireEvent.click(screen.getByRole('button', { name: 'je' }));
    answer.mockResolvedValueOnce({ ok: false, reason: 'offline' });
    fireEvent.click(screen.getByText('Check'));
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.getByTestId('dc-line').textContent).toContain('je');
  });

  it('says a flagged run does not count', async () => {
    today.mockResolvedValue({
      ok: true,
      state: { ...base, run: { ...running, status: 'finished', flagged: true, correctCount: 2, durationMs: 2000 }, items: [item(0), item(1)] },
    });
    setup();
    expect(await screen.findByText(/doesn’t count/)).toBeTruthy();
  });
});
