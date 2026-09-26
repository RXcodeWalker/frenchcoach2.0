import { defineConfig } from '@playwright/test';

/**
 * E2E harness for the Cambridge 0520 exam flow (npm run e2e:exam).
 * Never used in CI/production — it boots a fake scoring service
 * (scripts/e2e/fakeScoringServer.ts, fixed judge, no auth/Supabase) and
 * points a throwaway Vite dev server at it via VITE_SCORING_API_URL, so the
 * real client/server contract runs end-to-end without any provider or
 * Supabase credentials.
 */

const FAKE_SCORING_PORT = 4100;
const APP_PORT = 5180;

export default defineConfig({
  testDir: './e2e',
  // Full multi-turn exam runs (role play + two topic conversations, each
  // turn paced by examinerPacing.ts's leads) comfortably exceed Playwright's
  // 30s default and can approach a minute even without any hiccup.
  timeout: 180_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.E2E_CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
      args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
    },
  },
  webServer: [
    {
      command: `tsx scripts/e2e/fakeScoringServer.ts`,
      env: { FAKE_SCORING_PORT: String(FAKE_SCORING_PORT) },
      url: `http://127.0.0.1:${FAKE_SCORING_PORT}/health`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: `vite --port ${APP_PORT} --strictPort`,
      env: { VITE_SCORING_API_URL: `http://127.0.0.1:${FAKE_SCORING_PORT}` },
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
});
