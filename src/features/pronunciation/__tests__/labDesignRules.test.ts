/**
 * Pronunciation Lab UI rules (pronunciation-lab plan §4 "Design System v2"):
 * no text under 12px, only the eight named motions (no hover scale, looping
 * pulses, glows, gradients or confetti). Colour is held to role tokens by
 * `src/screens/learn/__tests__/lightContrast.test.ts`, which scans this folder
 * with no allowlist entry.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(__dirname, '..');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === '__tests__') return [];
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

const BANNED: Array<[string, RegExp]> = [
  ['text under 12px', /text-\[(?:\d|1[01])(?:\.\d+)?px\]/],
  ['hover motion', /whileHover|hover:scale/],
  ['looping pulse', /animate-(?:pulse|ping|bounce)/],
  ['gradient', /bg-gradient-/],
  ['glow', /shadow-\[[^\]]*rgba/],
  ['confetti', /confetti/i],
];

describe('Pronunciation Lab design rules', () => {
  const sources = files(DIR).map((f) => [f, readFileSync(f, 'utf8')] as const);

  it('scans the Lab UI', () => {
    expect(sources.some(([f]) => f.endsWith('LabPractice.tsx'))).toBe(true);
  });

  it.each(BANNED)('no %s', (_label, re) => {
    expect(sources.filter(([, text]) => re.test(text)).map(([f]) => f)).toEqual([]);
  });
});
