// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  CLEAN_TO_CLEAR, MAX_RECENT, MAX_SLIPS, getBest, getLastSetup, getRecentIds, getSlipIds, noteRecent, recordAttempt, recordBest, saveLastSetup,
} from '../store';

const best = (score: number) => ({ score, stars: 2 as const, accuracy: 80 });

beforeEach(() => localStorage.clear());

describe('bests', () => {
  it('starts empty and keeps the higher score per format and level', () => {
    expect(getBest('words', 'A1')).toBeNull();
    expect(recordBest('words', 'A1', best(500))).toBe(true);
    expect(recordBest('words', 'A1', best(400))).toBe(false);
    expect(recordBest('words', 'A1', best(500))).toBe(false);
    expect(recordBest('words', 'A1', best(700))).toBe(true);
    expect(getBest('words', 'A1')?.score).toBe(700);
    expect(getBest('words', 'A2')).toBeNull();
    expect(getBest('sentences', 'A1')).toBeNull();
  });

  it('does not keep a round that scored nothing', () => {
    expect(recordBest('words', 'A1', best(0))).toBe(false);
    expect(getBest('words', 'A1')).toBeNull();
  });
});

describe('the last setup', () => {
  it('is remembered, and a bad stored value is ignored', () => {
    saveLastSetup({ format: 'sentences', level: 'B1', focus: 'sound-alikes' });
    expect(getLastSetup()).toEqual({ format: 'sentences', level: 'B1', focus: 'sound-alikes' });
    localStorage.setItem('frenchCoach_dictee', JSON.stringify({ version: 1, last: { format: 'poems', level: 'A1', focus: 'any' } }));
    expect(getLastSetup()).toBeNull();
  });
});

describe('my slips', () => {
  it('a miss adds a line, and keeps it until it is right twice in a row', () => {
    recordAttempt('w-a1-01', false);
    expect(getSlipIds().has('w-a1-01')).toBe(true);
    recordAttempt('w-a1-01', true);
    expect(getSlipIds().has('w-a1-01')).toBe(true);
    recordAttempt('w-a1-01', false); // a miss restarts the run
    recordAttempt('w-a1-01', true);
    expect(getSlipIds().has('w-a1-01')).toBe(true);
    for (let i = 1; i < CLEAN_TO_CLEAR; i++) recordAttempt('w-a1-01', true);
    expect(getSlipIds().has('w-a1-01')).toBe(false);
  });

  it('a perfect answer to a line that was never missed adds nothing', () => {
    recordAttempt('w-a1-02', true);
    expect(getSlipIds().size).toBe(0);
  });

  it('caps the list, dropping the oldest miss first', () => {
    for (let i = 0; i < MAX_SLIPS + 5; i++) recordAttempt(`x-${i}`, false, i);
    const ids = getSlipIds();
    expect(ids.size).toBe(MAX_SLIPS);
    expect(ids.has('x-0')).toBe(false);
    expect(ids.has(`x-${MAX_SLIPS + 4}`)).toBe(true);
  });
});

describe('lines heard lately', () => {
  it('remembers the newest and keeps a bounded list', () => {
    noteRecent(['a', 'b']);
    noteRecent(['b', 'c']);
    expect([...getRecentIds()].sort()).toEqual(['a', 'b', 'c']);
    noteRecent(Array.from({ length: MAX_RECENT + 10 }, (_, i) => `n${i}`));
    expect(getRecentIds().size).toBe(MAX_RECENT);
    expect(getRecentIds().has('a')).toBe(false);
  });
});

describe('robustness', () => {
  it('shrugs off damaged storage', () => {
    localStorage.setItem('frenchCoach_dictee', '{not json');
    expect(getBest('words', 'A1')).toBeNull();
    localStorage.setItem('frenchCoach_dictee', JSON.stringify({ version: 1, bests: { 'words:A1': { score: 'lots' } }, weak: [{ id: 3 }, null], recent: [1, 'ok'] }));
    expect(getBest('words', 'A1')).toBeNull();
    expect(getSlipIds().size).toBe(0);
    expect([...getRecentIds()]).toEqual(['ok']);
  });

  it('never stores what the learner typed', () => {
    recordAttempt('w-a1-01', false);
    recordBest('words', 'A1', best(300));
    noteRecent(['w-a1-01']);
    const raw = localStorage.getItem('frenchCoach_dictee') ?? '';
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual(['bests', 'last', 'recent', 'version', 'weak']);
  });
});
