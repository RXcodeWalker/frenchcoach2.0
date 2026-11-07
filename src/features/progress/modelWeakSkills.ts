// learner-model §7 phase 6 — Progress's "Grammar to work on" from the learner
// model: the coach's own rule (mastery < 60%, confidence > 0.20, weakest first),
// language skills a learner can practise (never pronunciation or fluency),
// top WEAK_SKILL_LIMIT. Pure.
import { readSkill, weakestSkills } from '../../domain/learnerModel/read';
import type { SyncedSkillModel } from '../../domain/learnerModel/types';
import { SKILL_DEFS } from '../../services/coaching/diagnosticEngine';
import { WEAK_SKILL_LIMIT, type WeakSkill } from './progressSummary';

export function weakSkillsFromModel(model: SyncedSkillModel, now: number, limit = WEAK_SKILL_LIMIT): WeakSkill[] {
  return weakestSkills(model, now, { selectableOnly: true, limit }).map((id) => {
    const reading = readSkill(model, id, now);
    return { id, name: SKILL_DEFS[id]?.name ?? id, mastery: Math.round((reading?.mastery ?? 0) * 100) };
  });
}
