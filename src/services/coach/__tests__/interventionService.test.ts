// @vitest-environment jsdom
// ── Intervention service pure-logic tests ──────────────────────────────────────
// detectProblem and applyOutcomeToProblem are pure (no storage), so these run in
// the Node test environment without a localStorage shim.

import { describe, it, expect, beforeEach } from 'vitest';
import type { EvidenceEvent } from '../../../types/evidence';
import type { Intervention, LearningProblem } from '../../../types/intervention';
import type { EvidenceBeliefSnapshot } from '../../../types/beliefs';
import { detectProblem, applyOutcomeToProblem, detectAndPersistProblem } from '../interventionService';

function makeFailure(
  nodeId: string,
  daysAgo = 0,
  id = `ev-${nodeId}-${daysAgo}`,
  issueCategory = 'subjunctive',
): EvidenceEvent {
  return {
    id,
    learnerId: 'local-user',
    occurredAt: new Date(Date.now() - daysAgo * 86_400_000).toISOString(),
    sourceSessionId: 'sess-1',
    evidenceType: 'language',
    targetNodeIds: [nodeId],
    observation: { issueCategories: [issueCategory] },
    result: { score: 4, success: false },
    reliability: {
      assessmentConfidence: 0.8,
      taskValidity: 0.9,
      signalQuality: 0.9,
      evaluator: 'llm',
      rubricVersion: 'test',
    },
    context: { mode: 'practice', timed: false },
  };
}

function makeProblem(overrides: Partial<LearningProblem> = {}): LearningProblem {
  return {
    id: 'prob-1',
    learnerId: 'local-user',
    nodeId: 'subjunctive',
    problemType: 'error',
    severity: 0.6,
    evidenceIds: ['ev-1', 'ev-2'],
    status: 'active',
    detectedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    successfulDrills: 0,
    failedDrills: 0,
    ...overrides,
  };
}

describe('detectProblem', () => {
  it('fires on two failures of the same grammar node within 7 days', () => {
    const events = [makeFailure('subjunctive', 2, 'a'), makeFailure('subjunctive', 0, 'b')];
    const problem = detectProblem(events, null);
    expect(problem).not.toBeNull();
    expect(problem?.nodeId).toBe('subjunctive');
    expect(problem?.status).toBe('active');
    expect(problem?.evidenceIds).toEqual(expect.arrayContaining(['a', 'b']));
  });

  it('does not fire on a single failure', () => {
    expect(detectProblem([makeFailure('subjunctive')], null)).toBeNull();
  });

  it('does not fire for skills without MicroDrill coverage', () => {
    // 'word_count' is a structure node with no drill content
    const events = [makeFailure('word_count', 1, 'a'), makeFailure('word_count', 0, 'b')];
    expect(detectProblem(events, null)).toBeNull();
  });

  it('respects the 24h cooldown when a recent intervention exists', () => {
    const events = [makeFailure('subjunctive', 2, 'a'), makeFailure('subjunctive', 0, 'b')];
    const recentInterventions: Intervention[] = [
      {
        id: 'iv-1',
        learnerId: 'local-user',
        problemId: 'prob-1',
        nodeId: 'subjunctive',
        strategyType: 'retrieval_practice',
        targetNodeIds: ['subjunctive'],
        deliveredAt: new Date(Date.now() - 3 * 3_600_000).toISOString(), // 3h ago
      },
    ];
    expect(detectProblem(events, null, { recentInterventions })).toBeNull();
  });

  it('ignores failures older than 7 days', () => {
    const events = [makeFailure('subjunctive', 9, 'a'), makeFailure('subjunctive', 8, 'b')];
    expect(detectProblem(events, null)).toBeNull();
  });

  it('sets isRecurring true when the belief snapshot has recurringIssueIds for the node', () => {
    const events = [makeFailure('subjunctive', 2, 'a'), makeFailure('subjunctive', 0, 'b')];
    const snapshot = {
      skills: { subjunctive: { recurringIssueIds: ['subjunctive_mood'] } },
    } as unknown as EvidenceBeliefSnapshot;
    const problem = detectProblem(events, snapshot);
    expect(problem?.isRecurring).toBe(true);
  });

  it('sets isRecurring false for a fresh 2-failure, non-recurring case', () => {
    // Distinct issue categories per event so hasRepeatedIssueCategories doesn't fire.
    const events = [
      makeFailure('subjunctive', 2, 'a', 'cat_a'),
      makeFailure('subjunctive', 0, 'b', 'cat_b'),
    ];
    const problem = detectProblem(events, null);
    expect(problem?.isRecurring).toBe(false);
  });

  it('sets recurrenceNote once 3+ evidence events contributed', () => {
    const events = [
      makeFailure('subjunctive', 3, 'a', 'cat_a'),
      makeFailure('subjunctive', 2, 'b', 'cat_b'),
      makeFailure('subjunctive', 0, 'c', 'cat_c'),
    ];
    const problem = detectProblem(events, null);
    expect(problem?.recurrenceNote).toBe('Missed 3 times this week');
  });
});

describe('detectAndPersistProblem merge branch', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('carries the fresh isRecurring flag forward instead of keeping a stale prior value', () => {
    const firstEvents = [
      makeFailure('subjunctive', 2, 'a', 'cat_a'),
      makeFailure('subjunctive', 1, 'b', 'cat_b'),
    ];
    const first = detectAndPersistProblem(firstEvents, null);
    expect(first?.isRecurring).toBe(false);

    const secondEvents = [...firstEvents, makeFailure('subjunctive', 0, 'c', 'cat_c')];
    const snapshot = {
      skills: { subjunctive: { recurringIssueIds: ['subjunctive_mood'] } },
    } as unknown as EvidenceBeliefSnapshot;
    const second = detectAndPersistProblem(secondEvents, snapshot);
    expect(second?.isRecurring).toBe(true);
    expect(second?.id).toBe(first?.id); // merged, not duplicated
  });
});

describe('applyOutcomeToProblem', () => {
  it('moves an active problem to monitoring on a passing drill', () => {
    const updated = applyOutcomeToProblem(makeProblem(), 0.8);
    expect(updated.status).toBe('monitoring');
    expect(updated.successfulDrills).toBe(1);
  });

  it('resolves a problem after a second successful drill', () => {
    const monitoring = makeProblem({ status: 'monitoring', successfulDrills: 1 });
    const updated = applyOutcomeToProblem(monitoring, 0.7);
    expect(updated.status).toBe('resolved');
    expect(updated.successfulDrills).toBe(2);
  });

  it('keeps a problem active and counts a failed drill on a low score', () => {
    const updated = applyOutcomeToProblem(makeProblem(), 0.33);
    expect(updated.status).toBe('active');
    expect(updated.failedDrills).toBe(1);
  });
});
