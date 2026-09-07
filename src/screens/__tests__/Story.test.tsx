import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Story } from '../Story';

describe('Story (static prerender output)', () => {
  const markup = renderToStaticMarkup(createElement(Story));

  it('renders exactly one <h1>', () => {
    const matches = markup.match(/<h1[\s>]/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('does not skip heading levels (h1 then only h2)', () => {
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

  it('renders the seven numbered chapters', () => {
    for (const n of ['01', '02', '03', '04', '05', '06', '07']) {
      expect(markup).toContain(`${n} —`);
    }
  });

  it('links back to the app root and keeps a primary CTA', () => {
    expect(markup).toContain('href="/"');
    expect(markup).toContain('Start practising free');
  });

  it('frames DELF B2 as a future target, never as supported today', () => {
    expect(markup).toContain('DELF target, next');
    expect(markup).not.toContain('DELF B2 preparation');
  });
});
