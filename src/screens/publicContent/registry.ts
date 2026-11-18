import { createElement, type ReactElement } from 'react';
import { TOPIC_PAGES } from '../../data/seo/topics';
import { ROLE_PLAY_EXAMPLES } from '../../data/seo/rolePlays';
import { ROLEPLAY_HUB_PATH, TOPICS_HUB_PATH, rolePlayPath, topicPath } from '../../data/seo/paths';
import { TopicsHub } from './TopicsHub';
import { RolePlayHub } from './RolePlayHub';
import { TopicPageView } from './TopicPageView';
import { RolePlayExampleView } from './RolePlayExampleView';

/**
 * The page element for a public-content path, or undefined for any other path.
 * Used by the build-time prerender (scripts/seo/prerender.ts), which renders the
 * page with no router — the same views the lazy routes render in the app.
 */
export function publicContentElement(path: string): ReactElement | undefined {
  if (path === TOPICS_HUB_PATH) return createElement(TopicsHub);
  if (path === ROLEPLAY_HUB_PATH) return createElement(RolePlayHub);
  const topic = TOPIC_PAGES.find((t) => topicPath(t.slug) === path);
  if (topic) return createElement(TopicPageView, { slug: topic.slug });
  const example = ROLE_PLAY_EXAMPLES.find((r) => rolePlayPath(r.slug) === path);
  if (example) return createElement(RolePlayExampleView, { slug: example.slug });
  return undefined;
}
