import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// Owner directive (2026-10-30): Emoji Master must not affect XP for now.
// Nothing in the feature may dispatch XP, write a Session, or reach the shared
// minigame award helper. Lift this by deleting the test with the owner's say-so,
// not by adding an exemption.
const ROOT = join(__dirname, '../../../..');
const FILES = ['src/screens/EmojiMaster.tsx', 'src/screens/emoji-master'];

const FORBIDDEN: { pattern: RegExp; why: string }[] = [
  { pattern: /completeMinigameSession/, why: 'the shared helper that awards minigame XP' },
  { pattern: /dispatchAddXP/, why: 'adds XP and gems' },
  { pattern: /['"]ADD_XP['"]/, why: 'the XP reducer action' },
  { pattern: /['"]ADD_SESSION['"]/, why: 'writes a Session (XP, streak and mastery side effects)' },
  { pattern: /awardGemsForXP|progressionService|computeXPGain/, why: 'the XP and gem pipeline' },
  { pattern: /\bxpAwarded\b/, why: 'the old per-run XP field' },
];

function sourceFiles(path: string): string[] {
  const full = join(ROOT, path);
  if (!statSync(full).isDirectory()) return [full];
  return readdirSync(full).flatMap((name) => {
    const child = join(path, name);
    if (name === '__tests__') return [];
    return sourceFiles(child);
  });
}

describe('Emoji Master awards no XP', () => {
  const files = FILES.flatMap(sourceFiles).filter((f) => /\.tsx?$/.test(f));

  it('scans the feature', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  for (const { pattern, why } of FORBIDDEN) {
    it(`never uses ${pattern.source} (${why})`, () => {
      const offenders = files
        .filter((f) => pattern.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')))
        .map((f) => relative(ROOT, f));
      expect(offenders).toEqual([]);
    });
  }
});
