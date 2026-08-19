import { describe, it, expect } from 'vitest';
import { aimFromMigratedTier, computeSessionTarget } from '../sessionTarget';

describe('aimFromMigratedTier', () => {
  it('maps beginner -> comfortable', () => {
    expect(aimFromMigratedTier('beginner')).toBe('comfortable');
  });
  it('maps expert -> push', () => {
    expect(aimFromMigratedTier('expert')).toBe('push');
  });
  it('maps intermediate/advanced/null -> balanced', () => {
    expect(aimFromMigratedTier('intermediate')).toBe('balanced');
    expect(aimFromMigratedTier('advanced')).toBe('balanced');
    expect(aimFromMigratedTier(null)).toBe('balanced');
  });
});

describe('computeSessionTarget', () => {
  it('applies the +-1.0 / 0 offset and clamps to [0, 10]', () => {
    expect(computeSessionTarget(5, 'comfortable')).toBe(4);
    expect(computeSessionTarget(5, 'balanced')).toBe(5);
    expect(computeSessionTarget(5, 'push')).toBe(6);
    expect(computeSessionTarget(0.5, 'comfortable')).toBe(0);
    expect(computeSessionTarget(9.5, 'push')).toBe(10);
  });
});
