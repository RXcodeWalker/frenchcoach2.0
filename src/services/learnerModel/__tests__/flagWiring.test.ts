// @vitest-environment jsdom
//
// learner-model §7: each reader moves onto the model behind its OWN flag, and
// with the flag off the old path is untouched (the rollback).
import { describe, it, expect, beforeEach } from 'vitest';
import { FEATURE_FLAGS } from '../../../config/featureFlags';
import { STORAGE_KEYS, setStorageScope, storageSet } from '../../persistence/storage';
import { appendEvidenceEvents } from '../../coach/coachStorage';
import { gatherCoachInput, topicSkillCoverage } from '../../coach/coachBriefInput';
import { learnBeliefSnapshot, sessionAbility } from '../../../utils/sessionBuilder';
import { TOPIC_SKILL_COVERAGE, TOPIC_SKILL_COVERAGE_V2 } from '../../../data/questionIds';
import { applyObservations, emptyModel } from '../../../domain/learnerModel/update';
import { LEARNER_MODEL_SNAPSHOT_VERSION } from '../learnerModelViews';
import { syncedLearnerStateKeys } from '../../sync/learnerStateSync';
import type { SkillObservation } from '../../../domain/learnerModel/types';
import type { EvidenceEvent } from '../../../types/evidence';

const NOW = Date.now();

function setFlags(flags: Record<string, 'live' | 'coming-soon'>) {
  storageSet(STORAGE_KEYS.featureFlagOverrides, flags);
}

function modelWith(observations: SkillObservation[]) {
  return applyObservations(emptyModel('dev'), observations, NOW);
}

const weakTense = Array.from({ length: 6 }, (_, i): SkillObservation => ({ id: `t${i}`, skillIds: ['tense_past'], at: NOW - i * 60_000, kind: 'outcome', success: 0, weight: 0.5 }));
const strongJustify = Array.from({ length: 8 }, (_, i): SkillObservation => ({ id: `j${i}`, skillIds: ['demand:justify', 'demand:describe', 'demand:explain'], at: NOW - i * 60_000, kind: 'outcome', success: 1, weight: 0.5 }));

function oldEvent(id: string, nodes: string[]): EvidenceEvent {
  return {
    id, learnerId: 'local-user', occurredAt: new Date(NOW).toISOString(), sourceSessionId: id, evidenceType: 'language',
    targetNodeIds: nodes, observation: {}, result: { success: false },
    reliability: { assessmentConfidence: 0.8, taskValidity: 0.9, signalQuality: 0.9, evaluator: 'llm', rubricVersion: 'x' },
    context: { mode: 'practice', timed: false },
  };
}

beforeEach(() => {
  localStorage.clear();
  setStorageScope('user-1');
});

describe('learner-model flags', () => {
  it('readers ship off (coming-soon); sync is live (migration applied 2026-11-07)', () => {
    expect(FEATURE_FLAGS.learnerModelSync).toBe('live');
    expect(FEATURE_FLAGS.learnerModelCoach).toBe('coming-soon');
    expect(FEATURE_FLAGS.learnerModelLearn).toBe('coming-soon');
    expect(FEATURE_FLAGS.learnerModelProgress).toBe('coming-soon');
  });

  it('learnerModelSync gates the skill_model key', () => {
    setFlags({ learnerModelSync: 'coming-soon' });
    expect(syncedLearnerStateKeys()).not.toContain('skill_model');
    setFlags({ learnerModelSync: 'live' });
    expect(syncedLearnerStateKeys()).toContain('skill_model');
  });

  it('learnerModelCoach: off reads the evidence snapshot; on reads the model (and the registry coverage)', () => {
    appendEvidenceEvents([oldEvent('o1', ['gender']), oldEvent('o2', ['gender']), oldEvent('o3', ['gender'])]);
    const model = modelWith(weakTense);
    const off = gatherCoachInput({ learnAnswersLeft: 3, learnerModel: model });
    expect(off.weakestSkillIds).toEqual(['gender']);
    expect(off.examStanding).toBeUndefined();
    expect(topicSkillCoverage()).toBe(TOPIC_SKILL_COVERAGE);

    setFlags({ learnerModelCoach: 'live' });
    const on = gatherCoachInput({ learnAnswersLeft: 3, learnerModel: model });
    expect(on.weakestSkillIds).toEqual(['tense_past']);
    expect(on.examStanding).toEqual([]);
    expect(topicSkillCoverage()).toBe(TOPIC_SKILL_COVERAGE_V2);
  });

  it('learnerModelLearn: off keeps the old snapshot and cold start; on reads the model\'s demands', () => {
    const model = modelWith(strongJustify);
    expect(learnBeliefSnapshot(model)).toBeNull();
    expect(sessionAbility(undefined, model).source).toBe('seeded');

    setFlags({ learnerModelLearn: 'live' });
    const snap = learnBeliefSnapshot(model)!;
    expect(snap.reducerVersion).toBe(LEARNER_MODEL_SNAPSHOT_VERSION);
    expect(Object.keys(snap.demands ?? {}).sort()).toEqual(['demand:describe', 'demand:explain', 'demand:justify']);
    const ability = sessionAbility(undefined, model);
    expect(ability.source).toBeUndefined();
    expect(ability.measuredAnswers).toBe(24);
  });

  it('readers outside React fall back to the stored model when none is passed', () => {
    storageSet(STORAGE_KEYS.learnerModelDevice, 'dev');
    storageSet(STORAGE_KEYS.learnerModel, modelWith(weakTense));
    setFlags({ learnerModelCoach: 'live' });
    expect(gatherCoachInput({ learnAnswersLeft: 3 }).weakestSkillIds).toEqual(['tense_past']);
  });
});
