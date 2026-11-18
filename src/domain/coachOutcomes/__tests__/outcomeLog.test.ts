import { describe, expect, it } from 'vitest';
import {
  COACH_OUTCOME_LOG_VERSION,
  FOLLOW_WINDOW_MS,
  MAX_OUTCOME_ENTRIES,
  OUTCOME_HORIZON_MS,
  SHOW_DEBOUNCE_MS,
  emptyOutcomeLog,
  moveActivity,
  moveBaseline,
  moveTarget,
  parseOutcomeLog,
  recordShown,
  stepOutcomeLog,
  updateOutcomes,
  type CoachOutcomeLog,
  type OutcomeObservation,
  type OutcomeSession,
  type ShownMove,
} from '../outcomeLog';

const T0 = Date.parse('2026-11-10T09:00:00Z');
const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const at = (ms: number) => new Date(ms).toISOString();

const weakSkill: ShownMove = {
  kind: 'weak_skill',
  topicKey: 'holidays',
  skillIds: ['tense_past'],
  evidence: {
    skill: { id: 'tense_past', mastery: 0.42, evidenceCount: 10, trend: 'declining' },
    topic: { key: 'holidays', averageScore: 5.5, sessionsCompleted: 4 },
  },
};

const developAnswers: ShownMove = {
  kind: 'develop_answers',
  topicKey: 'school',
  skillIds: [],
  evidence: {
    examArea: { key: 'communication', mark: 8, max: 15, share: 8 / 15, basis: 'latest' },
    topic: { key: 'school', averageScore: 6, sessionsCompleted: 2 },
  },
};

const examSim: ShownMove = { kind: 'exam_sim', topicKey: null, skillIds: [], evidence: { examTotal: 24 } };
const review: ShownMove = { kind: 'review', topicKey: 'food', skillIds: [], evidence: { dueCount: 3, topic: { key: 'food', averageScore: 6.2, sessionsCompleted: 5 } } };
const firstSteps: ShownMove = { kind: 'first_steps', topicKey: null, skillIds: [], evidence: {} };
const rolePlayPlain: ShownMove = { kind: 'role_play', topicKey: null, skillIds: [], evidence: {} };

function practice(ms: number, topicKey: string, id = `p${ms}${topicKey}`): OutcomeSession {
  return { id, date: at(ms), mode: 'practice', topicKey, examTotal: null };
}

function examAttempt(ms: number, marks: { rolePlay: number; communication: number; qualityOfLanguage: number }, practiceOnly = false): OutcomeSession {
  const total = marks.rolePlay + marks.communication + marks.qualityOfLanguage;
  return { id: `e${ms}`, date: at(ms), mode: 'exam', topicKey: null, practiceOnly, examTotal: total, examMarks: { ...marks, rolePlayMax: 10 } };
}

function obs(now: number, over: Partial<OutcomeObservation> = {}): OutcomeObservation {
  return { now, sessions: [], skills: {}, topicStats: {}, ...over };
}

function shown(move: ShownMove, now = T0): CoachOutcomeLog {
  return recordShown(emptyOutcomeLog(), move, now);
}

describe('classifying a move', () => {
  it('targets the skill, the exam area, the exam or the topic the move is about', () => {
    expect(moveTarget(weakSkill)).toEqual({ type: 'skill', skillId: 'tense_past' });
    expect(moveTarget(developAnswers)).toEqual({ type: 'exam_area', area: 'communication' });
    expect(moveTarget(examSim)).toEqual({ type: 'exam' });
    expect(moveTarget(review)).toEqual({ type: 'topic', topicKey: 'food' });
    expect(moveTarget(firstSteps)).toEqual({ type: 'none' });
    expect(moveTarget(rolePlayPlain)).toEqual({ type: 'none' });
  });

  it('a Learn move is followed in its own topic; exam and role play by their own activity', () => {
    expect(moveActivity(weakSkill)).toEqual({ type: 'learn', topicKey: 'holidays' });
    expect(moveActivity(firstSteps)).toEqual({ type: 'learn', topicKey: null });
    expect(moveActivity(examSim)).toEqual({ type: 'exam_sim' });
    expect(moveActivity(rolePlayPlain)).toEqual({ type: 'role_play' });
  });

  it('the baseline is the evidence the move cited', () => {
    expect(moveBaseline(weakSkill)).toEqual({ type: 'skill_mastery', skillId: 'tense_past', value: 0.42, evidenceCount: 10 });
    expect(moveBaseline(developAnswers)).toEqual({ type: 'exam_area', area: 'communication', mark: 8, max: 15 });
    expect(moveBaseline(examSim)).toEqual({ type: 'exam_total', value: 24 });
    expect(moveBaseline(review)).toEqual({ type: 'topic_average', topicKey: 'food', value: 6.2, sessions: 5 });
    expect(moveBaseline(firstSteps)).toBeNull();
  });

  it('a skill move whose skill had no belief yet has no metric', () => {
    const noBelief: ShownMove = { ...weakSkill, kind: 'fix_mistake', evidence: { skill: { id: 'tense_past', mastery: null, evidenceCount: null, trend: null } } };
    const log = shown(noBelief);
    expect(log.entries[0].baseline).toBeNull();
    expect(log.entries[0].outcome).toEqual({ status: 'no_metric' });
  });
});

describe('recording shows', () => {
  it('starts an episode with when, what and the cited evidence', () => {
    const log = shown(weakSkill);
    expect(log.v).toBe(COACH_OUTCOME_LOG_VERSION);
    expect(log.entries).toHaveLength(1);
    const e = log.entries[0];
    expect(e).toMatchObject({
      kind: 'weak_skill', shownAt: at(T0), lastShownAt: at(T0), shows: 1,
      follow: { status: 'pending' }, outcome: { status: 'pending' }, evidence: weakSkill.evidence,
    });
  });

  it('re-renders within the debounce are one show; a later visit counts again but keeps the first baseline', () => {
    let log = shown(weakSkill);
    log = recordShown(log, weakSkill, T0 + 60_000);
    expect(log.entries[0].shows).toBe(1);
    const later = { ...weakSkill, evidence: { skill: { id: 'tense_past', mastery: 0.5, evidenceCount: 12, trend: 'stable' } } };
    log = recordShown(log, later, T0 + SHOW_DEBOUNCE_MS + 1);
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0].shows).toBe(2);
    expect(log.entries[0].evidence.skill?.mastery).toBe(0.42);
  });

  it('a different move, or the same kind aimed elsewhere, is its own episode', () => {
    let log = shown(weakSkill);
    log = recordShown(log, examSim, T0 + 1000);
    log = recordShown(log, { ...weakSkill, skillIds: ['gender'], evidence: { skill: { id: 'gender', mastery: 0.3, evidenceCount: 4, trend: null } } }, T0 + 2000);
    expect(log.entries.map(e => e.kind)).toEqual(['weak_skill', 'exam_sim', 'weak_skill']);
  });

  it('an ignored episode is closed: showing the move again later starts a new one', () => {
    let log = shown(weakSkill);
    const now = T0 + FOLLOW_WINDOW_MS + HOUR;
    log = stepOutcomeLog(log, weakSkill, obs(now));
    expect(log.entries).toHaveLength(2);
    expect(log.entries[0].follow).toEqual({ status: 'not_followed' });
    expect(log.entries[1].follow).toEqual({ status: 'pending' });
  });

  it('a followed episode keeps absorbing shows until its outcome is measured', () => {
    let log = shown(weakSkill);
    const sessions = [practice(T0 + HOUR, 'holidays')];
    log = stepOutcomeLog(log, weakSkill, obs(T0 + 2 * HOUR, { sessions, skills: { tense_past: { mastery: 0.45, evidenceCount: 11 } } }));
    expect(log.entries).toHaveLength(1);
    expect(log.entries[0].shows).toBe(2);
    log = stepOutcomeLog(log, weakSkill, obs(T0 + 3 * DAY, { sessions, skills: { tense_past: { mastery: 0.55, evidenceCount: 13 } } }));
    expect(log.entries[0].outcome.status).toBe('measured');
    expect(log.entries).toHaveLength(2);
  });

  it('keeps only the newest entries', () => {
    let log = emptyOutcomeLog();
    for (let i = 0; i < MAX_OUTCOME_ENTRIES + 5; i++) {
      log = recordShown(log, { ...review, topicKey: `t${i}`, evidence: { topic: { key: `t${i}`, averageScore: 5, sessionsCompleted: 1 } } }, T0 + i * 1000);
    }
    expect(log.entries).toHaveLength(MAX_OUTCOME_ENTRIES);
    expect(log.entries[0].target).toEqual({ type: 'topic', topicKey: 't5' });
  });
});

describe('following', () => {
  it('an answer in the suggested topic within 48 hours is a follow', () => {
    const hit = practice(T0 + 30 * HOUR, 'holidays', 'hit');
    const log = updateOutcomes(shown(weakSkill), obs(T0 + 31 * HOUR, { sessions: [practice(T0 + 2 * HOUR, 'food'), hit] }));
    expect(log.entries[0].follow).toEqual({ status: 'followed', at: hit.date, sessionId: 'hit' });
  });

  it('an answer elsewhere, or before the show, or after 48 hours is not', () => {
    const sessions = [practice(T0 - HOUR, 'holidays'), practice(T0 + HOUR, 'food'), practice(T0 + FOLLOW_WINDOW_MS + HOUR, 'holidays')];
    const log = updateOutcomes(shown(weakSkill), obs(T0 + FOLLOW_WINDOW_MS + 2 * HOUR, { sessions }));
    expect(log.entries[0].follow).toEqual({ status: 'not_followed' });
  });

  it('stays pending while the window is still open', () => {
    const log = updateOutcomes(shown(weakSkill), obs(T0 + 10 * HOUR));
    expect(log.entries[0].follow).toEqual({ status: 'pending' });
  });

  it('first steps are followed by any Learn answer', () => {
    const log = updateOutcomes(shown(firstSteps), obs(T0 + HOUR, { sessions: [practice(T0 + 10, 'family')] }));
    expect(log.entries[0].follow.status).toBe('followed');
  });

  it('an Exam Sim move is followed only by a counted attempt, never by Coached Practice', () => {
    const coached = updateOutcomes(shown(examSim), obs(T0 + 3 * DAY, { sessions: [examAttempt(T0 + HOUR, { rolePlay: 8, communication: 9, qualityOfLanguage: 9 }, true)] }));
    expect(coached.entries[0].follow).toEqual({ status: 'not_followed' });
    const counted = updateOutcomes(shown(examSim), obs(T0 + 2 * HOUR, { sessions: [examAttempt(T0 + HOUR, { rolePlay: 8, communication: 9, qualityOfLanguage: 9 })] }));
    expect(counted.entries[0].follow.status).toBe('followed');
  });

  it('a role-play move is followed by a role-play drill answer', () => {
    const drill: OutcomeSession = { id: 'story-rp_1-1-0', date: at(T0 + HOUR), mode: 'story', topicKey: null, examTotal: null };
    const log = updateOutcomes(shown(rolePlayPlain), obs(T0 + 2 * HOUR, { sessions: [drill] }));
    expect(log.entries[0].follow.status).toBe('followed');
  });
});

describe('outcomes', () => {
  it('skill mastery is read again only after three more observations', () => {
    let log = shown(weakSkill);
    log = updateOutcomes(log, obs(T0 + DAY, { skills: { tense_past: { mastery: 0.5, evidenceCount: 12 } } }));
    expect(log.entries[0].outcome).toEqual({ status: 'pending' });
    log = updateOutcomes(log, obs(T0 + 2 * DAY, { skills: { tense_past: { mastery: 0.58, evidenceCount: 13 } } }));
    expect(log.entries[0].outcome).toEqual({ status: 'measured', measuredAt: at(T0 + 2 * DAY), value: 0.58, delta: 0.16, answersSince: 3 });
  });

  it('a measured outcome is final', () => {
    let log = updateOutcomes(shown(weakSkill), obs(T0 + DAY, { skills: { tense_past: { mastery: 0.58, evidenceCount: 13 } } }));
    const first = log.entries[0].outcome;
    log = updateOutcomes(log, obs(T0 + 9 * DAY, { skills: { tense_past: { mastery: 0.9, evidenceCount: 30 } } }));
    expect(log.entries[0].outcome).toBe(first);
  });

  it('an exam area is read from the next counted Exam Sim, skipping Coached ones', () => {
    const sessions = [
      examAttempt(T0 + DAY, { rolePlay: 9, communication: 14, qualityOfLanguage: 9 }, true),
      examAttempt(T0 + 8 * DAY, { rolePlay: 7, communication: 11, qualityOfLanguage: 9 }),
    ];
    const log = updateOutcomes(shown(developAnswers), obs(T0 + 9 * DAY, { sessions }));
    expect(log.entries[0].outcome).toMatchObject({ status: 'measured', value: 11, delta: 3, answersSince: 1, sessionId: `e${T0 + 8 * DAY}` });
  });

  it('an Exam Sim move reads the next total; a first exam has no delta', () => {
    const sessions = [examAttempt(T0 + HOUR, { rolePlay: 7, communication: 10, qualityOfLanguage: 10 })];
    const log = updateOutcomes(shown(examSim), obs(T0 + 2 * HOUR, { sessions }));
    expect(log.entries[0].outcome).toMatchObject({ status: 'measured', value: 27, delta: 3 });
    const first = updateOutcomes(shown({ ...examSim, evidence: { examTotal: null } }), obs(T0 + 2 * HOUR, { sessions }));
    expect(first.entries[0].outcome).toMatchObject({ status: 'measured', value: 27, delta: null });
  });

  it('a topic average is read again after three more sessions in that topic', () => {
    let log = shown(review);
    log = updateOutcomes(log, obs(T0 + DAY, { topicStats: { food: { sessionsCompleted: 7, averageScore: 6.4 } } }));
    expect(log.entries[0].outcome.status).toBe('pending');
    log = updateOutcomes(log, obs(T0 + 2 * DAY, { topicStats: { food: { sessionsCompleted: 8, averageScore: 6.5 } } }));
    expect(log.entries[0].outcome).toMatchObject({ status: 'measured', value: 6.5, delta: 0.3, answersSince: 3 });
  });

  it('ignored moves are measured too (the comparison group)', () => {
    const log = updateOutcomes(shown(weakSkill), obs(T0 + 5 * DAY, { skills: { tense_past: { mastery: 0.4, evidenceCount: 14 } } }));
    expect(log.entries[0].follow).toEqual({ status: 'not_followed' });
    expect(log.entries[0].outcome).toMatchObject({ status: 'measured', delta: -0.02 });
  });

  it('gives up as unmeasured past the horizon', () => {
    const log = updateOutcomes(shown(weakSkill), obs(T0 + OUTCOME_HORIZON_MS + 1, { skills: { tense_past: { mastery: 0.4, evidenceCount: 11 } } }));
    expect(log.entries[0].outcome).toEqual({ status: 'unmeasured' });
  });

  it('a move with no metric records only the follow', () => {
    const log = updateOutcomes(shown(firstSteps), obs(T0 + HOUR, { sessions: [practice(T0 + 10, 'school')] }));
    expect(log.entries[0].outcome).toEqual({ status: 'no_metric' });
  });

  it('returns the same log object when nothing changed', () => {
    const log = shown(weakSkill);
    expect(updateOutcomes(log, obs(T0 + HOUR))).toBe(log);
  });
});

describe('parseOutcomeLog', () => {
  it('round-trips a log through JSON', () => {
    const log = shown(weakSkill);
    expect(parseOutcomeLog(JSON.parse(JSON.stringify(log)))).toEqual(log);
  });

  it('anything unreadable or of another version is an empty log', () => {
    expect(parseOutcomeLog(null)).toEqual(emptyOutcomeLog());
    expect(parseOutcomeLog('x')).toEqual(emptyOutcomeLog());
    expect(parseOutcomeLog({ v: 99, entries: [] })).toEqual(emptyOutcomeLog());
    expect(parseOutcomeLog({ v: COACH_OUTCOME_LOG_VERSION, entries: [{ id: 1 }, null] })).toEqual(emptyOutcomeLog());
  });
});
