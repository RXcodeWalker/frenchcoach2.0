/**
 * Bundles `src/pwa/serviceWorker.ts` into a single classic script for `/sw.js`.
 * Shared by the production post-build step (`buildServiceWorker.ts`, with the
 * precache list) and the Vite dev plugin (empty list: push only, no caching).
 */
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

export const SERVICE_WORKER_ENTRY = fileURLToPath(new URL('../../src/pwa/serviceWorker.ts', import.meta.url));

export async function bundleServiceWorker(opts: { precache: string[]; version: string; minify?: boolean }): Promise<string> {
  const result = await build({
    entryPoints: [SERVICE_WORKER_ENTRY],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    minify: opts.minify ?? false,
    legalComments: 'none',
    define: {
      __PRECACHE_MANIFEST__: JSON.stringify(opts.precache),
      __SW_VERSION__: JSON.stringify(opts.version),
    },
  });
  return result.outputFiles[0].text;
}

/** A short version id that changes whenever any precached file changes. */
export function precacheVersion(entries: ReadonlyArray<{ url: string; content: Buffer | string }>): string {
  const h = createHash('sha256');
  for (const e of [...entries].sort((a, b) => a.url.localeCompare(b.url))) {
    h.update(e.url);
    h.update('\0');
    h.update(e.content);
    h.update('\0');
  }
  return h.digest('hex').slice(0, 12);
}
