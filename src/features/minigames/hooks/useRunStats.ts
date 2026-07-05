import { useState, useCallback, useMemo } from 'react';
import type { BaseRunStats } from '../types';

export interface RunStatsState {
  score: number;
  correctAnswers: number;
  totalAnswered: number;
  maxStreak: number;
  streak: number;
  accuracy: number;
  stats: BaseRunStats;
  recordCorrect: (points: number) => void;
  recordIncorrect: () => void;
  recordAnswered: () => void;
  addScore: (points: number) => void;
  reset: () => void;
}

export function useRunStats(): RunStatsState {
  const [score, setScore] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [streak, setStreak] = useState(0);

  const accuracy =
    totalAnswered > 0
      ? Math.round((correctAnswers / totalAnswered) * 100)
      : 0;

  const stats = useMemo<BaseRunStats>(
    () => ({
      score,
      correctAnswers,
      totalAnswered,
      maxStreak,
      accuracy,
    }),
    [score, correctAnswers, totalAnswered, maxStreak, accuracy]
  );

  const recordCorrect = useCallback((points: number) => {
    setTotalAnswered((t) => t + 1);
    setCorrectAnswers((c) => c + 1);
    setScore((s) => s + points);
    setStreak((prev) => {
      const next = prev + 1;
      setMaxStreak((max) => Math.max(max, next));
      return next;
    });
  }, []);

  const recordIncorrect = useCallback(() => {
    setTotalAnswered((t) => t + 1);
    setStreak(0);
  }, []);

  const recordAnswered = useCallback(() => {
    setTotalAnswered((t) => t + 1);
  }, []);

  const addScore = useCallback((points: number) => {
    setScore((s) => s + points);
  }, []);

  const reset = useCallback(() => {
    setScore(0);
    setCorrectAnswers(0);
    setTotalAnswered(0);
    setMaxStreak(0);
    setStreak(0);
  }, []);

  return {
    score,
    correctAnswers,
    totalAnswered,
    maxStreak,
    streak,
    accuracy,
    stats,
    recordCorrect,
    recordIncorrect,
    recordAnswered,
    addScore,
    reset,
  };
}
