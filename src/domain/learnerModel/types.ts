// ── Learner model: types (learner-model §2, §4) ────────────────────────────────
// Pure data shapes. Nothing here reads storage, the network or React.

/** Bump when the stored shape or the update maths changes; a mismatch rebuilds the model (learner-model §4.5). */
export const LEARNER_MODEL_VERSION = 'learner-model-v1';

/**
 * Decayed sufficient statistics for one skill (learner-model §2). Every weight is
 * expressed at the reference time `t`; a reader rescales by exp(-λ(now − t)).
 *
 * Short keys on purpose: this object is stored per skill, per device bucket, and
 * synced (learner_state `skill_model`).
 */
export interface SkillStat {
  /** Decayed success weight. */
  s: number;
  /** Decayed failure weight. */
  f: number;
  /** Decayed evidence weight — success + failure + observations with no success signal (they still raise confidence, as before). */
  w: number;
  /** Decayed avoidance weight (behavior events: the learner steered round the structure). */
  a: number;
  /** Raw count of observations ingested (not decayed) — "about N answers". */
  n: number;
  /** Reference time of the decayed weights, ms since epoch. */
  t: number;
  /** Most recent observation time, ms since epoch. */
  last: number;
  /** Last ≤ 20 outcomes, oldest first, '1' success / '0' failure — trend only. */
  r: string;
  /** Exam-area nodes only: the latest counted attempt's mark and max for this area (display, never re-marked). */
  lm?: number;
  lx?: number;
}

export type SkillStats = Record<string, SkillStat>;

/** One device's own contributions (learner-model §4.3). Only that device ever writes it. */
export interface DeviceBucket {
  updatedAt: number;
  skills: SkillStats;
}

/**
 * What the model knew before it started recording live (learner-model §4.5):
 * the replayed evidence log, the topic-mastery prior and counted exams, all
 * strictly before `cutoff`. Merging keeps the earliest cutoff, so two devices
 * never both count the same pre-model history.
 */
export interface LegacyBucket {
  cutoff: number;
  createdBy: string;
  skills: SkillStats;
}

/** The synced value (learner_state key `skill_model`). No text, transcripts or event bodies. */
export interface SyncedSkillModel {
  version: typeof LEARNER_MODEL_VERSION;
  devices: Record<string, DeviceBucket>;
  legacy: LegacyBucket | null;
}

/** The AppState slice: the synced value plus this device's id and its idempotency set. */
export interface LearnerModelState extends SyncedSkillModel {
  /** This browser's id (device-scoped key); the only bucket this device writes. */
  deviceId: string;
  /** Observation ids already ingested (bounded, local only — never synced). */
  seen: string[];
}

/**
 * One observation for the model (learner-model §3). Produced once per evidence
 * event (Learn) or per counted exam; never from a derived view.
 */
export interface SkillObservation {
  /** Idempotency key: the source event id + occurredAt, or `exam:<sessionId>`. */
  id: string;
  skillIds: string[];
  /** ms since epoch. */
  at: number;
  kind: 'outcome' | 'avoidance';
  /**
   * 0–1 success fraction. Learn events are 0 or 1; an exam area is mark/max.
   * Undefined = no success signal (evidence weight only — the old
   * `hasSuccessSignal` rule).
   */
  success?: number;
  /** Base weight, gated at ingest (learner-model §2 gate fix). Never recency-decayed here. */
  weight: number;
  /** Exam areas only: the attempt's mark and max for display. */
  mark?: number;
  max?: number;
}

/** Read-out of one skill at `now` (all devices + legacy summed, then rescaled). */
export interface SkillReading {
  skillId: string;
  mastery: number;
  confidence: number;
  /** Decayed evidence weight at now. */
  weight: number;
  successWeight: number;
  failureWeight: number;
  avoidanceWeight: number;
  evidenceCount: number;
  lastObservedAt: number | null;
  recent: string;
  lastMark?: number;
  lastMax?: number;
}
