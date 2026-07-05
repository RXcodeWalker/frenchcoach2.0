// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRunStats } from '../hooks/useRunStats';

describe('useRunStats', () => {
  it('tracks correct answers and score', () => {
    const { result } = renderHook(() => useRunStats());

    act(() => {
      result.current.recordCorrect(10);
      result.current.recordCorrect(5);
    });

    expect(result.current.correctAnswers).toBe(2);
    expect(result.current.totalAnswered).toBe(2);
    expect(result.current.score).toBe(15);
    expect(result.current.accuracy).toBe(100);
    expect(result.current.streak).toBe(2);
    expect(result.current.maxStreak).toBe(2);
  });

  it('tracks incorrect answers and resets streak', () => {
    const { result } = renderHook(() => useRunStats());

    act(() => {
      result.current.recordCorrect(5);
      result.current.recordIncorrect();
    });

    expect(result.current.correctAnswers).toBe(1);
    expect(result.current.totalAnswered).toBe(2);
    expect(result.current.accuracy).toBe(50);
    expect(result.current.streak).toBe(0);
    expect(result.current.maxStreak).toBe(1);
  });

  it('exposes stats object for grading', () => {
    const { result } = renderHook(() => useRunStats());

    act(() => {
      result.current.recordCorrect(10);
    });

    expect(result.current.stats).toEqual({
      score: 10,
      correctAnswers: 1,
      totalAnswered: 1,
      maxStreak: 1,
      accuracy: 100,
    });
  });

  it('adds score without recording an answer', () => {
    const { result } = renderHook(() => useRunStats());

    act(() => {
      result.current.addScore(20);
    });
    expect(result.current.score).toBe(20);
    expect(result.current.totalAnswered).toBe(0);
  });

  it('resets all stats', () => {
    const { result } = renderHook(() => useRunStats());

    act(() => {
      result.current.recordCorrect(10);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.score).toBe(0);
    expect(result.current.correctAnswers).toBe(0);
    expect(result.current.totalAnswered).toBe(0);
    expect(result.current.maxStreak).toBe(0);
    expect(result.current.streak).toBe(0);
    expect(result.current.accuracy).toBe(0);
  });
});
