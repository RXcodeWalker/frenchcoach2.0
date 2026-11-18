import { PAGE_SEO, type PageSeo } from './seo';
import { TOPIC_PAGES } from '../data/seo/topics';
import { ROLE_PLAY_EXAMPLES } from '../data/seo/rolePlays';
import {
  IGCSE_PATH,
  MARKING_PATH,
  MISTAKES_PATH,
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

export const MARKING_SEO: PageSeo = {
  title: 'How the IGCSE French Speaking Exam Is Marked (Paper 3, 40 Marks)',
  description:
    'Where the 40 marks in IGCSE French speaking come from: role play, Communication and Quality of Language, with worked role-play marks and what each criterion rewards.',
  canonicalPath: MARKING_PATH,
  robots: 'index, follow',
  jsonLd: [
    buildBreadcrumbListSchema([HOME_CRUMB, GUIDE_CRUMB, { name: 'How it is marked', path: MARKING_PATH }]),
    buildLearningResourceSchema({
      name: 'How the IGCSE French speaking exam is marked',
      description:
        'Where the 40 marks in IGCSE French speaking come from, with worked role-play marks and what Communication and Quality of Language reward.',
      path: MARKING_PATH,
      teaches: 'How IGCSE French speaking is marked',
      learningResourceType: 'Guide',
    }),
  ],
};

export const MISTAKES_SEO: PageSeo = {
  title: 'Common Mistakes in IGCSE French Speaking (and How to Fix Them)',
  description:
    'Four slips that cost marks in IGCSE French speaking: agreement, être or avoir, the wrong tense and answers that stop too soon, each with a fix and a model answer.',
  canonicalPath: MISTAKES_PATH,
  robots: 'index, follow',
  jsonLd: [
    buildBreadcrumbListSchema([HOME_CRUMB, GUIDE_CRUMB, { name: 'Common mistakes', path: MISTAKES_PATH }]),
    buildLearningResourceSchema({
      name: 'Common mistakes in IGCSE French speaking',
      description:
        'Four common slips in spoken IGCSE French, with the corrected sentence, a fix and a model answer for each.',
      path: MISTAKES_PATH,
      teaches: 'Avoiding common mistakes in spoken French',
      learningResourceType: 'Guide',
    }),
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
  cache.set(MARKING_PATH, MARKING_SEO);
  cache.set(MISTAKES_PATH, MISTAKES_SEO);
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
