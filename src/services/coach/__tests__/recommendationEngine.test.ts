// @vitest-environment jsdom
// ── Recommendation engine tests (first-ever — Stage 9, docs §16) ──────────────
// generateRecommendation reads getActiveProblem() from storage, so problems are
// seeded via interventionService's persisted detection rather than constructed
// by hand — this also exercises the real priority ordering between the
// grammar and demand:* problem dimensions.

import { describe, it, expect, beforeEach } from 'vitest';
import type { EvidenceEvent } from '../../../types/evidence';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';
import { generateRecommendation, getActiveRecommendation, setRecommendationStatus } from '../recommendationEngine';
import { detectAndPersistProblem, detectAndPersistDemandProblem } from '../interventionService';

function makeGrammarFailure(nodeId: string, daysAgo: number, id: string): EvidenceEvent {
  return {
    id,
    learnerId: 'local-user',
    occurredAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    sourceSessionId: 'sess-1',
    evidenceType: 'language',
    targetNodeIds: [nodeId],
    observation: { issueCategories: ['subjunctive_mood'] },
    result: { score: 4, success: false },
    reliability: { assessmentConfidence: 0.8, taskValidity: 0.9, signalQuality: 0.9, evaluator: 'llm', rubricVersion: 'test' },
    context: { mode: 'practice', timed: false },
  };
}

function makeDemandAvoidance(nodeId: string, daysAgo: number, id: string): EvidenceEvent {
  return {
    id,
    learnerId: 'local-user',
    occurredAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    sourceSessionId: 'sess-1',
    evidenceType: 'behavior',
    targetNodeIds: [nodeId],
    observation: { avoidanceSkillIds: [nodeId] },
    result: { avoided: true },
    reliability: { assessmentConfidence: 0.5, taskValidity: 0.6, signalQuality: 0.9, evaluator: 'heuristic', rubricVersion: 'test' },
    context: { mode: 'practice', timed: false },
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

describe('generateRecommendation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('falls back to a default recommendation with no snapshot or evidence', () => {
    const rec = generateRecommendation(null, []);
    expect(rec.type).toBe('continue_topic');
    expect(rec.status).toBe('active');
  });

  it('recommends continuing the most recent topic when no weakness or problem exists', () => {
    const evidence: EvidenceEvent[] = [
      { ...makeGrammarFailure('subjunctive', 0, 'e1'), result: { score: 9, success: true }, context: { mode: 'practice', timed: false, topicKey: 'school' } },
    ];
    const rec = generateRecommendation(emptySnapshot(), evidence);
    expect(rec.type).toBe('continue_topic');
    expect(rec.targetTopicKey).toBe('school');
  });

  it('targets the weakest skill when mastery is below the threshold', () => {
    const snapshot = emptySnapshot({
      skills: {
        tense_past: {
          nodeId: 'tense_past', label: 'Past tense', category: 'grammar', mastery: 0.3, confidence: 0.6,
          uncertainty: 0.2, trend: 'stable', avoidanceScore: 0, evidenceCount: 5, weightedEvidence: 3,
          reliabilityMean: 0.7, lastObservedAt: new Date().toISOString(), recurringIssueIds: [], sourceBreakdown: {},
        },
      },
      weakestSkillIds: ['tense_past'],
    });
    const rec = generateRecommendation(snapshot, []);
    expect(rec.type).toBe('review_weak_skill');
    expect(rec.targetSkillIds).toEqual(['tense_past']);
  });

  it('a grammar problem forces a recovery recommendation and outranks weakest-skill scoring', () => {
    detectAndPersistProblem(
      [makeGrammarFailure('subjunctive', 2, 'a'), makeGrammarFailure('subjunctive', 0, 'b')],
      null,
    );
    const snapshot = emptySnapshot({
      skills: {
        tense_past: {
          nodeId: 'tense_past', label: 'Past tense', category: 'grammar', mastery: 0.2, confidence: 0.6,
          uncertainty: 0.2, trend: 'stable', avoidanceScore: 0, evidenceCount: 5, weightedEvidence: 3,
          reliabilityMean: 0.7, lastObservedAt: new Date().toISOString(), recurringIssueIds: [], sourceBreakdown: {},
        },
      },
      weakestSkillIds: ['tense_past'],
    });
    const rec = generateRecommendation(snapshot, []);
    expect(rec.targetSkillIds).toEqual(['subjunctive']);
    expect(rec.title).toContain('Recover');
  });

  it('a demand:* problem produces a recommendation with targetDemand set', () => {
    detectAndPersistDemandProblem(
      [makeDemandAvoidance('demand:justify', 2, 'a'), makeDemandAvoidance('demand:justify', 0, 'b')],
      null,
    );
    const rec = generateRecommendation(emptySnapshot(), []);
    expect(rec.targetDemand).toBe('justify');
    expect(rec.type).toBe('review_weak_skill');
  });

  it('a grammar problem outranks a simultaneously active demand problem', () => {
    detectAndPersistDemandProblem(
      [makeDemandAvoidance('demand:justify', 2, 'a'), makeDemandAvoidance('demand:justify', 0, 'b')],
      null,
    );
    detectAndPersistProblem(
      [makeGrammarFailure('subjunctive', 2, 'c'), makeGrammarFailure('subjunctive', 0, 'd')],
      null,
    );
    const rec = generateRecommendation(emptySnapshot(), []);
    expect(rec.targetSkillIds).toEqual(['subjunctive']);
    expect(rec.targetDemand).toBeUndefined();
  });

  it('persists the recommendation so getActiveRecommendation reads it back', () => {
    const rec = generateRecommendation(emptySnapshot(), []);
    expect(getActiveRecommendation()?.id).toBe(rec.id);
  });

  it('setRecommendationStatus updates the stored recommendation status', () => {
    generateRecommendation(emptySnapshot(), []);
    setRecommendationStatus('accepted');
    expect(getActiveRecommendation()?.status).toBe('accepted');
  });
});
