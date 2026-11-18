import { TOPIC_PAGES } from './topics';
import { ROLE_PLAY_EXAMPLES } from './rolePlays';
import {
  MARKING_PATH,
  MISTAKES_PATH,
  ROLEPLAY_HUB_PATH,
  TOPICS_HUB_PATH,
  rolePlayPath,
  topicPath,
} from './pathConstants';

/**
 * URL layout of the public SEO pages (routes, sitemap and tests read it). The
 * bare constants live in `pathConstants.ts`; this module adds the lists built
 * from the content, so import from here only where those are needed.
 */
export * from './pathConstants';

/** The hub pages and the two guide pages: real `<Route>`s with literal paths. */
export const PUBLIC_CONTENT_HUB_PATHS: readonly string[] = [
  TOPICS_HUB_PATH,
  ROLEPLAY_HUB_PATH,
  MARKING_PATH,
  MISTAKES_PATH,
];

/** One path per topic page and role-play example: served by a parameterised `<Route>`, prerendered individually. */
export const PUBLIC_CONTENT_PAGE_PATHS: readonly string[] = [
  ...TOPIC_PAGES.map((t) => topicPath(t.slug)),
  ...ROLE_PLAY_EXAMPLES.map((r) => rolePlayPath(r.slug)),
];
