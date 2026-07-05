import { useState, useCallback } from 'react';
import {
  getStreakMultiplier,
  STANDARD_STREAK_TIERS,
} from '../utils/getStreakMultiplier';
import type { StreakTier } from '../utils/getStreakMultiplier';

export interface UseStreakMultiplierOptions {
  tiers?: StreakTier[];
  overdriveThreshold?: number;
}

export interface StreakMultiplierState {
  streak: number;
  maxStreak: number;
  multiplier: number;
  isOverdrive: boolean;
  overdriveThreshold: number;
  onCorrect: () => void;
  onIncorrect: () => void;
  reset: () => void;
}

export function useStreakMultiplier({
  tiers = STANDARD_STREAK_TIERS,
  overdriveThreshold = 10,
}: UseStreakMultiplierOptions = {}): StreakMultiplierState {
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);

  const multiplier = getStreakMultiplier(streak, tiers);
  const isOverdrive = streak >= overdriveThreshold;

  const onCorrect = useCallback(() => {
    setStreak((prev) => {
      const next = prev + 1;
      setMaxStreak((max) => Math.max(max, next));
      return next;
    });
  }, []);

  const onIncorrect = useCallback(() => {
    setStreak(0);
  }, []);

  const reset = useCallback(() => {
    setStreak(0);
    setMaxStreak(0);
  }, []);

  return {
    streak,
    maxStreak,
    multiplier,
    isOverdrive,
    overdriveThreshold,
    onCorrect,
    onIncorrect,
    reset,
  };
}
