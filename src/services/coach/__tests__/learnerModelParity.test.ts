// learner-model §2 parity: the new model reproduces the evidence reducer's maths
// exactly where they should agree, and differs only by the documented gate fix.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { reduceEvidenceToBeliefState, projectEvidenceBeliefSnapshot, computeEventWeight, computeBaseEventWeight, MIN_RELIABLE_WEIGHT } from '../beliefReducer';
import { observationsFromEvents, observationFromEvent, retrievalGapDays, REVIEW_PASS_MULTIPLIER } from '../skillObservations';
import { applyObservations, emptyModel } from '../../../domain/learnerModel/update';
import { coachSkillsView, demandBeliefsView, readSkill } from '../../../domain/learnerModel/read';
import { bootstrapModel, topicMasteryPrior } from '../../../domain/learnerModel/bootstrap';
import { SKILL_DEFS } from '../../coaching/diagnosticEngine';
import type { EvidenceEvent } from '../../../types/evidence';

const NOW = Date.UTC(2026, 10, 1, 9);
const DAY = 86_400_000;
const meta = (id: string) => ({ label: SKILL_DEFS[id]?.name ?? id, category: SKILL_DEFS[id]?.category ?? 'grammar' });

let seq = 0;
function ev(over: Partial<EvidenceEvent> & { daysAgo?: number; nodes: string[]; success?: boolean; score?: number; type?: EvidenceEvent['evidenceType']; conf?: number; validity?: number }): EvidenceEvent {
  seq += 1;
  const { daysAgo = 0, nodes, success, score, type = 'language', conf = 0.8, validity = 0.9 } = over;
  return {
    id: `e${seq}`,
    learnerId: 'local-user',
    occurredAt: new Date(NOW - daysAgo * DAY).toISOString(),
    sourceSessionId: `s${seq}`,
    evidenceType: type,
    targetNodeIds: nodes,
    observation: {},
    result: { ...(success === undefined ? {} : { success }), ...(score === undefined ? {} : { score }) },
    reliability: { assessmentConfidence: conf, taskValidity: validity, signalQuality: 0.9, evaluator: 'llm', rubricVersion: 'x' },
    context: { mode: 'practice', timed: false, questionId: over.context?.questionId },
  };
}

function oldSnapshot(events: EvidenceEvent[]) {
  return projectEvidenceBeliefSnapshot(reduceEvidenceToBeliefState(events), undefined);
}
function newModel(events: EvidenceEvent[]) {
  return applyObservations(emptyModel('d'), observationsFromEvents(events), NOW);
}

describe('learner-model §2 — parity with beliefReducer on recent evidence', () => {
  afterEach(() => vi.useRealTimers());

  it('skills: same mastery, confidence, evidence count and weakest ids; demands: same beliefs', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    const events = [
      ev({ nodes: ['tense_past'], success: false, daysAgo: 3 }),
      ev({ nodes: ['tense_past'], success: false, daysAgo: 2 }),
      ev({ nodes: ['tense_past', 'gender'], success: false, daysAgo: 1 }),
      ev({ nodes: ['gender'], success: true, daysAgo: 1 }),
      ev({ nodes: ['opinion'], score: 8, daysAgo: 0.5 }),
      ev({ nodes: ['opinion'], score: 8, daysAgo: 0.2 }),
      ev({ nodes: ['opinion'], score: 3, daysAgo: 0.1 }),
      ev({ nodes: ['demand:justify'], success: true, daysAgo: 2, conf: 0.9, validity: 0.85 }),
      ev({ nodes: ['demand:justify'], success: true, daysAgo: 1, conf: 0.9, validity: 0.85 }),
      ev({ nodes: ['negation'], daysAgo: 1 }), // no success signal: evidence only
    ];
    const old = oldSnapshot(events);
    const model = newModel(events);
    const view = coachSkillsView(model, NOW, meta);
    for (const id of Object.keys(old.skills)) {
      expect(view.skills[id]?.mastery, id).toBe(old.skills[id].mastery);
      expect(view.skills[id]?.confidence, id).toBe(old.skills[id].confidence);
      expect(view.skills[id]?.evidenceCount, id).toBe(old.skills[id].evidenceCount);
      expect(view.skills[id]?.trend, id).toBe(old.skills[id].trend);
    }
    expect(Object.keys(view.skills).sort()).toEqual(Object.keys(old.skills).sort());
    expect(view.weakestSkillIds).toEqual(old.weakestSkillIds);
    expect(demandBeliefsView(model, NOW)).toEqual(old.demands);
  });

  it('intended divergence (gate fix): an inferred demand event 12 days old is dropped by the old reducer, kept (decayed) by the model', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
    // inferred: confidence 0.8 × validity 0.6 × signal 0.9 × heuristic cap 0.6 ≈ 0.26 base
    const inferred: EvidenceEvent = { ...ev({ nodes: ['demand:explain'], success: true, daysAgo: 12, conf: 0.8, validity: 0.6 }), reliability: { assessmentConfidence: 0.8, taskValidity: 0.6, signalQuality: 0.9, evaluator: 'heuristic', rubricVersion: 'x' } };
    expect(computeBaseEventWeight(inferred)).toBeCloseTo(0.2592, 4);
    expect(computeEventWeight(inferred)).toBeLessThan(MIN_RELIABLE_WEIGHT);
    expect(oldSnapshot([inferred]).demands).toEqual({});
    const r = readSkill(newModel([inferred]), 'demand:explain', NOW)!;
    expect(r.weight).toBeCloseTo(0.2592 * Math.pow(0.5, 12 / 14), 4);
    expect(r.evidenceCount).toBe(1);
  });

  it('the gate applies to the base weight: a weak event is dropped at any age', () => {
    const weak = ev({ nodes: ['gender'], success: false, conf: 0.2 });
    expect(computeBaseEventWeight(weak)).toBeLessThan(MIN_RELIABLE_WEIGHT);
    expect(observationFromEvent(weak)).toBeNull();
  });

  it('avoidance (behavior) events are always counted, as in the reducer', () => {
    const avoid = ev({ nodes: ['demand:compare'], type: 'behavior', conf: 0.2 });
    expect(observationFromEvent(avoid)).toMatchObject({ kind: 'avoidance' });
  });
});

describe('learner-model §3 — review-gap weighting (UNVALIDATED)', () => {
  const item = (lastDaysAgo: number, dueDaysAgo: number) => ({
    lastAnsweredAt: new Date(NOW - lastDaysAgo * DAY).toISOString(),
    nextEligibleAt: new Date(NOW - dueDaysAgo * DAY).toISOString(),
  });

  it('a pass on a due review item after ≥ 6 days counts ×1.25; a fail, a short gap or a non-due item counts ×1', () => {
    const pass = ev({ nodes: ['tense_past'], success: true, context: { mode: 'practice', timed: false, questionId: 'q1' } });
    const fail = ev({ nodes: ['tense_past'], success: false, context: { mode: 'practice', timed: false, questionId: 'q1' } });
    const base = computeBaseEventWeight(pass);
    expect(observationFromEvent(pass, () => item(8, 1))!.weight).toBeCloseTo(base * REVIEW_PASS_MULTIPLIER, 10);
    expect(observationFromEvent(fail, () => item(8, 1))!.weight).toBeCloseTo(base, 10);
    expect(observationFromEvent(pass, () => item(3, 1))!.weight).toBeCloseTo(base, 10);
    expect(observationFromEvent(pass, () => item(8, -2))!.weight).toBeCloseTo(base, 10); // not due yet → not a review slot
    expect(observationFromEvent(pass, () => undefined)!.weight).toBeCloseTo(base, 10);
    expect(retrievalGapDays(NOW, item(8, 1))).toBeCloseTo(8, 6);
  });
});

describe('learner-model §4.5 — bootstrap', () => {
  it('replays the log and counted exams before the cutoff into the legacy bucket and marks them seen', () => {
    const events = [ev({ nodes: ['tense_past'], success: false, daysAgo: 2 }), ev({ nodes: ['gender'], success: true, daysAgo: -1 })];
    const model = bootstrapModel({
      deviceId: 'd1',
      cutoff: NOW,
      evidenceObservations: observationsFromEvents(events),
      examSessions: [
        { sessionId: 'x1', date: new Date(NOW - DAY).toISOString(), mode: 'exam', practiceOnly: false, marks: { rolePlay: 10, rolePlayMax: 15, communication: 9, qualityOfLanguage: 8, total: 27 } },
        { sessionId: 'x2', date: new Date(NOW - DAY).toISOString(), mode: 'exam', practiceOnly: true, marks: { rolePlay: 1, rolePlayMax: 15, communication: 1, qualityOfLanguage: 1, total: 3 } },
      ],
      topicMastery: {},
      topicSkillCoverage: {},
      questionCountByTopic: {},
    });
    expect(model.devices).toEqual({});
    expect(Object.keys(model.legacy!.skills).sort()).toEqual(['exam:communication', 'exam:qualityOfLanguage', 'exam:rolePlay', 'tense_past']);
    expect(model.seen).toHaveLength(4); // 1 event (the future one is left for live ingest) + 3 areas
    expect(readSkill(model, 'exam:rolePlay', NOW)!.lastMark).toBe(10);
  });

  it('topic-mastery prior: only for language skills without evidence, ≤ 1 pseudo-count, no raw answers', () => {
    const prior = topicMasteryPrior(
      {
        school: { topicKey: 'school', sessionsCompleted: 4, uniqueQuestionsAnswered: [], lastSessionAt: new Date(NOW - DAY).toISOString(), mastered: false, averageScore: 6 },
        food: { topicKey: 'food', sessionsCompleted: 2, uniqueQuestionsAnswered: [], lastSessionAt: new Date(NOW - 2 * DAY).toISOString(), mastered: false, averageScore: 9 },
        none: { topicKey: 'none', sessionsCompleted: 0, uniqueQuestionsAnswered: [], lastSessionAt: new Date(NOW).toISOString(), mastered: false, averageScore: null },
      },
      { school: { tense_past: 30, opinion: 10, 'demand:justify': 5 }, food: { tense_past: 40 } },
      { school: 40, food: 40 },
      new Set(['opinion']),
      NOW,
    );
    expect(Object.keys(prior)).toEqual(['tense_past']);
    expect(prior.tense_past.w).toBe(1); // 0.75 + 1.0 capped at 1
    expect(prior.tense_past.n).toBe(0);
    expect(prior.tense_past.s / prior.tense_past.w).toBeCloseTo((0.75 * 0.6 + 1 * 0.9) / 1.75, 10);
  });
});
