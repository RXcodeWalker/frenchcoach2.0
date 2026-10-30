/**
 * Boss Battle awards nothing yet (owner, 2026-10-30): a fight must not touch
 * XP, gems, a Session, mastery, Learn evidence, the review pool, achievements
 * or analytics. Its one write is its own star record (`bossStore.ts`). This
 * scans the feature and its screen for the ways app state is written, so adding
 * XP later is a deliberate edit to this test, not a quiet import.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const FEATURE = join(__dirname, '..');
const SCREEN = join(__dirname, '..', '..', '..', 'screens', 'BossBattle.tsx');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (name === '__tests__') return [];
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

const sources = [...files(FEATURE), SCREEN].map((f) => [f, readFileSync(f, 'utf8')] as const);

const FORBIDDEN: Array<[string, RegExp]> = [
  ['the app state hook', /\buseApp\b|\bAppContext\b/],
  ['an XP dispatch', /dispatchAddXP|completeMinigameSession|computeXPGain|ADD_XP|ADD_SESSION|addXP/],
  ['progression or session services', /progressionService|sessionOrchestrator|sessionSync|xpEventLog|recordReviewOutcome|recordDemandOnlyAttempt/],
  ['coach evidence, mastery or achievements', /coachEvidence|topicMastery|checkAchievements|achievements/],
  ['analytics or telemetry', /\btrack\(|captureError|telemetryService/],
  ['the network', /\bfetch\(|supabase|apiClient/],
];

describe('Boss Battle writes no app state', () => {
  it('scans the feature and the screen', () => {
    expect(sources.some(([f]) => f.endsWith('engine.ts'))).toBe(true);
    expect(sources.some(([f]) => f.endsWith('BossBattle.tsx'))).toBe(true);
  });

  it.each(FORBIDDEN)('never reaches for %s', (_label, re) => {
    // Comments that explain the rule may name these; only code counts.
    const code = (text: string) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(sources.filter(([, text]) => re.test(code(text))).map(([f]) => f)).toEqual([]);
  });

  it('the only storage key it writes is its own', () => {
    const writers = sources.filter(([, text]) => /storageSet|localStorage\.setItem|STORAGE_KEYS\./.test(text)).map(([f]) => f.split('/').pop());
    expect(writers).toEqual(['bossStore.ts']);
    const keys = sources.flatMap(([, text]) => [...text.matchAll(/STORAGE_KEYS\.(\w+)/g)].map((m) => m[1]));
    expect(new Set(keys)).toEqual(new Set(['bossBattle']));
  });
});
