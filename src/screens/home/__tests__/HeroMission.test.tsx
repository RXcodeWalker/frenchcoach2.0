// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, cleanup, screen } from '@testing-library/react';
import { HeroMission } from '../HeroMission';
import type { DailyPlan } from '../../../types/coach';

afterEach(cleanup);

function makeDailyPlan(rationale: string): DailyPlan {
  return {
    generatedAt: new Date().toISOString(),
    urgency: 'none' as DailyPlan['urgency'],
    topAction: {
      type: 'general_practice',
      score: 50,
      targetSkillIds: [],
      rationale,
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
    explanation: 'because',
  };
}

describe('HeroMission', () => {
  it('renders the dailyGoal prop value in the progress ring, not a hardcoded 3', () => {
    render(<HeroMission todayCount={1} dailyGoal={5} dailyPlan={null} onLearn={vi.fn()} onExam={vi.fn()} />);
    expect(screen.getByText('1/5')).not.toBeNull();
  });

  it("renders dailyPlan.topAction.rationale when provided", () => {
    render(
      <HeroMission
        todayCount={0}
        dailyGoal={3}
        dailyPlan={makeDailyPlan('Push justify from good to excellent.')}
        onLearn={vi.fn()}
        onExam={vi.fn()}
      />,
    );
    expect(screen.getByText('Push justify from good to excellent.')).not.toBeNull();
  });

  it('renders the empty-state fallback when dailyPlan is null', () => {
    render(<HeroMission todayCount={0} dailyGoal={3} dailyPlan={null} onLearn={vi.fn()} onExam={vi.fn()} />);
    expect(screen.getByText('Complete a session to get your personalised focus for today.')).not.toBeNull();
  });
});
