// ── Learner model → the snapshot shape existing readers take (learner-model §5) ──
//
// Learn selection, deriveAbility, the daily plan and the Focus Token all take an
// EvidenceBeliefSnapshot. While `learnerModelLearn` is live they are handed this
// one instead: skills, weakest/strongest ids and demands all come from the model,
// so one reader never mixes the two models' numbers.

import type { EvidenceBeliefSnapshot } from '../../types/beliefs';
import type { SyncedSkillModel } from '../../domain/learnerModel/types';
import { coachSkillsView, demandBeliefsView, weakestSkills } from '../../domain/learnerModel/read';
import { SKILL_DEFS } from '../coaching/diagnosticEngine';
import { resolveFeatureStatus } from '../../config/featureFlags';
import { currentLearnerModel } from './learnerModelStore';

export const LEARNER_MODEL_SNAPSHOT_VERSION = 'learner-model-view';

function skillMeta(id: string): { label: string; category: string } {
  return { label: SKILL_DEFS[id]?.name ?? id, category: SKILL_DEFS[id]?.category ?? 'grammar' };
}

/** learner-model §7 phase 5: Learn selection, the daily plan's focus and the Focus Token read the model. */
export function learnReadsLearnerModel(): boolean {
  return resolveFeatureStatus('learnerModelLearn') === 'live';
}

/**
 * Pure given its inputs: the model as an EvidenceBeliefSnapshot. weakestSkillIds
 * are the SELECTABLE weakest (a Learn session can be steered toward them);
 * pronunciation and fluency never become a focus skill.
 */
export function learnerModelSnapshot(model: SyncedSkillModel, now: number): EvidenceBeliefSnapshot {
  const view = coachSkillsView(model, now, skillMeta);
  const totalEvidenceProcessed = Object.values(view.skills).reduce((sum, b) => sum + b.evidenceCount, 0);
  return {
    learnerId: 'local-user',
    generatedAt: new Date(now).toISOString(),
    reducerVersion: LEARNER_MODEL_SNAPSHOT_VERSION,
    skills: view.skills,
    weakestSkillIds: weakestSkills(model, now, { selectableOnly: true }),
    strongestSkillIds: view.strongestSkillIds,
    totalEvidenceProcessed,
    demands: demandBeliefsView(model, now),
  };
}

/** The model's snapshot when Learn reads it, else null (the caller keeps its old snapshot). */
export function learnModelSnapshotIfLive(model?: SyncedSkillModel, now: number = Date.now()): EvidenceBeliefSnapshot | null {
  if (!learnReadsLearnerModel()) return null;
  return learnerModelSnapshot(model ?? currentLearnerModel(), now);
}
