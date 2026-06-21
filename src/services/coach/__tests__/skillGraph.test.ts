import { describe, it, expect } from 'vitest';
import {
  getQuestionsPracticingSkill,
  getSkillLabel,
  getPrerequisites,
  getConfusions,
  isSkillReady,
  applyReadinessSubstitution,
} from '../skillGraph';
import type { EvidenceBeliefSnapshot, EvidenceDerivedSkillBelief } from '../../../types/beliefs';

function belief(nodeId: string, mastery: number, confidence: number): EvidenceDerivedSkillBelief {
  return {
    nodeId,
    label: nodeId,
    category: 'grammar',
    mastery,
    confidence,
    uncertainty: 0.2,
    trend: 'stable',
    avoidanceScore: 0,
    evidenceCount: 5,
    weightedEvidence: 2,
    reliabilityMean: 0.7,
    lastObservedAt: new Date().toISOString(),
    recurringIssueIds: [],
    sourceBreakdown: {},
  };
}

function snapshot(skills: Record<string, EvidenceDerivedSkillBelief>): EvidenceBeliefSnapshot {
  return {
    learnerId: 'local-user',
    generatedAt: new Date().toISOString(),
    reducerVersion: 'evidence-v1',
    skills,
    weakestSkillIds: [],
    strongestSkillIds: [],
    totalEvidenceProcessed: 0,
  };
}

describe('getQuestionsPracticingSkill', () => {
  it('returns questions whose grammarFocus includes the skill', () => {
    const questions = getQuestionsPracticingSkill('subjunctive');
    expect(questions.length).toBeGreaterThan(0);
    for (const q of questions) {
      expect(q.modelAnswer.toLowerCase()).toMatch(/il faut que|bien que|pour que|avant que|à moins que/);
    }
  });

  it('returns empty array for unknown skill', () => {
    expect(getQuestionsPracticingSkill('not_a_real_skill')).toEqual([]);
  });
});

describe('getSkillLabel', () => {
  it('resolves diagnostic skill names', () => {
    expect(getSkillLabel('subjunctive')).toBe('Subjunctive');
  });
});

describe('skill graph edges', () => {
  it('resolves a prerequisite chain', () => {
    // subjunctive ← hypothetical ← tense_past ← etre_avoir
    expect(getPrerequisites('subjunctive')).toEqual(expect.arrayContaining(['hypothetical', 'negation']));
    expect(getPrerequisites('hypothetical')).toContain('tense_past');
    expect(getPrerequisites('tense_past')).toContain('etre_avoir');
    // leaf has no prerequisites
    expect(getPrerequisites('etre_avoir')).toEqual([]);
  });

  it('reports commonly-confused skills symmetrically', () => {
    expect(getConfusions('hypothetical')).toContain('subjunctive');
    expect(getConfusions('subjunctive')).toContain('hypothetical');
  });
});

describe('isSkillReady', () => {
  it('returns ready when there is no snapshot', () => {
    expect(isSkillReady('subjunctive', null)).toEqual({ ready: true, blockers: [] });
  });

  it('blocks when a prerequisite has low mastery with enough evidence', () => {
    const snap = snapshot({ hypothetical: belief('hypothetical', 0.3, 0.6) });
    const result = isSkillReady('subjunctive', snap);
    expect(result.ready).toBe(false);
    expect(result.blockers).toContain('hypothetical');
  });

  it('does not block when prerequisite evidence is too sparse', () => {
    const snap = snapshot({ hypothetical: belief('hypothetical', 0.3, 0.1) });
    expect(isSkillReady('subjunctive', snap).ready).toBe(true);
  });

  it('is ready when the prerequisite is mastered', () => {
    const snap = snapshot({ hypothetical: belief('hypothetical', 0.8, 0.7) });
    expect(isSkillReady('subjunctive', snap).ready).toBe(true);
  });
});

describe('applyReadinessSubstitution', () => {
  it('substitutes a blocked skill with its prerequisite', () => {
    const snap = snapshot({ tense_past: belief('tense_past', 0.3, 0.6) });
    expect(applyReadinessSubstitution(['hypothetical'], snap)).toEqual(['tense_past']);
  });

  it('keeps a ready skill unchanged', () => {
    const snap = snapshot({ tense_past: belief('tense_past', 0.9, 0.7) });
    expect(applyReadinessSubstitution(['hypothetical'], snap)).toEqual(['hypothetical']);
  });
});
