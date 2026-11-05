import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import type { Plugin, ManualChunkMeta } from 'vite';
import { fileURLToPath } from 'node:url';
import { bundleServiceWorker } from './scripts/pwa/serviceWorkerBundle';

// Dev only: serves /sw.js bundled from src/pwa/serviceWorker.ts with an empty
// precache list — push works, nothing is ever cached (HMR stays untouched).
// Production builds write dist/sw.js in scripts/pwa/buildServiceWorker.ts.
function serviceWorkerDev(): Plugin {
  return {
    name: 'frenchcoach-service-worker-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/sw.js', (_req, res, next) => {
        bundleServiceWorker({ precache: [], version: 'dev' })
          .then((code) => {
            res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
            res.end(code);
          })
          .catch(next);
      });
    },
  };
}

// Sentry release = the commit Vercel is building (VERCEL_GIT_COMMIT_SHA), so
// events, source maps and the dashboard all line up. Local builds have no
// release. VERCEL_ENV (production / preview / development) picks the
// Sentry environment; telemetryService.ts falls back to the Vite mode.
const sentryRelease = process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE || '';
const sentryEnvironment = process.env.VERCEL_ENV || '';

// Source maps are uploaded only when the DSN *and* an auth token are present
// (Vercel), then deleted from dist/ so they're not served publicly.
const uploadSourceMaps = !!process.env.VITE_SENTRY_DSN && !!process.env.SENTRY_AUTH_TOKEN;

/**
 * Named chunks (build.rollupOptions.output.manualChunks). The point is that a
 * deploy renames as few files as possible, because every renamed file is
 * downloaded again by every learner (browser and offline cache alike).
 *
 * - Stable third-party code → `vendor-*`, icons included.
 * - The app code loaded at startup → `app-core`. Without it, that code sits in
 *   the entry chunk next to `routing/screens.ts`, whose `import()` calls name
 *   every screen file by hash — so changing one screen renamed the entry, and
 *   every screen importing a shared helper from it was renamed too (one line in
 *   Rapid Fire renamed 183 of 235 files). Modules holding an `import()` of app
 *   code, and everything that imports them, stay in the entry chunk so
 *   `app-core` never names a screen and never imports from the entry.
 *
 * Only modules the startup graph already contains are named: Rollup moves a
 * manual chunk's otherwise-unassigned dependencies into it (an `admin` chunk
 * once dragged the question bank in that way).
 */
const VENDOR_CHUNKS: ReadonlyArray<readonly [string, RegExp]> = [
  ['vendor-react', /\/node_modules\/(react|react-dom|scheduler|react-router|react-router-dom)\//],
  ['vendor-motion', /\/node_modules\/(framer-motion|motion-dom|motion-utils)\//],
  ['vendor-sentry', /\/node_modules\/@sentry(-internal)?\//],
  ['vendor-supabase', /\/node_modules\/@supabase\//],
  // Every icon the app uses (~15 KB compressed), one file: imported through one
  // index module, they would otherwise all land in app-core, or in ~90 tiny files.
  ['vendor-icons', /\/node_modules\/lucide-react\//],
];

const ENTRY = fileURLToPath(new URL('./src/main.tsx', import.meta.url)).replace(/\\/g, '/');
let appCore: Set<string> | null = null;

function isAppCode(id: string): boolean {
  return !id.startsWith('\0') && !id.includes('/node_modules/') && /\.(t|j)sx?$/.test(id);
}

function startupAppCore(getModuleInfo: ManualChunkMeta['getModuleInfo']): Set<string> {
  // Everything main.tsx imports statically.
  const startup = new Set<string>([ENTRY]);
  const queue = [ENTRY];
  while (queue.length) {
    for (const dep of getModuleInfo(queue.shift()!)?.importedIds ?? []) {
      if (!startup.has(dep)) {
        startup.add(dep);
        queue.push(dep);
      }
    }
  }
  // Modules that name app chunks in an import(), and (transitively) their importers.
  const entryOnly = new Set(
    [...startup].filter((id) => (getModuleInfo(id)?.dynamicallyImportedIds ?? []).some(isAppCode)),
  );
  entryOnly.add(ENTRY);
  for (let grew = true; grew; ) {
    grew = false;
    for (const id of startup) {
      if (entryOnly.has(id)) continue;
      if ((getModuleInfo(id)?.importedIds ?? []).some((dep) => entryOnly.has(dep))) {
        entryOnly.add(id);
        grew = true;
      }
    }
  }
  return new Set([...startup].filter((id) => isAppCode(id) && !entryOnly.has(id)));
}

function namedChunk(id: string, meta: ManualChunkMeta): string | undefined {
  const path = id.replace(/\\/g, '/');
  const vendor = VENDOR_CHUNKS.find(([, re]) => re.test(path))?.[0];
  if (vendor) return vendor;
  appCore ??= startupAppCore(meta.getModuleInfo);
  return appCore.has(id) ? 'app-core' : undefined;
}

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    __SENTRY_RELEASE__: JSON.stringify(sentryRelease),
    __SENTRY_ENVIRONMENT__: JSON.stringify(sentryEnvironment),
  },
  plugins: [
    react(),
    serviceWorkerDev(),
    ...(uploadSourceMaps
      ? [
          sentryVitePlugin({
            org: process.env.SENTRY_ORG,
            project: process.env.SENTRY_PROJECT,
            authToken: process.env.SENTRY_AUTH_TOKEN,
            release: sentryRelease ? { name: sentryRelease } : undefined,
            sourcemaps: {
              assets: './dist/**',
              filesToDeleteAfterUpload: ['./dist/**/*.map'],
            },
            telemetry: false,
            // A bad token or a Sentry outage must never block a deploy.
            errorHandler: (err) => console.warn('[sentry] source map upload failed:', err.message),
          }),
        ]
      : []),
  ],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    // 'hidden': maps are generated for the Sentry upload but no
    // sourceMappingURL comment points browsers at them.
    sourcemap: 'hidden',
    rollupOptions: {
      output: {
        // Vendor libraries and the startup app code get stable files of their own,
        // so a deploy renames only what changed (see namedChunk). Screens are
        // split per route by src/routing/screens.ts.
        manualChunks: namedChunk,
      },
    },
  },
});
