import { describe, it, expect } from 'vitest';
import { QUESTIONS, TOPICS, getTopicCounts } from '../questions';
import { QUESTION_COUNT_BY_TOPIC, QUESTION_IDS, TOPIC_SKILL_COVERAGE, TOPIC_SKILL_COVERAGE_V2 } from '../questionIds';
import { computeRegistryTopicSkillCoverage, computeTopicSkillCoverage } from '../../services/coach/topicSkillCoverage';

describe('questionIds.ts (the bank-free id list Home and Progress read)', () => {
  it('lists exactly the question bank — run `npm run learn:question-ids` after adding or removing a question', () => {
    expect([...QUESTION_IDS].sort()).toEqual([...new Set(QUESTIONS.map((q) => q.id))].sort());
    expect(QUESTION_COUNT_BY_TOPIC).toEqual(getTopicCounts());
    expect(TOPIC_SKILL_COVERAGE).toEqual(computeTopicSkillCoverage(QUESTIONS));
    expect(TOPIC_SKILL_COVERAGE_V2).toEqual(computeRegistryTopicSkillCoverage(QUESTIONS));
  });

  it('the registry coverage (learner-model §1) agrees with the legacy table wherever that table speaks', () => {
    for (const [topic, row] of Object.entries(TOPIC_SKILL_COVERAGE)) {
      for (const [skill, n] of Object.entries(row)) expect(TOPIC_SKILL_COVERAGE_V2[topic]?.[skill], `${topic}/${skill}`).toBe(n);
    }
    // …and reaches skills the legacy table never could (connectors via justification).
    expect(Object.values(TOPIC_SKILL_COVERAGE_V2).some((row) => (row.connectors ?? 0) > 0)).toBe(true);
  });

  it("gives every topic its real question count before the bank downloads", () => {
    const counts = getTopicCounts();
    for (const topic of TOPICS) expect(topic.questionsCount, topic.key).toBe(counts[topic.key] ?? 0);
    expect(TOPICS.find((t) => t.key === 'school')!.questionsCount).toBeGreaterThan(10);
  });
});
