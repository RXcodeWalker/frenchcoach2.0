import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { matchPath } from 'react-router-dom';
import { ROUTES } from '../routes';

// Paths that are never a <Route> in App.tsx by design, but still need a
// static shell once prerendering exists. Any addition must be deliberate —
// this list is the only thing that can excuse a routes.ts entry from having
// a matching <Route path> below. '/guardian-consent' (Phase 1.6 Part C) is
// PublicRoutes-only — a guardian confirming by emailed link is never a
// signed-in app user, so it has no App.tsx <Route>.
const UNREGISTERED_PATHS = ['/login', '/auth/callback', '/reset-password', '/guardian-consent', '/parent'];

function readPublicRoutesTsx(): string {
  const path = fileURLToPath(new URL('../../PublicRoutes.tsx', import.meta.url));
  return readFileSync(path, 'utf-8');
}

function readAppTsx(): string {
  const path = fileURLToPath(new URL('../../App.tsx', import.meta.url));
  return readFileSync(path, 'utf-8');
}

// Mirrors the import.meta.env.DEV-guarded block in App.tsx so the dev-only
// route can be extracted separately from the always-registered ones.
function extractRoutePaths(source: string): { registered: string[]; devOnly: string[] } {
  const devGuardMatch = source.match(
    /import\.meta\.env\.DEV && \(([\s\S]*?)\)\}/,
  );
  const devBlock = devGuardMatch ? devGuardMatch[1] : '';
  const withoutDevBlock = devBlock ? source.replace(devBlock, '') : source;

  const devOnly = [...devBlock.matchAll(/path="([^"]+)"/g)].map((m) => m[1]);
  // "*" is React Router's catch-all syntax, not a real route — it must never
  // get a routes.ts entry or a Stage C static shell.
  const registered = [...withoutDevBlock.matchAll(/path="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => p !== '*');

  return { registered, devOnly };
}

describe('route parity: src/config/routes.ts vs src/App.tsx', () => {
  const { registered, devOnly } = extractRoutePaths(readAppTsx());

  it('every <Route path> in App.tsx (excluding dev-only) has a routes.ts entry', () => {
    const known = new Set(ROUTES.map((r) => r.path));
    // A parameterised pattern is covered when routes.ts lists the concrete 'generated' paths it serves.
    const generated = ROUTES.filter((r) => r.kind === 'generated').map((r) => r.path);
    const coversGenerated = (p: string) =>
      p.includes(':') && generated.some((g) => matchPath({ path: p, end: true }, g) !== null);
    const missing = registered.filter((p) => !known.has(p) && !coversGenerated(p));
    expect(missing).toEqual([]);
  });

  it('every dev-only <Route path> in App.tsx is marked kind:"dev-only" in routes.ts', () => {
    const byPath = new Map(ROUTES.map((r) => [r.path, r]));
    for (const path of devOnly) {
      expect(byPath.get(path)?.kind).toBe('dev-only');
    }
  });

  it('no routes.ts entry marked dev-only is missing from the App.tsx dev-only block', () => {
    const devOnlyInTable = ROUTES.filter((r) => r.kind === 'dev-only').map((r) => r.path);
    expect(devOnlyInTable.sort()).toEqual([...devOnly].sort());
  });

  it('every routes.ts entry corresponds to a real <Route path>, or is explicitly unregistered', () => {
    const registeredSet = new Set([...registered, ...devOnly]);
    const unexpectedlyMissing = ROUTES.filter(
      (r) => r.kind !== 'unregistered' && r.kind !== 'generated' && !registeredSet.has(r.path),
    );
    expect(unexpectedlyMissing).toEqual([]);
  });

  // A 'generated' route is one concrete path of a parameterised <Route> (the public
  // topic and role-play pages): both the signed-in tree (App.tsx) and the logged-out
  // tree (PublicRoutes.tsx) must serve it, or a signed-out visitor gets the sign-in page.
  it("every 'generated' routes.ts entry is served by a parameterised <Route> in App.tsx and PublicRoutes.tsx", () => {
    const generated = ROUTES.filter((r) => r.kind === 'generated');
    expect(generated.length).toBeGreaterThan(0);
    for (const source of [readAppTsx(), readPublicRoutesTsx()]) {
      const patterns = extractRoutePaths(source).registered.filter((p) => p.includes(':'));
      for (const route of generated) {
        const served = patterns.some((pattern) => matchPath({ path: pattern, end: true }, route.path) !== null);
        expect(served, `${route.path} has no matching <Route path="…:param"> pattern`).toBe(true);
      }
    }
  });

  it("'generated' routes are public pages: indexable, never dynamic or app", () => {
    for (const route of ROUTES.filter((r) => r.kind === 'generated')) {
      expect(route.indexable, route.path).toBe(true);
      expect(route.path.startsWith('/igcse-french-speaking/'), route.path).toBe(true);
    }
  });

  it('the "unregistered" kind is used for exactly the expected set of paths', () => {
    const actualUnregistered = ROUTES.filter((r) => r.kind === 'unregistered')
      .map((r) => r.path)
      .sort();
    expect(actualUnregistered).toEqual([...UNREGISTERED_PATHS].sort());
  });

  it('routes.ts has no duplicate paths', () => {
    const paths = ROUTES.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
