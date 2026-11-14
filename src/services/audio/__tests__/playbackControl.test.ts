import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  attachEngine,
  claimPlayback,
  pausePlayback,
  playbackStatusFor,
  releasePlayback,
  resetPlaybackForTests,
  resumePlayback,
  stopPlayback,
} from '../playbackControl';

const engine = () => ({ pause: vi.fn(), resume: vi.fn(), stop: vi.fn() });

describe('playbackControl', () => {
  beforeEach(() => resetPlaybackForTests());

  it('a claimed play is playing, then paused and resumed on its engine', () => {
    const token = claimPlayback('a');
    const e = engine();
    attachEngine(e);
    expect(playbackStatusFor('a')).toBe('playing');
    expect(playbackStatusFor('b')).toBe('idle');
    pausePlayback();
    expect(e.pause).toHaveBeenCalledTimes(1);
    expect(playbackStatusFor('a')).toBe('paused');
    resumePlayback();
    expect(e.resume).toHaveBeenCalledTimes(1);
    expect(playbackStatusFor('a')).toBe('playing');
    releasePlayback(token);
    expect(playbackStatusFor('a')).toBe('idle');
  });

  it('an engine that attaches while paused (the next sound of the same play) starts paused', () => {
    claimPlayback('a');
    const first = engine();
    const detach = attachEngine(first);
    pausePlayback();
    detach();
    const second = engine();
    attachEngine(second);
    expect(second.pause).toHaveBeenCalledTimes(1);
    resumePlayback();
    expect(second.resume).toHaveBeenCalledTimes(1);
  });

  it('a new claim stops the current (even paused) sound and takes over; the old release is ignored', () => {
    const oldToken = claimPlayback('a');
    const e = engine();
    attachEngine(e);
    pausePlayback();
    claimPlayback('b');
    expect(e.stop).toHaveBeenCalledTimes(1);
    expect(playbackStatusFor('b')).toBe('playing');
    releasePlayback(oldToken);
    expect(playbackStatusFor('b')).toBe('playing');
  });

  it('stopPlayback stops the engine', () => {
    claimPlayback('a');
    const e = engine();
    attachEngine(e);
    stopPlayback();
    expect(e.stop).toHaveBeenCalledTimes(1);
  });

  it('pausing with nothing claimed does nothing', () => {
    const e = engine();
    attachEngine(e);
    pausePlayback();
    expect(e.pause).not.toHaveBeenCalled();
  });
});
