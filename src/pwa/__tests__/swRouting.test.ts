import { describe, expect, it } from 'vitest';
import { classifyRequest, parseRange, selectPrecacheUrls } from '../swRouting';

const ORIGIN = 'https://french.beyondthebasics.me';
const get = (url: string, mode = 'cors') => classifyRequest({ url, method: 'GET', mode }, ORIGIN);

describe('classifyRequest — what the service worker may cache', () => {
  it('never touches anything that reaches a server about the learner', () => {
    expect(get(`${ORIGIN}/api/feedback`)).toBe('bypass');
    expect(get(`${ORIGIN}/api/transcribe`)).toBe('bypass');
    expect(get(`${ORIGIN}/api/learn/allowance`)).toBe('bypass');
    expect(get(`${ORIGIN}/health`)).toBe('bypass');
    expect(get(`${ORIGIN}/auth/callback?code=abc`, 'navigate')).toBe('bypass');
    expect(get('https://abc.supabase.co/rest/v1/profiles?select=*')).toBe('bypass');
    expect(get('https://abc.supabase.co/auth/v1/token?grant_type=refresh_token')).toBe('bypass');
    expect(get('https://abc.supabase.co/storage/v1/object/sign/private/x.mp3')).toBe('bypass');
    expect(get('https://french-scoring.onrender.com/score')).toBe('bypass');
    expect(get('https://eu.i.posthog.com/e/')).toBe('bypass');
    expect(get('https://o1.ingest.sentry.io/api/1/envelope/')).toBe('bypass');
  });

  it('never caches a non-GET request', () => {
    for (const method of ['POST', 'PUT', 'DELETE', 'PATCH']) {
      expect(classifyRequest({ url: `${ORIGIN}/assets/index-abc.js`, method, mode: 'cors' }, ORIGIN)).toBe('bypass');
    }
  });

  it('routes page loads, build assets, public files and fonts', () => {
    expect(get(`${ORIGIN}/learn`, 'navigate')).toBe('navigation');
    expect(get(`${ORIGIN}/`, 'navigate')).toBe('navigation');
    expect(get(`${ORIGIN}/assets/index-DzlpoN0_.js`)).toBe('immutable-asset');
    expect(get(`${ORIGIN}/assets/index-DzlpoN0_.js.map`)).toBe('bypass');
    expect(get(`${ORIGIN}/favicon.svg`)).toBe('static-file');
    expect(get(`${ORIGIN}/icons/icon-192.png`)).toBe('static-file');
    expect(get(`${ORIGIN}/sw.js`)).toBe('bypass');
    expect(get('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque')).toBe('font-stylesheet');
    expect(get('https://fonts.gstatic.com/s/bricolage/v1/x.woff2')).toBe('font-file');
  });

  it('caches recorded voices from the public tts-audio bucket only', () => {
    expect(get('https://abc.supabase.co/storage/v1/object/public/tts-audio/v1/henri/ab/abcdef.mp3')).toBe('recorded-voice');
    expect(get('https://abc.supabase.co/storage/v1/object/public/other-bucket/x.mp3')).toBe('bypass');
    // A query (a signed or transformed URL) is not the stable content-hashed path.
    expect(get('https://abc.supabase.co/storage/v1/object/public/tts-audio/x.mp3?token=1')).toBe('bypass');
  });

  it('leaves the Vite dev server alone', () => {
    expect(get(`${ORIGIN}/@vite/client`)).toBe('bypass');
    expect(get(`${ORIGIN}/src/main.tsx`)).toBe('bypass');
    expect(get(`${ORIGIN}/node_modules/.vite/deps/react.js`)).toBe('bypass');
  });

  it('bypasses unparseable and non-http URLs', () => {
    expect(get('not a url')).toBe('bypass');
    expect(get('chrome-extension://abc/script.js')).toBe('bypass');
  });
});

describe('parseRange', () => {
  it('reads the forms media elements send', () => {
    expect(parseRange('bytes=0-', 1000)).toEqual({ start: 0, end: 999 });
    expect(parseRange('bytes=100-199', 1000)).toEqual({ start: 100, end: 199 });
    expect(parseRange('bytes=900-5000', 1000)).toEqual({ start: 900, end: 999 });
    expect(parseRange('bytes=-100', 1000)).toEqual({ start: 900, end: 999 });
  });

  it('rejects what it cannot serve, so the whole file is sent instead', () => {
    expect(parseRange(null, 1000)).toBeNull();
    expect(parseRange('bytes=0-1,5-6', 1000)).toBeNull();
    expect(parseRange('bytes=-', 1000)).toBeNull();
    expect(parseRange('bytes=2000-', 1000)).toBeNull();
    expect(parseRange('bytes=500-100', 1000)).toBeNull();
    expect(parseRange('items=0-1', 1000)).toBeNull();
  });
});

describe('selectPrecacheUrls', () => {
  it('precaches the shell, built assets and icons, never source maps or other pages', () => {
    const urls = selectPrecacheUrls([
      'index.html',
      'assets/index-abc.js',
      'assets/index-abc.js.map',
      'assets/index-abc.css',
      'favicon.svg',
      'site.webmanifest',
      'icons/icon-192.png',
      'og-image.png',
      'learn/index.html',
      'robots.txt',
      'sitemap.xml',
    ]);
    expect(urls).toEqual(['/', '/assets/index-abc.css', '/assets/index-abc.js', '/favicon.svg', '/icons/icon-192.png', '/site.webmanifest']);
  });

  it('normalises Windows separators', () => {
    expect(selectPrecacheUrls(['assets\\a.js'])).toEqual(['/', '/assets/a.js']);
  });
});
