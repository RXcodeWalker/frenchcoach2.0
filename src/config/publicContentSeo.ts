import { PAGE_SEO, type PageSeo } from './seo';
import { TOPIC_PAGES } from '../data/seo/topics';
import { ROLE_PLAY_EXAMPLES } from '../data/seo/rolePlays';
import {
  IGCSE_PATH,
  ROLEPLAY_HUB_PATH,
  TOPICS_HUB_PATH,
  rolePlayPath,
  topicPath,
} from '../data/seo/paths';
import type { RolePlayExample, TopicPage } from '../data/seo/types';
import {
  buildBreadcrumbListSchema,
  buildFAQPageSchema,
  buildItemListSchema,
  buildLearningResourceSchema,
} from '../utils/structuredData';

// Head data for the public SEO pages (docs/systems/public-seo-pages.md). Kept
// apart from seo.ts so the marketing pages that only need PAGE_SEO do not
// download the topic content; the new screens pass their entry to <Seo> as a
// prop, and the prerender step and sitemap resolve a path through
// `getPageSeo`. Every entry is built once, so its identity is stable across
// renders (Seo re-runs its effect when the entry changes).

const GUIDE_CRUMB = { name: 'IGCSE French Speaking Exam', path: IGCSE_PATH };
const TOPICS_CRUMB = { name: 'Topics and model answers', path: TOPICS_HUB_PATH };
const ROLEPLAY_CRUMB = { name: 'Role-play examples', path: ROLEPLAY_HUB_PATH };
const HOME_CRUMB = { name: 'Home', path: '/' };

export const TOPICS_HUB_SEO: PageSeo = {
  title: 'IGCSE French Speaking Topics and Model Answers',
  description: `Sixteen IGCSE French speaking topics with model answers for the present, opinions, the past and the future, plus key vocabulary and practice questions.`,
  canonicalPath: TOPICS_HUB_PATH,
  robots: 'index, follow',
  jsonLd: [
    buildBreadcrumbListSchema([HOME_CRUMB, GUIDE_CRUMB, { name: TOPICS_CRUMB.name, path: TOPICS_HUB_PATH }]),
    buildItemListSchema(TOPIC_PAGES.map((t) => ({ name: t.title, path: topicPath(t.slug) }))),
  ],
};

export const ROLEPLAY_HUB_SEO: PageSeo = {
  title: 'IGCSE French Role-Play Examples with Model Answers',
  description:
    'Six IGCSE-style French role plays (hotel, restaurant, train station and more) with the examiner’s lines, what to say in each task and a short model reply.',
  canonicalPath: ROLEPLAY_HUB_PATH,
  robots: 'index, follow',
  jsonLd: [
    buildBreadcrumbListSchema([HOME_CRUMB, GUIDE_CRUMB, { name: ROLEPLAY_CRUMB.name, path: ROLEPLAY_HUB_PATH }]),
    buildItemListSchema(ROLE_PLAY_EXAMPLES.map((r) => ({ name: r.title, path: rolePlayPath(r.slug) }))),
  ],
};

export function buildTopicSeo(topic: TopicPage): PageSeo {
  const path = topicPath(topic.slug);
  const description = `IGCSE French speaking: ${topic.title.toLowerCase()}. Four model answers (present, opinion, past, future) with what earns the marks, key vocabulary and practice questions.`;
  return {
    title: `${topic.title}: IGCSE French Speaking Model Answers`,
    description,
    canonicalPath: path,
    robots: 'index, follow',
    jsonLd: [
      buildBreadcrumbListSchema([HOME_CRUMB, GUIDE_CRUMB, TOPICS_CRUMB, { name: topic.title, path }]),
      buildLearningResourceSchema({
        name: `${topic.title}: IGCSE French speaking model answers`,
        description,
        path,
        teaches: `French speaking about ${topic.title.toLowerCase()}`,
        learningResourceType: 'Model answers',
      }),
      // Built from the same questions and answers the page renders.
      buildFAQPageSchema(topic.answers.map((a) => ({ question: a.question, answer: a.answer }))),
    ],
  };
}

export function buildRolePlaySeo(example: RolePlayExample): PageSeo {
  const path = rolePlayPath(example.slug);
  const description = `IGCSE French role play: ${example.title.toLowerCase()}. The examiner’s five lines, what you must get across in each task, and a short model reply with why it works.`;
  return {
    title: `${example.title}: French Role Play Example (IGCSE)`,
    description,
    canonicalPath: path,
    robots: 'index, follow',
    jsonLd: [
      buildBreadcrumbListSchema([HOME_CRUMB, GUIDE_CRUMB, ROLEPLAY_CRUMB, { name: example.title, path }]),
      buildLearningResourceSchema({
        name: `${example.title}: IGCSE French role play example`,
        description,
        path,
        teaches: 'French role-play tasks',
        learningResourceType: 'Worked example',
      }),
    ],
  };
}

let cache: Map<string, PageSeo> | null = null;

function publicContentSeo(): Map<string, PageSeo> {
  if (cache) return cache;
  cache = new Map<string, PageSeo>();
  cache.set(TOPICS_HUB_PATH, TOPICS_HUB_SEO);
  cache.set(ROLEPLAY_HUB_PATH, ROLEPLAY_HUB_SEO);
  for (const t of TOPIC_PAGES) cache.set(topicPath(t.slug), buildTopicSeo(t));
  for (const r of ROLE_PLAY_EXAMPLES) cache.set(rolePlayPath(r.slug), buildRolePlaySeo(r));
  return cache;
}

/** The (stable) SEO entry for a public content page; undefined for any other path. */
export function getPublicContentSeo(path: string): PageSeo | undefined {
  return publicContentSeo().get(path);
}

/** The SEO entry for any path: a hand-written page, else a public content page. */
export function getPageSeo(path: string): PageSeo | undefined {
  return PAGE_SEO[path] ?? getPublicContentSeo(path);
}
