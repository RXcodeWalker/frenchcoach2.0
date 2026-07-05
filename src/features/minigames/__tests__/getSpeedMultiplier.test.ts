import { describe, it, expect } from 'vitest';
import { getSpeedMultiplier } from '../utils/getSpeedMultiplier';

describe('getSpeedMultiplier', () => {
  it('returns 3× under 3 seconds', () => {
    expect(getSpeedMultiplier(2.9)).toEqual({
      multiplier: 3,
      label: 'GODLIKE SPEED!',
    });
  });

  it('returns 2× between 3 and 5 seconds', () => {
    expect(getSpeedMultiplier(3)).toEqual({
      multiplier: 2,
      label: 'LIGHTNING FAST!',
    });
    expect(getSpeedMultiplier(4.9)).toEqual({
      multiplier: 2,
      label: 'LIGHTNING FAST!',
    });
  });

  it('returns 1.5× between 5 and 8 seconds', () => {
    expect(getSpeedMultiplier(5)).toEqual({
      multiplier: 1.5,
      label: 'SPEEDY!',
    });
    expect(getSpeedMultiplier(7.9)).toEqual({
      multiplier: 1.5,
      label: 'SPEEDY!',
    });
  });

  it('returns 1× at 8 seconds or more', () => {
    expect(getSpeedMultiplier(8)).toEqual({ multiplier: 1, label: '' });
    expect(getSpeedMultiplier(20)).toEqual({ multiplier: 1, label: '' });
  });
});
