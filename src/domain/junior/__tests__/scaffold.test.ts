import { describe, expect, it } from 'vitest';
import { INITIAL_PATTERN_PROGRESS, recordPatternTurn, recordTurn, stepFor, type PatternProgress } from '../scaffold';
import type { MatchOutcome } from '../types';

const P = 'j-aime-le-X';

function run(outcomes: MatchOutcome[], start?: PatternProgress) {
  let progress = start;
  const events = [];
  for (const o of outcomes) {
    const r = recordPatternTurn(P, progress, o);
    progress = r.progress;
    if (r.event) events.push(r.event);
  }
  return { progress: progress!, events };
}

describe('scaffold ladder (junior-track §5)', () => {
  it('a new pattern starts at Echo', () => {
    expect(stepFor({}, P)).toBe('echo');
    expect(INITIAL_PATTERN_PROGRESS.step).toBe('echo');
  });

  it('Echo → Frame after 2 "got it" turns, with a levelledUp event', () => {
    const { progress, events } = run(['got', 'got']);
    expect(progress).toEqual({ step: 'frame', got: 0, misses: 0 });
    expect(events).toEqual([{ type: 'levelledUp', patternId: P, from: 'echo', to: 'frame' }]);
  });

  it('Frame → Free after 3 more "got it" turns', () => {
    const { progress, events } = run(['got', 'got', 'got', 'got', 'got']);
    expect(progress.step).toBe('free');
    expect(events.map((e) => e.to)).toEqual(['frame', 'free']);
  });

  it('Free is the top: more "got it" turns emit nothing', () => {
    const { events } = run(['got', 'got'], { step: 'free', got: 0, misses: 0 });
    expect(events).toEqual([]);
  });

  it('two misses at a step drop one step, silently (no event)', () => {
    for (const misses of [['almost', 'almost'], ['none', 'none'], ['almost', 'none']] as MatchOutcome[][]) {
      const { progress, events } = run(misses, { step: 'free', got: 0, misses: 0 });
      expect(progress).toEqual({ step: 'frame', got: 0, misses: 0 });
      expect(events).toEqual([]);
    }
  });

  it('a "got it" between misses resets the miss count', () => {
    const { progress } = run(['none', 'got', 'none'], { step: 'frame', got: 0, misses: 0 });
    expect(progress.step).toBe('frame');
  });

  it('never drops below Echo', () => {
    const { progress, events } = run(['none', 'none', 'none', 'none']);
    expect(progress.step).toBe('echo');
    expect(events).toEqual([]);
  });

  it('a drop restarts the "got it" count at the lower step', () => {
    const { progress, events } = run(['none', 'none', 'got', 'got'], { step: 'frame', got: 2, misses: 0 });
    expect(progress.step).toBe('frame');
    expect(events).toEqual([{ type: 'levelledUp', patternId: P, from: 'echo', to: 'frame' }]);
  });
});

describe('recordTurn', () => {
  it('moves each frame\'s own pattern', () => {
    const { progress, events } = recordTurn({ 'j-ai-N-ans': { step: 'echo', got: 1, misses: 0 } }, [
      { patternId: 'j-ai-N-ans', outcome: 'got' },
      { patternId: 'j-ai-un-X', outcome: 'almost' },
    ]);
    expect(progress['j-ai-N-ans'].step).toBe('frame');
    expect(progress['j-ai-un-X']).toEqual({ step: 'echo', got: 0, misses: 1 });
    expect(events.map((e) => e.patternId)).toEqual(['j-ai-N-ans']);
  });

  it('a pattern used twice in one turn moves once, on its weaker frame', () => {
    const { progress } = recordTurn({}, [
      { patternId: P, outcome: 'got' },
      { patternId: P, outcome: 'almost' },
    ]);
    expect(progress[P]).toEqual({ step: 'echo', got: 0, misses: 1 });
    const both = recordTurn({}, [
      { patternId: P, outcome: 'got' },
      { patternId: P, outcome: 'got' },
    ]);
    expect(both.progress[P]).toEqual({ step: 'echo', got: 1, misses: 0 });
  });

  it('does not mutate its input', () => {
    const before = { [P]: { step: 'echo' as const, got: 1, misses: 0 } };
    recordTurn(before, [{ patternId: P, outcome: 'got' }]);
    expect(before[P]).toEqual({ step: 'echo', got: 1, misses: 0 });
  });
});
