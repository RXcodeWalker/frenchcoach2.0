// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { azureWord, scripted } from '../../../domain/pronunciation/lab/__tests__/labFixtures';
import { buildLabTake } from '../../../domain/pronunciation/lab/wordStates';
import { clearLabHistory, loadLabHistory, recordLabDrill, recordLabTake, resetLabStoreForTests, useLabHistory } from '../labStore';

const KEY = 'frenchCoach_pronunciationLab';
const NOW = new Date(2026, 9, 28, 12, 0, 0);

function take(scores: number[]) {
  return buildLabTake(
    'Le vin rouge.',
    scripted(['Le', 'vin', 'rouge'].map((w, i) => azureWord(w, scores[i], { phonemeScores: [scores[i], scores[i]] }))),
  );
}

beforeEach(() => {
  localStorage.clear();
  resetLabStoreForTests();
});
afterEach(() => cleanup());

describe('labStore', () => {
  it('starts empty, keeps a take under its key, and returns the same object until something changes', () => {
    const empty = loadLabHistory();
    expect(empty.observations).toEqual([]);
    expect(loadLabHistory()).toBe(empty);

    recordLabTake(take([95, 30, 85]), NOW);
    const stored = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    expect(stored.version).toBe(1);
    expect(stored.observations.length).toBeGreaterThan(0);
    expect(stored.observations[0].day).toBe('2026-10-28');
    expect(Object.keys(stored.words)).toEqual(['vin']);
    expect(loadLabHistory()).toBe(loadLabHistory());
  });

  it('never writes the sentence, a transcript or audio', () => {
    recordLabTake(take([95, 30, 85]), NOW);
    const raw = localStorage.getItem(KEY) ?? '';
    expect(raw).not.toMatch(/rouge|Le vin/);
  });

  it('a refused take or an Almost drill writes nothing', () => {
    recordLabTake(buildLabTake('Le vin.', scripted([azureWord('le', 10)], { mode: 'freeform' })), NOW);
    recordLabDrill('vin', 'almost', NOW);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('drills move a word along the tricky table', () => {
    recordLabDrill('Tout', 'tryAgain', NOW);
    recordLabDrill('tout', 'tryAgain', NOW);
    expect(loadLabHistory().words.tout.status).toBe('tricky');
  });

  it('survives unreadable storage content', () => {
    localStorage.setItem(KEY, '{not json');
    expect(loadLabHistory().observations).toEqual([]);
    localStorage.setItem(KEY, JSON.stringify({ version: 1, observations: 'x', words: 3 }));
    expect(loadLabHistory().words).toEqual({});
  });

  it('useLabHistory re-renders when a take is recorded, and when the history is cleared', () => {
    const { result } = renderHook(() => useLabHistory());
    expect(result.current.observations).toEqual([]);
    act(() => recordLabTake(take([95, 30, 85]), NOW));
    expect(result.current.observations.length).toBeGreaterThan(0);
    act(() => clearLabHistory());
    expect(result.current.observations).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('picks up a change made in another tab', () => {
    const { result } = renderHook(() => useLabHistory());
    act(() => {
      localStorage.setItem(KEY, JSON.stringify({ version: 1, observations: [], words: { tout: { status: 'tricky', practiseCount: 2, clearRun: 0, lastDay: '2026-10-27', lastClearDay: null } } }));
      window.dispatchEvent(new StorageEvent('storage', { key: KEY }));
    });
    expect(Object.keys(result.current.words)).toEqual(['tout']);
  });
});
