// ── Learner model: first-run bootstrap (learner-model §3, §4.5) ────────────────
//
// Run once per LEARNER_MODEL_VERSION when a device has no model yet. Builds the
// LEGACY bucket from what already exists, all strictly before `cutoff`:
//   1. the local evidence log (≤ 150 events), converted to observations by the
//      caller (services/coach/skillObservations.ts) — the same conversion live
//      answers use;
//   2. counted Exam Sim attempts (examObservations);
//   3. a topic-mastery prior for language skills still without evidence.
// Live observations from then on go to this device's own bucket.
//
// Pure: every input is passed in.

import type { TopicMasteryEntry } from '../../types';
import { examObservations, applyToStats, MAX_SEEN_IDS, type CountedExamInput } from './update';
import { isLanguageSkill } from './skills';
import { LEARNER_MODEL_VERSION, type LearnerModelState, type SkillObservation, type SkillStats } from './types';

/** The topic-mastery prior never exceeds one pseudo-answer of weight (learner-model §3). */
export const TOPIC_PRIOR_MAX_WEIGHT = 1.0;

export interface BootstrapInput {
  deviceId: string;
  cutoff: number;
  /** Converted evidence-log observations (any time; those at or after `cutoff` are left for live ingest). */
  evidenceObservations: readonly SkillObservation[];
  /** Session history (any modes); only counted exams with marks give observations. */
  examSessions: readonly CountedExamInput[];
  topicMastery: Readonly<Record<string, TopicMasteryEntry>>;
  /** Per topic, how many questions practise each skill (TOPIC_SKILL_COVERAGE_V2). */
  topicSkillCoverage: Readonly<Record<string, Readonly<Record<string, number>>>>;
  questionCountByTopic: Readonly<Record<string, number>>;
}

/**
 * Pure: prior observations from topic mastery, for language skills with no
 * evidence. averageScore/10 is treated as a success rate (UNVALIDATED), weighted
 * by each topic's share of questions practising the skill, capped at one
 * pseudo-count, dated at the topic's lastSessionAt so it decays like evidence.
 * n is not raised (it is not an answer), so the coach's "at least two answers"
 * gate never fires on a prior alone.
 */
export function topicMasteryPrior(
  topicMastery: Readonly<Record<string, TopicMasteryEntry>>,
  coverage: Readonly<Record<string, Readonly<Record<string, number>>>>,
  questionCountByTopic: Readonly<Record<string, number>>,
  withEvidence: ReadonlySet<string>,
  cutoff: number,
): SkillStats {
  const acc: Record<string, { weight: number; success: number; at: number }> = {};
  for (const [topicKey, entry] of Object.entries(topicMastery)) {
    const avg = entry?.averageScore;
    if (typeof avg !== 'number' || !Number.isFinite(avg)) continue;
    const at = Date.parse(entry.lastSessionAt);
    if (!Number.isFinite(at) || at >= cutoff) continue;
    const total = questionCountByTopic[topicKey] ?? 0;
    if (total <= 0) continue;
    const rate = Math.min(1, Math.max(0, avg / 10));
    for (const [skillId, count] of Object.entries(coverage[topicKey] ?? {})) {
      if (!isLanguageSkill(skillId) || withEvidence.has(skillId) || !(count > 0)) continue;
      const share = Math.min(1, count / total);
      const row = (acc[skillId] ??= { weight: 0, success: 0, at: 0 });
      row.weight += share;
      row.success += share * rate;
      row.at = Math.max(row.at, at);
    }
  }
  const out: SkillStats = {};
  for (const [skillId, row] of Object.entries(acc)) {
    if (!(row.weight > 0)) continue;
    const w = Math.min(TOPIC_PRIOR_MAX_WEIGHT, row.weight);
    const p = row.success / row.weight;
    out[skillId] = { s: w * p, f: w * (1 - p), w, a: 0, n: 0, t: row.at, last: row.at, r: '' };
  }
  return out;
}

/** Pure: the first model for this device. */
export function bootstrapModel(input: BootstrapInput): LearnerModelState {
  const before = (o: SkillObservation) => o.at < input.cutoff;
  const evidence = input.evidenceObservations.filter(before);
  const exams = input.examSessions.flatMap(examObservations).filter(before);
  // Dedupe by id (a log can hold the same event twice after a cloud merge).
  const unique = new Map<string, SkillObservation>();
  for (const o of [...evidence, ...exams]) if (!unique.has(o.id)) unique.set(o.id, o);
  const observations = [...unique.values()];

  const fromEvidence = applyToStats({}, observations);
  // Any observation at all (even avoidance only) means the skill is not "without evidence".
  const withEvidence = new Set(Object.keys(fromEvidence));
  const prior = topicMasteryPrior(
    input.topicMastery, input.topicSkillCoverage, input.questionCountByTopic, withEvidence, input.cutoff,
  );

  return {
    version: LEARNER_MODEL_VERSION,
    deviceId: input.deviceId,
    devices: {},
    legacy: { cutoff: input.cutoff, createdBy: input.deviceId, skills: { ...prior, ...fromEvidence } },
    // Everything replayed is marked seen, so a later re-dispatch of the same event is a no-op.
    seen: observations.map((o) => o.id).slice(-MAX_SEEN_IDS),
  };
}
