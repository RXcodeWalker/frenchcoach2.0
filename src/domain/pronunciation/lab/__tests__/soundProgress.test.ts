import { describe, expect, it } from 'vitest';
import { SCORED_FAMILIES, type DatedObservation, type ScoredFamilyId } from '../soundFamilies';
import { soundProgress } from '../soundProgress';

/** Enough evidence to leave "not enough data": 6 observations over 2 days, all at `accuracy`. */
function evidence(family: ScoredFamilyId, accuracy: number): DatedObservation[] {
  return Array.from({ length: 6 }, (_, i) => ({ family, accuracy, basis: 'phoneme' as const, day: i % 2 === 0 ? '2026-11-01' : '2026-11-02' }));
}

describe('soundProgress', () => {
  it('names nothing without enough data', () => {
    const p = soundProgress([{ family: 'frenchR', accuracy: 90, basis: 'phoneme', day: '2026-11-01' }]);
    expect(p).toMatchObject({ strongest: [], workOn: [], measured: 0 });
    expect(SCORED_FAMILIES.every((f) => p.statuses[f] === 'notEnoughData')).toBe(true);
  });

  it('puts the best two first and the weakest two to work on', () => {
    const p = soundProgress([
      ...evidence('frenchR', 92),
      ...evidence('uOu', 85),
      ...evidence('nasalAn', 81),
      ...evidence('eu', 40),
      ...evidence('oi', 55),
      ...evidence('gnIll', 30),
    ]);
    expect(p.measured).toBe(6);
    expect(p.strongest).toEqual(['frenchR', 'uOu']);
    expect(p.workOn).toEqual(['gnIll', 'eu']);
  });

  it('never lists a family as both strong and to work on, and "Getting there" can be either', () => {
    const p = soundProgress([...evidence('frenchR', 70), ...evidence('uOu', 65)]);
    expect(p.strongest).toEqual(['frenchR', 'uOu']);
    expect(p.workOn).toEqual([]);
  });

  it('with one weak family and nothing strong, only the work-on side is filled', () => {
    const p = soundProgress(evidence('eu', 30));
    expect(p.strongest).toEqual([]);
    expect(p.workOn).toEqual(['eu']);
  });
});
