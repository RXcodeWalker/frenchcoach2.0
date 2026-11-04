import { describe, expect, it } from 'vitest';
import {
  INCOMPLETE_INSTALL_GRACE_MS,
  KEPT_PREVIOUS_VERSIONS,
  parseManifest,
  planRetention,
  type PrecacheEntry,
} from '../swCacheRetention';

const NOW = 1_800_000_000_000;
const v = (name: string, installedAt: number, assets: string[], complete = true): PrecacheEntry => ({
  name: `fc-precache-${name}`,
  manifest: { installedAt, assets, complete },
});

describe('planRetention — which app versions keep their files', () => {
  it('keeps the current version and the last two complete ones, and only their files', () => {
    const plan = planRetention('fc-precache-e', [
      v('a', NOW - 50_000, ['/assets/a.js', '/assets/shared.js']),
      v('b', NOW - 40_000, ['/assets/b.js', '/assets/shared.js']),
      v('c', NOW - 30_000, ['/assets/c.js', '/assets/shared.js']),
      v('d', NOW - 20_000, ['/assets/d.js', '/assets/shared.js']),
      v('e', NOW - 10_000, ['/assets/e.js', '/assets/shared.js']),
    ], NOW);
    expect(KEPT_PREVIOUS_VERSIONS).toBe(2);
    expect(plan.remove.sort()).toEqual(['fc-precache-a', 'fc-precache-b']);
    expect([...plan.keepAssets].sort()).toEqual(['/assets/c.js', '/assets/d.js', '/assets/e.js', '/assets/shared.js']);
  });

  it('always keeps the current version, even if it looks older', () => {
    const plan = planRetention('fc-precache-old', [
      v('old', NOW - 90_000, ['/assets/old.js']),
      v('x', NOW - 3, ['/assets/x.js']),
      v('y', NOW - 2, ['/assets/y.js']),
      v('z', NOW - 1, ['/assets/z.js']),
    ], NOW);
    expect(plan.remove).toEqual(['fc-precache-x']);
    expect(plan.keepAssets.has('/assets/old.js')).toBe(true);
  });

  it("keeps a recent unfinished install's files (it may be downloading right now) without letting it push out a real version", () => {
    const plan = planRetention('fc-precache-cur', [
      v('cur', NOW - 10, ['/assets/cur.js']),
      v('p1', NOW - 300, ['/assets/p1.js']),
      v('p2', NOW - 200, ['/assets/p2.js']),
      v('installing', NOW - 5, ['/assets/new.js'], false),
    ], NOW);
    expect(plan.remove).toEqual([]);
    expect(plan.keepAssets).toEqual(new Set(['/assets/cur.js', '/assets/p1.js', '/assets/p2.js', '/assets/new.js']));
  });

  it('drops an unfinished install after the grace period, and caches with no readable manifest', () => {
    const plan = planRetention('fc-precache-cur', [
      v('cur', NOW, ['/assets/cur.js']),
      v('stale', NOW - INCOMPLETE_INSTALL_GRACE_MS - 1, ['/assets/stale.js'], false),
      { name: 'fc-precache-legacy', manifest: null },
    ], NOW);
    expect(plan.remove.sort()).toEqual(['fc-precache-legacy', 'fc-precache-stale']);
    expect(plan.keepAssets).toEqual(new Set(['/assets/cur.js']));
  });
});

describe('parseManifest', () => {
  it('accepts a well-formed manifest and rejects anything else', () => {
    expect(parseManifest({ installedAt: 1, complete: true, assets: ['/assets/a.js'] })).toEqual({ installedAt: 1, complete: true, assets: ['/assets/a.js'] });
    expect(parseManifest(null)).toBeNull();
    expect(parseManifest({ installedAt: '1', complete: true, assets: [] })).toBeNull();
    expect(parseManifest({ installedAt: 1, complete: true, assets: [3] })).toBeNull();
  });
});
