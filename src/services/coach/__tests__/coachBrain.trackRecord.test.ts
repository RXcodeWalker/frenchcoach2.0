// decideCoachBrief × the coach outcome log: a strategy followed twice without
// its metric rising is lowered and the next one for that weakness is offered;
// one that worked says so, with the log's own numbers only.
import { describe, expect, it } from 'vitest';
import { decideCoachBrief, STALLED_PRIORITY_DROP, STRATEGY_LADDERS, type CoachInput, type CoachMove, type CoachTopic } from '../coachBrain';
import { emptyOutcomeLog, recordShown, updateOutcomes, type CoachOutcomeEntry, type CoachOutcomeLog, type MoveTarget, type OutcomeBaseline } from '../../../domain/coachOutcomes/outcomeLog';
import type { CoachMoveKind } from '../../../domain/coachOutcomes/types';
import type { StoredSession } from '../../analytics/analyticsService';
import type { EvidenceDerivedSkillBelief } from '../../../types/beliefs';
import { observationFromCoachInput } from '../coachOutcomeLog';

const NOW = Date.parse('2026-11-04T12:00:00Z');
const DAY = 86_400_000;
const iso = (daysAgo: number) => new Date(NOW - daysAgo * DAY).toISOString();

const TOPICS: CoachTopic[] = [
  { key: 'school', labelEn: 'School', isAdvanced: false, questionsCount: 69, skillCoverage: { tense_past: 4, opinion: 3 } },
  { key: 'holidays', labelEn: 'Holidays', isAdvanced: false, questionsCount: 66, skillCoverage: { tense_past: 21, opinion: 12 } },
];
const LABELS: Record<string, string> = { tense_past: 'Past tense' };

function learn(daysAgo: number, topicKey = 'school'): StoredSession {
  return { id: `p${daysAgo}${topicKey}`, date: iso(daysAgo), mode: 'practice', topicKey, questionText: '', transcript: '', wordCount: 30, score: 6, durationSec: 60 };
}
function story(daysAgo: number): StoredSession {
  return { id: `s${daysAgo}`, date: iso(daysAgo), mode: 'story', topicKey: null, questionText: '', transcript: '', wordCount: 30, score: 6, durationSec: 60 };
}
function exam(daysAgo: number, marks: { rolePlay: number; communication: number; qualityOfLanguage: number }, practiceOnly = false): StoredSession {
  const total = marks.rolePlay + marks.communication + marks.qualityOfLanguage;
  return {
    id: `e${daysAgo}`, date: iso(daysAgo), mode: 'exam', topicKey: null, questionText: '', transcript: '', wordCount: 300,
    score: total / 4, durationSec: 900, practiceOnly, examMarks: { ...marks, rolePlayMax: 10, total },
  };
}
function belief(nodeId: string, mastery: number): EvidenceDerivedSkillBelief {
  return {
    nodeId, label: LABELS[nodeId] ?? nodeId, category: 'grammar', mastery, confidence: 0.6, uncertainty: 0.3, trend: 'stable',
    avoidanceScore: 0, evidenceCount: 6, weightedEvidence: 3, reliabilityMean: 0.8, lastObservedAt: iso(1),
    recurringIssueIds: [], sourceBreakdown: {},
  };
}
function input(over: Partial<CoachInput> = {}): CoachInput {
  return {
    now: NOW, goalType: 'igcse', examDate: null, sessions: [], skills: {}, weakestSkillIds: [],
    skillLabel: id => LABELS[id] ?? id, activeProblemNodeId: null, focusSkillId: null, dueCounts: {},
    topics: TOPICS, topicStats: {}, learnAnswersLeft: 3, ...over,
  };
}

// ── Log fixtures ────────────────────────────────────────────────────────────────

let seq = 0;
function episode(kind: CoachMoveKind, target: MoveTarget, baseline: OutcomeBaseline, value: number, followed = true, daysAgo = 20): CoachOutcomeEntry {
  seq += 1;
  const base = baseline.type === 'exam_area' ? baseline.mark : (baseline.value as number);
  return {
    id: `x${seq}`, kind, target, activity: { type: 'role_play' }, evidence: {}, baseline,
    shownAt: iso(daysAgo - seq * 0.01), lastShownAt: iso(daysAgo), shows: 1,
    follow: followed ? { status: 'followed', at: iso(daysAgo - 1), sessionId: `f${seq}` } : { status: 'not_followed' },
    outcome: { status: 'measured', measuredAt: iso(daysAgo - 3), value, delta: value - base, answersSince: 1 },
  };
}
const area = (kind: CoachMoveKind, key: 'rolePlay' | 'communication', from: number, to: number, followed = true, max = key === 'rolePlay' ? 10 : 15) =>
  episode(kind, { type: 'exam_area', area: key }, { type: 'exam_area', area: key, mark: from, max }, to, followed);
const stalled = (kind: CoachMoveKind, key: 'rolePlay' | 'communication' = 'rolePlay', mark = 4) =>
  [area(kind, key, mark, mark), area(kind, key, mark, mark)];
const logOf = (...entries: CoachOutcomeEntry[]): CoachOutcomeLog => ({ v: 1, entries });

const all = (b: ReturnType<typeof decideCoachBrief>): CoachMove[] => [b.move, ...b.alternatives];

// Weak role play (4/10) three days ago: the exam week is used, role-play drill leads.
const weakRolePlay = { sessions: [exam(3, { rolePlay: 4, communication: 12, qualityOfLanguage: 11 }), learn(1)] };
// The same, nine days ago: this week's sample exam is open.
const weakRolePlayExamOpen = { sessions: [exam(9, { rolePlay: 4, communication: 12, qualityOfLanguage: 11 }), learn(1)] };

describe('decideCoachBrief — track record from the outcome log', () => {
  it('the role-play ladder is drill cards → two-part Learn answers → Coached Exam', () => {
    expect(STRATEGY_LADDERS.rolePlay).toEqual(['role_play', 'two_part_answers', 'coached_exam']);
    expect(STRATEGY_LADDERS.communication).toEqual(['develop_answers', 'coached_exam']);
  });

  it('no log, or an empty one: the plan is unchanged', () => {
    const plain = decideCoachBrief(input(weakRolePlay));
    const empty = decideCoachBrief(input({ ...weakRolePlay, outcomeLog: emptyOutcomeLog() }));
    expect(empty).toEqual(plain);
    expect(plain.move.kind).toBe('role_play');
  });

  it('drill cards followed twice without the role-play mark rising → two-part answers lead', () => {
    const plain = decideCoachBrief(input(weakRolePlay));
    const b = decideCoachBrief(input({ ...weakRolePlay, outcomeLog: logOf(...stalled('role_play')) }));
    expect(b.move.kind).toBe('two_part_answers');
    expect(b.move.priority).toBe(plain.move.priority - 1);
    expect(b.move.to).toBe('/learn?topic=holidays&focus=opinion');
    expect(b.move.usesLearnAnswer).toBe(true);
    expect(b.move.why).toContain('The last two times you followed my advice to drill role-play cards, your role play mark didn’t go up');
    expect(b.move.evidence.examArea).toMatchObject({ key: 'rolePlay', mark: 4, max: 10 });
    const drill = all(b).find(m => m.kind === 'role_play');
    expect(drill?.priority).toBe(plain.move.priority - STALLED_PRIORITY_DROP);
    expect(b.steps.map(s => s.title)).toEqual(['Warm up', 'Part one', 'Part two']);
  });

  it('one stall is not enough to switch', () => {
    const b = decideCoachBrief(input({ ...weakRolePlay, outcomeLog: logOf(area('role_play', 'rolePlay', 4, 4)) }));
    expect(b.move.kind).toBe('role_play');
    expect(all(b).some(m => m.kind === 'two_part_answers')).toBe(false);
  });

  it('ignored advice is not a stall: the move keeps its place', () => {
    const b = decideCoachBrief(input({
      ...weakRolePlay,
      outcomeLog: logOf(area('role_play', 'rolePlay', 4, 4, false), area('role_play', 'rolePlay', 4, 4, false)),
    }));
    expect(b.move.kind).toBe('role_play');
  });

  it('drills and two-part answers both stalled, exam week open → Coached Exam', () => {
    const b = decideCoachBrief(input({ ...weakRolePlayExamOpen, outcomeLog: logOf(...stalled('role_play'), ...stalled('two_part_answers')) }));
    expect(b.move.kind).toBe('coached_exam');
    expect(b.move.to).toBe('/exam?mode=coached');
    expect(b.move.usesLearnAnswer).toBe(false);
    expect(b.move.why).toContain('The last two times you followed my advice to practise two-part answers');
    expect(b.move.why).toContain('its mark doesn’t count');
    expect(all(b).some(m => m.kind === 'two_part_answers')).toBe(false);
  });

  it('Coached Exam is never offered when this week’s sample exam is used', () => {
    const b = decideCoachBrief(input({ ...weakRolePlay, outcomeLog: logOf(...stalled('role_play'), ...stalled('two_part_answers')) }));
    expect(all(b).some(m => m.kind === 'coached_exam' || m.kind === 'two_part_answers')).toBe(false);
  });

  it('every rung stalled: nothing new is offered, the drill stays demoted', () => {
    const plain = decideCoachBrief(input(weakRolePlayExamOpen));
    const b = decideCoachBrief(input({
      ...weakRolePlayExamOpen,
      outcomeLog: logOf(...stalled('role_play'), ...stalled('two_part_answers'), ...stalled('coached_exam')),
    }));
    expect(all(b).some(m => m.kind === 'two_part_answers' || m.kind === 'coached_exam')).toBe(false);
    const drill = [b.move, ...b.alternatives].find(m => m.kind === 'role_play');
    const plainDrill = all(plain).find(m => m.kind === 'role_play');
    if (drill && plainDrill) expect(drill.priority).toBe(plainDrill.priority - STALLED_PRIORITY_DROP);
  });

  it('a weak Communication mark: develop answers stalled twice → Coached Exam', () => {
    const b = decideCoachBrief(input({
      sessions: [exam(9, { rolePlay: 9, communication: 6, qualityOfLanguage: 12 }), learn(1)],
      outcomeLog: logOf(...stalled('develop_answers', 'communication', 6)),
    }));
    expect(b.move.kind).toBe('coached_exam');
    expect(b.move.why).toContain('to develop your answers, your communication mark didn’t go up');
  });

  it('a strategy that worked says so, with the log’s numbers', () => {
    const plain = decideCoachBrief(input(weakRolePlay));
    const b = decideCoachBrief(input({ ...weakRolePlay, outcomeLog: logOf(area('role_play', 'rolePlay', 4, 5), area('role_play', 'rolePlay', 5, 7)) }));
    expect(b.move.kind).toBe('role_play');
    expect(b.move.priority).toBe(plain.move.priority);
    expect(b.move.why.endsWith('Your role play went from 4/10 to 7/10 since you started drilling role-play cards.')).toBe(true);
  });

  it('never invents an improvement: ignored rounds, a fall overall, or a rise below the threshold say nothing', () => {
    const cases = [
      logOf(area('role_play', 'rolePlay', 4, 7, false)),
      logOf(area('role_play', 'rolePlay', 6, 3), area('role_play', 'rolePlay', 3, 5)),
      logOf(episode('role_play', { type: 'exam_area', area: 'rolePlay' }, { type: 'exam_area', area: 'rolePlay', mark: 4, max: 10 }, 4.5)),
    ];
    for (const outcomeLog of cases) {
      const b = decideCoachBrief(input({ ...weakRolePlay, outcomeLog }));
      expect(b.move.why).not.toMatch(/went from/);
    }
  });

  it('a skill move that worked quotes its mastery from the log; a stalled one is only lowered', () => {
    const skill: MoveTarget = { type: 'skill', skillId: 'tense_past' };
    const s = (from: number, to: number) => episode('weak_skill', skill, { type: 'skill_mastery', skillId: 'tense_past', value: from, evidenceCount: 6 }, to);
    const base = { sessions: [learn(1), learn(2)], skills: { tense_past: belief('tense_past', 0.4) }, weakestSkillIds: ['tense_past'] };
    const plain = decideCoachBrief(input(base));
    const plainSkill = all(plain).find(m => m.kind === 'weak_skill')!;

    const worked = decideCoachBrief(input({ ...base, outcomeLog: logOf(s(0.3, 0.42)) }));
    expect(all(worked).find(m => m.kind === 'weak_skill')?.why).toContain('Past tense went from 30% to 42% right since you started practising it.');

    const stuck = decideCoachBrief(input({ ...base, outcomeLog: logOf(s(0.4, 0.4), s(0.4, 0.41)) }));
    const stuckSkill = [stuck.move, ...stuck.alternatives].find(m => m.kind === 'weak_skill');
    if (stuckSkill) expect(stuckSkill.priority).toBe(plainSkill.priority - STALLED_PRIORITY_DROP);
    expect(stuck.move.kind).not.toBe('weak_skill');
  });

  it('the weekly Exam Sim is the measurement, never demoted', () => {
    const e = (from: number, to: number) => episode('exam_sim', { type: 'exam' }, { type: 'exam_total', value: from }, to);
    const base = { examDate: new Date(NOW + 20 * DAY).toISOString(), ...weakRolePlayExamOpen };
    const plain = decideCoachBrief(input(base));
    const b = decideCoachBrief(input({ ...base, outcomeLog: logOf(e(27, 27), e(27, 26)) }));
    expect(b.move.kind).toBe('exam_sim');
    expect(b.move.priority).toBe(plain.move.priority);
    expect(b.move.why).toBe(plain.move.why);
  });

  it('end to end: two real drill episodes with no rise, read through the outcome log, switch the strategy', () => {
    // Round 1: drill shown 20 days ago, followed next day, counted Exam Sim 13 days ago: still 4/10.
    // Round 2: drill shown 12 days ago, followed, counted Exam Sim 3 days ago: still 4/10.
    const rounds = [
      { shown: 20, drill: 19, exam: 13 },
      { shown: 12, drill: 11, exam: 3 },
    ];
    let log = emptyOutcomeLog();
    let history: StoredSession[] = [exam(25, { rolePlay: 4, communication: 12, qualityOfLanguage: 11 }), learn(26)];
    for (const r of rounds) {
      const at = NOW - r.shown * DAY;
      const shownBrief = decideCoachBrief(input({ now: at, sessions: history.filter(s => Date.parse(s.date) <= at) }));
      expect(shownBrief.move.kind).toBe('role_play');
      log = recordShown(updateOutcomes(log, observationFromCoachInput(input({ now: at, sessions: history }), at)), shownBrief.move, at);
      history = [exam(r.exam, { rolePlay: 4, communication: 12, qualityOfLanguage: 11 }), story(r.drill), ...history];
    }
    log = updateOutcomes(log, observationFromCoachInput(input({ sessions: history }), NOW));
    expect(log.entries.map(e => [e.follow.status, e.outcome.status])).toEqual([['followed', 'measured'], ['followed', 'measured']]);

    const b = decideCoachBrief(input({ sessions: history, outcomeLog: log }));
    expect(b.move.kind).toBe('two_part_answers');
  });
});
