import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Owner decision, 2026-10-30: Rapid Fire does not award XP "right now". The
 * simplest guarantee is structural — nothing that can award XP, record a
 * session or touch the streak is reachable from the screen or its folder.
 * If Rapid Fire should count later, change this test together with the code.
 */
const ROOT = resolve(__dirname, '../../..');
const FILES = [
  join(ROOT, 'screens/RapidFire.tsx'),
  ...readdirSync(join(ROOT, 'features/rapidFire'))
    .filter(f => /\.(ts|tsx)$/.test(f))
    .map(f => join(ROOT, 'features/rapidFire', f)),
];

const FORBIDDEN = [
  'AppContext',
  'useApp',
  'dispatchAddXP',
  'completeMinigameSession',
  'computeXPGain',
  'progressionService',
  'ADD_XP',
  'ADD_SESSION',
  'xpEventLog',
  'sessionOrchestrator',
];

describe('Rapid Fire awards no XP', () => {
  it('covers the screen and every source file in the feature', () => {
    expect(FILES.length).toBeGreaterThan(6);
  });

  for (const file of FILES) {
    it(`${file.replace(ROOT, 'src')} touches no XP, session or app-state API`, () => {
      const source = readFileSync(file, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      for (const name of FORBIDDEN) expect(source, name).not.toContain(name);
    });
  }
});
