import { describe, expect, it } from 'vitest';
import { decideCoachBrief, LOSS_TOP_BONUS, type CoachInput, type CoachTopic } from '../coachBrain';
import { moveTarget } from '../../../domain/coachOutcomes/outcomeLog';
import type { LossReason } from '../../../domain/coachLosses/types';
import type { StoredSession } from '../../analytics/analyticsService';
import type { EvidenceDerivedSkillBelief } from '../../../types/beliefs';

const NOW = Date.parse('2026-11-04T12:00:00Z');
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const TOPICS: CoachTopic[] = [
  { key: 'school', labelEn: 'School', isAdvanced: false, questionsCount: 69, skillCoverage: { tense_past: 4 } },
  { key: 'holidays', labelEn: 'Holidays', isAdvanced: false, questionsCount: 66, skillCoverage: { tense_past: 21 } },
  { key: 'family', labelEn: 'Family', isAdvanced: false, questionsCount: 66, skillCoverage: {} },
];
const LABELS: Record<string, string> = { tense_past: 'Past Tense', gender: 'Gender Agreement' };

function learn(daysAgo: number, topicKey = 'school'): StoredSession {
  return { id: `p${daysAgo}${topicKey}`, date: iso(daysAgo), mode: 'practice', topicKey, questionText: '', transcript: '', wordCount: 30, score: 6, durationSec: 60 };
}

function exam(daysAgo: number, marks: { rolePlay: number; communication: number; qualityOfLanguage: number }, practiceOnly = false): StoredSession {
  const total = marks.rolePlay + marks.communication + marks.qualityOfLanguage;
  return {
    id: `e${daysAgo}`, date: iso(daysAgo), mode: 'exam', topicKey: null, questionText: '', transcript: '', wordCount: 300,
    score: total / 4, durationSec: 900, practiceOnly, examMarks: { ...marks, rolePlayMax: 10, total },
  };
}

const reason = (over: Partial<LossReason> & Pick<LossReason, 'code' | 'area'>): LossReason => ({ marksBelowMax: 4, mark: 6, max: 10, count: 2, ...over });

function input(over: Partial<CoachInput> = {}): CoachInput {
  return {
    now: NOW, goalType: 'igcse', examDate: null, sessions: [], skills: {}, weakestSkillIds: [],
    skillLabel: id => LABELS[id] ?? id, activeProblemNodeId: null, focusSkillId: null, dueCounts: {},
    topics: TOPICS,
    topicStats: { school: { sessionsCompleted: 2, averageScore: 6, lastSessionAt: iso(1) }, holidays: { sessionsCompleted: 1, averageScore: 7, lastSessionAt: iso(2) }, family: { sessionsCompleted: 1, averageScore: 7, lastSessionAt: iso(3) } },
    learnAnswersLeft: 3, ...over,
  };
}

const belief = (mastery: number): EvidenceDerivedSkillBelief => ({
  nodeId: 'tense_past', label: 'Past Tense', category: 'grammar', mastery, confidence: 0.6, uncertainty: 0.3, trend: 'stable', avoidanceScore: 0,
  evidenceCount: 6, weightedEvidence: 3, reliabilityMean: 0.8, lastObservedAt: iso(1), recurringIssueIds: [], sourceBreakdown: {},
});

describe('the coach’s "why" comes from why marks were lost', () => {
  it('a silent role play leads with the silence, not just the area total, and routes to the drill', () => {
    const sessions = [exam(3, { rolePlay: 6, communication: 12, qualityOfLanguage: 12 }), learn(1), learn(2)];
    const before = decideCoachBrief(input({ sessions }));
    expect(before.move.kind).toBe('role_play');
    expect(before.move.why).toContain('weakest area');

    const b = decideCoachBrief(input({ sessions, examLosses: { attemptId: 'e3', reasons: [reason({ code: 'rp_silent', area: 'rolePlay', mark: 0, max: 4, marksBelowMax: 4 })] } }));
    expect(b.move.kind).toBe('role_play');
    expect(b.move.to).toBe('/exam/role-play');
    expect(b.move.why).toContain('you said nothing on 2 role-play tasks');
    expect(b.move.evidence.lostReason).toEqual({ code: 'rp_silent', area: 'rolePlay', marksBelowMax: 4 });
    expect(b.move.priority).toBe(before.move.priority + LOSS_TOP_BONUS);
    expect(b.signals).toContain('2 role-play tasks left silent');
    // still measured like any role-play move
    expect(moveTarget(b.move)).toEqual({ type: 'exam_area', area: 'rolePlay' });
  });

  it('a Communication shortfall in an area that is not "weak" still becomes the move, opening Learn on opinions', () => {
    const sessions = [exam(3, { rolePlay: 9, communication: 11, qualityOfLanguage: 13 }), learn(1), learn(2)];
    const b = decideCoachBrief(input({
      sessions,
      examLosses: { attemptId: 'e3', reasons: [reason({ code: 'comm_develop', area: 'communication', mark: 11, max: 15, marksBelowMax: 4, count: 0 })] },
    }));
    expect(b.move.kind).toBe('develop_answers');
    expect(b.move.why).toContain('Communication was 11/15 in your last Exam Sim');
    expect(b.move.why).toContain('to develop your ideas and opinions');
    expect(b.move.to).toMatch(/^\/learn\?topic=[a-z]+&focus=opinion$/);
    expect(moveTarget(b.move)).toEqual({ type: 'exam_area', area: 'communication' });

    // without the reasons the same exam gives no Communication move at all
    const plain = decideCoachBrief(input({ sessions }));
    expect(plain.move.kind).not.toBe('develop_answers');
  });

  it('recurring tense mistakes route to the past-tense drill in the topic that practises it', () => {
    const sessions = [exam(3, { rolePlay: 9, communication: 13, qualityOfLanguage: 8 }), learn(1), learn(2)];
    const b = decideCoachBrief(input({
      sessions,
      examLosses: { attemptId: 'e3', reasons: [reason({ code: 'qol_errors', area: 'qualityOfLanguage', category: 'tense', mark: 8, max: 15, marksBelowMax: 7, count: 4, total: 6 })] },
    }));
    expect(b.move.kind).toBe('weak_skill');
    expect(b.move.skillIds).toEqual(['tense_past']);
    expect(b.move.to).toBe('/learn?topic=holidays&focus=past');
    expect(b.move.why).toContain('4 of the 6 mistakes marked were tense mistakes');
    expect(b.move.why).toContain('Holidays has the most questions that need past tense');
  });

  it('when that skill is already the weakest, the reason leads its sentence instead of a second move', () => {
    const sessions = [exam(3, { rolePlay: 9, communication: 13, qualityOfLanguage: 8 }), learn(1), learn(2)];
    const base = input({ sessions, skills: { tense_past: belief(0.4) }, weakestSkillIds: ['tense_past'] });
    const b = decideCoachBrief({ ...base, examLosses: { attemptId: 'e3', reasons: [reason({ code: 'qol_errors', area: 'qualityOfLanguage', category: 'tense', mark: 8, max: 15, marksBelowMax: 7, count: 4, total: 6 })] } });
    const all = [b.move, ...b.alternatives];
    expect(all.filter(m => m.kind === 'weak_skill')).toHaveLength(1);
    expect(b.move.kind).toBe('weak_skill');
    expect(b.move.why.startsWith('Quality of language was 8/15')).toBe(true);
    expect(b.move.why).toContain('is your weakest area');
    expect(b.move.evidence.skill?.mastery).toBe(0.4);
  });

  it('skips a reason nothing in the app can drill and uses the next-biggest routable one', () => {
    const sessions = [exam(3, { rolePlay: 6, communication: 12, qualityOfLanguage: 6 }), learn(1), learn(2)];
    const b = decideCoachBrief(input({
      sessions,
      examLosses: { attemptId: 'e3', reasons: [
        reason({ code: 'qol_fluency', area: 'qualityOfLanguage', marksBelowMax: 9, mark: 6, max: 15, count: 0 }),
        reason({ code: 'rp_partly_communicated', area: 'rolePlay', marksBelowMax: 4, count: 4, mark: 4, max: 8 }),
      ] },
    }));
    expect(b.move.evidence.lostReason?.code).toBe('rp_partly_communicated');
  });
});

describe('when the reasons do not apply', () => {
  const marks = { rolePlay: 6, communication: 12, qualityOfLanguage: 12 };
  const losses = (attemptId: string) => ({ attemptId, reasons: [reason({ code: 'rp_silent', area: 'rolePlay', mark: 0, max: 4, marksBelowMax: 4 })] });
  const noReason = (b: ReturnType<typeof decideCoachBrief>) => [b.move, ...b.alternatives].every(m => !m.evidence.lostReason);

  it('ignores reasons for an attempt that is not the newest counted one', () => {
    expect(noReason(decideCoachBrief(input({ sessions: [exam(3, marks), learn(1)], examLosses: losses('e9') })))).toBe(true);
  });

  it('a newer Coached attempt does not hide, and is not mistaken for, the counted one', () => {
    const sessions = [exam(1, marks, true), exam(5, marks), learn(1)];
    expect(decideCoachBrief(input({ sessions, examLosses: losses('e5') })).move.evidence.lostReason?.code).toBe('rp_silent');
    expect(noReason(decideCoachBrief(input({ sessions, examLosses: losses('e1') })))).toBe(true);
  });

  it('lets reasons for an old Exam Sim go, like the area marks do', () => {
    expect(noReason(decideCoachBrief(input({ sessions: [exam(40, marks), learn(1)], examLosses: losses('e40') })))).toBe(true);
  });

  it('an absent or null field changes nothing', () => {
    const sessions = [exam(3, marks), learn(1), learn(2)];
    const plain = JSON.stringify(decideCoachBrief(input({ sessions })));
    expect(JSON.stringify(decideCoachBrief(input({ sessions, examLosses: null })))).toBe(plain);
    expect(JSON.stringify(decideCoachBrief(input({ sessions, examLosses: { attemptId: 'e3', reasons: [] } })))).toBe(plain);
  });
});
