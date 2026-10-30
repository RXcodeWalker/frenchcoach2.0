// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { getBest, getLastSetup, recordResult, saveLastSetup } from '../bestStore';

const run = (score: number, wave = 2) => ({ score, wave, bestCombo: 4, cleared: 9 });

beforeEach(() => localStorage.clear());

describe('bestStore', () => {
  it('starts empty', () => {
    expect(getBest('fr-en', 'steady')).toBeNull();
    expect(getLastSetup()).toBeNull();
  });

  it('keeps the higher score per direction and pace', () => {
    expect(recordResult('fr-en', 'steady', run(120))).toBe(true);
    expect(recordResult('fr-en', 'steady', run(90))).toBe(false);
    expect(recordResult('fr-en', 'steady', run(120))).toBe(false);
    expect(getBest('fr-en', 'steady')?.score).toBe(120);
    expect(recordResult('fr-en', 'steady', run(200, 4))).toBe(true);
    expect(getBest('fr-en', 'steady')).toMatchObject({ score: 200, wave: 4 });
    expect(getBest('en-fr', 'steady')).toBeNull();
    expect(getBest('fr-en', 'quick')).toBeNull();
  });

  it('does not store a round that scored nothing', () => {
    expect(recordResult('fr-en', 'steady', run(0))).toBe(false);
    expect(getBest('fr-en', 'steady')).toBeNull();
  });

  it('remembers the last setup alongside the bests', () => {
    recordResult('fr-en', 'steady', run(50));
    saveLastSetup({ direction: 'en-fr', pace: 'quick', topic: 'food' });
    expect(getLastSetup()).toEqual({ direction: 'en-fr', pace: 'quick', topic: 'food' });
    expect(getBest('fr-en', 'steady')?.score).toBe(50);
  });

  it('shrugs off a damaged or foreign value', () => {
    localStorage.setItem('frenchCoach_wordDropBests', '{"version":9}');
    expect(getBest('fr-en', 'steady')).toBeNull();
    localStorage.setItem('frenchCoach_wordDropBests', JSON.stringify({ version: 1, bests: { 'fr-en:steady': { score: 'x' } }, last: { direction: 'zz' } }));
    expect(getBest('fr-en', 'steady')).toBeNull();
    expect(getLastSetup()).toBeNull();
    localStorage.setItem('frenchCoach_wordDropBests', 'not json');
    expect(getBest('fr-en', 'steady')).toBeNull();
  });
});
