// @vitest-environment jsdom
// ── Phase 4b hard gate ──────────────────────────────────────────────────────
// Session.score is null for any attempt that was never actually graded
// (offline fallback). getStats()/getDailyStats() must exclude those sessions
// from avgScore/bestScore/chart data entirely — never treat the null as a 0.

import { describe, it, expect, beforeEach } from 'vitest';
import { recordSession, getStats, getDailyStats } from '../analyticsService';
import type { Session } from '../../../types';

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

beforeEach(() => {
  localStorage.clear();
});

describe('analyticsService excludes unscored (score: null) sessions from aggregates', () => {
  it('getStats().avgScore ignores null-score sessions entirely — never averages them in as 0', () => {
    recordSession(makeSession({ score: 8 }));
    recordSession(makeSession({ score: null })); // unscored offline attempt
    recordSession(makeSession({ score: 4 }));

    const stats = getStats();
    // If the null were treated as 0, avg would be (8+0+4)/3 = 4.0. The
    // correct real-scores-only average is (8+4)/2 = 6.0.
    expect(stats.avgScore).toBe(6.0);
    expect(stats.totalSessions).toBe(3); // still counts toward total/streak
  });

  it('getStats().bestScore ignores null-score sessions', () => {
    recordSession(makeSession({ score: null }));
    const stats = getStats();
    expect(stats.bestScore).toBeNull();
  });

  it('getStats().byTopic average excludes null-score sessions for that topic', () => {
    recordSession(makeSession({ topicKey: 'sport', score: 9 }));
    recordSession(makeSession({ topicKey: 'sport', score: null }));
    const stats = getStats();
    expect(stats.byTopic['sport'].avg).toBe(9);
    expect(stats.byTopic['sport'].count).toBe(1);
  });

  it('getDailyStats() day average excludes null-score sessions for that day', () => {
    recordSession(makeSession({ score: 10 }));
    recordSession(makeSession({ score: null }));
    const today = getDailyStats(1)[0];
    expect(today.score).toBe(10);
    expect(today.sessions).toBe(2); // both sessions still counted toward activity
    expect(today.scoredSessions).toBe(1);
  });

  // Regression: a day with sessions but zero real scores (e.g. every attempt
  // was offline/unscored) previously defaulted `score` to 0 with no way for a
  // caller to tell that 0 wasn't a real average — confirmed live in the app
  // via OverviewTab's "7-Day Performance" widget showing "Avg: 0.0" after a
  // single unscored offline session.
  it('a day with sessions but none scored reports scoredSessions: 0, so callers can distinguish it from a real 0 average', () => {
    recordSession(makeSession({ score: null }));
    recordSession(makeSession({ score: null }));
    const today = getDailyStats(1)[0];
    expect(today.sessions).toBe(2);
    expect(today.scoredSessions).toBe(0);
    // `score` itself is still a plottable placeholder (chart convention), but
    // callers must gate on scoredSessions, never trust `score` directly as a
    // real average when scoredSessions is 0.
    expect(today.score).toBe(0);
  });

  it('an all-unscored session set produces avgScore: null, never 0', () => {
    recordSession(makeSession({ score: null }));
    recordSession(makeSession({ score: null }));
    const stats = getStats();
    expect(stats.avgScore).toBeNull();
    expect(stats.bestScore).toBeNull();
  });
});
