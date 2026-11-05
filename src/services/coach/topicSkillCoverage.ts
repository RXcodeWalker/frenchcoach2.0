import { SKILL_TO_STRUCTURES } from '../../domain/learn/selection/skillStructures';
import { REGISTRY_SKILL_TO_STRUCTURES } from '../../domain/learnerModel/skills';
import type { LearnStructure } from '../../domain/learn/demand/types';

type SkillMap = Readonly<Record<string, readonly LearnStructure[]>>;

/**
 * Per topic, how many questions practise each mapped coach skill (pure). Home's
 * coach reads the generated copy in `data/questionIds.ts`, so it opens without
 * the question bank; `questionIds.test.ts` holds that copy equal to this.
 *
 * `skillMap` defaults to the hand-written SKILL_TO_STRUCTURES (TOPIC_SKILL_COVERAGE,
 * the coach's table while `learnerModelCoach` is off). The learner model's
 * registry view gives TOPIC_SKILL_COVERAGE_V2 (learner-model §1).
 */
export function computeTopicSkillCoverage(
  questions: ReadonlyArray<{ topicKey: string; demands?: { structures?: readonly string[] } }>,
  skillMap: SkillMap = SKILL_TO_STRUCTURES,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  const skillIds = Object.keys(skillMap);
  for (const q of questions) {
    const structures = (q.demands?.structures ?? []) as string[];
    if (structures.length === 0) continue;
    for (const id of skillIds) {
      if (!(skillMap[id] ?? []).some((s) => structures.includes(s))) continue;
      const row = (out[q.topicKey] ??= {});
      row[id] = (row[id] ?? 0) + 1;
    }
  }
  return out;
}

/** The registry-generated coverage (learner-model §1) — TOPIC_SKILL_COVERAGE_V2. */
export function computeRegistryTopicSkillCoverage(
  questions: ReadonlyArray<{ topicKey: string; demands?: { structures?: readonly string[] } }>,
): Record<string, Record<string, number>> {
  return computeTopicSkillCoverage(questions, REGISTRY_SKILL_TO_STRUCTURES);
}
