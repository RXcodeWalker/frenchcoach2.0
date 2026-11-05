// ── Reader parity: Home coach (learner-model §7 phase 4, flag learnerModelCoach) ─
//
// The same seeded learner runs through both pipelines (simulationHarness.runDual).
// At every step the coach's decision is made twice — from the old evidence
// snapshot + latest-exam rule, and from the learner model (learnerModelCoachFields)
// — with every other input shared. decideCoachBrief itself is the same code.
//
// Asserted: (1) agreement where the design says they agree; (2) each intended
// divergence, named and pinned; (3) the invariants (marking level and a
// practice-only exam change nothing).
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { runDual, readDualAt, dailyPlan, DAY_MS, type DualState } from './simulationHarness';
import { learnerModelCoachFields } from '../../../services/coach/coachBriefInput';
import { decideCoachBrief, type CoachInput, type CoachTopic } from '../../../services/coach/coachBrain';
import { SKILL_DEFS } from '../../../services/coaching/diagnosticEngine';
import { observationsFromEvents } from '../../../services/coach/skillObservations';
import { TOPIC_SKILL_COVERAGE, TOPIC_SKILL_COVERAGE_V2 } from '../../../data/questionIds';
import { TOPICS } from '../../../data/topics';
import { MARKING_LEVELS, type LevelCheck } from '../../learn/marking/markingLevel';
import ladderFixture from '../../learn/marking/__tests__/fixtures/ladderReply.fam_01_simple_a1.json';
import type { ExamAreaMarks } from '../../../types';

const START = Date.UTC(2026, 9, 1, 8);
const setNow = (ms: number) => vi.setSystemTime(ms);

function topics(coverage: Readonly<Record<string, Readonly<Record<string, number>>>>): CoachTopic[] {
  return TOPICS.filter((t) => !t.isAdvanced).map((t) => ({
    key: t.key, labelEn: t.labelEn, isAdvanced: false, skillCoverage: { ...(coverage[t.key] ?? {}) }, questionsCount: t.questionsCount,
  }));
}

function shared(state: DualState): Omit<CoachInput, 'skills' | 'weakestSkillIds' | 'topics'> {
  return {
    now: state.now,
    goalType: 'igcse',
    examDate: null,
    sessions: state.sessions,
    skillLabel: (id) => SKILL_DEFS[id]?.name ?? id,
    activeProblemNodeId: null,
    focusSkillId: null,
    dueCounts: {},
    topicStats: {},
    learnAnswersLeft: 3,
  };
}

/** The old reader: snapshot skills + the latest-counted-exam rule (no examStanding). */
function oldBrief(state: DualState) {
  return decideCoachBrief({
    ...shared(state),
    skills: state.oldSnapshot.skills,
    weakestSkillIds: state.oldSnapshot.weakestSkillIds,
    topics: topics(TOPIC_SKILL_COVERAGE),
  });
}

/** The new reader: what gatherCoachInput builds with learnerModelCoach live. */
function newBrief(state: DualState) {
  return decideCoachBrief({
    ...shared(state),
    ...learnerModelCoachFields(state.model, state.now),
    topics: topics(TOPIC_SKILL_COVERAGE_V2),
  });
}

const GRAMMAR_LEARNER = { demandAbility: { describe: 6, explain: 5, justify: 4, compare: 4, hypothesize: 3 }, issueRates: { tense: 0.7, gender: 0.25 } } as const;

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'] }));
afterEach(() => vi.useRealTimers());

describe('reader parity — coach: agreement', () => {
  it.each([1, 2, 3, 4, 5, 6])('seed %i: same weak skills, same top move and target, every day of a normal fortnight', (seed) => {
    let days = 0;
    runDual({
      learner: GRAMMAR_LEARNER,
      plan: dailyPlan(10, 3),
      seed,
      startMs: START,
      setNow,
      onDay: (state) => {
        days += 1;
        const fields = learnerModelCoachFields(state.model, state.now);
        expect([...fields.weakestSkillIds].sort(), `day ${state.day}`).toEqual([...state.oldSnapshot.weakestSkillIds].sort());
        for (const id of Object.keys(state.oldSnapshot.skills)) {
          expect(fields.skills[id]?.mastery, `${id} day ${state.day}`).toBe(state.oldSnapshot.skills[id].mastery);
        }
        const before = oldBrief(state);
        const after = newBrief(state);
        expect(after.move.kind, `day ${state.day}`).toBe(before.move.kind);
        // A tie on rounded mastery may name a different skill of EQUAL weakness.
        const masteryOf = (skills: Record<string, { mastery: number }>, id?: string) => (id ? skills[id]?.mastery : undefined);
        expect(masteryOf(fields.skills, after.move.skillIds[0])).toBe(masteryOf(state.oldSnapshot.skills, before.move.skillIds[0]));
      },
    });
    expect(days).toBe(10);
  });

  it('the agreement is not vacuous: the learner\'s weak skills are really found by both', () => {
    const state = runDual({ learner: GRAMMAR_LEARNER, plan: dailyPlan(10, 3), seed: 1, startMs: START, setNow });
    expect(state.oldSnapshot.weakestSkillIds).toContain('tense_past');
    expect(learnerModelCoachFields(state.model, state.now).weakestSkillIds).toContain('tense_past');
    expect(newBrief(state).move.kind).toBe('weak_skill');
  });
});

describe('reader parity — coach: intended divergences', () => {
  it('≈ 11–24-day expiry: after a month away the old reader forgets the weak skill; the model still holds it (decayed)', () => {
    const state = runDual({ learner: GRAMMAR_LEARNER, plan: dailyPlan(6, 4), seed: 11, startMs: START, setNow });
    expect(state.oldSnapshot.weakestSkillIds).toContain('tense_past');
    const later = readDualAt(state, state.now + 30 * DAY_MS, setNow);
    expect(later.oldSnapshot.weakestSkillIds).toEqual([]);
    expect(later.oldSnapshot.skills.tense_past).toBeUndefined();
    const fields = learnerModelCoachFields(later.model, later.now);
    expect(fields.weakestSkillIds).toContain('tense_past');
    expect(newBrief(later).move).toMatchObject({ kind: 'weak_skill', skillIds: ['tense_past'] });
    expect(oldBrief(later).move.kind).not.toBe('weak_skill');
  });

  it('150-event cap: a heavy user\'s early answers fall out of the old log, never out of the model', () => {
    const state = runDual({ learner: GRAMMAR_LEARNER, plan: dailyPlan(2, 40), seed: 12, startMs: START, setNow });
    expect(state.allEvents.length).toBeGreaterThan(150);
    expect(state.log).toHaveLength(150);
    // Every tense_past answer that passes the reliability gate (two-word answers do not, in either model).
    const tenseEvents = observationsFromEvents(state.allEvents).filter((o) => o.kind === 'outcome' && o.skillIds.includes('tense_past')).length;
    const fields = learnerModelCoachFields(state.model, state.now);
    expect(fields.skills.tense_past.evidenceCount).toBe(tenseEvents);
    expect(state.oldSnapshot.skills.tense_past.evidenceCount).toBeLessThan(tenseEvents);
  });

  it('exam-area evidence: the model weighs every counted Exam Sim, the old rule only the latest', () => {
    const first: ExamAreaMarks = { rolePlay: 3, rolePlayMax: 15, communication: 10, qualityOfLanguage: 11, total: 24 };
    const second: ExamAreaMarks = { rolePlay: 11, rolePlayMax: 15, communication: 8, qualityOfLanguage: 11, total: 30 };
    const plan = dailyPlan(8, 2).map((d) =>
      d.day === 0 ? { ...d, exam: 'counted' as const, examMarks: first } : d.day === 7 ? { ...d, exam: 'counted' as const, examMarks: second } : d);
    const state = runDual({ learner: { demandAbility: { describe: 6 } }, plan, seed: 13, startMs: START, setNow });
    // Old: latest attempt's weakest = Communication 8/15.
    expect(oldBrief(state).move.kind).toBe('develop_answers');
    // New: Role play averages lowest across both counted attempts (3/15 then 11/15).
    const brief = newBrief(state);
    expect(brief.move.kind).toBe('role_play');
    expect(brief.move.why).toContain('across your recent Exam Sims');
    expect(brief.move.why).toContain('11/15 last time');
  });
});

describe('reader parity — coach: invariants', () => {
  it('a practice-only exam (Coached, typed, resumed, early start) changes nothing in the model or the brief', () => {
    const marks: ExamAreaMarks = { rolePlay: 1, rolePlayMax: 15, communication: 1, qualityOfLanguage: 1, total: 3 };
    const base = dailyPlan(5, 3);
    const a = runDual({ learner: GRAMMAR_LEARNER, plan: base, seed: 21, startMs: START, setNow });
    const b = runDual({ learner: GRAMMAR_LEARNER, plan: [...base.slice(0, 4), { ...base[4], exam: 'practiceOnly', examMarks: marks }], seed: 21, startMs: START, setNow });
    expect(b.model).toEqual(a.model);
    expect(learnerModelCoachFields(b.model, b.now).examStanding).toEqual([]);
  });

  it('the marking level changes what is shown, never what the model or the coach reads', () => {
    const levelCheck = ladderFixture.response.levelCheck as LevelCheck;
    const runs = MARKING_LEVELS.map((level) =>
      runDual({ learner: GRAMMAR_LEARNER, plan: dailyPlan(4, 3), seed: 22, startMs: START, setNow, marking: { level, levelCheck } }));
    expect(new Set(runs.map((r) => JSON.stringify(r.markedScores))).size).toBeGreaterThan(1);
    for (const r of runs.slice(1)) {
      expect(r.model).toEqual(runs[0].model);
      expect(newBrief(r).move).toEqual(newBrief(runs[0]).move);
    }
  });
});
