import type { TopicPage } from '../types';
import { EVERYDAY_TOPICS } from './everyday';
import { LIVING_TOPICS } from './living';
import { WORLD_TOPICS } from './world';
import { PEOPLE_TOPICS } from './people';

/** Every public topic page, in the order the hub lists them. */
export const TOPIC_PAGES: readonly TopicPage[] = [
  ...EVERYDAY_TOPICS,
  ...PEOPLE_TOPICS,
  ...LIVING_TOPICS,
  ...WORLD_TOPICS,
];

export function getTopicPage(slug: string): TopicPage | undefined {
  return TOPIC_PAGES.find((t) => t.slug === slug);
}
