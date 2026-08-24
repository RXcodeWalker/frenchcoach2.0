import { describe, it, expect } from 'vitest';
import { listScenarios, isAuthored, getScenario } from '../registry';
import { validateRegistry, type ScenarioEntryForValidation } from '../../../features/roleplay/validate';

describe('registry — Stage 2 validator run across the real corpus', () => {
  it('produces zero errors for every authored scenario (bakery, hairdresser)', () => {
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
    const gare = getScenario('gare');
    expect(gare).toBeDefined();
    expect(isAuthored('gare')).toBe(false);
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
