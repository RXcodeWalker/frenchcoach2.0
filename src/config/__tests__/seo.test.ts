import { describe, expect, it } from 'vitest';
import { PAGE_SEO } from '../seo';
import { ROUTES } from '../routes';

describe('PAGE_SEO keys vs routes.ts', () => {
  it('every PAGE_SEO key exists in routes.ts', () => {
    const knownPaths = new Set(ROUTES.map((r) => r.path));
    const unknownKeys = Object.keys(PAGE_SEO).filter((path) => !knownPaths.has(path));
    expect(unknownKeys).toEqual([]);
  });

  it('every PAGE_SEO entry\'s canonicalPath matches its own key', () => {
    for (const [path, entry] of Object.entries(PAGE_SEO)) {
      expect(entry.canonicalPath).toBe(path);
    }
  });

  it('indexable PAGE_SEO entries are only for routes marked indexable in routes.ts', () => {
    const byPath = new Map(ROUTES.map((r) => [r.path, r]));
    for (const [path, entry] of Object.entries(PAGE_SEO)) {
      if (entry.robots === 'index, follow') {
        expect(byPath.get(path)?.indexable).toBe(true);
      }
    }
  });
});
