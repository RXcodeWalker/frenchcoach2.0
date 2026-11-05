import { SKILL_TO_STRUCTURES, practisesAnySkill } from '../../domain/learn/selection/skillStructures';

/**
 * Per topic, how many questions practise each mapped coach skill (pure). Home's
 * coach reads the generated copy in `data/questionIds.ts`, so it opens without
 * the question bank; `questionIds.test.ts` holds that copy equal to this.
 */
export function computeTopicSkillCoverage(
  questions: ReadonlyArray<{ topicKey: string; demands?: { structures?: readonly string[] } }>,
): Record<string, Record<string, number>> {
  const out: Record<string, Record<string, number>> = {};
  const skillIds = Object.keys(SKILL_TO_STRUCTURES);
  for (const q of questions) {
    const structures = (q.demands?.structures ?? []) as string[];
    if (structures.length === 0) continue;
    for (const id of skillIds) {
      if (!practisesAnySkill(structures as never, [id])) continue;
      const row = (out[q.topicKey] ??= {});
      row[id] = (row[id] ?? 0) + 1;
    }
  }
  return out;
}
