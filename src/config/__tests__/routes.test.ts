import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '../routes';

// Paths that are never a <Route> in App.tsx by design, but still need a
// static shell once prerendering exists. Any addition must be deliberate —
// this list is the only thing that can excuse a routes.ts entry from having
// a matching <Route path> below.
const UNREGISTERED_PATHS = ['/login'];

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
    const missing = registered.filter((p) => !known.has(p));
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
      (r) => r.kind !== 'unregistered' && !registeredSet.has(r.path),
    );
    expect(unexpectedlyMissing).toEqual([]);
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
