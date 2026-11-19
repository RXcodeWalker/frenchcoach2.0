import { describe, expect, it } from 'vitest';
import { decideCoachBrief, type CoachInput, type CoachTopic } from '../coachBrain';
import { buildWeekPlan, PLAN_DAYS } from '../weekPlan';
import type { StoredSession } from '../../analytics/analyticsService';
import type { EvidenceDerivedSkillBelief } from '../../../types/beliefs';
import { localDay } from '../../../lib/localDay';

// Local noon, so a day is the same day in every timezone the suite runs in.
const NOW = new Date(2026, 10, 4, 12, 0, 0).getTime();
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();
const ymdIn = (days: number) => localDay(new Date(2026, 10, 4 + days, 12));

const TOPICS: CoachTopic[] = [
  { key: 'school', labelEn: 'School', isAdvanced: false, questionsCount: 69, skillCoverage: { tense_past: 4 } },
  { key: 'holidays', labelEn: 'Holidays', isAdvanced: false, questionsCount: 66, skillCoverage: { tense_past: 21 } },
  { key: 'food', labelEn: 'Food', isAdvanced: false, questionsCount: 94, skillCoverage: { comparative: 6 } },
];
const LABELS: Record<string, string> = { tense_past: 'Past tense', comparative: 'Comparatives' };

function learn(daysAgo: number): StoredSession {
  return { id: `p${daysAgo}`, date: iso(daysAgo), mode: 'practice', topicKey: 'school', questionText: '', transcript: '', wordCount: 30, score: 6, durationSec: 60 };
}

function exam(daysAgo: number, marks = { rolePlay: 8, communication: 8, qualityOfLanguage: 8 }): StoredSession {
  const total = marks.rolePlay + marks.communication + marks.qualityOfLanguage;
  return {
    id: `e${daysAgo}`, date: iso(daysAgo), mode: 'exam', topicKey: null, questionText: '', transcript: '', wordCount: 300,
    score: total / 4, durationSec: 900, examMarks: { ...marks, rolePlayMax: 10, total },
  };
}

function belief(nodeId: string, mastery: number): EvidenceDerivedSkillBelief {
  return {
    nodeId, label: LABELS[nodeId] ?? nodeId, category: 'grammar', mastery, confidence: 0.6, uncertainty: 0.3, trend: 'stable',
    avoidanceScore: 0, evidenceCount: 6, weightedEvidence: 3, reliabilityMean: 0.8, lastObservedAt: iso(1),
    recurringIssueIds: [], sourceBreakdown: {}, ...{},
  };
}

function input(over: Partial<CoachInput> = {}): CoachInput {
  return {
    now: NOW, goalType: 'igcse', examDate: null, sessions: [learn(1), learn(2), learn(3), learn(4)],
    skills: {}, weakestSkillIds: [], skillLabel: id => LABELS[id] ?? id, activeProblemNodeId: null,
    focusSkillId: null, dueCounts: {}, topics: TOPICS, topicStats: {}, learnAnswersLeft: 3, ...over,
  };
}

function plan(over: Partial<CoachInput> = {}, keepOffToday = false) {
  const i = input(over);
  let brief = decideCoachBrief(i);
  // In the final week the coach itself leads with the Exam Sim; to exercise the backward
  // placement, make the mission its next-best (non-sim) move instead.
  if (keepOffToday && brief.move.kind === 'exam_sim') {
    const next = brief.alternatives[0];
    brief = { ...brief, move: next, alternatives: brief.alternatives.slice(1) };
  }
  return { i, brief, plan: buildWeekPlan(i, brief) };
}

describe('buildWeekPlan', () => {
  it('is seven consecutive days from today, today first', () => {
    const { plan: p } = plan({ examDate: ymdIn(60) });
    expect(p.days).toHaveLength(PLAN_DAYS);
    expect(p.days.map(d => d.date)).toEqual([0, 1, 2, 3, 4, 5, 6].map(ymdIn));
    expect(p.days[0].isToday).toBe(true);
    expect(p.days.slice(1).every(d => !d.isToday)).toBe(true);
  });

  it('puts at most one Exam Sim in the week (the 7-day limit)', () => {
    for (const examDate of [null, ymdIn(5), ymdIn(20), ymdIn(60), ymdIn(200)]) {
      const { plan: p } = plan({ examDate });
      expect(p.days.filter(d => d.kind === 'exam_sim').length).toBeLessThanOrEqual(1);
    }
  });

  it('today is exactly what the mission card says', () => {
    const { plan: p, brief } = plan({ examDate: ymdIn(60), activeProblemNodeId: 'tense_past', skills: { tense_past: belief('tense_past', 0.3) } });
    expect(brief.move.kind).toBe('fix_mistake');
    expect(p.days[0].kind).toBe('learn');
    expect(p.days[0].to).toBe(brief.move.to);
    expect(p.days[0].label).toBe('Past tense');
  });

  it('the Exam Sim lands today when the mission is the Exam Sim', () => {
    const { plan: p, brief } = plan({ examDate: ymdIn(20), sessions: [exam(9), learn(1), learn(2), learn(3)] });
    expect(brief.move.kind).toBe('exam_sim');
    expect(p.examSimIndex).toBe(0);
    expect(p.days[0].kind).toBe('exam_sim');
    expect(p.days[0].learnAnswers).toBe(0);
  });

  it('builds backwards from an exam inside the week: sim three days out, follow-up after it, light eve, then the exam', () => {
    // A recent Exam Sim and a fix_mistake mission keep the sim off today.
    const { plan: p } = plan({
      examDate: ymdIn(6),
      sessions: [exam(1), learn(1), learn(2), learn(3)],
      activeProblemNodeId: 'tense_past',
      skills: { tense_past: belief('tense_past', 0.3) },
    });
    // The last sim was yesterday, so the window reopens in 6 days — beyond the strip's useful days.
    expect(p.days).toHaveLength(7);
    expect(p.days[6].kind).toBe('exam_day');
    expect(p.days[5].kind).toBe('light');
    expect(p.examDayIndex).toBe(6);
  });

  it('with the window open, the sim sits exam − 3, the next day fixes it, and the eve is light', () => {
    const { plan: p } = plan({
      examDate: ymdIn(6),
      sessions: [exam(20), learn(1), learn(2), learn(3)],
      activeProblemNodeId: 'tense_past',
      skills: { tense_past: belief('tense_past', 0.3) },
    }, true);
    expect(p.examSimIndex).toBe(3);
    expect(p.days[3].kind).toBe('exam_sim');
    expect(p.days[4].kind).toBe('follow_up');
    expect(p.days[5].kind).toBe('light');
    expect(p.days[6].kind).toBe('exam_day');
    expect(p.days).toHaveLength(7);
  });

  it('never places the sim before the window reopens', () => {
    // Last sim 4 days ago → the next opens in 3 days (index 3).
    const { plan: p, brief } = plan({
      examDate: ymdIn(60),
      sessions: [exam(4), learn(1), learn(2), learn(3)],
      activeProblemNodeId: 'tense_past',
      skills: { tense_past: belief('tense_past', 0.3) },
    });
    expect(brief.examAvailable).toBe(false);
    if (p.examSimIndex !== null) expect(p.examSimIndex).toBeGreaterThanOrEqual(3);
    expect(p.days[0].kind).not.toBe('exam_sim');
  });

  it('drops days after the exam, and the exam day carries no Learn answers', () => {
    const { plan: p } = plan({ examDate: ymdIn(2) });
    expect(p.days).toHaveLength(3);
    expect(p.days[p.days.length - 1].kind).toBe('exam_day');
    expect(p.days[p.days.length - 1].learnAnswers).toBe(0);
  });

  it('never exceeds the daily Learn limit, and Learn-free days spend none', () => {
    const { plan: p } = plan({ examDate: ymdIn(30), dueCounts: { school: 6 } });
    for (const d of p.days) expect(d.learnAnswers).toBeLessThanOrEqual(3);
    for (const d of p.days.filter(x => x.kind === 'exam_sim' || x.kind === 'role_play' || x.kind === 'exam_day')) expect(d.learnAnswers).toBe(0);
  });

  it('uses the answers actually left today, and a spent day becomes a role-play day', () => {
    const { plan: p } = plan({ examDate: ymdIn(60), sessions: [exam(2), learn(1), learn(2), learn(3)], learnAnswersLeft: 0, activeProblemNodeId: 'tense_past', skills: { tense_past: belief('tense_past', 0.3) } });
    expect(p.days[0].learnAnswers).toBe(0);
    expect(p.days[0].kind).toBe('role_play');
    expect(p.days[1].learnAnswers).toBe(3);
  });

  it('spreads the weak skills over the learn days instead of repeating one', () => {
    const { plan: p } = plan({
      examDate: ymdIn(60),
      skills: { tense_past: belief('tense_past', 0.3), comparative: belief('comparative', 0.4) },
      weakestSkillIds: ['tense_past', 'comparative'],
      activeProblemNodeId: 'tense_past',
    });
    const labels = new Set(p.days.filter(d => d.kind === 'learn').map(d => d.label));
    expect(labels.has('Past tense')).toBe(true);
    expect(labels.has('Comparatives')).toBe(true);
  });

  it('adds a review day only when something is due', () => {
    const none = plan({ examDate: ymdIn(60) }).plan;
    expect(none.days.some(d => d.kind === 'review')).toBe(false);
    const due = plan({ examDate: ymdIn(60), dueCounts: { school: 3 } }).plan;
    expect(due.days.some(d => d.kind === 'review' && d.topicKey === 'school')).toBe(true);
  });

  it('plans no Exam Sim for a learner without an exam goal, or while Exam is locked', () => {
    expect(plan({ goalType: 'general_speaking' as CoachInput['goalType'] }).plan.examSimIndex).toBeNull();
    expect(plan({ examDate: ymdIn(60), examUnlocked: false }).plan.examSimIndex).toBeNull();
    expect(plan({ goalType: 'general_speaking' as CoachInput['goalType'] }).plan.days.some(d => d.kind === 'role_play')).toBe(false);
  });

  it('anchors a far exam on the weekly cadence: the sim is exam − 3 modulo 7', () => {
    // 20 days out: exam − 3 = day 17 → 10 → 3.
    const { plan: p } = plan({ examDate: ymdIn(20), sessions: [exam(20), learn(1), learn(2), learn(3)], activeProblemNodeId: 'tense_past', skills: { tense_past: belief('tense_past', 0.3) } });
    expect(p.examSimIndex).toBe(3);
  });

  it('is deterministic: same input, same plan', () => {
    const a = plan({ examDate: ymdIn(12), dueCounts: { food: 2 } }).plan;
    const b = plan({ examDate: ymdIn(12), dueCounts: { food: 2 } }).plan;
    expect(a).toEqual(b);
  });

  it('a brand-new learner still gets a full week with no sim before warm-up', () => {
    const { plan: p } = plan({ sessions: [], examDate: ymdIn(60) });
    expect(p.days).toHaveLength(7);
    expect(p.days[0].kind).toBe('learn');
    if (p.examSimIndex !== null) expect(p.examSimIndex).toBeGreaterThanOrEqual(2);
  });
});
