// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { isSfxSilenced, resetSfxForTests } from '../sfx';
import { MIC_SILENCE_TAIL_MS, useMicSilence, useSfxSilence } from '../useSfx';

beforeEach(() => {
  vi.useFakeTimers();
  resetSfxForTests();
});
afterEach(() => {
  vi.useRealTimers();
  resetSfxForTests();
});

describe('useMicSilence', () => {
  it('is silent while the mic is open and for a short tail after it closes', () => {
    const { rerender } = renderHook(({ open }) => useMicSilence(open), { initialProps: { open: false } });
    expect(isSfxSilenced()).toBe(false);
    rerender({ open: true });
    expect(isSfxSilenced()).toBe(true);
    rerender({ open: false });
    expect(isSfxSilenced()).toBe(true); // recognisers still capturing
    vi.advanceTimersByTime(MIC_SILENCE_TAIL_MS + 10);
    expect(isSfxSilenced()).toBe(false);
  });

  it('a second recording opened inside the tail keeps silence', () => {
    const { rerender } = renderHook(({ open }) => useMicSilence(open), { initialProps: { open: true } });
    rerender({ open: false });
    rerender({ open: true });
    vi.advanceTimersByTime(MIC_SILENCE_TAIL_MS + 10);
    expect(isSfxSilenced()).toBe(true);
  });
});

describe('useSfxSilence', () => {
  it('holds for as long as the component is mounted', () => {
    const { unmount } = renderHook(() => useSfxSilence());
    expect(isSfxSilenced()).toBe(true);
    unmount();
    expect(isSfxSilenced()).toBe(false);
  });
});
