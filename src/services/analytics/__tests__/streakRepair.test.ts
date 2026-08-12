// @vitest-environment jsdom
// ── Shop plan §14.4/§15 Phase 5: Streak Repair ───────────────────────────────
// "Restore a streak lost <48h ago" — recordSession's updateStreak() records
// what broke and when; repairStreak() restores it within the 48h window,
// consuming one streak_repair from the server-reconciled inventory cache
// (the same generic path Streak Freeze uses).
//
// updateStreak() always compares against Date.now() (via dateKey()), not
// session.createdAt, so a broken streak is simulated by seeding
// streak.lastDate directly rather than backdating session timestamps.

import { describe, it, expect, beforeEach } from 'vitest';
import { recordSession, canRepairStreak, repairStreak, getStreakCount } from '../analyticsService';
import { STORAGE_KEYS, storageSet } from '../../persistence/storage';
import type { Session } from '../../../types';

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: `sess-${Math.random().toString(36).slice(2)}`,
    mode: 'practice',
    topicKey: 'school',
    wordCount: 40,
    score: 6,
    xpEarned: 20,
    durationSec: 30,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function seedAnalytics(streak: { count: number; lastDate: string | null; brokenAt?: { previousCount: number; brokenDate: string } | null }) {
  localStorage.setItem(STORAGE_KEY(), JSON.stringify({ sessions: [], totalWords: 0, streak, challengeLog: {} }));
}

// Mirrors STORAGE_KEYS.analytics without importing it twice for clarity.
function STORAGE_KEY() {
  return STORAGE_KEYS.analytics;
}

function grantStreakRepair(qty = 1) {
  storageSet(STORAGE_KEYS.shopInventoryCache, { streak_repair: qty });
}

beforeEach(() => {
  localStorage.clear();
});

describe('Streak Repair', () => {
  it('canRepairStreak is false when nothing has broken', () => {
    recordSession(makeSession());
    expect(canRepairStreak()).toBe(false);
  });

  it('canRepairStreak is true immediately after a streak breaks (gap > 1 day, no freeze)', () => {
    // Seed a 5-day-old streak of 4 (older than yesterday/day-before-yesterday,
    // so no freeze branch applies), then record today's session — breaks it.
    const fiveDaysAgo = dateKey(new Date(Date.now() - 5 * 86400000));
    seedAnalytics({ count: 4, lastDate: fiveDaysAgo });
    recordSession(makeSession());
    expect(canRepairStreak()).toBe(true);
    expect(getStreakCount()).toBe(1);
  });

  it('repairStreak restores the pre-break count and consumes one streak_repair', () => {
    const fiveDaysAgo = dateKey(new Date(Date.now() - 5 * 86400000));
    seedAnalytics({ count: 4, lastDate: fiveDaysAgo });
    recordSession(makeSession());
    expect(getStreakCount()).toBe(1);

    grantStreakRepair(1);
    const result = repairStreak();
    expect(result).toBe(true);
    expect(getStreakCount()).toBe(5); // previousCount(4) + 1
    expect(canRepairStreak()).toBe(false); // brokenAt cleared, can't double-repair
  });

  it('repairStreak fails without an owned streak_repair, leaving the streak untouched', () => {
    const fiveDaysAgo = dateKey(new Date(Date.now() - 5 * 86400000));
    seedAnalytics({ count: 4, lastDate: fiveDaysAgo });
    recordSession(makeSession());
    expect(canRepairStreak()).toBe(true);

    const result = repairStreak();
    expect(result).toBe(false);
    expect(getStreakCount()).toBe(1);
  });

  it('repairStreak fails outside the 48h window even with an owned item', () => {
    seedAnalytics({
      count: 1,
      lastDate: dateKey(new Date()),
      brokenAt: { previousCount: 4, brokenDate: dateKey(new Date(Date.now() - 3 * 86400000)) },
    });
    grantStreakRepair(1);

    expect(canRepairStreak()).toBe(false);
    expect(repairStreak()).toBe(false);
    expect(getStreakCount()).toBe(1);
  });

  it('clears brokenAt once the streak naturally continues after a repair-eligible break', () => {
    const fiveDaysAgo = dateKey(new Date(Date.now() - 5 * 86400000));
    seedAnalytics({ count: 4, lastDate: fiveDaysAgo });
    recordSession(makeSession()); // breaks -> count=1, brokenAt set
    expect(canRepairStreak()).toBe(true);

    // Simulate "yesterday was today" by seeding lastDate to yesterday, then
    // recording again — updateStreak's consecutive-day branch clears brokenAt.
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY())!);
    raw.streak.lastDate = dateKey(new Date(Date.now() - 86400000));
    localStorage.setItem(STORAGE_KEY(), JSON.stringify(raw));

    recordSession(makeSession());
    expect(canRepairStreak()).toBe(false);
  });
});
