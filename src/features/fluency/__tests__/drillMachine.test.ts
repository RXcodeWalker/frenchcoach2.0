import { describe, expect, it } from 'vitest';
import { GET_READY_S } from '../../../domain/fluency/drill432';
import { metrics } from '../../../domain/fluency/__tests__/fixtures';
import { drillReducer, initialDrillState, measuredRounds, type DrillAction, type DrillState } from '../drillMachine';

const run = (actions: DrillAction[], from: DrillState = initialDrillState()) => actions.reduce(drillReducer, from);
const ok = (limitS: number): DrillAction => ({ type: 'measured', outcome: 'ok', result: { limitS, metrics: metrics(), stoppedEarly: false } });

describe('drill flow', () => {
  it('counts down, then records', () => {
    const ticks = Array.from({ length: GET_READY_S - 1 }, () => ({ type: 'tick' }) as DrillAction);
    expect(run(ticks).phase).toEqual({ kind: 'countdown', round: 0, left: 1 });
    expect(run([...ticks, { type: 'tick' }]).phase).toEqual({ kind: 'recording', round: 0 });
    expect(run([{ type: 'skipCountdown' }]).phase.kind).toBe('recording');
  });

  it('walks the three rounds to done', () => {
    const s = run([
      { type: 'skipCountdown' }, { type: 'stop' }, ok(60), { type: 'next' },
      { type: 'skipCountdown' }, { type: 'stop' }, ok(45), { type: 'next' },
      { type: 'skipCountdown' }, { type: 'stop' }, ok(30), { type: 'next' },
    ]);
    expect(s.phase.kind).toBe('done');
    expect(measuredRounds(s).map((r) => r.limitS)).toEqual([60, 45, 30]);
  });

  it('a round with no speech must be recorded again: no next, nothing stored', () => {
    const s = run([{ type: 'skipCountdown' }, { type: 'stop' }, { type: 'measured', outcome: 'noSpeech', result: null }]);
    expect(s.phase).toEqual({ kind: 'review', round: 0, outcome: 'noSpeech' });
    expect(run([{ type: 'next' }], s)).toBe(s);
    expect(measuredRounds(s)).toEqual([]);
    expect(run([{ type: 'retry' }], s).phase).toEqual({ kind: 'countdown', round: 0, left: GET_READY_S });
  });

  it('can finish early and keeps only the measured rounds', () => {
    const s = run([
      { type: 'skipCountdown' }, { type: 'stop' }, ok(60), { type: 'next' },
      { type: 'skipCountdown' }, { type: 'stop' }, { type: 'measured', outcome: 'unmeasured', result: null }, { type: 'finish' },
    ]);
    expect(s.phase.kind).toBe('done');
    expect(measuredRounds(s).map((r) => r.limitS)).toEqual([60]);
  });

  it('ignores actions that don’t fit the phase (a double stop, a stray tick)', () => {
    const recording = run([{ type: 'skipCountdown' }]);
    expect(run([{ type: 'tick' }], recording)).toBe(recording);
    const measuring = run([{ type: 'stop' }], recording);
    expect(run([{ type: 'stop' }], measuring)).toBe(measuring);
  });
});
