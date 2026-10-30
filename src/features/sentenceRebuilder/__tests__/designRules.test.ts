/**
 * Sentence Rebuilder UI rules (Design System v2): no text under 12px, only the
 * named motions (no hover scale, looping pulses, glows, gradients or confetti),
 * and colour only from role tokens. The first version of this screen broke
 * every one of these.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FEATURE = join(__dirname, '..');
const SCREEN = join(__dirname, '..', '..', '..', 'screens', 'SentenceRebuilder.tsx');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    if (name === '__tests__') return [];
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

const sources = [...files(FEATURE), SCREEN].map(f => [f, readFileSync(f, 'utf8')] as const);

const BANNED: Array<[string, RegExp]> = [
  ['text under 12px', /text-\[(?:\d|1[01])(?:\.\d+)?px\]/],
  ['hover motion', /whileHover|hover:scale/],
  ['looping animation', /animate-(?:pulse|ping|bounce|spin)|repeat:\s*Infinity|repeatType/],
  ['gradient', /bg-gradient-|radial-gradient|linear-gradient/],
  ['glow or blur', /shadow-\[[^\]]*rgba|drop-shadow|backdrop-blur|\bblur-/],
  ['confetti', /confetti/i],
  ['raw colour classes', /\b(?:text|bg|border)-(?:slate|red|emerald|amber|cyan|violet|lime|orange|pink|sky|blue|green|white|black)(?:-\d{2,3})?\b/],
  ['inline hex colour', /#[0-9a-fA-F]{6}\b|rgba?\(/],
  ['an emoji', /\p{Extended_Pictographic}/u],
  ['a shake or rotate', /rotate:\s*\[|x:\s*\[/],
  ['the old italic uppercase heading style', /\bitalic\b|tracking-tighter/],
];

describe('Sentence Rebuilder design rules', () => {
  it('scans the whole feature and the screen', () => {
    expect(sources.some(([f]) => f.endsWith('PlayView.tsx'))).toBe(true);
    expect(sources.some(([f]) => f.endsWith('SentenceRebuilder.tsx'))).toBe(true);
  });

  it.each(BANNED)('no %s', (_label, re) => {
    expect(sources.filter(([, text]) => re.test(text)).map(([f]) => f)).toEqual([]);
  });
});
