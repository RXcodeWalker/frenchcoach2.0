/**
 * Live progress toward a Shop item's achievement requirement (Shop plan §15
 * Phase 5: "a locked card shows real progress from the real belief
 * snapshot"). Pure — reads only the values passed in, mirroring the same
 * underlying signals achievements.ts's predicates use (streak, xp,
 * beliefSnapshot skill mastery, problems) so progress never drifts from what
 * actually unlocks the achievement.
 *
 * Requirement ids not covered by a case below (e.g. session-count or
 * exam-completion gates with no natural 0..1 progress) fall back to a
 * binary 0/1 read of whether the achievement is already unlocked — still
 * correct, just not a partial bar.
 */

import type { EvidenceBeliefSnapshot } from '../../types/beliefs';
import type { LearningProblem, Intervention } from '../../types/intervention';

export interface RequirementProgressInput {
  achievementId: string;
  unlocked: boolean;
  streak: number;
  xp: number;
  beliefSnapshot: EvidenceBeliefSnapshot | null;
  problems: LearningProblem[];
  interventions: Intervention[];
  roleplayCount: number;
}

export interface RequirementProgress {
  /** 0..1 */
  ratio: number;
  /** e.g. "2 / 3 days", "0.72 / 0.80 mastery" — always a real, current value. */
  label: string;
}

function clampRatio(current: number, target: number): number {
  if (target <= 0) return current > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, current / target));
}

function bestSkillMastery(snapshot: EvidenceBeliefSnapshot | null): number {
  const skills = snapshot ? Object.values(snapshot.skills) : [];
  if (skills.length === 0) return 0;
  return Math.max(...skills.map(s => s.mastery));
}

function avgSkillMastery(snapshot: EvidenceBeliefSnapshot | null): number {
  const skills = snapshot ? Object.values(snapshot.skills) : [];
  if (skills.length === 0) return 0;
  return skills.reduce((sum, s) => sum + s.mastery, 0) / skills.length;
}

export function computeRequirementProgress(input: RequirementProgressInput): RequirementProgress {
  const { achievementId, unlocked, streak, xp, beliefSnapshot, problems, interventions, roleplayCount } = input;

  if (unlocked) return { ratio: 1, label: 'Unlocked' };

  switch (achievementId) {
    case 'triple_jour': {
      const ratio = clampRatio(streak, 3);
      return { ratio, label: `${Math.min(streak, 3)} / 3 day streak` };
    }
    case 'semaine_parfaite': {
      const ratio = clampRatio(streak, 7);
      return { ratio, label: `${Math.min(streak, 7)} / 7 day streak` };
    }
    case 'causeur': {
      const ratio = clampRatio(roleplayCount, 5);
      return { ratio, label: `${Math.min(roleplayCount, 5)} / 5 roleplays` };
    }
    case 'grammaire_maitrisee': {
      const best = bestSkillMastery(beliefSnapshot);
      const ratio = clampRatio(best, 0.8);
      return { ratio, label: `${best.toFixed(2)} / 0.80 mastery` };
    }
    case 'niveau_b2': {
      const avg = avgSkillMastery(beliefSnapshot);
      const ratio = clampRatio(avg, 0.6);
      return { ratio, label: `${avg.toFixed(2)} / 0.60 avg mastery` };
    }
    case 'bete_de_mode': {
      const ratio = clampRatio(xp, 7000);
      return { ratio, label: `${xp.toLocaleString()} / 7,000 XP` };
    }
    case 'expert': {
      const ratio = clampRatio(xp, 1500);
      return { ratio, label: `${xp.toLocaleString()} / 1,500 XP` };
    }
    case 'probleme_resolu': {
      const resolved = problems.some(p => p.status === 'resolved');
      return resolved ? { ratio: 1, label: 'Unlocked' } : { ratio: 0, label: 'Fix a recurring grammar problem' };
    }
    case 'drill_master': {
      const ratio = clampRatio(interventions.length, 5);
      return { ratio, label: `${Math.min(interventions.length, 5)} / 5 interventions` };
    }
    default:
      // examinateur, fluent, perfectionniste, grand_oral — binary, no natural
      // partial progress metric; unlocked is already handled above.
      return { ratio: 0, label: 'Not yet unlocked' };
  }
}
