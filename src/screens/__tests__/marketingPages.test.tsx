import { describe, expect, it } from 'vitest';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { IgcseFrenchSpeaking } from '../IgcseFrenchSpeaking';
import { FrenchRoleplayPractice } from '../FrenchRoleplayPractice';
import { Story } from '../Story';
import { ROUTES } from '../../config/routes';
import { PAGE_SEO } from '../../config/seo';
import { listScenarioIds } from '../../data/scenarios/registry';
import { TOPIC_PAGES } from '../../data/seo/topics';
import { ROLE_PLAY_EXAMPLES } from '../../data/seo/rolePlays';

// The older public pages, audited for thin copy, unsourced claims and
// dead links (docs/systems/public-seo-pages.md §8).

const PAGES: [string, ComponentType][] = [
  ['/igcse-french-speaking', IgcseFrenchSpeaking],
  ['/french-roleplay-practice', FrenchRoleplayPractice],
  ['/story', Story],
];

const decode = (s: string) => s.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const textOf = (markup: string) => decode(markup.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));

describe.each(PAGES)('%s', (path, Page) => {
  const markup = renderToStaticMarkup(createElement(Page));
  const text = textOf(markup);

  it('has one <h1> and never skips a heading level', () => {
    expect((markup.match(/<h1[\s>]/g) ?? []).length).toBe(1);
    const levels = [...markup.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    let max = levels[0];
    for (const l of levels.slice(1)) {
      expect(l).toBeLessThanOrEqual(max + 1);
      max = Math.max(max, l);
    }
  });

  it('has a visible breadcrumb that matches its JSON-LD', () => {
    const crumbs = PAGE_SEO[path].jsonLd!.find((b) => b['@type'] === 'BreadcrumbList') as unknown as {
      itemListElement: { name: string }[];
    };
    const nav = markup.match(/<nav aria-label="Breadcrumb"[\s\S]*?<\/nav>/)?.[0] ?? '';
    expect(nav).not.toBe('');
    for (const item of crumbs.itemListElement) expect(textOf(nav)).toContain(item.name);
  });

  it('only links to pages that exist', () => {
    const known = new Set(ROUTES.filter((r) => r.kind !== 'dynamic' && r.kind !== 'dev-only').map((r) => r.path));
    for (const m of markup.matchAll(/href="(\/[^"#?]*)/g)) expect(known.has(decode(m[1])), `${path} links to ${m[1]}`).toBe(true);
  });

  it('claims nothing the sources do not give', () => {
    expect(text).not.toMatch(/\b25\s?%/); // weighting: unsourced (domain/igcse/unsourced.ts)
    expect(text).not.toMatch(/guarantee|predicts? your grade|(?<!not an )official (cambridge )?(mark|grade|score)/i);
  });

  it('is more than a stub', () => {
    expect(text.split(' ').length).toBeGreaterThan(250);
  });
});

describe('copy that quotes a count', () => {
  it('the role-play practice head says how many scenarios there are', () => {
    const n = listScenarioIds().length;
    expect(PAGE_SEO['/french-roleplay-practice'].title).toContain(String(n));
    expect(PAGE_SEO['/french-roleplay-practice'].description).toContain(String(n));
  });

  it('the guide and Our story cards say how many topics and role plays there are', () => {
    const guide = textOf(renderToStaticMarkup(createElement(IgcseFrenchSpeaking)));
    expect(guide).toContain(`${TOPIC_PAGES.length} topics`);
    // "Our story" carries the About facts and spells the count out as a word.
    const story = textOf(renderToStaticMarkup(createElement(Story)));
    expect(story).toContain(TOPIC_PAGES.length === 16 ? 'Sixteen topics' : `${TOPIC_PAGES.length} topics`);
    expect(guide.toLowerCase()).toContain(ROLE_PLAY_EXAMPLES.length === 6 ? 'six practice role plays' : 'role plays');
  });

  it('the exam guide links the marking and common-mistakes pages', () => {
    const markup = renderToStaticMarkup(createElement(IgcseFrenchSpeaking));
    expect(markup).toContain('href="/igcse-french-speaking/marking"');
    expect(markup).toContain('href="/igcse-french-speaking/common-mistakes"');
  });
});
