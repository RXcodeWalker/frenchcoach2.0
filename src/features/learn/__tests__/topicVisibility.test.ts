import { describe, expect, it } from 'vitest';
import { MIN_TOPIC_QUESTIONS } from '../topicVisibility';
import { SESSION_TARGET } from '../../../utils/sessionBuilder';

describe('topic visibility', () => {
  it('hides a topic that cannot fill the shortest session', () => {
    expect(MIN_TOPIC_QUESTIONS).toBe(SESSION_TARGET.quick);
  });
});
