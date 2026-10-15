import { describe, it, expect } from 'vitest';
import {
  emptyJuniorState, parseJuniorState, parseLearnerTrack, startMission, recordTurn, finishMission, markDemoSeen,
  isMissionResumable, MISSION_RESUME_MS,
} from '../state';

const T0 = 1_700_000_000_000;

describe('24 h mission resume', () => {
  const stored = (startedAt: number) => ({ ...emptyJuniorState(), activeMission: { themeId: 'colors', startedAt, results: [{ turnId: 't1', outcome: 'got' }] } });

  it('keeps a mission younger than 24 h, with its finished turns', () => {
    const s = parseJuniorState(stored(T0), T0 + MISSION_RESUME_MS - 1);
    expect(s.activeMission?.results).toEqual([{ turnId: 't1', outcome: 'got' }]);
  });
  it('drops it silently at 24 h, leaving no sticker, count or tally behind', () => {
    const s = parseJuniorState(stored(T0), T0 + MISSION_RESUME_MS);
    expect(s).toEqual(emptyJuniorState());
  });
  it('treats a start time in the future (clock change) as not resumable', () => {
    expect(parseJuniorState(stored(T0 + 5000), T0).activeMission).toBeNull();
  });
  it('starting the same theme within the window resumes; another theme or an expired one replaces', () => {
    const s = startMission(emptyJuniorState(), 'colors', T0);
    expect(startMission(s, 'colors', T0 + 1000)).toBe(s);
    expect(startMission(s, 'me', T0 + 1000).activeMission).toEqual({ themeId: 'me', startedAt: T0 + 1000, results: [] });
    expect(startMission(s, 'colors', T0 + MISSION_RESUME_MS).activeMission?.startedAt).toBe(T0 + MISSION_RESUME_MS);
    expect(isMissionResumable(null, T0)).toBe(false);
  });
});

describe('parse is defensive', () => {
  it.each([null, undefined, 'x', 7, [], { stickers: 5, unlocks: 'a', outcomeTally: 'z', patternSteps: { p: 'expert' } }])('falls back for %j', (raw) => {
    expect(parseJuniorState(raw, T0)).toEqual(emptyJuniorState());
  });
  it('filters bad entries and keeps good ones', () => {
    const s = parseJuniorState({
      patternSteps: { a: 'frame', b: 'nope' }, stickers: { colors: ['s1', 's1', 3] }, unlocks: ['u', 4],
      missionsDone: { colors: 2, me: -1 }, demoSeen: true, outcomeTally: { got: 2, almost: 'x', none: 1.9 },
    }, T0);
    expect(s.patternSteps).toEqual({ a: 'frame' });
    expect(s.stickers).toEqual({ colors: ['s1'] });
    expect(s.unlocks).toEqual(['u']);
    expect(s.missionsDone).toEqual({ colors: 2, me: 0 });
    expect(s.demoSeen).toBe(true);
    expect(s.outcomeTally).toEqual({ got: 2, almost: 0, none: 1 });
    expect(s.silentTries).toBe(0);
  });
  it('track defaults to exam', () => {
    expect(parseLearnerTrack('junior')).toBe('junior');
    expect(parseLearnerTrack('anything')).toBe('exam');
    expect(parseLearnerTrack(null)).toBe('exam');
  });
});

describe('turn recording', () => {
  it('records outcomes honestly and ignores a repeated turn id', () => {
    let s = startMission(emptyJuniorState(), 'colors', T0);
    s = recordTurn(s, { turnId: 't1', outcome: 'none' });
    expect(recordTurn(s, { turnId: 't1', outcome: 'got' })).toBe(s);
    expect(s.activeMission?.results).toEqual([{ turnId: 't1', outcome: 'none' }]);
    expect(s.outcomeTally.none).toBe(1);
  });
  it('counts silent tries apart from outcomes and keeps them off the stored result', () => {
    let s = startMission(emptyJuniorState(), 'colors', T0);
    s = recordTurn(s, { turnId: 't1', outcome: 'none', silentTries: 2 });
    expect(s.silentTries).toBe(2);
    expect(s.outcomeTally).toEqual({ got: 0, almost: 0, none: 1 });
    expect(s.activeMission?.results).toEqual([{ turnId: 't1', outcome: 'none' }]);
  });
  it('is a no-op with no active mission', () => {
    const s = emptyJuniorState();
    expect(recordTurn(s, { turnId: 't1', outcome: 'got' })).toBe(s);
  });
});

describe('a two-frame turn moves both of its patterns', () => {
  it('records every pattern step passed with the turn, once', () => {
    const s0 = startMission(emptyJuniorState(), 'colors', T0);
    const s1 = recordTurn(s0, { turnId: 'q1', outcome: 'got' }, [
      { patternId: 'a', step: 'frame' },
      { patternId: 'b', step: 'free' },
    ]);
    expect(s1.patternSteps).toEqual({ a: 'frame', b: 'free' });
    // The same turn id again is ignored entirely, steps included.
    expect(recordTurn(s1, { turnId: 'q1', outcome: 'none' }, { patternId: 'a', step: 'echo' })).toBe(s1);
  });
});

describe('stickers reward finishing, never accuracy', () => {
  const run = (outcomes: Array<'got' | 'almost' | 'none'>) => {
    let s = startMission(emptyJuniorState(), 'colors', T0);
    outcomes.forEach((o, i) => { s = recordTurn(s, { turnId: `t${i}`, outcome: o }); });
    const done = finishMission(s, { themeId: 'colors', stickerId: 'colors-1' });
    return { stickers: done.stickers, unlocks: done.unlocks, missionsDone: done.missionsDone, active: done.activeMission };
  };
  it('an all-none mission earns exactly what an all-got mission earns', () => {
    expect(run(['none', 'none', 'none', 'none'])).toEqual(run(['got', 'got', 'got', 'got']));
  });
  it('an unfinished mission earns nothing', () => {
    const s = recordTurn(startMission(emptyJuniorState(), 'colors', T0), { turnId: 't1', outcome: 'got' });
    expect(s.stickers).toEqual({});
  });
  it('finishing a different theme than the active one is ignored', () => {
    const s = startMission(emptyJuniorState(), 'colors', T0);
    expect(finishMission(s, { themeId: 'me', stickerId: 'me-1' })).toBe(s);
  });
});

describe('demo flag', () => {
  it('is set once', () => {
    const s = markDemoSeen(emptyJuniorState());
    expect(s.demoSeen).toBe(true);
    expect(markDemoSeen(s)).toBe(s);
  });
});
