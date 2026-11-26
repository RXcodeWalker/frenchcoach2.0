/**
 * My Plan UI rules (Design System v2): no text under 12px, only the named
 * motions (no hover scale, looping pulses, glows, gradients or confetti),
 * colour only from role tokens, no emoji in the chrome.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const PIECES = join(__dirname, '..');
const MODEL = join(__dirname, '..', '..', '..', 'features', 'myPlan');
const SCREEN = join(__dirname, '..', '..', 'MyPlan.tsx');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name);
    if (name === '__tests__') return [];
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

const sources = [...files(PIECES), ...files(MODEL), SCREEN].map(f => [f, readFileSync(f, 'utf8')] as const);

const BANNED: Array<[string, RegExp]> = [
  ['text under 12px', /text-\[(?:\d|1[01])(?:\.\d+)?px\]/],
  ['hover motion', /whileHover|hover:scale/],
  ['looping animation', /animate-(?:pulse|ping|bounce|spin)|repeat:\s*Infinity|repeatType/],
  ['gradient', /bg-gradient-|radial-gradient|linear-gradient/],
  ['glow or blur', /shadow-\[[^\]]*rgba|drop-shadow|backdrop-blur|\bblur-/],
  ['confetti', /confetti|Burst/],
  ['raw colour classes', /\b(?:text|bg|border)-(?:slate|red|emerald|amber|cyan|violet|lime|orange|pink|sky|blue|green|white|black)(?:-\d{2,3})?\b/],
  ['inline hex colour', /#[0-9a-fA-F]{6}\b|rgba?\(/],
  ['an emoji', /\p{Extended_Pictographic}/u],
  ['the old italic uppercase heading style', /\bitalic\b|tracking-tighter/],
  ['the XP colour (a plan is not a reward)', /reward/],
];

describe('My Plan design rules', () => {
  it('scans the screen, its pieces and the model', () => {
    expect(sources.some(([f]) => f.endsWith('MyPlan.tsx'))).toBe(true);
    expect(sources.some(([f]) => f.endsWith('PlanRoad.tsx'))).toBe(true);
    expect(sources.some(([f]) => f.endsWith('planModel.ts'))).toBe(true);
  });

  it.each(BANNED)('no %s', (_label, re) => {
    expect(sources.filter(([, text]) => re.test(text)).map(([f]) => f)).toEqual([]);
  });
});
