import { describe, expect, it } from 'vitest';
import { decideCoachBrief, examPhase, bestTopicForSkill, type CoachInput, type CoachTopic } from '../coachBrain';
import type { StoredSession } from '../../analytics/analyticsService';
import type { EvidenceDerivedSkillBelief } from '../../../types/beliefs';

const NOW = Date.parse('2026-11-04T12:00:00Z');
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const TOPICS: CoachTopic[] = [
  { key: 'school', labelEn: 'School', isAdvanced: false, questionsCount: 69, skillCoverage: { tense_past: 4, hypothetical: 9 } },
  { key: 'holidays', labelEn: 'Holidays', isAdvanced: false, questionsCount: 66, skillCoverage: { tense_past: 21 } },
  { key: 'food', labelEn: 'Food', isAdvanced: false, questionsCount: 94, skillCoverage: { comparative: 6 } },
  { key: 'family', labelEn: 'Family', isAdvanced: false, questionsCount: 66, skillCoverage: {} },
];

const LABELS: Record<string, string> = { tense_past: 'Past tense', hypothetical: 'Conditional', comparative: 'Comparatives', gender: 'Gender' };

function learn(daysAgo: number, topicKey = 'school', score = 6): StoredSession {
  return { id: `p${daysAgo}${topicKey}`, date: iso(daysAgo), mode: 'practice', topicKey, questionText: '', transcript: '', wordCount: 30, score, durationSec: 60 };
}

function exam(daysAgo: number, marks: { rolePlay: number; communication: number; qualityOfLanguage: number }, practiceOnly = false): StoredSession {
  const total = marks.rolePlay + marks.communication + marks.qualityOfLanguage;
  return {
    id: `e${daysAgo}`, date: iso(daysAgo), mode: 'exam', topicKey: null, questionText: '', transcript: '', wordCount: 300,
    score: total / 4, durationSec: 900, practiceOnly,
    examMarks: { ...marks, rolePlayMax: 10, total },
  };
}

function belief(nodeId: string, mastery: number, extra: Partial<EvidenceDerivedSkillBelief> = {}): EvidenceDerivedSkillBelief {
  return {
    nodeId, label: LABELS[nodeId] ?? nodeId, category: 'grammar', mastery, confidence: 0.6, uncertainty: 0.3, trend: 'stable',
    avoidanceScore: 0, evidenceCount: 6, weightedEvidence: 3, reliabilityMean: 0.8, lastObservedAt: iso(1),
    recurringIssueIds: [], sourceBreakdown: {}, ...extra,
  };
}

function input(over: Partial<CoachInput> = {}): CoachInput {
  return {
    now: NOW,
    goalType: 'igcse',
    examDate: null,
    sessions: [],
    skills: {},
    weakestSkillIds: [],
    skillLabel: id => LABELS[id] ?? id,
    activeProblemNodeId: null,
    focusSkillId: null,
    dueCounts: {},
    topics: TOPICS,
    topicStats: {},
    learnAnswersLeft: 3,
    ...over,
  };
}

const examIn = (days: number) => new Date(NOW + days * DAY).toISOString();

describe('examPhase', () => {
  it('phases by days to the exam, and only for an exam goal', () => {
    expect(examPhase('general_speaking', 10)).toBe('no_exam');
    expect(examPhase('igcse', null)).toBe('no_date');
    expect(examPhase('igcse', -2)).toBe('after_exam');
    expect(examPhase('igcse', 5)).toBe('final_week');
    expect(examPhase('igcse', 20)).toBe('exam_month');
    expect(examPhase('igcse', 60)).toBe('sharpen');
    expect(examPhase('igcse', 200)).toBe('build');
  });
});

describe('decideCoachBrief', () => {
  it('a brand-new learner is sent to answer a first question', () => {
    const b = decideCoachBrief(input());
    expect(b.move.kind).toBe('first_steps');
    expect(b.move.to).toBe('/learn');
  });

  it('routes a weak skill to the topic that actually practises it, not the lowest-average topic', () => {
    const b = decideCoachBrief(input({
      sessions: [learn(1), learn(2), learn(3, 'food', 3)],
      skills: { tense_past: belief('tense_past', 0.35) },
      weakestSkillIds: ['tense_past'],
      // Food has the lowest average but no past-tense questions.
      topicStats: {
        school: { sessionsCompleted: 2, averageScore: 6, lastSessionAt: iso(1) },
        food: { sessionsCompleted: 1, averageScore: 3, lastSessionAt: iso(3) },
        holidays: { sessionsCompleted: 1, averageScore: 7, lastSessionAt: iso(9) },
        family: { sessionsCompleted: 1, averageScore: 7, lastSessionAt: iso(9) },
      },
    }));
    // No exam sat yet, so a first Exam Sim competes for the lead; the skill move must still be routed correctly.
    const skillMove = [b.move, ...b.alternatives].find(m => m.kind === 'weak_skill');
    expect(skillMove?.topicKey).toBe('holidays');
    expect(skillMove?.to).toBe('/learn?topic=holidays');
    expect(skillMove?.why).toContain('35%');
    expect(skillMove?.why).toContain('Holidays has the most questions');
  });

  it('a slipping skill outranks a stable one of the same mastery', () => {
    const base = {
      sessions: [exam(2, { rolePlay: 8, communication: 12, qualityOfLanguage: 11 }), learn(1)],
      weakestSkillIds: ['tense_past'],
    };
    const stable = decideCoachBrief(input({ ...base, skills: { tense_past: belief('tense_past', 0.5) } }));
    const slipping = decideCoachBrief(input({ ...base, skills: { tense_past: belief('tense_past', 0.5, { trend: 'declining' }) } }));
    expect(slipping.move.priority).toBeGreaterThan(stable.move.priority);
    expect(slipping.move.why).toContain('slipping');
  });

  it('an active recurring mistake leads, and is routed to its topic', () => {
    const b = decideCoachBrief(input({
      sessions: [exam(2, { rolePlay: 8, communication: 12, qualityOfLanguage: 11 }), learn(1)],
      activeProblemNodeId: 'hypothetical',
      skills: { hypothetical: belief('hypothetical', 0.3) },
    }));
    expect(b.move.kind).toBe('fix_mistake');
    expect(b.move.topicKey).toBe('school');
    expect(b.steps[1].sub).toContain('Conditional');
  });

  it('suggests the weekly Exam Sim only when the 7-day window is open', () => {
    const open = decideCoachBrief(input({ examDate: examIn(20), sessions: [exam(8, { rolePlay: 6, communication: 10, qualityOfLanguage: 10 }), learn(1)] }));
    expect(open.move.kind).toBe('exam_sim');
    expect(open.examAvailable).toBe(true);

    const used = decideCoachBrief(input({ examDate: examIn(20), sessions: [exam(3, { rolePlay: 9, communication: 13, qualityOfLanguage: 12 }), learn(1)] }));
    expect([used.move, ...used.alternatives].some(m => m.kind === 'exam_sim')).toBe(false);
    expect(used.examAvailable).toBe(false);
    expect(used.nextExamAt).toBe(new Date(NOW - 3 * DAY + 7 * DAY).toISOString());
  });

  it('a Coached attempt still uses the weekly window but never counts as a result', () => {
    const b = decideCoachBrief(input({ sessions: [exam(2, { rolePlay: 2, communication: 3, qualityOfLanguage: 3 }, true), learn(1)] }));
    expect(b.examAvailable).toBe(false);
    expect(b.signals.some(s => s.startsWith('Last Exam Sim'))).toBe(false);
    expect(b.move.kind).not.toBe('role_play');
  });

  it('a weak role play in the last Exam Sim leads to the role-play drill', () => {
    const b = decideCoachBrief(input({ sessions: [exam(3, { rolePlay: 4, communication: 12, qualityOfLanguage: 11 }), learn(1)] }));
    expect(b.move.kind).toBe('role_play');
    expect(b.move.to).toBe('/exam/role-play');
    expect(b.move.why).toContain('4/10');
    expect(b.signals).toContain('Weakest exam area: Role play 4/10');
  });

  it('a weak Communication mark leads to developing answers', () => {
    const b = decideCoachBrief(input({ sessions: [exam(3, { rolePlay: 9, communication: 6, qualityOfLanguage: 12 }), learn(1)] }));
    expect(b.move.kind).toBe('develop_answers');
    expect(b.move.why).toContain('6/15');
  });

  it('old exam results stop steering the plan', () => {
    const b = decideCoachBrief(input({ sessions: [learn(1), exam(60, { rolePlay: 3, communication: 12, qualityOfLanguage: 11 })] }));
    expect(b.move.kind).not.toBe('role_play');
  });

  it('when today’s Learn answers are used up it never leads with a Learn move', () => {
    const b = decideCoachBrief(input({
      sessions: [exam(3, { rolePlay: 9, communication: 13, qualityOfLanguage: 12 }), learn(0)],
      skills: { tense_past: belief('tense_past', 0.3) },
      weakestSkillIds: ['tense_past'],
      learnAnswersLeft: 0,
    }));
    expect(b.move.usesLearnAnswer).toBe(false);
    expect(b.move.kind).toBe('role_play');
    expect(b.signals).toContain('Today’s marked answers used');
  });

  it('flags an unpractised topic as an exam risk while building', () => {
    const b = decideCoachBrief(input({
      examDate: examIn(150),
      sessions: [exam(2, { rolePlay: 9, communication: 13, qualityOfLanguage: 12 }), learn(1)],
      topicStats: { school: { sessionsCompleted: 3, averageScore: 7.5, lastSessionAt: iso(1) } },
    }));
    expect(b.phase).toBe('build');
    expect(b.move.kind).toBe('new_topic');
    expect(b.move.topicKey).toBe('food');
    expect(b.move.why).toContain('1 of 4 topics');
  });

  it('a general-speaking learner gets no exam push or exam headline', () => {
    const b = decideCoachBrief(input({ goalType: 'general_speaking', sessions: [learn(1)] }));
    expect(b.headline).toBeNull();
    expect([b.move, ...b.alternatives].some(m => m.kind === 'exam_sim')).toBe(false);
  });

  it('asks for an exam date when an exam goal has none', () => {
    expect(decideCoachBrief(input({ sessions: [learn(1)] })).headline).toContain('add it in Profile');
  });

  it('alternatives are distinct kinds and never repeat the lead', () => {
    const b = decideCoachBrief(input({
      sessions: [exam(9, { rolePlay: 4, communication: 7, qualityOfLanguage: 8 }), learn(1)],
      skills: { tense_past: belief('tense_past', 0.4) },
      weakestSkillIds: ['tense_past'],
      dueCounts: { school: 2 },
    }));
    const kinds = [b.move.kind, ...b.alternatives.map(a => a.kind)];
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(b.alternatives.length).toBe(2);
  });
});

describe('bestTopicForSkill', () => {
  it('returns null when no visible topic practises the skill', () => {
    expect(bestTopicForSkill('gender', TOPICS, {})).toBeNull();
  });
});
