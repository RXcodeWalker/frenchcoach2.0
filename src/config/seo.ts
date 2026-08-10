export interface PageSeo {
  title: string;
  description: string;
  /** Path-only, no origin — SEO.tsx / the prerender step prefix SITE_URL. */
  canonicalPath: string;
  robots: 'index, follow' | 'noindex, nofollow';
  /** JSON-LD objects to emit as separate <script type="application/ld+json"> tags. */
  jsonLd?: Record<string, unknown>[];
}

// Keyed by path — every key must exist in src/config/routes.ts (enforced by
// src/config/__tests__/seo.test.ts). Populated lazily as pages are built;
// an app route with no entry here falls back to noindex via SEO.tsx.
export const PAGE_SEO: Record<string, PageSeo> = {
  '/about': {
    title: 'About Français AI | AI-Powered IGCSE French Speaking Coach',
    description:
      'Français AI is a speaking-practice coach for IGCSE French learners: record answers, get structured feedback, and track skill mastery over time.',
    canonicalPath: '/about',
    robots: 'index, follow',
  },
};
