import { describe, expect, it } from 'vitest';
import { HISTORY_LIMITS, LAB_HISTORY_VERSION, addCheck, addDrill, addTake, emptyLabHistory, historyStatuses, parseLabHistory } from '../labHistory';
import { BENCHMARK_VERSION } from '../benchmark';
import { LAB_THRESHOLDS_VERSION } from '../thresholds';
import type { MonthlyCheckResult } from '../monthlyCheck';
import { buildLabTake } from '../wordStates';
import { azureWord, scripted } from './labFixtures';

const D1 = '2026-10-01';
const D2 = '2026-10-02';

const aCheck = (day: string): MonthlyCheckResult => ({
  day,
  benchmarkVersion: BENCHMARK_VERSION,
  thresholdsVersion: LAB_THRESHOLDS_VERSION,
  sentences: [{ index: 0, wordsClear: 3, wordsTotal: 6 }],
});

function takeOf(scores: number[]) {
  const words = ['Le', 'vin', 'rouge'];
  return buildLabTake(
    'Le vin rouge.',
    scripted(words.map((w, i) => azureWord(w, scores[i], { phonemeScores: w === 'vin' ? [scores[i], scores[i]] : w === 'rouge' ? [scores[i], scores[i], scores[i]] : [scores[i], scores[i]] }))),
  );
}

describe('labHistory', () => {
  it('starts empty and versioned', () => {
    expect(emptyLabHistory()).toEqual({ version: LAB_HISTORY_VERSION, observations: [], words: {}, checks: [] });
  });

  it('a take adds dated family observations and notes Practise / Clear words only', () => {
    const h = addTake(emptyLabHistory(), takeOf([95, 30, 85]), D1);
    expect(h.observations.length).toBeGreaterThan(0);
    expect(h.observations.every((o) => o.day === D1)).toBe(true);
    expect(Object.keys(h.words)).toEqual(['vin']);
    expect(h.words.vin.status).toBe('watching');
  });

  it('keeps no sentence, audio or transcript: the serialised history has only the declared fields', () => {
    const h = addTake(emptyLabHistory(), takeOf([95, 30, 85]), D1);
    const json = JSON.stringify(h);
    expect(json).not.toMatch(/Le vin rouge/);
    expect(Object.keys(h).sort()).toEqual(['checks', 'observations', 'version', 'words']);
    expect(Object.keys(h.observations[0]).sort()).toEqual(['accuracy', 'basis', 'day', 'family']);
  });

  it('a refused take changes nothing', () => {
    const refused = buildLabTake('Le vin rouge.', scripted([azureWord('le', 10)], { mode: 'freeform' }));
    const h = emptyLabHistory();
    expect(addTake(h, refused, D1)).toBe(h);
  });

  it('a drill moves a word: Try again is a miss, Clear a clear day, Almost nothing', () => {
    let h = addDrill(emptyLabHistory(), 'Tout', 'tryAgain', D1);
    h = addDrill(h, 'tout', 'tryAgain', D1);
    expect(h.words.tout.status).toBe('tricky');
    const same = addDrill(h, 'tout', 'almost', D2);
    expect(same).toBe(h);
    h = addDrill(h, 'tout', 'clear', D2);
    expect(h.words.tout.clearRun).toBe(1);
    expect(addDrill(h, 'tout', 'unknown', D2)).toBe(h);
  });

  it('keeps only the newest observations of each family, order preserved', () => {
    let h = emptyLabHistory();
    for (let i = 0; i < HISTORY_LIMITS.observationsPerFamily + 10; i++) h = addTake(h, takeOf([90, 90, 90]), `2026-10-${String((i % 28) + 1).padStart(2, '0')}`);
    const byFamily = new Map<string, number>();
    for (const o of h.observations) byFamily.set(o.family, (byFamily.get(o.family) ?? 0) + 1);
    expect(Math.max(...byFamily.values())).toBe(HISTORY_LIMITS.observationsPerFamily);
  });

  it('"Your sounds" needs enough observations on enough days', () => {
    let h = emptyLabHistory();
    for (let i = 0; i < 4; i++) h = addTake(h, takeOf([90, 90, 90]), D1);
    expect(historyStatuses(h).nasalIn).toBe('notEnoughData');
    for (let i = 0; i < 4; i++) h = addTake(h, takeOf([90, 90, 90]), D2);
    expect(historyStatuses(h).nasalIn).toBe('clear');
  });

  it('a take keeps the saved monthly checks', () => {
    const withCheck = addCheck(emptyLabHistory(), aCheck(D1));
    expect(addTake(withCheck, takeOf([95, 30, 85]), D2).checks).toEqual(withCheck.checks);
  });

  it('addCheck ring-buffers the checks', () => {
    let h = emptyLabHistory();
    for (let i = 0; i < HISTORY_LIMITS.checks + 3; i++) h = addCheck(h, aCheck(`2026-11-${String((i % 28) + 1).padStart(2, '0')}`));
    expect(h.checks).toHaveLength(HISTORY_LIMITS.checks);
  });

  describe('parseLabHistory', () => {
    it('keeps good checks and drops malformed ones; a history with no checks field reads as none', () => {
      const parsed = parseLabHistory({ version: LAB_HISTORY_VERSION, observations: [], words: {}, checks: [aCheck(D1), { day: 'bad' }] });
      expect(parsed.checks).toHaveLength(1);
      expect(parseLabHistory({ version: LAB_HISTORY_VERSION, observations: [], words: {} }).checks).toEqual([]);
      expect(parseLabHistory({ version: LAB_HISTORY_VERSION, checks: 3 }).checks).toEqual([]);
    });
  });

  describe('parseLabHistory', () => {
    it('round-trips', () => {
      const h = addTake(emptyLabHistory(), takeOf([95, 30, 85]), D1);
      expect(parseLabHistory(JSON.parse(JSON.stringify(h)))).toEqual(h);
    });

    it('treats the wrong shape or version as empty and drops malformed rows', () => {
      expect(parseLabHistory(null)).toEqual(emptyLabHistory());
      expect(parseLabHistory({ version: 99, observations: [{}] })).toEqual(emptyLabHistory());
      const parsed = parseLabHistory({
        version: LAB_HISTORY_VERSION,
        observations: [
          { family: 'uOu', accuracy: 70, basis: 'word', day: D1 },
          { family: 'liaison', accuracy: 70, basis: 'word', day: D1 },
          { family: 'uOu', accuracy: 170, basis: 'word', day: D1 },
          { family: 'uOu', accuracy: 70, basis: 'word', day: 'yesterday' },
          'junk',
        ],
        words: {
          tout: { status: 'tricky', practiseCount: 2, clearRun: 0, lastDay: D1, lastClearDay: null },
          bad: { status: 'nope' },
          '': { status: 'tricky', practiseCount: 2, clearRun: 0, lastDay: D1, lastClearDay: null },
        },
      });
      expect(parsed.observations).toHaveLength(1);
      expect(Object.keys(parsed.words)).toEqual(['tout']);
    });
  });
});
