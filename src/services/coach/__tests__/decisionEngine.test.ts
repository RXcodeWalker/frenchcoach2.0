// @vitest-environment jsdom
// ── Decision engine tests (first-ever — Stage 9, docs §16) ─────────────────────
// generateDailyPlan caches to STORAGE_KEYS.coachDailyPlan (localStorage), so
// jsdom + localStorage.clear() per test, following persistenceRoundTrip's
// precedent. profile/snapshot/evidence are always passed explicitly so tests
// don't depend on coachProfileService/coachStorage's own storage reads.

import { describe, it, expect, beforeEach } from 'vitest';
import { generateDailyPlan, getDailyPlan, invalidateDailyPlan } from '../decisionEngine';
import type { CoachProfile } from '../../../types/coach';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';
import type { EvidenceEvent } from '../../../types/evidence';

function makeProfile(overrides: Partial<CoachProfile> = {}): CoachProfile {
  return {
    learnerId: 'local-user',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    demographics: { ageBand: 'teen', preferredLanguage: 'en' },
    goals: [],
    activeGoalId: null,
    cefr: { estimate: 'A2', confidence: 0.3, updatedAt: new Date().toISOString() },
    affect: { confidenceScore: 0.5, anxietyRisk: 0.2, correctionTolerance: 0.7, motivationPattern: 'new' },
    habits: { streakDays: 0, averageSessionMinutes: 0, consistencyScore: 0, lastActiveAt: null },
    onboardingComplete: false,
    ...overrides,
  };
}

function emptySnapshot(overrides: Partial<EvidenceBeliefSnapshot> = {}): EvidenceBeliefSnapshot {
  return {
    learnerId: 'local-user',
    generatedAt: new Date().toISOString(),
    reducerVersion: 'test',
    skills: {},
    weakestSkillIds: [],
    strongestSkillIds: [],
    totalEvidenceProcessed: 0,
    ...overrides,
  };
}

function skillBelief(nodeId: string, mastery: number, confidence = 0.6) {
  return {
    nodeId, label: nodeId, category: 'grammar', mastery, confidence,
    uncertainty: 0.2, trend: 'stable' as const, avoidanceScore: 0, evidenceCount: 5,
    weightedEvidence: 3, reliabilityMean: 0.7, lastObservedAt: new Date().toISOString(),
    recurringIssueIds: [], sourceBreakdown: {},
  };
}

describe('generateDailyPlan', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns a plan with a top action, explanation, and a session blend that sums to 100', () => {
    const plan = generateDailyPlan({ profile: makeProfile(), snapshot: emptySnapshot(), evidence: [] });
    expect(plan.topAction).toBeDefined();
    expect(plan.explanation.length).toBeGreaterThan(0);
    const b = plan.sessionBlend;
    expect(b.warmupPct + b.reviewPct + b.targetSkillPct + b.stretchPct + b.choicePct).toBe(100);
  });

  it('detects exam_soon urgency when the exam is within 14 days and biases toward exam_mock', () => {
    const examDate = new Date(Date.now() + 5 * 86_400_000).toISOString();
    const profile = makeProfile({ examDate, goals: [{ id: 'g1', type: 'igcse', label: 'IGCSE', createdAt: new Date().toISOString(), active: true }], activeGoalId: 'g1' });
    const plan = generateDailyPlan({ profile, snapshot: emptySnapshot(), evidence: [] });
    expect(plan.urgency).toBe('exam_soon');
    expect(plan.topAction.type).toBe('exam_mock');
  });

  it('detects overdue_review urgency when the last evidence is older than 10 days', () => {
    const evidence: EvidenceEvent[] = [{
      id: 'e1', learnerId: 'local-user', occurredAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
      sourceSessionId: 's1', evidenceType: 'language', targetNodeIds: ['tense_past'],
      observation: {}, result: { success: true }, reliability: { assessmentConfidence: 0.8, taskValidity: 0.8, signalQuality: 0.8, evaluator: 'llm', rubricVersion: 't' },
      context: { mode: 'practice', timed: false },
    }];
    const plan = generateDailyPlan({ profile: makeProfile(), snapshot: emptySnapshot(), evidence });
    expect(plan.urgency).toBe('overdue_review');
  });

  it('review_weak_skill top action biases the blend toward review over stretch', () => {
    const snapshot = emptySnapshot({
      skills: { tense_past: skillBelief('tense_past', 0.2) },
      weakestSkillIds: ['tense_past'],
    });
    const plan = generateDailyPlan({ profile: makeProfile(), snapshot, evidence: [] });
    expect(plan.topAction.type).toBe('review_weak_skill');
    expect(plan.sessionBlend.reviewPct).toBeGreaterThan(plan.sessionBlend.stretchPct);
    expect(plan.sessionBlend.focusSkillIds).toEqual(['tense_past']);
  });

  it('stretch_skill top action biases the blend toward stretch — the SessionBlend.stretchPct varies by candidate type (docs §10)', () => {
    const snapshot = emptySnapshot({
      skills: { subjunctive: skillBelief('subjunctive', 0.8) },
      strongestSkillIds: ['subjunctive'],
      // No weak skills, so review_weak_skill never becomes a candidate and
      // stretch_skill (the only snapshot-driven candidate left) wins the rank.
    });
    const plan = generateDailyPlan({ profile: makeProfile(), snapshot, evidence: [] });
    expect(plan.topAction.type).toBe('stretch_skill');
    expect(plan.sessionBlend.stretchPct).toBe(35);
    expect(plan.sessionBlend.stretchPct).toBeGreaterThan(plan.sessionBlend.reviewPct);
  });

  it('caches the plan for same-day reads and only regenerates on forceRegenerate', () => {
    const first = generateDailyPlan({ profile: makeProfile(), snapshot: emptySnapshot(), evidence: [] });
    const second = generateDailyPlan({ profile: makeProfile(), snapshot: emptySnapshot(), evidence: [] });
    expect(second.generatedAt).toBe(first.generatedAt);
    expect(getDailyPlan()?.generatedAt).toBe(first.generatedAt);

    const forced = generateDailyPlan({ profile: makeProfile(), snapshot: emptySnapshot(), evidence: [], forceRegenerate: true });
    expect(forced).toBeDefined();
  });

  it('invalidateDailyPlan clears the cache so the next read is null', () => {
    generateDailyPlan({ profile: makeProfile(), snapshot: emptySnapshot(), evidence: [] });
    invalidateDailyPlan();
    expect(getDailyPlan()).toBeNull();
  });

  it('falls back to general_practice when there is no snapshot, no urgency, and no exam-oriented goal', () => {
    const plan = generateDailyPlan({ profile: makeProfile(), snapshot: null, evidence: [] });
    expect(['general_practice', 'roleplay']).toContain(plan.topAction.type);
  });
});
