// @vitest-environment jsdom
// Step 5 / ADR-0007: Session.practiceOnly must survive the Session ->
// StoredSession projection, or roadmapService's practiceOnly filtering (which
// reads getStats().allSessions, i.e. StoredSession) is a no-op in practice.

import { describe, it, expect, beforeEach } from 'vitest';
import { recordSession, getStats } from '../analyticsService';
import type { Session } from '../../../types';

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: `sess-${Math.random().toString(36).slice(2)}`,
    mode: 'exam',
    wordCount: 40,
    score: 8,
    xpEarned: 20,
    durationSec: 300,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('analyticsService carries Session.practiceOnly through to StoredSession', () => {
  it('a practiceOnly session is stored and read back with practiceOnly: true', () => {
    recordSession(makeSession({ practiceOnly: true }));
    recordSession(makeSession({ practiceOnly: false }));
    recordSession(makeSession());

    const [oldestToNewest] = [getStats().allSessions].map((s) => [...s].reverse());
    expect(oldestToNewest[0].practiceOnly).toBe(true);
    expect(oldestToNewest[1].practiceOnly).toBe(false);
    expect(oldestToNewest[2].practiceOnly).toBeUndefined();
  });
});
