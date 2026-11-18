/**
 * Every indexable path the site has published (the sitemap's list), recorded
 * so a rename or removal cannot slip through unnoticed. Append-only: when a
 * page is renamed, keep the old path here and add a redirect for it in
 * `redirects.ts` and vercel.json. `__tests__/redirects.test.ts` enforces it,
 * and also fails when a new indexable page is not recorded here yet.
 * See docs/systems/public-seo-pages.md §7.
 */
export const PUBLISHED_PATHS: readonly string[] = [
  '/',
  '/about',
  '/igcse-french-speaking',
  '/french-roleplay-practice',
  '/igcse-french-speaking/topics',
  '/igcse-french-speaking/role-play',
  '/igcse-french-speaking/marking',
  '/igcse-french-speaking/common-mistakes',
  '/igcse-french-speaking/topics/school',
  '/igcse-french-speaking/topics/hobbies-and-free-time',
  '/igcse-french-speaking/topics/family-and-friends',
  '/igcse-french-speaking/topics/holidays-and-travel',
  '/igcse-french-speaking/topics/future-plans',
  '/igcse-french-speaking/topics/jobs-and-work',
  '/igcse-french-speaking/topics/sports-and-fitness',
  '/igcse-french-speaking/topics/emotions-and-feelings',
  '/igcse-french-speaking/topics/home-and-town',
  '/igcse-french-speaking/topics/food-and-health',
  '/igcse-french-speaking/topics/clothes-and-fashion',
  '/igcse-french-speaking/topics/shopping-and-money',
  '/igcse-french-speaking/topics/environment-and-technology',
  '/igcse-french-speaking/topics/animals-and-nature',
  '/igcse-french-speaking/topics/transport',
  '/igcse-french-speaking/topics/arts-and-entertainment',
  '/igcse-french-speaking/role-play/tourist-office',
  '/igcse-french-speaking/role-play/hotel',
  '/igcse-french-speaking/role-play/restaurant',
  '/igcse-french-speaking/role-play/train-station',
  '/igcse-french-speaking/role-play/campsite',
  '/igcse-french-speaking/role-play/lost-property',
  '/story',
];
