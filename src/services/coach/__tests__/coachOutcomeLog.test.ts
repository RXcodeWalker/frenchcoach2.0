// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STORAGE_KEYS, setStorageScope, scopedKey } from '../../persistence/storage';
import { decideCoachBrief, type CoachInput, type CoachTopic } from '../coachBrain';
import { readCoachOutcomeLog, recordCoachMoveShown } from '../coachOutcomeLog';
import type { StoredSession } from '../../analytics/analyticsService';
import type { EvidenceDerivedSkillBelief } from '../../../types/beliefs';

const NOW = Date.parse('2026-11-10T09:00:00Z');
const HOUR = 3_600_000;
const iso = (ms: number) => new Date(ms).toISOString();

const TOPICS: CoachTopic[] = [
  { key: 'holidays', labelEn: 'Holidays', isAdvanced: false, questionsCount: 66, skillCoverage: { tense_past: 21 } },
  { key: 'school', labelEn: 'School', isAdvanced: false, questionsCount: 69, skillCoverage: {} },
];

function learn(ms: number, topicKey: string): StoredSession {
  return {
    id: `p${ms}`, date: iso(ms), mode: 'practice', topicKey, questionText: 'Où es-tu allé en vacances ?',
    transcript: 'SECRET-TRANSCRIPT je suis allé', wordCount: 5, score: 6, durationSec: 40,
  };
}

function belief(mastery: number, evidenceCount: number): EvidenceDerivedSkillBelief {
  return {
    nodeId: 'tense_past', label: 'Past tense', category: 'grammar', mastery, confidence: 0.6, uncertainty: 0.3, trend: 'declining',
    avoidanceScore: 0, evidenceCount, weightedEvidence: 3, reliabilityMean: 0.8, lastObservedAt: iso(NOW - HOUR),
    recurringIssueIds: [], sourceBreakdown: {},
  };
}

function input(now: number, over: Partial<CoachInput> = {}): CoachInput {
  return {
    now,
    goalType: 'general_speaking',
    examDate: null,
    sessions: [learn(NOW - 2 * HOUR, 'holidays')],
    skills: { tense_past: belief(0.4, 8) },
    weakestSkillIds: ['tense_past'],
    skillLabel: id => (id === 'tense_past' ? 'Past tense' : id),
    activeProblemNodeId: null,
    focusSkillId: null,
    dueCounts: {},
    topics: TOPICS,
    topicStats: { holidays: { sessionsCompleted: 1, averageScore: 6, lastSessionAt: iso(NOW - 2 * HOUR) }, school: { sessionsCompleted: 1, averageScore: 7, lastSessionAt: iso(NOW - 3 * HOUR) } },
    learnAnswersLeft: 3,
    ...over,
  };
}

beforeEach(() => {
  localStorage.clear();
  setStorageScope('user-1');
});

describe('coach move evidence', () => {
  it('a weak-skill move carries the mastery and topic numbers its sentence cites', () => {
    const { move } = decideCoachBrief(input(NOW));
    expect(move.kind).toBe('weak_skill');
    expect(move.evidence).toEqual({
      skill: { id: 'tense_past', mastery: 0.4, evidenceCount: 8, trend: 'declining' },
      topic: { key: 'holidays', averageScore: 6, sessionsCompleted: 1 },
    });
    expect(move.why).toContain('40%');
  });
});

describe('recordCoachMoveShown', () => {
  it('stores the episode under the account-scoped key and follows it through to an outcome', () => {
    const first = input(NOW);
    recordCoachMoveShown(decideCoachBrief(first).move, first, NOW);
    expect(localStorage.getItem(scopedKey(STORAGE_KEYS.coachOutcomeLog))).not.toBeNull();
    expect(scopedKey(STORAGE_KEYS.coachOutcomeLog)).toBe(`${STORAGE_KEYS.coachOutcomeLog}::user-1`);
    expect(readCoachOutcomeLog().entries).toHaveLength(1);

    const later = NOW + 5 * HOUR;
    const second = input(later, {
      sessions: [learn(NOW + HOUR, 'holidays'), learn(NOW - 2 * HOUR, 'holidays')],
      skills: { tense_past: belief(0.5, 11) },
    });
    recordCoachMoveShown(decideCoachBrief(second).move, second, later);
    const [e] = readCoachOutcomeLog().entries;
    expect(e.follow).toEqual({ status: 'followed', at: iso(NOW + HOUR), sessionId: `p${NOW + HOUR}` });
    expect(e.outcome).toMatchObject({ status: 'measured', value: 0.5, delta: 0.1, answersSince: 3 });
  });

  it('keeps ids and numbers only — no transcript, question text or coach sentence', () => {
    const first = input(NOW);
    const { move } = decideCoachBrief(first);
    recordCoachMoveShown(move, first, NOW);
    const raw = localStorage.getItem(scopedKey(STORAGE_KEYS.coachOutcomeLog)) ?? '';
    expect(raw).not.toContain('SECRET-TRANSCRIPT');
    expect(raw).not.toContain('vacances');
    expect(raw).not.toContain(move.why);
  });

  it('a broken stored value is replaced, never thrown', () => {
    localStorage.setItem(scopedKey(STORAGE_KEYS.coachOutcomeLog), '{not json');
    const first = input(NOW);
    expect(() => recordCoachMoveShown(decideCoachBrief(first).move, first, NOW)).not.toThrow();
    expect(readCoachOutcomeLog().entries).toHaveLength(1);
  });
});

describe('local only', () => {
  const read = (p: string) => readFileSync(resolve(__dirname, '../../..', p), 'utf8');

  it('is not synced to learner_state and is removed with the account', () => {
    expect(read('services/sync/learnerStateSync.ts')).not.toMatch(/coachOutcome/i);
    expect(read('services/account/accountService.ts')).toContain('storageRemove(STORAGE_KEYS.coachOutcomeLog)');
  });

  it('declares no analytics event', () => {
    expect(read('services/telemetry/telemetryService.ts')).not.toMatch(/coach_outcome|coachOutcome/i);
    expect(read('services/coach/coachOutcomeLog.ts')).not.toMatch(/\btrack\(|telemetry/);
  });
});
