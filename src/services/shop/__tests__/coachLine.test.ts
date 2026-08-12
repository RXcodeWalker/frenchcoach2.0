// Shop plan §9: coach line resolution order — streak_at_risk (no freeze) >
// exam_soon > overdue_review > nearest unlock > nothing.

import { describe, it, expect } from 'vitest';
import { computeCoachLine } from '../coachLine';
import type { DailyPlan } from '../../../types/coach';

function plan(urgency: DailyPlan['urgency']): DailyPlan {
  return {
    generatedAt: new Date().toISOString(),
    urgency,
    topAction: {
      type: 'general_practice',
      score: 50,
      targetSkillIds: [],
      rationale: 'r',
      suggestedMode: 'standard',
    },
    allCandidates: [],
    sessionBlend: {
      warmupPct: 20,
      reviewPct: 30,
      targetSkillPct: 30,
      stretchPct: 10,
      choicePct: 10,
      focusSkillIds: [],
    },
    explanation: 'e',
  };
}

describe('computeCoachLine', () => {
  it('streak_at_risk with no freeze owned takes top priority', () => {
    const line = computeCoachLine({
      dailyPlan: plan('streak_at_risk'),
      hasStreakFreeze: false,
      streakDays: 12,
      daysUntilExam: null,
      lockedCandidates: [],
    });
    expect(line).toBe('Your 12-day streak is at risk today. A Streak Freeze covers it.');
  });

  it('streak_at_risk is suppressed when a freeze is already owned, falling through', () => {
    const line = computeCoachLine({
      dailyPlan: plan('streak_at_risk'),
      hasStreakFreeze: true,
      streakDays: 12,
      daysUntilExam: null,
      lockedCandidates: [],
    });
    expect(line).toBeNull();
  });

  it('exam_soon reports the real day count', () => {
    const line = computeCoachLine({
      dailyPlan: plan('exam_soon'),
      hasStreakFreeze: false,
      streakDays: 0,
      daysUntilExam: 9,
      lockedCandidates: [],
    });
    expect(line).toBe("Exam in 9 days. A Focus Token lets you drill your weakest topic instead of today's plan.");
  });

  it('exam_soon singularizes for 1 day', () => {
    const line = computeCoachLine({
      dailyPlan: plan('exam_soon'),
      hasStreakFreeze: false,
      streakDays: 0,
      daysUntilExam: 1,
      lockedCandidates: [],
    });
    expect(line).toContain('Exam in 1 day.');
  });

  it('overdue_review recommends a Focus Token framed as review', () => {
    const line = computeCoachLine({
      dailyPlan: plan('overdue_review'),
      hasStreakFreeze: false,
      streakDays: 0,
      daysUntilExam: null,
      lockedCandidates: [],
    });
    expect(line).toContain('Focus Token');
    expect(line).toContain('review');
  });

  it('falls back to the nearest unlock when urgency is none', () => {
    const line = computeCoachLine({
      dailyPlan: plan('none'),
      hasStreakFreeze: false,
      streakDays: 0,
      daysUntilExam: null,
      lockedCandidates: [
        { name: 'Le Renard', ratio: 0.9 },
        { name: 'Le Croissant', ratio: 0.3 },
      ],
    });
    expect(line).toBe("Keep going — you're closest to unlocking Le Renard.");
  });

  it('collapses to null when nothing applies and no locked candidate has progress', () => {
    const line = computeCoachLine({
      dailyPlan: plan('none'),
      hasStreakFreeze: false,
      streakDays: 0,
      daysUntilExam: null,
      lockedCandidates: [{ name: 'Le Renard', ratio: 0 }],
    });
    expect(line).toBeNull();
  });

  it('collapses to null when there is no daily plan and no candidates', () => {
    const line = computeCoachLine({
      dailyPlan: null,
      hasStreakFreeze: false,
      streakDays: 0,
      daysUntilExam: null,
      lockedCandidates: [],
    });
    expect(line).toBeNull();
  });
});
