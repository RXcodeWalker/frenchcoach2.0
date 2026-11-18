import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REDIRECTS, unprotectedPaths, type Redirect } from '../redirects';
import { PUBLISHED_PATHS } from '../publishedPaths';
import { ROUTES } from '../../../config/routes';

// Redirect protection (docs/systems/public-seo-pages.md §7): a published URL is
// never allowed to disappear without a redirect, and the redirect list is what
// vercel.json serves.

const LIVE = ROUTES.filter((r) => r.indexable).map((r) => r.path);

function vercelRedirects(): { source: string; destination: string; permanent?: boolean }[] {
  const file = fileURLToPath(new URL('../../../../vercel.json', import.meta.url));
  return (JSON.parse(readFileSync(file, 'utf-8')) as { redirects?: [] }).redirects ?? [];
}

describe('published URLs are protected', () => {
  it('every published path is still live or has a redirect', () => {
    const missing = unprotectedPaths(PUBLISHED_PATHS, LIVE, REDIRECTS);
    expect(
      missing,
      `These published URLs would 404. Add { from, to } to REDIRECTS (src/data/seo/redirects.ts) and ` +
        `{ "source": from, "destination": to, "permanent": true } to vercel.json "redirects":\n  ${missing.join('\n  ')}`,
    ).toEqual([]);
  });

  it('every live indexable page is recorded, so it is protected from now on', () => {
    const recorded = new Set(PUBLISHED_PATHS);
    const unrecorded = LIVE.filter((p) => !recorded.has(p));
    expect(unrecorded, `Append these to PUBLISHED_PATHS (src/data/seo/publishedPaths.ts):\n  ${unrecorded.join('\n  ')}`).toEqual([]);
  });

  it('the record has no duplicates', () => {
    expect(new Set(PUBLISHED_PATHS).size).toBe(PUBLISHED_PATHS.length);
  });
});

describe('REDIRECTS', () => {
  const live = new Set(LIVE);

  it('every redirect leaves a retired path and lands, in one hop, on a live indexable page', () => {
    const froms = new Set<string>();
    for (const r of REDIRECTS) {
      expect(r.from.startsWith('/') && r.to.startsWith('/'), `${r.from} → ${r.to}`).toBe(true);
      expect(r.from, 'a redirect to itself').not.toBe(r.to);
      expect(live.has(r.from), `${r.from} is still a live page: remove the redirect or the page`).toBe(false);
      expect(live.has(r.to), `${r.from} → ${r.to}: the target is not a live indexable page`).toBe(true);
      expect(froms.has(r.from), `duplicate redirect from ${r.from}`).toBe(false);
      froms.add(r.from);
    }
    for (const r of REDIRECTS) expect(froms.has(r.to), `${r.from} → ${r.to} is a chain`).toBe(false);
  });

  it('only ever redirects a path that was published (the record is the source of truth)', () => {
    const recorded = new Set(PUBLISHED_PATHS);
    for (const r of REDIRECTS) expect(recorded.has(r.from), `${r.from} is not in PUBLISHED_PATHS`).toBe(true);
  });

  it('matches vercel.json exactly: permanent, same order, nothing extra', () => {
    expect(vercelRedirects()).toEqual(
      REDIRECTS.map((r) => ({ source: r.from, destination: r.to, permanent: true })),
    );
  });
});

describe('unprotectedPaths (the check itself)', () => {
  const published = ['/a', '/a/old-slug', '/a/keep'];

  it('reports a renamed slug until a redirect covers it', () => {
    const live = ['/a', '/a/new-slug', '/a/keep'];
    expect(unprotectedPaths(published, live, [])).toEqual(['/a/old-slug']);
    const fixed: Redirect[] = [{ from: '/a/old-slug', to: '/a/new-slug' }];
    expect(unprotectedPaths(published, live, fixed)).toEqual([]);
  });

  it('reports a removed page too', () => {
    expect(unprotectedPaths(published, ['/a', '/a/keep'], [])).toEqual(['/a/old-slug']);
  });

  it('passes when nothing was renamed', () => {
    expect(unprotectedPaths(published, published, [])).toEqual([]);
  });
});
