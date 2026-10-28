// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { BENCHMARK_VERSION } from '../../../domain/pronunciation/lab/benchmark';
import { LAB_THRESHOLDS_VERSION } from '../../../domain/pronunciation/lab/thresholds';
import { buildLabTake } from '../../../domain/pronunciation/lab/wordStates';
import { azureWord, scripted } from '../../../domain/pronunciation/lab/__tests__/labFixtures';
import { STORAGE_KEYS, setStorageScope } from '../../persistence/storage';
import { getLabHistory, getSoundProgress, recordLabTake, saveMonthlyCheck } from '../labStore';

const take = buildLabTake('Le vin rouge.', scripted([azureWord('le', 95, { phonemeScores: [95, 95] }), azureWord('vin', 60, { phonemeScores: [90, 35] }), azureWord('rouge', 80, { phonemeScores: [60, 95, 90] })]));

beforeEach(() => {
  localStorage.clear();
  setStorageScope('learner-1');
});

describe('labStore', () => {
  it('starts empty and survives unreadable storage', () => {
    expect(getLabHistory()).toEqual({ v: 1, observations: [], checks: [] });
    localStorage.setItem(`${STORAGE_KEYS.labHistory}::learner-1`, '{not json');
    expect(getLabHistory().observations).toEqual([]);
  });

  it('records a take as sound families with the local day — no word, sentence or audio', () => {
    recordLabTake(take, new Date(2026, 10, 3, 9, 0));
    const { observations } = getLabHistory();
    expect(observations.map((o) => o.family)).toEqual(['nasalIn', 'frenchR', 'uOu']);
    expect(observations.every((o) => o.day === '2026-11-03')).toBe(true);
    const raw = localStorage.getItem(`${STORAGE_KEYS.labHistory}::learner-1`) ?? '';
    expect(raw).not.toMatch(/vin|rouge|Le /);
  });

  it('a refused take records nothing', () => {
    recordLabTake(buildLabTake('Le vin.', scripted([azureWord('le', 95), azureWord('vin', 30)], { mode: 'freeform' })));
    expect(getLabHistory().observations).toEqual([]);
    expect(localStorage.getItem(`${STORAGE_KEYS.labHistory}::learner-1`)).toBeNull();
  });

  it('keeps the history per account', () => {
    recordLabTake(take);
    setStorageScope('learner-2');
    expect(getLabHistory().observations).toEqual([]);
  });

  it('saves a monthly check beside the observations', () => {
    recordLabTake(take);
    saveMonthlyCheck({ day: '2026-11-03', benchmarkVersion: BENCHMARK_VERSION, thresholdsVersion: LAB_THRESHOLDS_VERSION, sentences: [{ index: 0, wordsClear: 5, wordsTotal: 8 }] });
    const h = getLabHistory();
    expect(h.checks).toHaveLength(1);
    expect(h.observations.length).toBeGreaterThan(0);
  });

  it('builds "Your French sounds" from the takes, naming a family only after enough takes on enough days', () => {
    expect(getSoundProgress().measured).toBe(0);
    for (let i = 0; i < 6; i++) recordLabTake(take, new Date(2026, 10, 1 + (i % 2), 9, 0));
    const progress = getSoundProgress();
    expect(progress.measured).toBeGreaterThan(0);
    expect(progress.workOn.length + progress.strongest.length).toBeGreaterThan(0);
  });
});
