import { TOPIC_PAGES } from './topics';
import { ROLE_PLAY_EXAMPLES } from './rolePlays';

/** URL layout of the public SEO pages, in one place (routes, sitemap, links and tests all read it). */
export const IGCSE_PATH = '/igcse-french-speaking';
export const TOPICS_HUB_PATH = `${IGCSE_PATH}/topics`;
export const ROLEPLAY_HUB_PATH = `${IGCSE_PATH}/role-play`;
/** Two single guide pages beside the hubs: how the exam is marked, and the slips that cost marks. */
export const MARKING_PATH = `${IGCSE_PATH}/marking`;
export const MISTAKES_PATH = `${IGCSE_PATH}/common-mistakes`;

export const topicPath = (slug: string): string => `${TOPICS_HUB_PATH}/${slug}`;
export const rolePlayPath = (slug: string): string => `${ROLEPLAY_HUB_PATH}/${slug}`;

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
