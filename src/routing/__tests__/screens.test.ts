import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CORE_SCREENS, Home, Landing, screensFor } from '../screens';

const read = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf-8');
const APP = read('../../App.tsx');
const PUBLIC = read('../../PublicRoutes.tsx');

/** `<Route path="…" element={<X />}` pairs, minus redirects and the catch-all. */
function routedPaths(source: string): string[] {
  const paths: string[] = [];
  for (const m of source.matchAll(/<Route path="([^"]+)" element=\{(\s*<\w+)/g)) {
    if (m[1] === '*' || m[2].trim() === '<Navigate') continue;
    paths.push(m[1]);
  }
  return paths;
}

describe('code splitting: routed screens', () => {
  it('App.tsx and PublicRoutes.tsx import no screen directly — every screen comes from routing/screens', () => {
    for (const source of [APP, PUBLIC]) {
      expect(source).not.toMatch(/from '\.\/(screens|layouts)\//);
    }
  });

  it('every routed path starts its screen downloading at boot (SCREEN_PATHS mirrors the <Route> table)', () => {
    const paths = [...routedPaths(APP), ...routedPaths(PUBLIC)];
    expect(paths.length).toBeGreaterThan(50);
    const missing = paths.filter((p) => !p.startsWith('/debug/') && screensFor(p.replace(/:(\w+)/g, 'x')).length === 0);
    expect(missing).toEqual([]);
  });

  it('`/` fetches both the signed-in and the signed-out home, and unknown paths fetch nothing', () => {
    expect(screensFor('/')).toEqual([Home, Landing]);
    expect(screensFor('/no-such-page')).toEqual([]);
  });

  it('prefetches the main tabs once the app is idle', () => {
    expect(CORE_SCREENS).toContain(Home);
    expect(CORE_SCREENS.length).toBeLessThanOrEqual(6);
  });
});
