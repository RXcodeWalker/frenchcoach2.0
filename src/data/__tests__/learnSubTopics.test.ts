import { describe, expect, it } from 'vitest';
import { TOPICS } from '../questions';
import { LEARN_SUB_TOPICS, isKnownSubTopic, subTopicsFor } from '../learnSubTopics';

describe('LEARN_SUB_TOPICS', () => {
  const coreKeys = TOPICS.filter((t) => !t.isAdvanced).map((t) => t.key);

  it('has a list for exactly the core topics', () => {
    expect(Object.keys(LEARN_SUB_TOPICS).sort()).toEqual([...coreKeys].sort());
  });

  it('gives every topic 3–5 sub-topics with unique kebab-case keys and non-empty labels', () => {
    for (const [topic, list] of Object.entries(LEARN_SUB_TOPICS)) {
      expect(list.length, topic).toBeGreaterThanOrEqual(3);
      expect(list.length, topic).toBeLessThanOrEqual(5);
      expect(new Set(list.map((s) => s.key)).size, topic).toBe(list.length);
      for (const s of list) {
        expect(s.key, topic).toMatch(/^[a-z]+(-[a-z]+)*$/);
        expect(s.label.trim(), topic).not.toBe('');
      }
    }
  });

  it('resolves known and unknown keys, per topic', () => {
    expect(isKnownSubTopic('school', 'subjects')).toBe(true);
    expect(isKnownSubTopic('school', 'cooking')).toBe(false);
    expect(isKnownSubTopic('slang', 'subjects')).toBe(false);
    expect(subTopicsFor('slang')).toEqual([]);
  });
});
