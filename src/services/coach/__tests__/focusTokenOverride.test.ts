import { describe, it, expect } from 'vitest';
import { applyFocusTokenOverride } from '../decisionEngine';
import type { DailyPlan } from '../../../types/coach';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';

const BASE_PLAN: DailyPlan = {
  generatedAt: new Date().toISOString(),
  urgency: 'none',
  topAction: {
    type: 'general_practice',
    score: 50,
    targetSkillIds: [],
    rationale: 'A well-rounded speaking session across all areas.',
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
  explanation: 'A balanced speaking session today.',
};

function snapshotWithWeakest(weakestSkillIds: string[]): EvidenceBeliefSnapshot {
  return {
    learnerId: 'l1',
    generatedAt: new Date().toISOString(),
    reducerVersion: 'test',
    skills: {},
    weakestSkillIds,
    strongestSkillIds: [],
    totalEvidenceProcessed: 10,
  };
}

describe('applyFocusTokenOverride', () => {
  it('forces topAction to review_weak_skill on the single weakest skill at quick mode', () => {
    const overridden = applyFocusTokenOverride(BASE_PLAN, snapshotWithWeakest(['tense_past', 'subjunctive']));
    expect(overridden.topAction.type).toBe('review_weak_skill');
    expect(overridden.topAction.targetSkillIds).toEqual(['tense_past']);
    expect(overridden.topAction.suggestedMode).toBe('quick');
  });

  it('updates sessionBlend.focusSkillIds to the overridden skill', () => {
    const overridden = applyFocusTokenOverride(BASE_PLAN, snapshotWithWeakest(['tense_past']));
    expect(overridden.sessionBlend.focusSkillIds).toEqual(['tense_past']);
  });

  it('rewrites explanation to mention the Focus Token', () => {
    const overridden = applyFocusTokenOverride(BASE_PLAN, snapshotWithWeakest(['tense_past']));
    expect(overridden.explanation).toContain('Focus Token');
  });

  it('leaves urgency and generatedAt untouched — only the recommendation changes', () => {
    const plan = { ...BASE_PLAN, urgency: 'streak_at_risk' as const };
    const overridden = applyFocusTokenOverride(plan, snapshotWithWeakest(['tense_past']));
    expect(overridden.urgency).toBe('streak_at_risk');
    expect(overridden.generatedAt).toBe(plan.generatedAt);
  });

  it('returns the plan unchanged when there is no belief snapshot to derive a weakest skill from', () => {
    const overridden = applyFocusTokenOverride(BASE_PLAN, null);
    expect(overridden).toBe(BASE_PLAN);
  });

  it('returns the plan unchanged when the snapshot has no weakest skills recorded', () => {
    const overridden = applyFocusTokenOverride(BASE_PLAN, snapshotWithWeakest([]));
    expect(overridden).toBe(BASE_PLAN);
  });
});
