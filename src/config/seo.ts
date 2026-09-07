import {
  buildOrganizationSchema,
  buildWebSiteSchema,
  buildSoftwareApplicationSchema,
  buildBreadcrumbListSchema,
} from '../utils/structuredData';

export interface PageSeo {
  title: string;
  description: string;
  /** Path-only, no origin — SEO.tsx / the prerender step prefix SITE_URL. */
  canonicalPath: string;
  robots: 'index, follow' | 'noindex, nofollow';
  /** JSON-LD objects to emit as separate <script type="application/ld+json"> tags. */
  jsonLd?: { '@context': 'https://schema.org'; '@type': string }[];
}

const SITE_NAME = 'Français AI';

// Keyed by path — every key must exist in src/config/routes.ts (enforced by
// src/config/__tests__/seo.test.ts). Populated lazily as pages are built;
// an app route with no entry here falls back to noindex via SEO.tsx.
export const PAGE_SEO: Record<string, PageSeo> = {
  '/': {
    title: 'Français AI | IGCSE French Speaking Practice',
    description:
      'Français AI is a speaking-practice coach for IGCSE French learners: record spoken answers, get structured feedback, and track skill mastery over time.',
    canonicalPath: '/',
    robots: 'index, follow',
    // No SearchAction (no site search) and no `offers` (no pricing is
    // established anywhere in the repo) — see docs/architecture SEO plan Rev 2.
    jsonLd: [
      buildOrganizationSchema({ name: SITE_NAME }),
      buildWebSiteSchema({ name: SITE_NAME }),
      buildSoftwareApplicationSchema({ name: SITE_NAME }),
    ],
  },
  '/about': {
    title: 'About Français AI | AI-Powered IGCSE French Speaking Coach',
    description:
      'Français AI is a speaking-practice coach for IGCSE French learners: record answers, get structured feedback, and track skill mastery over time.',
    canonicalPath: '/about',
    robots: 'index, follow',
    // Mirrors the visible breadcrumb rendered by MarketingLayout on this route.
    jsonLd: [
      buildBreadcrumbListSchema([
        { name: 'Home', path: '/' },
        { name: 'About', path: '/about' },
      ]),
    ],
  },
  '/igcse-french-speaking': {
    title: 'IGCSE French Speaking Exam (Paper 3) — What It Covers & How to Practise',
    description:
      'A guide to Cambridge IGCSE French 0520 Paper 3 Speaking: role play, topic conversations, and marks — plus how to practise it with Français AI.',
    canonicalPath: '/igcse-french-speaking',
    robots: 'index, follow',
    // No FAQPage: the page has no visible Q&A section (two prose sections
    // only) — schema must describe visible content, not be added mechanically.
    jsonLd: [
      buildBreadcrumbListSchema([
        { name: 'Home', path: '/' },
        { name: 'IGCSE French Speaking Exam', path: '/igcse-french-speaking' },
      ]),
    ],
  },
  '/french-roleplay-practice': {
    title: 'French Roleplay Practice — 30 Everyday Speaking Scenarios',
    description:
      'Practise spoken French across 30 everyday roleplay scenarios — cafés, hotels, doctors, and more — with feedback on your grammar and vocabulary.',
    canonicalPath: '/french-roleplay-practice',
    robots: 'index, follow',
    jsonLd: [
      buildBreadcrumbListSchema([
        { name: 'Home', path: '/' },
        { name: 'French Roleplay Practice', path: '/french-roleplay-practice' },
      ]),
    ],
  },
  '/story': {
    title: 'The Story Behind Français AI | Why I Built a Speaking Coach',
    description:
      'Ten years of French class taught grammar, never speaking. The founder story behind Français AI — the gap between reading French and being able to speak it.',
    canonicalPath: '/story',
    robots: 'index, follow',
    jsonLd: [
      buildBreadcrumbListSchema([
        { name: 'Home', path: '/' },
        { name: 'Story', path: '/story' },
      ]),
    ],
  },
};
