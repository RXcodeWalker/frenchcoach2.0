import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROUTES } from '../routes';

// A `dynamic` route (`/scenario/:scenarioId`) has no prerendered shell, so a
// direct visit or a reload only works if vercel.json rewrites it to the app.
// With `cleanUrls: true` the destination must be extensionless ("/", "/admin"):
// a "/index.html" destination 404s in production. That is exactly how every
// scenario, duel and Junior theme link served "Page not found" until 2026-11-02.
// Unknown paths deliberately keep their real 404 (scripts/seo/sitemap.ts), so
// there is no catch-all — each dynamic route needs its own rewrite.

interface Rewrite {
  source: string;
  destination: string;
}

function readVercelJson(): { cleanUrls?: boolean; rewrites: Rewrite[] } {
  const path = fileURLToPath(new URL('../../../vercel.json', import.meta.url));
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('vercel.json rewrites cover every dynamic route', () => {
  const config = readVercelJson();
  const appRewrites = config.rewrites.filter((r) => r.destination.startsWith('/'));

  it.each(ROUTES.filter((r) => r.kind === 'dynamic').map((r) => r.path))('%s is rewritten to the app', (path) => {
    const rewrite = appRewrites.find((r) => r.source === path);
    expect(rewrite, `add { "source": "${path}", "destination": "/" } to vercel.json`).toBeDefined();
  });

  it('no app rewrite points at a .html file while cleanUrls is on', () => {
    expect(config.cleanUrls).toBe(true);
    for (const r of appRewrites) expect(r.destination, r.source).not.toMatch(/\.html$/);
  });

  it('every app rewrite lands on a page that has a static shell', () => {
    const shells = new Set(ROUTES.filter((r) => r.kind !== 'dynamic' && r.kind !== 'dev-only').map((r) => r.path));
    for (const r of appRewrites) expect(shells.has(r.destination), `${r.source} → ${r.destination}`).toBe(true);
  });
});

// Security review F15: no other site may frame the app (clickjacking). The
// Android app is a Trusted Web Activity, not a frame, so it is unaffected.
describe('vercel.json forbids framing', () => {
  it('sends frame-ancestors none on every path', () => {
    const path = fileURLToPath(new URL('../../../vercel.json', import.meta.url));
    const config = JSON.parse(readFileSync(path, 'utf-8')) as {
      headers: { source: string; headers: { key: string; value: string }[] }[];
    };
    const all = config.headers.find((h) => h.source === '/(.*)');
    expect(all, 'a "/(.*)" header block').toBeDefined();
    const csp = all!.headers.find((h) => h.key === 'Content-Security-Policy');
    expect(csp?.value).toContain("frame-ancestors 'none'");
  });
});
