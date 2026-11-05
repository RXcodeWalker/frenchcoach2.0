import { describe, expect, it } from 'vitest';
import { bundleServiceWorker, precacheVersion } from '../serviceWorkerBundle';

describe('bundleServiceWorker', () => {
  it('bundles one classic script with the precache list injected', async () => {
    const code = await bundleServiceWorker({ precache: ['/', '/assets/a.js'], version: 'abc123' });
    expect(code).toContain('"/assets/a.js"');
    expect(code).toContain('fc-precache-');
    expect(code).toContain('abc123');
    expect(code).not.toMatch(/^\s*(import|export)\s/m); // a classic worker script, not a module
    // Web Push survives the move from public/sw.js.
    expect(code).toContain('showNotification');
    expect(code).toContain('notificationclick');
  }, 20_000);

  it('dev build (empty list) caches nothing', async () => {
    const code = await bundleServiceWorker({ precache: [], version: 'dev' });
    expect(code).toContain('[]');
  }, 20_000);
});

describe('precacheVersion', () => {
  it('changes when any precached file changes, not when the order does', () => {
    const a = precacheVersion([{ url: '/', content: 'one' }, { url: '/a.js', content: 'two' }]);
    const b = precacheVersion([{ url: '/a.js', content: 'two' }, { url: '/', content: 'one' }]);
    const c = precacheVersion([{ url: '/', content: 'one!' }, { url: '/a.js', content: 'two' }]);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{12}$/);
  });
});
