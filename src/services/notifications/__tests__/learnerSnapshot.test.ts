import { describe, expect, it } from 'vitest';
import { buildLearnerSnapshot, type SnapshotInputs } from '../learnerSnapshot';
import type { LearningProblem } from '../../../types/intervention';
import type { EvidenceEvent } from '../../../types/evidence';

const NOW = Date.parse('2026-11-03T18:00:00Z');
const DAY = 86_400_000;

function problem(over: Partial<LearningProblem> = {}): LearningProblem {
  return {
    id: 'p1', learnerId: 'l', nodeId: 'tense_past', problemType: 'error', severity: 0.8,
    evidenceIds: ['e1', 'e2', 'e3'], status: 'active', detectedAt: '', updatedAt: '', ...over,
  };
}
const ev = (id: string, ageDays: number) => ({ id, occurredAt: new Date(NOW - ageDays * DAY).toISOString() }) as unknown as EvidenceEvent;

function inputs(over: Partial<SnapshotInputs> = {}): SnapshotInputs {
  return {
    userId: 'u1',
    timezone: 'Europe/London',
    streak: { count: 12, lastDate: '2026-11-02' },
    hasFreeze: false,
    problem: problem(),
    evidence: [ev('e1', 1), ev('e2', 3), ev('e3', 10), ev('other', 0)],
    skillDefs: { tense_past: { name: 'Past Tense', desc: 'passé composé / imparfait' } },
    hasDrill: () => true,
    now: NOW,
    ...over,
  };
}

describe('buildLearnerSnapshot', () => {
  it('mirrors the streak and counts only this week\'s misses of the active problem', () => {
    const row = buildLearnerSnapshot(inputs());
    expect(row).toMatchObject({
      user_id: 'u1', timezone: 'Europe/London', streak_count: 12, streak_last_date: '2026-11-02', streak_freezes: 0,
      focus_skill_id: 'tense_past', focus_label: 'Past Tense', focus_hint: 'passé composé / imparfait',
      focus_misses: 2, focus_has_drill: true,
    });
    expect(row.focus_last_missed_at).toBe(new Date(NOW - DAY).toISOString());
  });

  it('drops a focus that is improving, unknown, or has no miss this week', () => {
    expect(buildLearnerSnapshot(inputs({ problem: problem({ status: 'monitoring' }) })).focus_skill_id).toBeNull();
    expect(buildLearnerSnapshot(inputs({ problem: problem({ nodeId: 'mystery' }) })).focus_skill_id).toBeNull();
    expect(buildLearnerSnapshot(inputs({ evidence: [ev('e3', 10)] })).focus_skill_id).toBeNull();
    expect(buildLearnerSnapshot(inputs({ problem: null })).focus_misses).toBeNull();
  });

  it('sanitises what it sends', () => {
    const row = buildLearnerSnapshot(inputs({ streak: { count: -3, lastDate: 'yesterday' }, hasFreeze: true }));
    expect(row.streak_count).toBe(0);
    expect(row.streak_last_date).toBeNull();
    expect(row.streak_freezes).toBe(1);
  });
});
