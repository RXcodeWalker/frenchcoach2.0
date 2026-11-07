// ── Learner model: storage and bootstrap glue (learner-model §4) ───────────────
//
// The slice lives in AppState (AppContext's reducer is the only writer). This
// module only reads storage, builds the first model and writes it on the
// reducer's behalf. Readers that run outside React (coach brief, daily plan)
// read the stored copy through `currentLearnerModel()` — the reducer keeps it
// equal to state.

import { STORAGE_KEYS, storageGet, storageSet } from '../persistence/storage';
import { getEvidenceEvents } from '../coach/coachStorage';
import { observationsFromEvents, type ReviewItemLookup } from '../coach/skillObservations';
import { readState as readReviewPool } from '../coach/reviewPool';
import { getSessionHistory } from '../analytics/analyticsService';
import { QUESTION_COUNT_BY_TOPIC, TOPIC_SKILL_COVERAGE_V2 } from '../../data/questionIds';
import { bootstrapModel } from '../../domain/learnerModel/bootstrap';
import { parseSyncedModel } from '../../domain/learnerModel/merge';
import { LEARNER_MODEL_VERSION, type LearnerModelState } from '../../domain/learnerModel/types';
import { MAX_SEEN_IDS } from '../../domain/learnerModel/update';
import type { TopicMasteryEntry } from '../../types';

function randomId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    // fall through
  }
  return `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** This browser's bucket id (device-scoped key, created once). */
export function getLearnerModelDeviceId(): string {
  const existing = storageGet<string | null>(STORAGE_KEYS.learnerModelDevice, null);
  if (typeof existing === 'string' && existing.length > 0 && existing.length <= 64) return existing;
  const id = randomId();
  storageSet(STORAGE_KEYS.learnerModelDevice, id);
  return id;
}

/** Defensive parse of a stored slice (wrong version or shape = null, so the caller rebuilds). */
export function parseStoredLearnerModel(raw: unknown, deviceId: string): LearnerModelState | null {
  const synced = parseSyncedModel(raw);
  if (!synced) return null;
  const v = raw as Record<string, unknown>;
  const seen = Array.isArray(v.seen) ? v.seen.filter((x): x is string => typeof x === 'string').slice(-MAX_SEEN_IDS) : [];
  return { ...synced, deviceId, seen };
}

/** The stored slice for this account, or null when there is none yet (or it is from another version). */
export function readStoredLearnerModel(): LearnerModelState | null {
  return parseStoredLearnerModel(storageGet<unknown>(STORAGE_KEYS.learnerModel, null), getLearnerModelDeviceId());
}

export function writeLearnerModel(model: LearnerModelState): void {
  storageSet(STORAGE_KEYS.learnerModel, model);
}

/** The review-pool lookup the converter uses for the review-gap weight. */
export function reviewItemLookup(): (questionId: string) => ReviewItemLookup | undefined {
  const items = readReviewPool().items;
  return (questionId) => items[questionId];
}

/**
 * First run (or a LEARNER_MODEL_VERSION bump): replay the local evidence log,
 * counted exams and the topic-mastery prior into the legacy bucket. Pure apart
 * from these reads; does not write.
 */
export function buildBootstrapModel(now: number = Date.now()): LearnerModelState {
  const sessions = getSessionHistory();
  return bootstrapModel({
    deviceId: getLearnerModelDeviceId(),
    cutoff: now,
    // No review-gap weighting on replay: the pool now reflects answers made
    // after these events, so it cannot say whether they filled a review slot.
    evidenceObservations: observationsFromEvents(getEvidenceEvents()),
    examSessions: sessions.map((s) => ({
      sessionId: s.id,
      date: s.date,
      mode: s.mode,
      practiceOnly: s.practiceOnly,
      marks: s.examMarks,
    })),
    topicMastery: storageGet<Record<string, TopicMasteryEntry>>(STORAGE_KEYS.topicMastery, {}),
    topicSkillCoverage: TOPIC_SKILL_COVERAGE_V2,
    questionCountByTopic: QUESTION_COUNT_BY_TOPIC,
  });
}

/** The stored slice, or a freshly bootstrapped one (not written — the caller persists it). */
export function loadOrBootstrapLearnerModel(now: number = Date.now()): { model: LearnerModelState; fresh: boolean } {
  const stored = readStoredLearnerModel();
  if (stored) return { model: stored, fresh: false };
  return { model: buildBootstrapModel(now), fresh: true };
}

/**
 * For readers outside React (coach brief, daily plan): the stored slice, or a
 * bootstrap built on the fly when nothing is stored yet. Never throws.
 */
export function currentLearnerModel(): LearnerModelState {
  try {
    return loadOrBootstrapLearnerModel().model;
  } catch {
    return { version: LEARNER_MODEL_VERSION, deviceId: 'unknown', devices: {}, legacy: null, seen: [] };
  }
}
