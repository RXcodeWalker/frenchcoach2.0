/**
 * B3 version-drift guard for the belief reducer.
 *
 * Mirrors src/domain/igcse/evidence/__tests__/version-pin.test.ts: hashes
 * rendered output over a fixed EvidenceEvent[] fixture, not source text, so
 * this only fires when observable reduction behavior actually changes.
 *
 * Why this test exists: Phase 4b added the `hasSuccessSignal` gate — a real
 * output change — and shipped it WITHOUT bumping REDUCER_VERSION, so cached
 * snapshots built by the old reducer were never invalidated. Nothing caught
 * it. This pin makes the next such omission fail loudly.
 *
 * REDUCER_VERSION and REDUCER_FIXTURE_HASH must be bumped together, in the
 * same commit, whenever the reduction output legitimately changes.
 */

import { createHash } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { reduceEvidenceToBeliefState, REDUCER_VERSION } from '../beliefReducer';
import type { EvidenceEvent } from '../../../types/evidence';

const REDUCER_FIXTURE_HASH = 'a4bf69c5f73b199e9423c53c871412a2fd1b319cf799d2c03d691337d3562ea4';

/** Fixed "now" so recencyWeight is deterministic. 2026-01-15T00:00:00.000Z. */
const FIXED_NOW = Date.UTC(2026, 0, 15);

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function event(overrides: Partial<EvidenceEvent> = {}): EvidenceEvent {
  return {
    id: 'ev-1',
    learnerId: 'local-user',
    occurredAt: '2026-01-14T12:00:00.000Z',
    sourceSessionId: 'sess-1',
    evidenceType: 'language',
    targetNodeIds: ['tense_past'],
    observation: {
      transcript: 'hier je vais au cinema',
      issueIds: ['issue-1'],
      issueCategories: ['tense'],
      avoidanceSkillIds: [],
      feedbackSummary: 'past tense slip',
    },
    result: { score: 6, success: false, wordCount: 22, issueCount: 1, criticalIssueCount: 1 },
    reliability: {
      assessmentConfidence: 0.8,
      taskValidity: 0.9,
      signalQuality: 0.9,
      evaluator: 'llm',
      rubricVersion: 'coach-mvp-1',
    },
    context: { mode: 'practice', topicKey: 'holidays', timed: false },
    ...overrides,
  };
}

/** Deliberately exercises every branch the reducer has. */
const FIXTURE_EVENTS: EvidenceEvent[] = [
  event(),
  // A success on a different node.
  event({
    id: 'ev-2',
    occurredAt: '2026-01-13T12:00:00.000Z',
    targetNodeIds: ['gender'],
    result: { score: 9, success: true, wordCount: 60, issueCount: 0, criticalIssueCount: 0 },
  }),
  // No success signal at all (unscored, no explicit success) — must NOT
  // contribute to alpha/beta. This is the branch Phase 4b added un-versioned.
  event({
    id: 'ev-3',
    occurredAt: '2026-01-12T12:00:00.000Z',
    targetNodeIds: ['tense_past'],
    result: { wordCount: 12, issueCount: 0, criticalIssueCount: 0 },
  }),
  // Behavior (avoidance) event.
  event({
    id: 'ev-4',
    occurredAt: '2026-01-11T12:00:00.000Z',
    evidenceType: 'behavior',
    targetNodeIds: ['subjunctive'],
    observation: { avoidanceSkillIds: ['subjunctive'], feedbackSummary: 'no subjunctive' },
    result: { avoided: true, wordCount: 40 },
    reliability: {
      assessmentConfidence: 0.5, taskValidity: 0.9, signalQuality: 0.9,
      evaluator: 'heuristic', rubricVersion: 'coach-mvp-1',
    },
  }),
  // Exam mode (different source weight).
  event({
    id: 'ev-5',
    occurredAt: '2026-01-10T12:00:00.000Z',
    targetNodeIds: ['negation'],
    context: { mode: 'exam', timed: true },
    result: { score: 4, success: false, wordCount: 30, issueCount: 2, criticalIssueCount: 0 },
  }),
  // Below MIN_RELIABLE_WEIGHT — must be dropped entirely.
  event({
    id: 'ev-6',
    occurredAt: '2026-01-09T12:00:00.000Z',
    targetNodeIds: ['elision'],
    reliability: {
      assessmentConfidence: 0.2, taskValidity: 0.1, signalQuality: 0.2,
      evaluator: 'offline', rubricVersion: 'coach-mvp-1',
    },
  }),
];

describe('belief reducer version pin', () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it('reduceEvidenceToBeliefState(FIXTURE_EVENTS) hash matches REDUCER_FIXTURE_HASH', () => {
    const actual = sha256(reduceEvidenceToBeliefState(FIXTURE_EVENTS));
    expect(
      actual,
      `belief reducer output changed — bump REDUCER_VERSION (currently "${REDUCER_VERSION}") and update REDUCER_FIXTURE_HASH together in this commit. Do NOT re-pin the hash to make this pass unless the change was intended.`,
    ).toBe(REDUCER_FIXTURE_HASH);
  });

  it('the pinned hash is paired with the current REDUCER_VERSION', () => {
    expect(REDUCER_VERSION).toBe('evidence-v4');
  });
});
