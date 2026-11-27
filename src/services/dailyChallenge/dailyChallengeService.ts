/**
 * Daily Challenge (docs/systems/daily-challenge-and-leagues.md §2) — the client of four
 * SECURITY DEFINER RPCs. The server owns the challenge end to end: which items, the tile
 * order, the clock, the marking, the XP and the board. The client never holds an answer
 * key and never sends a score; it sends which tiles were placed, in order, and shows what
 * the server says. Nothing is stored locally — reloading resumes from the server.
 */

import { supabase, supabaseConfigured } from '../../lib/supabase';
import { classifyRpcError, type RpcFailure } from '../../lib/rpcFailure';
import type {
  BoardScope,
  DailyChallengeBoard,
  DailyChallengeBoardRow,
  DailyChallengeItem,
  DailyChallengeRun,
  DailyChallengeState,
} from '../../features/dailyChallenge/types';

const ANSWER_ERRORS = ['not_started', 'invalid_position', 'invalid_answer', 'run_finished'] as const;
export type AnswerFailure = RpcFailure<(typeof ANSWER_ERRORS)[number]>;

export type StateResult = { ok: true; state: DailyChallengeState } | { ok: false; reason: RpcFailure };
export type AnswerResult =
  | { ok: true; state: DailyChallengeState; repeat: boolean; expired: boolean }
  | { ok: false; reason: AnswerFailure };
export type BoardResult = { ok: true; board: DailyChallengeBoard } | { ok: false; reason: RpcFailure };

type Json = Record<string, unknown>;
const obj = (v: unknown): Json | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Json) : null);
const num = (v: unknown, fallback = 0): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback;
const numOrNull = (v: unknown): number | null => (v === null || v === undefined ? null : Number.isFinite(num(v, NaN)) ? num(v) : null);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const ints = (v: unknown): number[] => (Array.isArray(v) ? v.filter((x): x is number => Number.isInteger(x)) : []);

function parseItem(raw: unknown): DailyChallengeItem | null {
  const it = obj(raw);
  if (!it || typeof it.english !== 'string') return null;
  const tiles = strings(it.tiles);
  if (tiles.length === 0) return null;
  const answer = obj(it.answer);
  const solution = obj(it.solution);
  const difficulty = num(it.difficulty, 1);
  return {
    position: num(it.position),
    english: it.english,
    theme: str(it.theme) ?? '',
    difficulty: difficulty === 2 || difficulty === 3 ? difficulty : 1,
    wordCount: Math.max(1, num(it.word_count, 1)),
    tiles,
    answer: answer ? { tiles: ints(answer.tiles), correct: answer.correct === true } : null,
    solution:
      solution && typeof solution.french === 'string'
        ? { french: solution.french, explanation: str(solution.explanation) ?? '' }
        : null,
  };
}

function parseRun(raw: unknown): DailyChallengeRun | null {
  const r = obj(raw);
  if (!r || (r.status !== 'in_progress' && r.status !== 'finished')) return null;
  return {
    status: r.status,
    startedAt: str(r.started_at) ?? '',
    deadlineAt: str(r.deadline_at) ?? '',
    finishedAt: str(r.finished_at),
    correctCount: num(r.correct_count),
    durationMs: numOrNull(r.duration_ms),
    flagged: r.flagged === true,
    xpAwarded: num(r.xp_awarded),
    rank: numOrNull(r.rank),
  };
}

/** Exported for tests: the RPC's JSON → state, or null when it is not that shape. */
export function parseState(raw: unknown): DailyChallengeState | null {
  const s = obj(raw);
  const challengeDate = str(s?.challenge_date);
  if (!s || !challengeDate) return null;
  const streak = obj(s.streak);
  const items = Array.isArray(s.items)
    ? s.items.map(parseItem).filter((i): i is DailyChallengeItem => i !== null).sort((a, b) => a.position - b.position)
    : [];
  return {
    challengeDate,
    resetsAt: str(s.resets_at) ?? '',
    itemCount: num(s.item_count, items.length),
    participants: num(s.participants),
    streak: { current: num(streak?.current), best: num(streak?.best) },
    run: parseRun(s.run),
    items,
  };
}

function parseBoardRow(raw: unknown): DailyChallengeBoardRow | null {
  const r = obj(raw);
  const username = str(r?.username);
  if (!r || !username) return null;
  return {
    rank: num(r.rank),
    username,
    avatarEmoji: str(r.avatar_emoji),
    equippedFrame: str(r.equipped_frame),
    equippedNameplate: str(r.equipped_nameplate),
    correctCount: num(r.correct_count),
    itemCount: num(r.item_count),
    durationMs: num(r.duration_ms),
    isMe: r.is_me === true,
  };
}

export function parseBoard(raw: unknown): DailyChallengeBoard | null {
  const b = obj(raw);
  const challengeDate = str(b?.challenge_date);
  if (!b || !challengeDate) return null;
  return {
    challengeDate,
    scope: b.scope === 'friends' ? 'friends' : 'global',
    total: num(b.total),
    rows: Array.isArray(b.rows) ? b.rows.map(parseBoardRow).filter((r): r is DailyChallengeBoardRow => r !== null) : [],
  };
}

async function callState(fn: 'daily_challenge_today' | 'daily_challenge_start'): Promise<StateResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc(fn);
    if (error) return { ok: false, reason: classifyRpcError(error) };
    const state = parseState(data);
    return state ? { ok: true, state } : { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

/** Today's challenge and the caller's run (no items until it is started). */
export function getDailyChallenge(): Promise<StateResult> {
  return callState('daily_challenge_today');
}

/** Starts today's run (the server clock) and reveals the items. Calling it again never restarts it. */
export function startDailyChallenge(): Promise<StateResult> {
  return callState('daily_challenge_start');
}

/** Marks one item. `tiles` are indexes into that item's `tiles`, in the order placed. Final. */
export async function answerDailyChallengeItem(challengeDate: string, position: number, tiles: number[]): Promise<AnswerResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('daily_challenge_answer', {
      p_challenge_date: challengeDate,
      p_position: position,
      p_tiles: tiles,
    });
    if (error) return { ok: false, reason: classifyRpcError(error, ANSWER_ERRORS) };
    const state = parseState(data);
    if (!state) return { ok: false, reason: 'error' };
    const raw = obj(data);
    return { ok: true, state, repeat: raw?.repeat === true, expired: raw?.expired === true };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}

export async function getDailyChallengeBoard(scope: BoardScope): Promise<BoardResult> {
  if (!supabaseConfigured) return { ok: false, reason: 'offline' };
  try {
    const { data, error } = await supabase.rpc('daily_challenge_board', { p_scope: scope });
    if (error) return { ok: false, reason: classifyRpcError(error) };
    const board = parseBoard(data);
    return board ? { ok: true, board } : { ok: false, reason: 'error' };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}
