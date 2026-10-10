// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { useTypedReveal } from '../useTypedReveal';
import { TOTAL_CAP_MS } from '../typing';

function stubReducedMotion(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({ matches: matches && query.includes('reduce'), media: query, addEventListener() {}, removeEventListener() {} }),
  });
}

const COUNTS = [0, 80, 0, 120, 0];

beforeEach(() => {
  vi.useFakeTimers();
  stubReducedMotion(false);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('useTypedReveal', () => {
  it('starts with the first line only and finishes within the cap', () => {
    const key = {};
    const { result } = renderHook(() => useTypedReveal(key, COUNTS));
    expect(result.current.visible).toBe(1);
    expect(result.current.done).toBe(false);
    act(() => { vi.advanceTimersByTime(TOTAL_CAP_MS + 200); });
    expect(result.current.done).toBe(true);
    expect(result.current.visible).toBe(COUNTS.length);
  });

  it('skip shows everything at once', () => {
    const key = {};
    const { result } = renderHook(() => useTypedReveal(key, COUNTS));
    act(() => { result.current.skip(); });
    expect(result.current.done).toBe(true);
    expect(result.current.visible).toBe(COUNTS.length);
  });

  it('is instant under prefers-reduced-motion', () => {
    stubReducedMotion(true);
    const { result } = renderHook(() => useTypedReveal({}, COUNTS));
    expect(result.current.done).toBe(true);
    expect(result.current.visible).toBe(COUNTS.length);
  });

  it('does not type the same attempt again after it has played', () => {
    const key = {};
    const first = renderHook(() => useTypedReveal(key, COUNTS));
    act(() => { first.result.current.skip(); });
    first.unmount();
    const again = renderHook(() => useTypedReveal(key, COUNTS));
    expect(again.result.current.done).toBe(true);
  });

  it('types a new attempt from the start', () => {
    const old = {};
    const { result, rerender } = renderHook(({ k }) => useTypedReveal(k, COUNTS), { initialProps: { k: old } });
    act(() => { result.current.skip(); });
    rerender({ k: {} });
    expect(result.current.done).toBe(false);
    expect(result.current.visible).toBe(1);
  });
});
