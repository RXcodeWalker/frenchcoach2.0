import { describe, expect, it } from 'vitest';
import { createElement, type ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Landing } from '../../../screens/Landing';
import { Story } from '../../../screens/Story';
import { IgcseFrenchSpeaking } from '../../../screens/IgcseFrenchSpeaking';
import { FrenchRoleplayPractice } from '../../../screens/FrenchRoleplayPractice';
import { LANDING_SECTIONS } from '../../../screens/landing/landingContent';
import { SITE_NAV, isSectionItem, navHref } from '../siteNav';

// One header for every public page: the same items, in the same order, so the
// nav never changes under a visitor who moves between the landing page, "Our
// story" and the guide pages. Only the link targets (anchor vs /#anchor) and
// the highlight differ.

const PAGES: [string, ComponentType][] = [
  ['landing', Landing],
  ['/story', Story],
  ['/igcse-french-speaking', IgcseFrenchSpeaking],
  ['/french-roleplay-practice', FrenchRoleplayPractice],
];

const LABELS = ['How it works', 'Why it works', 'The exam', 'Our story', 'FAQ'];

function primaryNav(markup: string): string {
  return markup.match(/<nav aria-label="Primary"[\s\S]*?<\/nav>/)?.[0] ?? '';
}

function labelsIn(nav: string): string[] {
  return [...nav.matchAll(/<a [^>]*>([^<]+)<\/a>/g)].map((m) => m[1]);
}

describe('SITE_NAV', () => {
  it('has the agreed items in landing-page order', () => {
    expect(SITE_NAV.map((i) => i.label)).toEqual(LABELS);
  });

  it('points every section item at a real landing section', () => {
    const ids: string[] = LANDING_SECTIONS.map((s) => s.id);
    for (const item of SITE_NAV.filter(isSectionItem)) expect(ids).toContain(item.section);
  });

  it('anchors in place on the landing page and links back to it from everywhere else', () => {
    const faq = SITE_NAV.find((i) => i.label === 'FAQ')!;
    expect(navHref(faq, true)).toBe('#faq');
    expect(navHref(faq, false)).toBe('/#faq');
    const story = SITE_NAV.find((i) => i.label === 'Our story')!;
    expect(navHref(story, true)).toBe('/story');
    expect(navHref(story, false)).toBe('/story');
  });
});

describe.each(PAGES)('%s header', (_name, Page) => {
  const nav = primaryNav(renderToStaticMarkup(createElement(Page)));

  it('shows the same five items in the same order', () => {
    expect(labelsIn(nav)).toEqual(LABELS);
  });

  it('has no leftover "Exam guide" / "Model answers" / "About" item', () => {
    expect(nav).not.toMatch(/Exam guide|Model answers|>About</);
  });
});

describe('Our story page', () => {
  const markup = renderToStaticMarkup(createElement(Story));

  it('is the current page in the header', () => {
    expect(primaryNav(markup)).toMatch(/<a [^>]*aria-current="page"[^>]*>Our story<\/a>|aria-current="page"[^>]*href="\/story"|href="\/story"[^>]*aria-current="page"/);
  });

  it('links the other sections back to the landing page', () => {
    expect(primaryNav(markup)).toContain('href="/#how-it-works"');
    expect(primaryNav(markup)).toContain('href="/#faq"');
  });

  it('no longer links to the retired /about page', () => {
    expect(markup).not.toContain('href="/about"');
  });
});
