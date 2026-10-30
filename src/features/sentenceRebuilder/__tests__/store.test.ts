// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { STORAGE_KEYS } from '../../../services/persistence/storage';
import { getBest, getCleanCounts, getLastSetup, masteredCount, recordClean, recordResult, saveLastSetup } from '../store';

beforeEach(() => localStorage.clear());

describe('Sentence Rebuilder store', () => {
  it('starts empty', () => {
    expect(getBest('classic', 'mixed')).toBeNull();
    expect(getLastSetup()).toBeNull();
    expect(getCleanCounts()).toEqual({});
  });

  it('keeps one best per mode and level, and only replaces it with a higher score', () => {
    expect(recordResult('classic', 'mixed', { score: 500, solved: 6, bestCombo: 3 })).toBe(true);
    expect(recordResult('classic', 'mixed', { score: 400, solved: 8, bestCombo: 8 })).toBe(false);
    expect(recordResult('classic', 'mixed', { score: 500, solved: 7, bestCombo: 4 })).toBe(false);
    expect(getBest('classic', 'mixed')?.score).toBe(500);
    expect(getBest('speed', 'mixed')).toBeNull();
    expect(recordResult('speed', 'mixed', { score: 900, solved: 9, bestCombo: 5 })).toBe(true);
    expect(getBest('classic', 'mixed')?.score).toBe(500);
  });

  it('never stores a zero score as a best', () => {
    expect(recordResult('classic', 'starter', { score: 0, solved: 0, bestCombo: 0 })).toBe(false);
    expect(getBest('classic', 'starter')).toBeNull();
  });

  it('remembers the last setup and ignores a corrupt one', () => {
    saveLastSetup({ mode: 'tricky', level: 'stretch' });
    expect(getLastSetup()).toEqual({ mode: 'tricky', level: 'stretch' });
    saveLastSetup({ mode: 'bogus', level: 'stretch' } as never);
    expect(getLastSetup()).toBeNull();
  });

  it('counts a clean solve once per round per sentence, and masters a sentence at two', () => {
    recordClean(['a', 'a', 'b']);
    expect(getCleanCounts()).toEqual({ a: 1, b: 1 });
    recordClean(['a']);
    expect(getCleanCounts()).toEqual({ a: 2, b: 1 });
    expect(masteredCount(['a', 'b', 'c'], getCleanCounts())).toBe(1);
  });

  it('survives garbage in storage', () => {
    localStorage.setItem(Object.keys(localStorage)[0] ?? 'x', 'not json');
    for (const bad of ['not json', '{"version":2}', '[]', 'null']) {
      for (const key of Object.keys(localStorage)) localStorage.removeItem(key);
      localStorage.setItem(`${STORAGE_KEYS.sentenceRebuilder}::guest`, bad);
      localStorage.setItem(STORAGE_KEYS.sentenceRebuilder, bad);
      expect(getBest('classic', 'mixed')).toBeNull();
      expect(getCleanCounts()).toEqual({});
    }
  });
});
