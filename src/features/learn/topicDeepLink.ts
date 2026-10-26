import { TOPICS } from '../../data/gameData';
import { LEARN_TOPIC_DEPENDENCIES } from '../../data/learnTopicDependencies';
import { isLearnTopicUnlocked } from './topicProgress';
import { isTopicVisible } from './sessionSetup';
import type { Topic } from '../../types';

export const LEARN_TOPIC_PARAM = 'topic';

/**
 * The topic a `/learn?topic=<key>` link may open: only one the topic grid
 * itself would let the learner tap (visible, and unlocked if advanced).
 * Anything else returns null and Learn shows the grid.
 */
export function topicFromDeepLink(key: string | null, topics: Topic[] = TOPICS): Topic | null {
  if (!key) return null;
  const topic = topics.find(t => t.key === key);
  if (!topic || !isTopicVisible(topic)) return null;
  const unlocked = !topic.isAdvanced || isLearnTopicUnlocked(LEARN_TOPIC_DEPENDENCIES[topic.key] ?? []);
  return unlocked ? topic : null;
}
