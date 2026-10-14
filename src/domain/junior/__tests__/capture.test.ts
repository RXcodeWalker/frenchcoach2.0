import { describe, expect, it } from 'vitest';
import { END_SILENCE_MS, HARD_LIMIT_MS, startCaptureWatch, tickCapture, type CaptureWatch } from '../capture';
import { MIC_SOUND_LEVEL } from '../warmup';

const LOUD = MIC_SOUND_LEVEL + 0.2;
const QUIET = MIC_SOUND_LEVEL / 2;

function run(steps: Array<[level: number, at: number]>): { watch: CaptureWatch; stop: string; at: number | null } {
  let watch = startCaptureWatch(0);
  for (const [level, at] of steps) {
    const r = tickCapture(watch, level, at);
    watch = r.watch;
    if (r.stop !== 'continue') return { watch, stop: r.stop, at };
  }
  return { watch, stop: 'continue', at: null };
}

describe('Junior capture end-of-speech rule (junior-track §4)', () => {
  it('does not stop on silence before the kid has started speaking', () => {
    const r = run([[QUIET, 3000], [QUIET, 6000], [QUIET, 9000]]);
    expect(r.stop).toBe('continue');
    expect(r.watch.speechStarted).toBe(false);
  });

  it('stops after the end-of-speech silence once speech has started', () => {
    const r = run([[LOUD, 500], [QUIET, 500 + END_SILENCE_MS - 1], [QUIET, 500 + END_SILENCE_MS]]);
    expect(r).toMatchObject({ stop: 'silence', at: 500 + END_SILENCE_MS });
  });

  it('a pause mid-sentence shorter than the silence window does not stop it, and more speech resets the clock', () => {
    const r = run([[LOUD, 500], [QUIET, 2000], [LOUD, 2400], [QUIET, 2400 + END_SILENCE_MS - 1]]);
    expect(r.stop).toBe('continue');
  });

  it('the hard limit ends a capture that never goes quiet, and one that never starts', () => {
    expect(run([[LOUD, 1000], [LOUD, HARD_LIMIT_MS]])).toMatchObject({ stop: 'limit', at: HARD_LIMIT_MS });
    expect(run([[QUIET, 5000], [QUIET, HARD_LIMIT_MS]])).toMatchObject({ stop: 'limit' });
  });

  it('tracks the peak level for the warm-up decision and the silence rule', () => {
    const r = run([[0.1, 100], [0.5, 200], [0.2, 300]]);
    expect(r.watch.peak).toBe(0.5);
  });

  it('keeps the constants in this one file as positive numbers, silence shorter than the hard limit', () => {
    expect(END_SILENCE_MS).toBeGreaterThan(0);
    expect(HARD_LIMIT_MS).toBeGreaterThan(END_SILENCE_MS);
  });
});
