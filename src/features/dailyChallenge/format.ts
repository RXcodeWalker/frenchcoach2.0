import type { DailyChallengeItem, DailyChallengeState } from './types';

/** 83 000 ms → "1:23"; an hour or more → "1:02:05". */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

/** Time left until an ISO instant: "6h 12m", "12m", "under a minute". Null if the instant is unreadable. */
export function timeUntil(iso: string, now: number = Date.now()): string | null {
  const at = Date.parse(iso);
  if (!Number.isFinite(at)) return null;
  const ms = at - now;
  if (ms <= 60_000) return 'under a minute';
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${hours}h`;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

/** The item to show next: the first one not answered yet (null once all are). */
export function nextItem(state: DailyChallengeState): DailyChallengeItem | null {
  return state.items.find(i => i.answer === null) ?? null;
}

export type ChallengeView = 'intro' | 'playing' | 'done';

/** Which part of the screen the state calls for. */
export function viewFor(state: DailyChallengeState): ChallengeView {
  if (!state.run) return 'intro';
  if (state.run.status === 'finished') return 'done';
  return nextItem(state) ? 'playing' : 'done';
}

/** The words of an answer, in order, as the learner placed them. */
export function answerWords(item: DailyChallengeItem, tiles: readonly number[]): string[] {
  return tiles.map(t => item.tiles[t]).filter((w): w is string => typeof w === 'string');
}

/** "3 of 8 right" style summary for a finished run. */
export function scoreLine(correct: number, total: number): string {
  return `${correct} of ${total} right`;
}

/** The streak line on the intro and result: never claims a streak that is not there. */
export function streakLine(streak: { current: number; best: number }, doneToday: boolean): string | null {
  if (streak.current <= 0) return streak.best > 1 ? `Your best run is ${streak.best} days. Start a new one today.` : null;
  const days = `${streak.current}-day challenge streak`;
  return doneToday ? `${days}. Come back tomorrow to keep it going.` : `${days}. Finish today's to keep it going.`;
}
