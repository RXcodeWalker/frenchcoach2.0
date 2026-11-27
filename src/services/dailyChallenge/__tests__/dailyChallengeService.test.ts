// Daily Challenge client (daily-challenge-and-leagues §2): the client sends only which
// tiles were placed, parses the server's JSON defensively and words failures by reason.
import { describe, it, expect, beforeEach, vi } from 'vitest';

const rpcMock = vi.fn();
vi.mock('../../../lib/supabase', () => ({
  supabase: { rpc: (...args: unknown[]) => rpcMock(...args) },
  supabaseConfigured: true,
}));

import {
  answerDailyChallengeItem,
  getDailyChallenge,
  getDailyChallengeBoard,
  parseState,
  startDailyChallenge,
} from '../dailyChallengeService';

const ITEM = {
  position: 0, english: 'I like the red house.', theme: 'Adjective Placement', difficulty: 1, word_count: 4,
  tiles: ['rouge', 'la', 'le', 'j\'aime', 'maison', 'rouges'], answer: null, solution: null,
};
const STATE = {
  challenge_date: '2026-11-26', resets_at: '2026-11-27T00:00:00+00:00', item_count: 8, participants: 3,
  streak: { current: 2, best: 5 },
  run: { status: 'in_progress', started_at: '2026-11-26T09:00:00Z', deadline_at: '2026-11-26T09:20:00Z', finished_at: null,
    correct_count: 0, duration_ms: null, flagged: false, xp_awarded: 0, rank: null },
  items: [ITEM, { ...ITEM, position: 1 }],
};

beforeEach(() => rpcMock.mockReset());

describe('parseState', () => {
  it('reads the RPC shape', () => {
    const s = parseState(STATE)!;
    expect(s.challengeDate).toBe('2026-11-26');
    expect(s.streak).toEqual({ current: 2, best: 5 });
    expect(s.run?.status).toBe('in_progress');
    expect(s.items[0].tiles).toHaveLength(6);
    expect(s.items[0].answer).toBeNull();
  });

  it('rejects junk and drops malformed items', () => {
    expect(parseState(null)).toBeNull();
    expect(parseState({ items: [] })).toBeNull();
    const s = parseState({ ...STATE, items: [ITEM, { english: 'x', tiles: [] }, 'nope'] })!;
    expect(s.items).toHaveLength(1);
  });

  it('keeps items in position order', () => {
    const s = parseState({ ...STATE, items: [{ ...ITEM, position: 3 }, ITEM] })!;
    expect(s.items.map(i => i.position)).toEqual([0, 3]);
  });
});

describe('RPC calls', () => {
  it('today and start take no arguments', async () => {
    rpcMock.mockResolvedValue({ data: STATE, error: null });
    await getDailyChallenge();
    await startDailyChallenge();
    expect(rpcMock.mock.calls).toEqual([['daily_challenge_today'], ['daily_challenge_start']]);
  });

  it('an answer sends tile indexes only — never a score or a sentence', async () => {
    rpcMock.mockResolvedValue({ data: { ...STATE, repeat: false }, error: null });
    const r = await answerDailyChallengeItem('2026-11-26', 0, [3, 1, 4, 0]);
    expect(r.ok).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('daily_challenge_answer', { p_challenge_date: '2026-11-26', p_position: 0, p_tiles: [3, 1, 4, 0] });
  });

  it('reports an expired run', async () => {
    rpcMock.mockResolvedValue({ data: { ...STATE, expired: true }, error: null });
    const r = await answerDailyChallengeItem('2026-11-26', 0, [0]);
    expect(r.ok && r.expired).toBe(true);
  });

  it('classifies failures', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.daily_challenge_today' } });
    expect(await getDailyChallenge()).toEqual({ ok: false, reason: 'not_deployed' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: 'P0001', message: 'not_authenticated' } });
    expect(await getDailyChallenge()).toEqual({ ok: false, reason: 'signed_out' });
    rpcMock.mockResolvedValueOnce({ data: null, error: { code: '22023', message: 'invalid_answer' } });
    expect(await answerDailyChallengeItem('2026-11-26', 0, [0, 0])).toEqual({ ok: false, reason: 'invalid_answer' });
    rpcMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    expect(await getDailyChallenge()).toEqual({ ok: false, reason: 'offline' });
  });

  it('parses the board', async () => {
    rpcMock.mockResolvedValue({
      data: { challenge_date: '2026-11-26', scope: 'friends', total: 1,
        rows: [{ rank: 1, username: 'lea', avatar_emoji: null, correct_count: 7, item_count: 8, duration_ms: 90000, is_me: true }] },
      error: null,
    });
    const r = await getDailyChallengeBoard('friends');
    expect(rpcMock).toHaveBeenCalledWith('daily_challenge_board', { p_scope: 'friends' });
    expect(r.ok && r.board.rows[0]).toMatchObject({ username: 'lea', correctCount: 7, isMe: true });
  });
});
