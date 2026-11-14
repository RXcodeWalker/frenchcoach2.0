// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const speak = vi.hoisted(() => vi.fn());
vi.mock('../../../services/tts/ttsService', () => ({
  TTS: { speak, stop: vi.fn(), canSpeakFrench: () => true, isSupported: () => true },
}));

import { useBroadcast } from '../useBroadcast';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  speak.mockReset();
});

describe('useBroadcast', () => {
  it('plays every sentence as a recorded line, in order, then counts the story as heard', async () => {
    vi.useFakeTimers();
    speak.mockImplementation(() => new Promise<void>(r => setTimeout(r, 1000)));
    const { result } = renderHook(() => useBroadcast(['Un.', 'Deux.']));
    act(() => result.current.playAll());
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(speak.mock.calls.map(c => c[0])).toEqual(['Un.', 'Deux.']);
    expect(speak.mock.calls[0][1]).toMatchObject({ recorded: true });
    expect(result.current.listened).toBe(true);
    expect(result.current.playing).toBe(false);
  });

  it('a stop drops the rest of the story and does not count it as heard', async () => {
    vi.useFakeTimers();
    speak.mockImplementation(() => new Promise<void>(r => setTimeout(r, 1000)));
    const { result } = renderHook(() => useBroadcast(['Un.', 'Deux.', 'Trois.']));
    act(() => result.current.playAll());
    act(() => result.current.stop());
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(speak).toHaveBeenCalledTimes(1);
    expect(result.current.listened).toBe(false);
  });

  it('marks audio unavailable when every line "finishes" without making a sound', async () => {
    speak.mockResolvedValue(undefined);
    const { result } = renderHook(() => useBroadcast(['Un.']));
    await act(async () => { result.current.playAll(); await Promise.resolve(); await Promise.resolve(); });
    expect(result.current.unavailable).toBe(true);
    expect(result.current.listened).toBe(false);
  });
});
