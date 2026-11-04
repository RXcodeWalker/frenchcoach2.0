import { describe, it, expect } from 'vitest';
import { QUESTIONS, TOPICS, getTopicCounts } from '../questions';
import { QUESTION_COUNT_BY_TOPIC, QUESTION_IDS } from '../questionIds';

describe('questionIds.ts (the bank-free id list Home and Progress read)', () => {
  it('lists exactly the question bank — run `npm run learn:question-ids` after adding or removing a question', () => {
    expect([...QUESTION_IDS].sort()).toEqual([...new Set(QUESTIONS.map((q) => q.id))].sort());
    expect(QUESTION_COUNT_BY_TOPIC).toEqual(getTopicCounts());
  });

  it("gives every topic its real question count before the bank downloads", () => {
    const counts = getTopicCounts();
    for (const topic of TOPICS) expect(topic.questionsCount, topic.key).toBe(counts[topic.key] ?? 0);
    expect(TOPICS.find((t) => t.key === 'school')!.questionsCount).toBeGreaterThan(10);
  });
});
