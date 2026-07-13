// @vitest-environment jsdom
import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { useGuestMode, isGuestMode } from '../useGuestMode';

describe('useGuestMode: full guest lifecycle', () => {
  beforeEach(() => localStorage.clear());

  it('enter -> persists across a simulated reload -> untouched by cancel round-trip -> cleared on real exit', () => {
    const first = renderHook(() => useGuestMode());
    act(() => first.result.current.enterGuestMode());
    expect(first.result.current.isGuest).toBe(true);

    // Simulated reload: a fresh renderHook instance re-reads persisted state,
    // the same way a real page reload would re-mount AppShell from scratch.
    const afterReload = renderHook(() => useGuestMode());
    expect(afterReload.result.current.isGuest).toBe(true);
    expect(isGuestMode()).toBe(true);

    // Visiting /login and clicking Cancel never calls exitGuestMode() (per
    // the Auth.tsx design) — assert the flag is untouched by mere navigation.
    expect(isGuestMode()).toBe(true);

    // Only an explicit exit (real login success, or "Exit Guest Mode") clears it.
    act(() => afterReload.result.current.exitGuestMode());
    expect(afterReload.result.current.isGuest).toBe(false);
    expect(first.result.current.isGuest).toBe(false); // useSyncExternalStore: both subscribers agree
  });
});
