import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import type { Plugin } from 'vite';
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
  },
});
