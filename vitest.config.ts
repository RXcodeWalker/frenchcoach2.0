import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run in Node — the coach reducer has no browser dependencies.
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Keep output concise in CI; use 'verbose' locally if needed.
    reporter: 'default',
  },
});
