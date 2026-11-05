import { describe, it, expect } from 'vitest';
import {
  DAY_MS,
  EXAM_OBSERVATION_WEIGHT,
  MAX_SEEN_IDS,
  applyObservations,
  applyToStats,
  decayFactor,
  emptyModel,
  examObservations,
} from '../update';
import { readSkill } from '../read';
import type { SkillObservation } from '../types';
import type { ExamAreaMarks } from '../../../types';

const T0 = Date.UTC(2026, 9, 1);

function obs(id: string, at: number, success: number | undefined, weight = 0.5, skillIds = ['tense_past']): SkillObservation {
  return { id, skillIds, at, kind: 'outcome', ...(success === undefined ? {} : { success }), weight };
}

describe('learner-model §2 — decayed Beta sufficient statistics', () => {
  it('reads (1+s)/(2+s+f) and 1 − 1/(1+0.3W) after rescaling to now', () => {
    const model = applyObservations(emptyModel('d1'), [obs('a', T0, 1, 0.5), obs('b', T0, 0, 0.3)], T0);
    const r = readSkill(model, 'tense_past', T0)!;
    expect(r.mastery).toBeCloseTo((1 + 0.5) / (2 + 0.8), 10);
    expect(r.confidence).toBeCloseTo(1 - 1 / (1 + 0.8 * 0.3), 10);
    expect(r.evidenceCount).toBe(2);
    const later = readSkill(model, 'tense_past', T0 + 14 * DAY_MS)!;
    expect(later.weight).toBeCloseTo(0.4, 10); // one half-life
    expect(later.evidenceCount).toBe(2); // the count is not decayed
  });

  it('an observation with no success signal raises confidence but not mastery (the old hasSuccessSignal rule)', () => {
    const model = applyObservations(emptyModel('d1'), [obs('a', T0, undefined, 0.5)], T0);
    const r = readSkill(model, 'tense_past', T0)!;
    expect(r.mastery).toBe(0.5);
    expect(r.weight).toBeCloseTo(0.5, 10);
  });

  it('is order-independent: any arrival order gives the same numbers', () => {
    const list = [obs('a', T0, 1), obs('b', T0 + 3 * DAY_MS, 0), obs('c', T0 + 9 * DAY_MS, 1, 0.2), obs('d', T0 + DAY_MS, 0, 0.7)];
    const now = T0 + 20 * DAY_MS;
    const forward = readSkill({ version: 'learner-model-v1', devices: { x: { updatedAt: 1, skills: applyToStats({}, list) } }, legacy: null }, 'tense_past', now)!;
    let stats = {};
    for (const o of [...list].reverse()) stats = applyToStats(stats, [o]);
    const backward = readSkill({ version: 'learner-model-v1', devices: { x: { updatedAt: 1, skills: stats } }, legacy: null }, 'tense_past', now)!;
    expect(backward.mastery).toBeCloseTo(forward.mastery, 12);
    expect(backward.weight).toBeCloseTo(forward.weight, 12);
  });

  it('decay never exceeds 1 (a future time counts at full weight)', () => {
    expect(decayFactor(T0 + DAY_MS, T0)).toBe(1);
  });

  it('is idempotent by observation id and ignores zero or broken weights', () => {
    const once = applyObservations(emptyModel('d1'), [obs('a', T0, 1)], T0);
    const twice = applyObservations(once, [obs('a', T0, 1)], T0 + 1);
    expect(twice).toBe(once);
    const broken = applyObservations(emptyModel('d1'), [obs('z', T0, 1, 0), obs('y', T0, 1, Number.NaN)], T0);
    expect(broken.devices).toEqual({});
  });

  it('writes only this device\'s bucket and keeps the seen-set bounded', () => {
    let model = emptyModel('mine');
    model = { ...model, devices: { other: { updatedAt: 5, skills: {} } } };
    const many = Array.from({ length: MAX_SEEN_IDS + 50 }, (_, i) => obs(`e${i}`, T0 + i, 1, 0.2));
    model = applyObservations(model, many, T0);
    expect(Object.keys(model.devices).sort()).toEqual(['mine', 'other']);
    expect(model.devices.other).toEqual({ updatedAt: 5, skills: {} });
    expect(model.seen).toHaveLength(MAX_SEEN_IDS);
  });

  it('ignores ids outside the registry (pron:* nodes stay out, as before)', () => {
    const model = applyObservations(emptyModel('d1'), [obs('a', T0, 1, 0.5, ['pron:r', 'gender'])], T0);
    expect(Object.keys(model.devices.d1.skills)).toEqual(['gender']);
  });
});

describe('learner-model §3/§6 — counted Exam Sim attempts only', () => {
  const marks: ExamAreaMarks = Object.freeze({ rolePlay: 9, rolePlayMax: 15, communication: 6, qualityOfLanguage: 12, total: 27 });

  it('a counted attempt gives one fractional observation per area at weight 2 × 0.6', () => {
    const out = examObservations({ sessionId: 's1', date: new Date(T0).toISOString(), mode: 'exam', practiceOnly: false, marks });
    expect(out.map((o) => [o.skillIds[0], o.success, o.weight])).toEqual([
      ['exam:rolePlay', 9 / 15, EXAM_OBSERVATION_WEIGHT],
      ['exam:communication', 6 / 15, EXAM_OBSERVATION_WEIGHT],
      ['exam:qualityOfLanguage', 12 / 15, EXAM_OBSERVATION_WEIGHT],
    ]);
    expect(EXAM_OBSERVATION_WEIGHT).toBeCloseTo(1.2, 10);
  });

  it('a practice-only (Coached, typed, resumed, early start) attempt, a Learn session or no marks give nothing', () => {
    const date = new Date(T0).toISOString();
    expect(examObservations({ sessionId: 's', date, mode: 'exam', practiceOnly: true, marks })).toEqual([]);
    expect(examObservations({ sessionId: 's', date, mode: 'practice', practiceOnly: false, marks })).toEqual([]);
    expect(examObservations({ sessionId: 's', date, mode: 'exam', practiceOnly: false })).toEqual([]);
  });

  it('reads the marks without touching them (frozen input survives)', () => {
    expect(() => examObservations({ sessionId: 's', date: new Date(T0).toISOString(), mode: 'exam', marks })).not.toThrow();
    expect(marks).toEqual({ rolePlay: 9, rolePlayMax: 15, communication: 6, qualityOfLanguage: 12, total: 27 });
  });

  it('the same session recorded twice counts once', () => {
    const o = examObservations({ sessionId: 's1', date: new Date(T0).toISOString(), mode: 'exam', marks });
    const m1 = applyObservations(emptyModel('d'), o, T0);
    expect(applyObservations(m1, o, T0 + 5)).toBe(m1);
  });
});
