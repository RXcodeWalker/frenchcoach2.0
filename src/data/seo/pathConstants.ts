/**
 * URL layout of the public SEO pages, in one place — and nothing else. Kept
 * apart from `paths.ts` (which enumerates the content-backed pages and so
 * imports every topic and role play) so a page that only needs a link, such as
 * the marking guide or About, does not download the content (~29 KB gzipped).
 */
export const IGCSE_PATH = '/igcse-french-speaking';
export const TOPICS_HUB_PATH = `${IGCSE_PATH}/topics`;
export const ROLEPLAY_HUB_PATH = `${IGCSE_PATH}/role-play`;
/** Two single guide pages beside the hubs: how the exam is marked, and the slips that cost marks. */
export const MARKING_PATH = `${IGCSE_PATH}/marking`;
export const MISTAKES_PATH = `${IGCSE_PATH}/common-mistakes`;

export const topicPath = (slug: string): string => `${TOPICS_HUB_PATH}/${slug}`;
export const rolePlayPath = (slug: string): string => `${ROLEPLAY_HUB_PATH}/${slug}`;
