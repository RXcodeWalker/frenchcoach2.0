/**
 * Learn overhaul Batch 5 — the role tokens themselves must clear WCAG AA in
 * both themes, so "use the token" is a safe instruction. Parses the token
 * blocks out of src/index.css (the single source of truth) and composites
 * translucent soft fills over the surface they sit on.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const css = readFileSync(join(__dirname, '../../../index.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('}', start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--([\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const dark = block(':root');
const light = { ...dark, ...block('html:not(.dark)') };

type RGBA = [number, number, number, number];
function parse(v: string): RGBA {
  const hex = v.match(/^#([0-9a-f]{6})$/i);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1];
  }
  const rgba = v.match(/^rgba?\(([^)]+)\)$/);
  if (!rgba) throw new Error(`unparseable colour: ${v}`);
  const p = rgba[1].split(',').map(s => parseFloat(s));
  return [p[0], p[1], p[2], p[3] ?? 1];
}
function over(top: RGBA, bottom: RGBA): RGBA {
  const a = top[3];
  return [0, 1, 2].map(i => top[i] * a + bottom[i] * (1 - a)).concat(1) as RGBA;
}
function lum([r, g, b]: RGBA): number {
  const f = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a: RGBA, b: RGBA): number {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const themes = { dark, light } as const;
const TEXT_TOKENS = ['ink', 'ink-muted', 'ink-subtle', 'action-text', 'progress-text', 'reward-text', 'correction-text', 'info-text', 'streak-text'];
const SURFACES = ['bg', 'surface', 'surface-recessed'];
const SOFT = ['action-soft', 'progress-soft', 'reward-soft', 'correction-soft', 'info-soft'];

describe.each(Object.entries(themes))('%s theme tokens', (_name, t) => {
  it.each(TEXT_TOKENS)('%s reaches AA (4.5:1) on every surface', token => {
    expect(t[token], `--${token} is defined`).toBeDefined();
    for (const s of SURFACES) {
      expect(ratio(parse(t[token]), parse(t[s])), `${token} on ${s}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(SOFT)('%s text token stays AA on its own soft fill', soft => {
    expect(t[soft], `--${soft} is defined`).toBeDefined();
    const textToken = soft.replace('-soft', '-text');
    for (const s of ['surface', 'surface-recessed']) {
      const fill = over(parse(t[soft]), parse(t[s]));
      expect(ratio(parse(t[textToken]), fill), `${textToken} on ${soft}/${s}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('action-ink on action fill is AA', () => {
    expect(ratio(parse(t['action-ink']), parse(t['action']))).toBeGreaterThanOrEqual(4.5);
  });

  it('non-text strokes (--action, --progress, --correction as icon/decoration) reach 3:1', () => {
    for (const token of ['action', 'progress', 'correction']) {
      expect(ratio(parse(t[token]), parse(t['surface'])), token).toBeGreaterThanOrEqual(3);
    }
  });
});
