import { describe, expect, it } from 'vitest';
import { PAGE_SEO } from '../seo';
import { getPageSeo } from '../publicContentSeo';
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

// Every page the sitemap lists must carry an indexable head, with unique copy:
// the sitemap is built from `indexable` routes, the head from getPageSeo.
describe('indexable routes vs their SEO heads (static pages and public content)', () => {
  const indexable = ROUTES.filter((r) => r.indexable);

  it('every indexable route has an indexable SEO entry, and the entry agrees with the route', () => {
    for (const route of indexable) {
      const entry = getPageSeo(route.path);
      expect(entry, `${route.path} has no SEO entry`).toBeDefined();
      expect(entry!.robots, route.path).toBe('index, follow');
      expect(entry!.canonicalPath, route.path).toBe(route.path);
    }
  });

  it('every indexable page has a unique title and description of a sensible length', () => {
    const titles = new Set<string>();
    const descriptions = new Set<string>();
    for (const route of indexable) {
      const { title, description } = getPageSeo(route.path)!;
      expect(title.length, `${route.path} title`).toBeLessThanOrEqual(75);
      expect(description.length, `${route.path} description`).toBeGreaterThanOrEqual(80);
      expect(description.length, `${route.path} description`).toBeLessThanOrEqual(190);
      expect(titles.has(title), `duplicate title: ${title}`).toBe(false);
      expect(descriptions.has(description), `duplicate description on ${route.path}`).toBe(false);
      titles.add(title);
      descriptions.add(description);
    }
  });

  it('every public-content page declares a BreadcrumbList whose last item is the page itself', () => {
    for (const route of indexable.filter((r) => r.path.startsWith('/igcse-french-speaking/'))) {
      const crumbs = getPageSeo(route.path)!.jsonLd?.find((b) => b['@type'] === 'BreadcrumbList') as
        | { itemListElement: { item: string }[] }
        | undefined;
      expect(crumbs, route.path).toBeDefined();
      const last = crumbs!.itemListElement[crumbs!.itemListElement.length - 1];
      expect(last.item.endsWith(route.path), route.path).toBe(true);
    }
  });
});

