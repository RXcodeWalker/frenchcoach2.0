// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useScreenWakeLock } from '../useScreenWakeLock';

function installWakeLock() {
  const sentinels: { released: boolean; release: ReturnType<typeof vi.fn> }[] = [];
  const request = vi.fn(async () => {
    const s = { released: false, release: vi.fn(async () => { s.released = true; }) };
    sentinels.push(s);
    return s;
  });
  Object.defineProperty(navigator, 'wakeLock', { value: { request }, configurable: true });
  return { request, sentinels };
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

afterEach(() => {
  delete (navigator as unknown as Record<string, unknown>).wakeLock;
  Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
});

describe('useScreenWakeLock', () => {
  it('holds the lock only while active and releases it after', async () => {
    const { request, sentinels } = installWakeLock();
    const { rerender } = renderHook(({ on }) => useScreenWakeLock(on), { initialProps: { on: false } });
    expect(request).not.toHaveBeenCalled();
    await act(async () => rerender({ on: true }));
    expect(request).toHaveBeenCalledWith('screen');
    await act(async () => rerender({ on: false }));
    expect(sentinels[0].release).toHaveBeenCalled();
  });

  it('re-requests when the page comes back after the browser dropped the lock', async () => {
    const { request, sentinels } = installWakeLock();
    renderHook(() => useScreenWakeLock(true));
    await act(async () => undefined);
    expect(request).toHaveBeenCalledTimes(1);
    sentinels[0].released = true; // the browser drops it while hidden
    setVisibility('hidden');
    await act(async () => setVisibility('visible'));
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('is a silent no-op where the API is missing or refuses', async () => {
    renderHook(() => useScreenWakeLock(true)); // no navigator.wakeLock in jsdom
    Object.defineProperty(navigator, 'wakeLock', {
      value: { request: vi.fn(async () => { throw new DOMException('battery saver', 'NotAllowedError'); }) },
      configurable: true,
    });
    const { unmount } = renderHook(() => useScreenWakeLock(true));
    await act(async () => undefined);
    unmount();
  });
});
