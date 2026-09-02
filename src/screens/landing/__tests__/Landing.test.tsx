import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Landing } from '../../Landing';

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
];

describe('Landing (static prerender output)', () => {
  const markup = renderToStaticMarkup(createElement(Landing));

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

  it('includes both primary CTAs', () => {
    expect(markup).toContain('Start practising free');
    expect(markup).toContain('See how it works');
  });

  it('does not contain any banned/unbuilt-feature strings', () => {
    for (const banned of BANNED_STRINGS) {
      expect(markup).not.toContain(banned);
    }
  });

  it('never claims a grade prediction — only the negation of one', () => {
    expect(markup).not.toMatch(/\bwe predict your grade|grade prediction feature|calibrated prediction of your grade\b/i);
    expect(markup).toContain('not a grade prediction');
  });

  it('frames DELF as planned, never as currently supported', () => {
    expect(markup).not.toContain('DELF preparation');
    expect(markup).toMatch(/Planned:\s*DELF/);
  });
});
