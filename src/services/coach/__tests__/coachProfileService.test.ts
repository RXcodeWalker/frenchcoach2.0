// ── coachProfileService.deriveCEFREstimate — docs §10 "Profile" row ────────────
// Pure function: no localStorage, so this runs in the default (node) test
// environment, following persistenceRoundTrip's "pure functions don't need
// jsdom" precedent (see interventionService.test.ts's header comment).

import { describe, it, expect } from 'vitest';
import { deriveCEFREstimate } from '../coachProfileService';
import type { CoachProfile } from '../../../types/coach';
import type { EvidenceBeliefSnapshot, DemandBelief } from '../../../types/beliefs';

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

function makeSnapshot(demands: Record<string, DemandBelief>): EvidenceBeliefSnapshot {
  return {
    learnerId: 'local-user',
    generatedAt: new Date().toISOString(),
    reducerVersion: 'test',
    skills: {},
    weakestSkillIds: [],
    strongestSkillIds: [],
    totalEvidenceProcessed: 10,
    demands,
  };
}

function belief(overrides: Partial<DemandBelief> = {}): DemandBelief {
  return { nodeId: 'demand:justify', mastery: 0.5, confidence: 0.6, rawEvidenceCount: 5, lastObservedAt: new Date().toISOString(), ...overrides };
}

describe('deriveCEFREstimate', () => {
  it('keeps the profile default when there is no snapshot at all', () => {
    const profile = makeProfile();
    const result = deriveCEFREstimate(null, profile);
    expect(result.cefrEstimate).toBe('A2');
    expect(result.cefrConfidence).toBe(0.3);
  });

  it('keeps the profile default when overallConfidence is below the "no band" gate (docs §6.3)', () => {
    const profile = makeProfile({ cefr: { estimate: 'A1', confidence: 0.1, updatedAt: new Date().toISOString() } });
    // Only one demand has any evidence -> overallConfidence = 0.6/5 = 0.12, well below 0.25.
    const snapshot = makeSnapshot({ 'demand:justify': belief({ confidence: 0.6, mastery: 0.9 }) });
    const result = deriveCEFREstimate(snapshot, profile);
    expect(result.cefrEstimate).toBe('A1');
    expect(result.cefrConfidence).toBe(0.1);
  });

  it('derives a real band once confidence clears the gate, independent of the learner-chosen tier', () => {
    // High mastery across enough demands to clear overallConfidence >= 0.25.
    const snapshot = makeSnapshot({
      'demand:describe': belief({ nodeId: 'demand:describe', mastery: 0.9, confidence: 0.7 }),
      'demand:explain': belief({ nodeId: 'demand:explain', mastery: 0.9, confidence: 0.7 }),
    });
    const result = deriveCEFREstimate(snapshot, makeProfile());
    // Never derives 'C1' — the demand ladder's ceiling is B2 (docs §7).
    expect(['A1', 'A2', 'B1', 'B2']).toContain(result.cefrEstimate);
    expect(result.cefrConfidence).toBeGreaterThanOrEqual(0.25);
  });

  it('does not inflate to a high band from a single low-anchor demand (kills the §3.7 avgScore circularity)', () => {
    // A learner who only ever gets 'describe' questions right should not be
    // read as strong overall — this is the property deriveCEFR(avgScore)
    // could never guarantee (grading was against the learner's own chosen tier).
    const snapshot = makeSnapshot({
      'demand:describe': belief({ nodeId: 'demand:describe', mastery: 0.95, confidence: 0.8 }),
    });
    const result = deriveCEFREstimate(snapshot, makeProfile());
    expect(result.cefrEstimate).not.toBe('B2');
  });
});
