// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountdown } from '../hooks/useCountdown';

describe('useCountdown', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts down 3-2-1 then shows GO!', () => {
    const { result } = renderHook(() => useCountdown({ from: 3 }));

    act(() => {
      result.current.start();
    });
    expect(result.current.value).toBe(3);
    expect(result.current.display).toBe(3);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.value).toBe(2);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.value).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.value).toBe(0);
    expect(result.current.display).toBe('GO!');
  });

  it('calls onComplete when countdown finishes', () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useCountdown({ from: 2, onComplete })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.value).toBe(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(result.current.isComplete).toBe(true);
    expect(result.current.isRunning).toBe(false);
  });

  it('starts automatically when active is true', () => {
    const { result } = renderHook(() =>
      useCountdown({ from: 3, active: true })
    );

    expect(result.current.isRunning).toBe(true);

    for (let i = 0; i < 3; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    expect(result.current.isComplete).toBe(true);
  });

  it('supports custom go label', () => {
    const { result } = renderHook(() =>
      useCountdown({ from: 1, goLabel: 'FIGHT!' })
    );

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.display).toBe('FIGHT!');
  });

  it('resets to initial value', () => {
    const { result } = renderHook(() => useCountdown({ from: 3 }));

    act(() => {
      result.current.start();
      vi.advanceTimersByTime(1000);
      result.current.reset();
    });

    expect(result.current.value).toBe(3);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.isRunning).toBe(false);
  });
});
