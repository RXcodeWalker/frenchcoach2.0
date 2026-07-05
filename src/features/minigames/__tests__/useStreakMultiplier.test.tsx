// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useStreakMultiplier } from '../hooks/useStreakMultiplier';
import { DEFAULT_STREAK_TIERS } from '../utils/getStreakMultiplier';

describe('useStreakMultiplier', () => {
  it('increments streak and maxStreak on correct', () => {
    const { result } = renderHook(() => useStreakMultiplier());

    act(() => {
      result.current.onCorrect();
      result.current.onCorrect();
      result.current.onCorrect();
    });

    expect(result.current.streak).toBe(3);
    expect(result.current.maxStreak).toBe(3);
    expect(result.current.multiplier).toBe(1.5);
  });

  it('resets streak on incorrect but keeps maxStreak', () => {
    const { result } = renderHook(() => useStreakMultiplier());

    act(() => {
      result.current.onCorrect();
      result.current.onCorrect();
      result.current.onIncorrect();
    });

    expect(result.current.streak).toBe(0);
    expect(result.current.maxStreak).toBe(2);
  });

  it('enters overdrive at threshold 10', () => {
    const { result } = renderHook(() => useStreakMultiplier());

    act(() => {
      for (let i = 0; i < 9; i++) result.current.onCorrect();
    });
    expect(result.current.isOverdrive).toBe(false);

    act(() => {
      result.current.onCorrect();
    });
    expect(result.current.isOverdrive).toBe(true);
    expect(result.current.multiplier).toBe(3);
  });

  it('uses custom tiers including 5× RapidFire tier', () => {
    const { result } = renderHook(() =>
      useStreakMultiplier({ tiers: DEFAULT_STREAK_TIERS })
    );

    act(() => {
      for (let i = 0; i < 20; i++) result.current.onCorrect();
    });
    expect(result.current.multiplier).toBe(5);
  });

  it('reset clears streak and maxStreak', () => {
    const { result } = renderHook(() => useStreakMultiplier());

    act(() => {
      result.current.onCorrect();
      result.current.reset();
    });

    expect(result.current.streak).toBe(0);
    expect(result.current.maxStreak).toBe(0);
  });
});
