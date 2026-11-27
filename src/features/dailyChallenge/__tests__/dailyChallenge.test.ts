import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DAILY_CHALLENGE_BANK, renderBankSeedSql, toBankItem } from '../bank';
import { formatDuration, streakLine, timeUntil, viewFor } from '../format';
import { REBUILD_QUESTIONS } from '../../../data/rebuildQuestions';
import type { DailyChallengeState } from '../types';

describe('bank items (what the server marks against)', () => {
  it('every item has one key per tile and every accepted order uses only its tile keys', () => {
    for (const it of DAILY_CHALLENGE_BANK) {
      expect(it.tileKeys).toHaveLength(it.tiles.length);
      expect(it.wordCount).toBeLessThanOrEqual(it.tiles.length);
      for (const order of it.acceptedOrders) {
        const pool = [...it.tileKeys];
        for (const k of order) {
          const i = pool.indexOf(k);
          expect(i, `${it.id}: "${k}" is not a tile`).toBeGreaterThanOrEqual(0);
          pool.splice(i, 1);
        }
      }
    }
  });

  it('the main order is the sentence words in order, and no decoy completes a right answer', () => {
    const it = toBankItem(REBUILD_QUESTIONS[0]);
    expect(it.acceptedOrders[0]).toEqual(it.tileKeys.slice(0, it.wordCount));
    for (const item of DAILY_CHALLENGE_BANK) {
      const decoys = item.tileKeys.slice(item.wordCount);
      for (const order of item.acceptedOrders) for (const d of decoys) {
        if (item.tileKeys.slice(0, item.wordCount).includes(d)) continue; // same word as a real tile
        expect(order, `${item.id}: decoy "${d}" is in an accepted order`).not.toContain(d);
      }
    }
  });

  it('there are enough items for the daily quotas (3 easy, 4 medium, 1 hard) without a repeat in 5 days', () => {
    const by = (d: number) => DAILY_CHALLENGE_BANK.filter(i => i.difficulty === d).length;
    expect(by(1)).toBeGreaterThanOrEqual(15);
    expect(by(2)).toBeGreaterThanOrEqual(20);
    expect(by(3)).toBeGreaterThanOrEqual(5);
  });
});

describe('seed parity with the backend', () => {
  const dir = join(process.cwd(), 'backend', 'supabase', 'migrations');
  const seeds = existsSync(dir) ? readdirSync(dir).filter(f => f.endsWith('_daily_challenge_bank_seed.sql')).sort() : [];
  it.skipIf(seeds.length === 0)('the newest seed migration matches the bank (run npm run daily-challenge:seed -- <timestamp>)', () => {
    expect(readFileSync(join(dir, seeds[seeds.length - 1]), 'utf8')).toBe(renderBankSeedSql());
  });
});

describe('the answer key never reaches the Daily Challenge screen', () => {
  it('no screen-side file imports the bank, the rebuild sentences or the rebuilder engine', () => {
    const files = [
      'src/screens/DailyChallenge.tsx',
      ...readdirSync('src/features/dailyChallenge').filter(f => /\.tsx?$/.test(f) && f !== 'bank.ts').map(f => `src/features/dailyChallenge/${f}`),
      'src/services/dailyChallenge/dailyChallengeService.ts',
    ];
    for (const f of files) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/from ['"][^'"]*(\/bank|rebuildQuestions|sentenceRebuilder\/engine)['"]/);
    }
  });
});

describe('format', () => {
  it('durations', () => {
    expect(formatDuration(83_000)).toBe('1:23');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
  });

  it('time until', () => {
    const now = Date.parse('2026-11-26T17:48:00Z');
    expect(timeUntil('2026-11-27T00:00:00Z', now)).toBe('6h 12m');
    expect(timeUntil('nope', now)).toBeNull();
  });

  it('streak copy never invents a streak', () => {
    expect(streakLine({ current: 0, best: 0 }, false)).toBeNull();
    expect(streakLine({ current: 3, best: 3 }, true)).toContain('3-day');
  });

  it('view follows the server state', () => {
    const base: DailyChallengeState = { challengeDate: 'd', resetsAt: '', itemCount: 1, participants: 0, streak: { current: 0, best: 0 }, run: null, items: [] };
    expect(viewFor(base)).toBe('intro');
    const run = { status: 'in_progress' as const, startedAt: '', deadlineAt: '', finishedAt: null, correctCount: 0, durationMs: null, flagged: false, xpAwarded: 0, rank: null };
    const item = { position: 0, english: 'e', theme: '', difficulty: 1 as const, wordCount: 1, tiles: ['a'], answer: null, solution: null };
    expect(viewFor({ ...base, run, items: [item] })).toBe('playing');
    expect(viewFor({ ...base, run: { ...run, status: 'finished' }, items: [item] })).toBe('done');
  });
});
