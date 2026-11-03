/**
 * Post-build step (after `vite build` and the prerender): writes `dist/sw.js`
 * with the precache list — the app shell (`/`), every built JS/CSS asset and
 * the app icons. Runs last so it hashes the final `dist/index.html`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectPrecacheUrls } from '../../src/pwa/swRouting';
import { bundleServiceWorker, precacheVersion } from './serviceWorkerBundle';

const DIST = fileURLToPath(new URL('../../dist', import.meta.url));

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [relative(DIST, full)];
  });
}

async function main() {
  const precache = selectPrecacheUrls(walk(DIST));
  const entries = precache.map((url) => ({
    url,
    content: readFileSync(join(DIST, url === '/' ? 'index.html' : url.slice(1))),
  }));
  const version = precacheVersion(entries);
  const code = await bundleServiceWorker({ precache, version, minify: true });
  writeFileSync(join(DIST, 'sw.js'), code, 'utf-8');
  const kb = entries.reduce((n, e) => n + e.content.length, 0) / 1024;
  console.log(`[pwa] dist/sw.js ${version}: ${precache.length} files precached (${Math.round(kb)} KB)`);
}

main().catch((err) => {
  console.error('[pwa] service worker build failed:', err);
  process.exit(1);
});
