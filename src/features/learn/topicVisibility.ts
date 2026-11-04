import type { Topic } from '../../types';

/**
 * A topic holding fewer questions than the shortest multi-question session (5)
 * can't be practised as a session, so the topic grid hides it (docs §13.4: the
 * eight advanced topics hold one question each). Equal to `SESSION_TARGET.quick`
 * (a test holds them together); kept here, apart from the session builder, so
 * Home's coach can use it without downloading the question bank.
 */
export const MIN_TOPIC_QUESTIONS = 5;

export function isTopicVisible(topic: Topic): boolean {
  return topic.questionsCount >= MIN_TOPIC_QUESTIONS;
}
