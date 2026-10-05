import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  putTurnAudio,
  getTurnAudio,
  getTurnAudioKeys,
  clearExamAudio,
  clearAllExamAudio,
  IDLE_TTL_MS,
} from '../examAudioStore';

const blob = (n = 4) => new Blob([new Uint8Array(n)], { type: 'audio/webm' });

describe('examAudioStore', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    clearAllExamAudio();
  });
  afterEach(() => {
    clearAllExamAudio();
    vi.useRealTimers();
  });

  it('stores and returns a blob per (session, turn)', () => {
    const a = blob(), b = blob(8);
    putTurnAudio('s1', 3, a);
    putTurnAudio('s1', 5, b);
    expect(getTurnAudio('s1', 3)).toBe(a);
    expect(getTurnAudio('s1', 5)).toBe(b);
    expect(getTurnAudioKeys('s1')).toEqual([3, 5]);
  });

  it('keeps sessions apart', () => {
    putTurnAudio('s1', 1, blob());
    expect(getTurnAudio('s2', 1)).toBeUndefined();
    expect(getTurnAudioKeys('s2')).toEqual([]);
  });

  it('does not store a missing or empty blob (a turn with no audio has no entry)', () => {
    putTurnAudio('s1', 1, null);
    putTurnAudio('s1', 2, undefined);
    putTurnAudio('s1', 3, new Blob([]));
    putTurnAudio('', 4, blob());
    expect(getTurnAudioKeys('s1')).toEqual([]);
    expect(getTurnAudioKeys('')).toEqual([]);
  });

  it('replaces the blob when the same turn is stored again', () => {
    const first = blob(), second = blob(9);
    putTurnAudio('s1', 1, first);
    putTurnAudio('s1', 1, second);
    expect(getTurnAudio('s1', 1)).toBe(second);
    expect(getTurnAudioKeys('s1')).toEqual([1]);
  });

  it('clearExamAudio drops only that session', () => {
    putTurnAudio('s1', 1, blob());
    putTurnAudio('s2', 1, blob());
    clearExamAudio('s1');
    expect(getTurnAudio('s1', 1)).toBeUndefined();
    expect(getTurnAudio('s2', 1)).toBeDefined();
    expect(() => clearExamAudio('never-existed')).not.toThrow();
    expect(() => clearExamAudio('')).not.toThrow();
  });

  it('clearAllExamAudio drops every session', () => {
    putTurnAudio('s1', 1, blob());
    putTurnAudio('s2', 1, blob());
    clearAllExamAudio();
    expect(getTurnAudioKeys('s1')).toEqual([]);
    expect(getTurnAudioKeys('s2')).toEqual([]);
  });

  it('drops a session after 60 minutes idle', () => {
    putTurnAudio('s1', 1, blob());
    vi.advanceTimersByTime(IDLE_TTL_MS - 1);
    expect(getTurnAudio('s1', 1)).toBeDefined();
    vi.advanceTimersByTime(IDLE_TTL_MS);
    expect(getTurnAudio('s1', 1)).toBeUndefined();
  });

  it('a read counts as activity and restarts the idle clock', () => {
    putTurnAudio('s1', 1, blob());
    vi.advanceTimersByTime(IDLE_TTL_MS - 1000);
    expect(getTurnAudio('s1', 1)).toBeDefined();
    vi.advanceTimersByTime(IDLE_TTL_MS - 1000);
    expect(getTurnAudio('s1', 1)).toBeDefined();
  });

  it('expires lazily even if the timer was throttled (clock moved, timer did not fire)', () => {
    putTurnAudio('s1', 1, blob());
    vi.setSystemTime(Date.now() + IDLE_TTL_MS + 1);
    expect(getTurnAudio('s1', 1)).toBeUndefined();
  });

  it('storing into an expired session starts a fresh one without the old turns', () => {
    putTurnAudio('s1', 1, blob());
    vi.setSystemTime(Date.now() + IDLE_TTL_MS + 1);
    putTurnAudio('s1', 2, blob());
    expect(getTurnAudioKeys('s1')).toEqual([2]);
  });
});
