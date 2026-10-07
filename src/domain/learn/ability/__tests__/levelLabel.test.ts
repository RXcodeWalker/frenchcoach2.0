// ── Learn overhaul Batch 1e — exam-relative level wording ───────────────────
import { describe, it, expect } from 'vitest';
import { cefrLevelLabel, levelLabel, measuredLevelDisplay } from '../levelLabel';
import type { AbilityResult } from '../deriveAbility';

function ability(overrides: Partial<AbilityResult>): AbilityResult {
  return { abilityScore: 4.5, overallConfidence: 0, measuredAnswers: 0, ...overrides };
}

describe('levelLabel', () => {
  it('maps to Warm-up (A1) · Exam level (A2) · Stretch (B1) · Stretch (B1+)', () => {
    expect(levelLabel('A1')).toBe('Warm-up (A1)');
    expect(levelLabel('A2')).toBe('Exam level (A2)');
    expect(levelLabel('B1')).toBe('Stretch (B1)');
    expect(levelLabel('B2')).toBe('Stretch (B1+)');
  });
});

describe('cefrLevelLabel (Batch 4: the coach model\'s cefrLevel)', () => {
  it('clamps everything above B1 to Stretch (B1+), never showing B2 or C1', () => {
    expect(cefrLevelLabel('A2')).toBe('Exam level (A2)');
    expect(cefrLevelLabel('b1')).toBe('Stretch (B1)');
    for (const code of ['B2', 'C1', 'C2']) {
      expect(cefrLevelLabel(code)).toBe('Stretch (B1+)');
      expect(cefrLevelLabel(code)).not.toMatch(/B2|C1|C2/);
    }
  });

  it('returns null for an unknown or missing code', () => {
    expect(cefrLevelLabel(undefined)).toBeNull();
    expect(cefrLevelLabel('Core-Secure')).toBeNull();
  });
});

describe('measuredLevelDisplay (docs §6.3)', () => {
  it('below the confidence gate shows a starting point, not "getting to know your level"', () => {
    const { band, caption } = measuredLevelDisplay(ability({ abilityScore: 4.5, overallConfidence: 0.1 }));
    expect(band).toBe('Starting point: Exam level (A2)');
    expect(caption).toBe("We'll adjust as you answer.");
  });

  it('the starting point follows the ability selection uses (a beginner seed)', () => {
    expect(measuredLevelDisplay(ability({ abilityScore: 2.5 })).band).toBe('Starting point: Warm-up (A1)');
  });

  it('low confidence shows "Around …" with the measured-answers caption', () => {
    const { band, caption } = measuredLevelDisplay(ability({ abilityScore: 6, overallConfidence: 0.3, measuredAnswers: 7 }));
    expect(band).toBe('Around Stretch (B1)');
    expect(caption).toBe('from 7 answers we could measure');
  });

  it('never shows B2 or C1, even for a high ability', () => {
    for (const overallConfidence of [0, 0.3, 0.9]) {
      const { band, caption } = measuredLevelDisplay(ability({ abilityScore: 9.5, overallConfidence, measuredAnswers: 1 }));
      expect(`${band} ${caption}`).not.toMatch(/B2|C1/);
      expect(band).toContain('Stretch (B1+)');
    }
  });
});
