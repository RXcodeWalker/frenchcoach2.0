import { describe, it, expect } from 'vitest';
import { computeRequirementProgress } from '../requirementProgress';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';
import type { LearningProblem, Intervention } from '../../../types/intervention';

function snapshot(masteries: number[]): EvidenceBeliefSnapshot {
  const skills: EvidenceBeliefSnapshot['skills'] = {};
  masteries.forEach((m, i) => {
    skills[`skill_${i}`] = {
      nodeId: `skill_${i}`,
      label: `Skill ${i}`,
      category: 'grammar',
      mastery: m,
      confidence: 1,
      uncertainty: 0,
      trend: 'stable',
      avoidanceScore: 0,
      evidenceCount: 5,
      weightedEvidence: 5,
      reliabilityMean: 1,
      lastObservedAt: null,
      recurringIssueIds: [],
      sourceBreakdown: {},
    };
  });
  return {
    learnerId: 'l1',
    generatedAt: new Date().toISOString(),
    reducerVersion: 'test',
    skills,
    weakestSkillIds: [],
    strongestSkillIds: [],
    totalEvidenceProcessed: masteries.length * 5,
  };
}

const baseInput = {
  unlocked: false,
  streak: 0,
  xp: 0,
  beliefSnapshot: null as EvidenceBeliefSnapshot | null,
  problems: [] as LearningProblem[],
  interventions: [] as Intervention[],
  roleplayCount: 0,
};

describe('computeRequirementProgress', () => {
  it('returns ratio 1 and "Unlocked" once the achievement is already unlocked, regardless of underlying signal', () => {
    const result = computeRequirementProgress({ ...baseInput, achievementId: 'triple_jour', unlocked: true, streak: 0 });
    expect(result).toEqual({ ratio: 1, label: 'Unlocked' });
  });

  it('computes streak-based progress for triple_jour (3-day streak)', () => {
    const result = computeRequirementProgress({ ...baseInput, achievementId: 'triple_jour', streak: 2 });
    expect(result.ratio).toBeCloseTo(2 / 3);
    expect(result.label).toBe('2 / 3 day streak');
  });

  it('clamps streak progress at 1 when streak exceeds target', () => {
    const result = computeRequirementProgress({ ...baseInput, achievementId: 'semaine_parfaite', streak: 20 });
    expect(result.ratio).toBe(1);
    expect(result.label).toBe('7 / 7 day streak');
  });

  it('computes grammaire_maitrisee from the real belief snapshot best skill mastery (0.8 target)', () => {
    const result = computeRequirementProgress({
      ...baseInput,
      achievementId: 'grammaire_maitrisee',
      beliefSnapshot: snapshot([0.3, 0.72, 0.5]),
    });
    expect(result.ratio).toBeCloseTo(0.72 / 0.8);
    expect(result.label).toBe('0.72 / 0.80 mastery');
  });

  it('computes niveau_b2 from average skill mastery (0.6 target)', () => {
    const result = computeRequirementProgress({
      ...baseInput,
      achievementId: 'niveau_b2',
      beliefSnapshot: snapshot([0.4, 0.6]),
    });
    expect(result.ratio).toBeCloseTo(0.5 / 0.6);
    expect(result.label).toBe('0.50 / 0.60 avg mastery');
  });

  it('treats a null belief snapshot as zero mastery rather than throwing', () => {
    const result = computeRequirementProgress({ ...baseInput, achievementId: 'grammaire_maitrisee', beliefSnapshot: null });
    expect(result.ratio).toBe(0);
  });

  it('computes XP-based progress for expert (1500 XP) and bete_de_mode (7000 XP)', () => {
    const expert = computeRequirementProgress({ ...baseInput, achievementId: 'expert', xp: 750 });
    expect(expert.ratio).toBeCloseTo(0.5);
    const beast = computeRequirementProgress({ ...baseInput, achievementId: 'bete_de_mode', xp: 3500 });
    expect(beast.ratio).toBeCloseTo(0.5);
  });

  it('computes roleplay progress for causeur (5 roleplays)', () => {
    const result = computeRequirementProgress({ ...baseInput, achievementId: 'causeur', roleplayCount: 3 });
    expect(result.ratio).toBeCloseTo(0.6);
    expect(result.label).toBe('3 / 5 roleplays');
  });

  it('resolves probleme_resolu from a resolved LearningProblem, not merely a present one', () => {
    const monitoring: LearningProblem[] = [{ id: 'p1', nodeId: 'n', status: 'monitoring' } as LearningProblem];
    const notResolved = computeRequirementProgress({ ...baseInput, achievementId: 'probleme_resolu', problems: monitoring });
    expect(notResolved.ratio).toBe(0);

    const resolved: LearningProblem[] = [{ id: 'p1', nodeId: 'n', status: 'resolved' } as LearningProblem];
    const isResolved = computeRequirementProgress({ ...baseInput, achievementId: 'probleme_resolu', problems: resolved });
    expect(isResolved.ratio).toBe(1);
  });

  it('computes drill_master from intervention count (5 target)', () => {
    const interventions = [1, 2, 3].map(i => ({ id: `i${i}` }) as Intervention);
    const result = computeRequirementProgress({ ...baseInput, achievementId: 'drill_master', interventions });
    expect(result.ratio).toBeCloseTo(0.6);
    expect(result.label).toBe('3 / 5 interventions');
  });

  it('falls back to binary not-yet-unlocked for requirements with no partial metric (e.g. examinateur)', () => {
    const result = computeRequirementProgress({ ...baseInput, achievementId: 'examinateur' });
    expect(result.ratio).toBe(0);
    expect(result.label).toBe('Not yet unlocked');
  });
});
