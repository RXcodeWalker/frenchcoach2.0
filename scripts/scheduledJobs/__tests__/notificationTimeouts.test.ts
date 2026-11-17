import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Security review F14: the hourly job posts to learner-chosen push endpoints.
 * Each push has a timeout, and the workflow has a ceiling, so one slow
 * endpoint cannot stall everyone's nudges.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');

describe('notification job timeouts (F14)', () => {
  it('passes a timeout to every web-push send', () => {
    const src = read('scripts/scheduledJobs/sendNotifications.ts');
    const calls = src.match(/webpush\.sendNotification\([^;]*;/gs) ?? [];
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) expect(call).toMatch(/timeout:\s*PUSH_TIMEOUT_MS/);
    expect(src).toMatch(/PUSH_TIMEOUT_MS = 10_000/);
  });

  it('caps the workflow run time', () => {
    const yml = read('.github/workflows/notifications-streak-and-goal.yml');
    const minutes = Number(/timeout-minutes:\s*(\d+)/.exec(yml)?.[1]);
    expect(minutes).toBeGreaterThan(0);
    expect(minutes).toBeLessThanOrEqual(55);
  });
});
