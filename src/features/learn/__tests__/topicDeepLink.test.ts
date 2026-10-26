// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { topicFromDeepLink } from '../topicDeepLink';
import type { Topic } from '../../../types';

function topic(key: string, over: Partial<Topic> = {}): Topic {
  return { key, label: key, labelEn: key, icon: '', color: '', description: '', questionsCount: 20, ...over };
}

const TOPICS = [topic('school'), topic('tiny', { questionsCount: 1 }), topic('pro', { isAdvanced: true })];

beforeEach(() => localStorage.clear());

describe('topicFromDeepLink', () => {
  it('opens a visible base topic', () => {
    expect(topicFromDeepLink('school', TOPICS)?.key).toBe('school');
  });

  it('refuses a missing key, an unknown topic, a hidden topic and a locked advanced topic', () => {
    expect(topicFromDeepLink(null, TOPICS)).toBeNull();
    expect(topicFromDeepLink('nope', TOPICS)).toBeNull();
    expect(topicFromDeepLink('tiny', TOPICS)).toBeNull();
    expect(topicFromDeepLink('pro', TOPICS)).toBeNull();
  });
});
