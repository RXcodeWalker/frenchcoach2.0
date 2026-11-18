import type { PageSeo } from './seo';
import { IGCSE_PATH, MARKING_PATH, MISTAKES_PATH } from '../data/seo/pathConstants';
import { buildBreadcrumbListSchema, buildLearningResourceSchema } from '../utils/structuredData';

// Head data for the two single guide pages under /igcse-french-speaking
// (docs/systems/public-seo-pages.md §1). Kept apart from publicContentSeo.ts,
// which imports every topic and role play: these pages need none of that
// content, and importing it would add ~29 KB (gzipped) to each of them.
// publicContentSeo.ts re-exports both so `getPageSeo` still resolves them.

const GUIDE_CRUMB = { name: 'IGCSE French Speaking Exam', path: IGCSE_PATH };
const HOME_CRUMB = { name: 'Home', path: '/' };

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
