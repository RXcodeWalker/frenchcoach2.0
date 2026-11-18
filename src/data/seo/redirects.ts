/**
 * Redirect protection for the public pages (docs/systems/public-seo-pages.md §7).
 *
 * A slug is a URL, and a URL that has been indexed or linked must keep working.
 * Renaming or removing a published page without a redirect turns every link to
 * it into a 404 and throws away whatever ranking it earned.
 *
 *  - `PUBLISHED_PATHS` (publishedPaths.ts) is the permanent record of every
 *    indexable path we have shipped. It only ever grows.
 *  - When a page is renamed or retired, add `{ from: <old path>, to: <new path> }`
 *    here, and the same entry (permanent: true) to the `redirects` array in
 *    vercel.json. `__tests__/redirects.test.ts` fails until both are done.
 *  - Redirects are never removed: the old URL stays out in the world.
 *
 * While the list is empty, vercel.json carries no `redirects` key at all.
 */
export interface Redirect {
  /** The retired path (not a live page any more). */
  from: string;
  /** Where it now lives: a live, indexable path. One hop, never a chain. */
  to: string;
}

export const REDIRECTS: readonly Redirect[] = [];

/**
 * Every published path that is neither live nor redirected. An empty result is
 * the only passing one; each entry is a URL that would now 404.
 */
export function unprotectedPaths(
  published: readonly string[],
  live: readonly string[],
  redirects: readonly Redirect[],
): string[] {
  const liveSet = new Set(live);
  const redirected = new Set(redirects.map((r) => r.from));
  return published.filter((p) => !liveSet.has(p) && !redirected.has(p));
}
