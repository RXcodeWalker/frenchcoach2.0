import { describe, it, expect } from 'vitest';
import { listScenarios, isAuthored, getScenario, isPlayable } from '../registry';
import { validateRegistry, type ScenarioEntryForValidation } from '../../../features/roleplay/validate';

describe('registry — Stage 2 validator run across the real corpus', () => {
  it('produces zero errors for every authored scenario', () => {
    const entries: ScenarioEntryForValidation[] = listScenarios().map((e) => ({
      id: e.meta.id,
      meta: e.meta,
      graph: e.graph,
      deck: e.deck,
      authored: isAuthored(e.meta.id),
    }));
    const report = validateRegistry(entries);
    expect(report.errors).toEqual([]);
  });

  it('skips unauthored scenarios entirely (no errors from empty stubs)', () => {
    const museum = getScenario('museum');
    expect(museum).toBeDefined();
    expect(isAuthored('museum')).toBe(false);
  });
});

describe('registry — isPlayable (Stage 3 gate)', () => {
  it('is playable only when unlocked AND authored', () => {
    expect(isPlayable('bakery', true)).toBe(true);
    expect(isPlayable('hairdresser', true)).toBe(true);
    expect(isPlayable('gare', true)).toBe(true);
    expect(isPlayable('cafe', true)).toBe(true);
    expect(isPlayable('market', true)).toBe(true);
    expect(isPlayable('store', true)).toBe(true);
    expect(isPlayable('bank', true)).toBe(true);
    expect(isPlayable('post_office', true)).toBe(true);
    expect(isPlayable('pharmacy', true)).toBe(true);
    expect(isPlayable('bookstore', true)).toBe(true);
    expect(isPlayable('airport', true)).toBe(true);
    expect(isPlayable('camping', true)).toBe(true);
    expect(isPlayable('car_rental', true)).toBe(true);
    expect(isPlayable('cinema', true)).toBe(true);
    expect(isPlayable('dentist', true)).toBe(true);
    expect(isPlayable('doctor', true)).toBe(true);
    expect(isPlayable('flight', true)).toBe(true);
    expect(isPlayable('flower_shop', true)).toBe(true);
    expect(isPlayable('gas_station', true)).toBe(true);
    expect(isPlayable('gym', true)).toBe(true);
    expect(isPlayable('hotel', true)).toBe(true);
    expect(isPlayable('job_interview', true)).toBe(true);
    expect(isPlayable('real_estate', true)).toBe(true);
    expect(isPlayable('restaurant', true)).toBe(true);
    expect(isPlayable('ski_resort', true)).toBe(true);
    expect(isPlayable('taxi', true)).toBe(true);
    expect(isPlayable('police_station', true)).toBe(true);
  });

  it('is not playable when unlocked but unauthored (e.g. museum)', () => {
    expect(isAuthored('museum')).toBe(false);
    expect(isPlayable('museum', true)).toBe(false);
  });

  it('is not playable when authored but locked', () => {
    expect(isPlayable('bakery', false)).toBe(false);
  });
});

describe('registry — deep-freeze invariant', () => {
  it('throws when mutating an authored graph', () => {
    const bakery = getScenario('bakery');
    expect(bakery).toBeDefined();
    expect(() => {
      bakery!.graph.start.prompt = ['mutated'];
    }).toThrow();
  });

  it('throws when mutating an authored meta object', () => {
    const bakery = getScenario('bakery');
    expect(bakery).toBeDefined();
    expect(() => {
      bakery!.meta.title = 'mutated';
    }).toThrow();
  });

  it('throws when mutating an authored deck entry', () => {
    const bakery = getScenario('bakery');
    expect(bakery).toBeDefined();
    expect(() => {
      bakery!.deck.entries[0].fr = 'mutated';
    }).toThrow();
  });
});
