// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFloatingXP } from '../hooks/useFloatingXP';

describe('useFloatingXP', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds floating XP items', () => {
    const { result } = renderHook(() => useFloatingXP());

    act(() => {
      result.current.add({ amount: 10, x: 5 });
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].amount).toBe(10);
    expect(result.current.items[0].x).toBe(5);
    expect(result.current.items[0].y).toBe(0);
  });

  it('auto-removes items after default duration', () => {
    const { result } = renderHook(() => useFloatingXP());

    act(() => {
      result.current.add({ id: 42, amount: 5, x: 0 });
    });
    expect(result.current.items).toHaveLength(1);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it('removes item manually', () => {
    const { result } = renderHook(() => useFloatingXP());

    act(() => {
      result.current.add({ id: 7, amount: 5, x: 0 });
      result.current.remove(7);
    });
    expect(result.current.items).toHaveLength(0);
  });

  it('clears all items', () => {
    const { result } = renderHook(() => useFloatingXP());

    act(() => {
      result.current.add({ id: 1, amount: 5, x: 0 });
      result.current.add({ id: 2, amount: 10, x: 0 });
      result.current.clear();
    });
    expect(result.current.items).toHaveLength(0);
  });
});
