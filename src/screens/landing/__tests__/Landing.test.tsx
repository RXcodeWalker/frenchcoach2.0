import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Landing } from '../../Landing';
import { LANDING_FAQ, LANDING_SECTIONS } from '../landingContent';
import { PAGE_SEO } from '../../../config/seo';
import { LEARN_ANSWERS_PER_DAY } from '../../../features/learn/dailyAllowance';

// Hidden or unbuilt features (src/config/launchScope.ts) must not be advertised.
const BANNED_STRINGS = [
  'Whisper',
  'spaced repetition',
  'Leagues',
  'Daily Challenge',
  'Study Groups',
  'Boss Battle',
  'Mastery',
  'Fluency Heatmap',
  'Roadmap',
  'Rapid Fire',
  'Speed Speaking',
  'Word Drop',
  'Survival',
  'Speaking Arena',
  'Challenges',
  'Listening Mode',
  'Sentence Rebuilder',
  'scenario',
];

// The owner removed hedging copy from the landing page; it must not creep back.
const HEDGING = [/illustrative/i, /unvalidated/i, /early preview/i, /in active development/i, /rough signal/i];

// …and must not be replaced with claims we can't back up.
const OVERCLAIMS = [
  /predicts? your grade/i,
  /exactly like (the )?cambridge/i,
  /(?<!not an )official (cambridge )?(mark|grade|score)/i,
  /same as (a |the )?real examiner/i,
  /\b\d{2,}(,\d{3})*\+? (students|learners|users)\b/i,
  /testimonial/i,
];

describe('Landing (static prerender output)', () => {
  const markup = renderToStaticMarkup(createElement(Landing));
  const text = markup.replace(/<[^>]+>/g, ' ');
  // The page body only: the shared footer links to every marketing page.
  const mainText = (markup.match(/<main[\s\S]*<\/main>/)?.[0] ?? '').replace(/<[^>]+>/g, ' ');

  it('renders exactly one <h1>', () => {
    const matches = markup.match(/<h1[\s>]/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('does not skip heading levels', () => {
    const levels = [...markup.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]));
    expect(levels[0]).toBe(1);
    let maxSeen = levels[0];
    for (const level of levels.slice(1)) {
      expect(level).toBeLessThanOrEqual(maxSeen + 1);
      maxSeen = Math.max(maxSeen, level);
    }
  });

  it('never ships opacity:0 in the static output', () => {
    expect(markup).not.toMatch(/opacity:\s*0(?!\.\d)/);
    expect(markup).not.toContain('opacity: 0');
  });

  it('ships the finished demo, not an empty animation frame', () => {
    expect(markup).toContain('Feedback ready');
    expect(markup).toContain('What you did well');
    expect(markup).toContain('Fix this first');
    expect(markup).not.toContain('invisible');
  });

  it('includes the primary CTA, sign-in and section navigation', () => {
    expect(markup).toContain('Start practising free');
    expect(markup).toContain('See how it works');
    expect(markup).toContain('href="/login"');
    for (const section of LANDING_SECTIONS) {
      expect(markup).toContain(`id="${section.id}"`);
      expect(markup).toContain(`href="#${section.id}"`);
    }
  });

  it('does not contain any banned/unbuilt-feature strings', () => {
    for (const banned of BANNED_STRINGS) {
      expect(mainText).not.toContain(banned);
    }
  });

  it('carries no hedging copy and no unprovable claims', () => {
    for (const re of [...HEDGING, ...OVERCLAIMS]) {
      expect(text).not.toMatch(re);
    }
  });

  it('describes marking as "against the criteria", never as equivalence', () => {
    expect(text).toContain('marked against the Cambridge 0520 speaking criteria');
  });

  it('states the launch limits instead of promising unlimited practice', () => {
    expect(text).not.toMatch(/as many (questions|answers) as you (like|want)|unlimited/i);
    expect(text).toContain(`${LEARN_ANSWERS_PER_DAY} marked answers a day`);
  });

  it('keeps the Cambridge non-affiliation statement', () => {
    expect(text).toMatch(/not affiliated with or endorsed by\s+Cambridge Assessment International Education/);
  });

  it('shows every FAQ the structured data describes, and nothing else', () => {
    for (const item of LANDING_FAQ) {
      expect(markup).toContain(item.question);
      expect(markup).toContain(item.answer);
    }
    const faqSchema = PAGE_SEO['/'].jsonLd?.find((b) => b['@type'] === 'FAQPage') as
      | { mainEntity: { name: string }[] }
      | undefined;
    expect(faqSchema?.mainEntity.map((q) => q.name)).toEqual(LANDING_FAQ.map((q) => q.question));
  });
});
