import { describe, expect, it } from 'vitest';
import { computeSessionPriorities, rankSessions } from '../priority';
import type { DiffRow } from '../../../../src/domain/igcse/comparison/diff';

function row(overrides: Partial<DiffRow>): DiffRow {
  return {
    sessionId: 's1',
    attemptId: 'a1',
    criterion: 'communication',
    scorerMark: 8,
    teacherMark: null,
    delta: null,
    justification: 'j',
    quotedEvidence: [],
    meanWordConfidence: 1,
    lowConfidenceSpanRatio: 0,
    ...overrides,
  };
}

describe('computeSessionPriorities', () => {
  it('computes maxAbsDelta across a session, ignoring null deltas', () => {
    const rows = [
      row({ sessionId: 's1', delta: -2 }),
      row({ sessionId: 's1', criterion: 'qualityOfLanguage', delta: 5 }),
      row({ sessionId: 's1', criterion: 'rolePlayTask', taskId: 't1', delta: null }),
    ];
    const priorities = computeSessionPriorities(rows, new Map());
    expect(priorities).toEqual([{ sessionId: 's1', maxAbsDelta: 5, guardrailTriggerCount: 0 }]);
  });

  it('reports maxAbsDelta null when no row has a teacher mark', () => {
    const rows = [row({ sessionId: 's2', delta: null })];
    const priorities = computeSessionPriorities(rows, new Map());
    expect(priorities[0]).toEqual({ sessionId: 's2', maxAbsDelta: null, guardrailTriggerCount: 0 });
  });

  it('includes sessions that only appear in guardrailTriggersBySession', () => {
    const priorities = computeSessionPriorities([], new Map([['s3', ['quote_verification_failed']]]));
    expect(priorities).toEqual([{ sessionId: 's3', maxAbsDelta: null, guardrailTriggerCount: 1 }]);
  });
});

describe('rankSessions', () => {
  const rows = [row({ sessionId: 's1', delta: -1 }), row({ sessionId: 's2', delta: 6 }), row({ sessionId: 's3', delta: null })];
  const guardrails = new Map([
    ['s1', []],
    ['s2', []],
    ['s3', ['quote_verification_failed', 'insufficient_evidence_duration']],
  ]);

  it('sortBy none preserves input order', () => {
    expect(rankSessions(rows, guardrails, 'none')).toEqual(['s1', 's2', 's3']);
  });

  it('sortBy delta sorts descending by |delta|, no-teacher-mark sessions last', () => {
    expect(rankSessions(rows, guardrails, 'delta')).toEqual(['s2', 's1', 's3']);
  });

  it('sortBy guardrails sorts descending by trigger count', () => {
    expect(rankSessions(rows, guardrails, 'guardrails')).toEqual(['s3', 's1', 's2']);
  });
});
