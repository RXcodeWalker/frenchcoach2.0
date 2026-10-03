// @vitest-environment jsdom
// Step 5 / ADR-0007: a Coached Practice exam session is tagged
// Session.practiceOnly and must never feed the roadmap's exam-derived skill
// average or its IGCSE milestone nodes — only a counting (Exam Sim) attempt does.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Feedback, Session } from '../../../types';

const { getStats } = vi.hoisted(() => ({ getStats: vi.fn() }));
vi.mock('../../analytics/analyticsService', () => ({ getStats }));

function examSession(overrides: Partial<Session> & { score: number } & { aiFeedback?: Feedback }): Session & { aiFeedback?: Feedback } {
  return {
    id: `s-${Math.random()}`,
    mode: 'exam',
    wordCount: 50,
    xpEarned: 0,
    durationSec: 300,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const FAKE_FEEDBACK: Feedback = {} as Feedback;

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('evaluateRoadmap — practiceOnly exclusion', () => {
  it('skips a practiceOnly exam session for the examResponse skill average', async () => {
    const countingSession = examSession({ score: 8, aiFeedback: FAKE_FEEDBACK });
    const practiceSession = examSession({ score: 2, aiFeedback: FAKE_FEEDBACK, practiceOnly: true });
    getStats.mockReturnValue({
      totalSessions: 2,
      allSessions: [practiceSession, countingSession],
    });

    const { evaluateRoadmap } = await import('../roadmapService');
    const data = evaluateRoadmap();

    // Only the counting session's score (8, already /10) should have counted —
    // a low practiceOnly score (2) dragging the average down is the failure
    // mode this test catches.
    expect(data.skills.examResponse).toBe(8);
  });

  it('counts a 7.5 Exam Sim session (no aiFeedback) as 7.5, unscaled', async () => {
    getStats.mockReturnValue({
      totalSessions: 1,
      allSessions: [examSession({ score: 7.5 })],
    });

    const { evaluateRoadmap } = await import('../roadmapService');
    expect(evaluateRoadmap().skills.examResponse).toBe(7.5);
  });

  it('ignores a practice-only exam session entirely for examResponse', async () => {
    getStats.mockReturnValue({
      totalSessions: 1,
      allSessions: [examSession({ score: 7.5, practiceOnly: true })],
    });

    const { evaluateRoadmap } = await import('../roadmapService');
    expect(evaluateRoadmap().skills.examResponse).toBe(0);
  });

  it('skips a practiceOnly exam session for the "Exam Preview" (igcse) milestone', async () => {
    const practiceSession = examSession({ score: 9, practiceOnly: true });
    getStats.mockReturnValue({
      totalSessions: 1,
      allSessions: [practiceSession],
    });

    const { evaluateRoadmap } = await import('../roadmapService');
    const data = evaluateRoadmap();

    expect(data.completedNodes).not.toContain('i4');
  });

  it('does complete the "Exam Preview" milestone from a counting exam session', async () => {
    const countingSession = examSession({ score: 9 });
    getStats.mockReturnValue({
      totalSessions: 1,
      allSessions: [countingSession],
    });

    const { evaluateRoadmap } = await import('../roadmapService');
    const data = evaluateRoadmap();

    expect(data.completedNodes).toContain('i4');
  });
});
