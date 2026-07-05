// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGameTimer } from '../hooks/useGameTimer';

describe('useGameTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('ticks down every second in 1s mode', () => {
    const { result } = renderHook(() =>
      useGameTimer({ mode: 'global', initialSeconds: 5, active: true })
    );

    expect(result.current.timeLeft).toBe(5);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.timeLeft).toBe(4);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.timeLeft).toBe(1);
  });

  it('fires onExpire when global timer reaches zero', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useGameTimer({
        mode: 'global',
        initialSeconds: 3,
        active: true,
        onExpire,
      })
    );

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.timeLeft).toBe(0);
    expect(result.current.isExpired).toBe(true);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('does not tick while paused', () => {
    const { result } = renderHook(() =>
      useGameTimer({
        mode: 'global',
        initialSeconds: 10,
        active: true,
        paused: true,
      })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.timeLeft).toBe(10);
  });

  it('skips ticks when internally paused', () => {
    const { result } = renderHook(() =>
      useGameTimer({ mode: 'global', initialSeconds: 10, active: true })
    );

    act(() => {
      result.current.pause();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.timeLeft).toBe(10);

    act(() => {
      result.current.resume();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.timeLeft).toBe(9);
  });

  it('adds and subtracts time', () => {
    const { result } = renderHook(() =>
      useGameTimer({ mode: 'global', initialSeconds: 10, active: false })
    );

    act(() => {
      result.current.addTime(5);
      result.current.subtractTime(3);
    });
    expect(result.current.timeLeft).toBe(12);
  });

  it('resets per-question timer to new max', () => {
    const { result } = renderHook(() =>
      useGameTimer({ mode: 'perQuestion', initialSeconds: 20, active: true })
    );

    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(result.current.timeLeft).toBe(15);

    act(() => {
      result.current.reset(12);
    });
    expect(result.current.timeLeft).toBe(12);
    expect(result.current.maxTime).toBe(12);
    expect(result.current.progress).toBe(1);
  });

  it('ticks by 0.1s in 100ms decisecond mode', () => {
    const onExpire = vi.fn();
    const { result } = renderHook(() =>
      useGameTimer({
        mode: 'perQuestion',
        initialSeconds: 0.5,
        tickMs: 100,
        active: true,
        onExpire,
      })
    );

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.timeLeft).toBe(0.4);

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current.timeLeft).toBe(0);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('marks critical when below threshold', () => {
    const { result } = renderHook(() =>
      useGameTimer({
        mode: 'global',
        initialSeconds: 11,
        active: true,
        criticalThreshold: 10,
      })
    );

    expect(result.current.isCritical).toBe(false);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current.timeLeft).toBe(9);
    expect(result.current.isCritical).toBe(true);
  });
});
