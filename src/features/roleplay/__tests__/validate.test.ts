import { describe, it, expect } from 'vitest';
import { validateScenario, validateRegistry, type ScenarioEntryForValidation } from '../validate';
import type { ScenarioGraph, ScenarioMeta, ScenarioDeck } from '../types';

function baseMeta(overrides: Partial<ScenarioMeta> = {}): ScenarioMeta {
  return {
    id: 'test_scenario',
    title: 'Test',
    titleFr: 'Test',
    emoji: '🧪',
    tier: 1,
    category: 'Test',
    dependencies: [],
    npc: { nameFr: 'NPC', roleFr: 'npc', roleEn: 'npc', emoji: '🧑', register: 'informal' },
    briefingEn: 'briefing',
    branches: {},
    triggers: [],
    ...overrides,
  };
}

function entry(overrides: {
  id?: string;
  graph: ScenarioGraph;
  meta?: Partial<ScenarioMeta>;
  deck?: ScenarioDeck;
  authored?: boolean;
}): ScenarioEntryForValidation {
  return {
    id: overrides.id ?? 'test_scenario',
    graph: overrides.graph,
    meta: baseMeta({ id: overrides.id ?? 'test_scenario', ...overrides.meta }),
    deck: overrides.deck ?? { entries: [] },
    authored: overrides.authored ?? true,
  };
}

/** A minimal, otherwise-clean two-state graph: start -> end_session. */
function cleanGraph(): ScenarioGraph {
  return {
    start: { prompt: ['Bonjour !'], next: 'end_session' },
    end_session: { prompt: ['Au revoir !'] },
  };
}

const GRAPH_STRUCTURE_CODES = new Set([
  'dangling-next',
  'dangling-intent-target',
  'empty-prompt',
  'unreachable-state',
  'no-path-to-terminal',
  'no-terminal-within-max-turns',
]);

describe('validateScenario — graph structure', () => {
  it('is clean on a minimal valid graph (graph-structure rules only — an empty meta legitimately fails the separate authored-completeness rules)', () => {
    const report = validateScenario(entry({ graph: cleanGraph() }));
    expect(report.errors.filter((e) => GRAPH_STRUCTURE_CODES.has(e.code))).toEqual([]);
  });

  it('flags a dangling next target', () => {
    const graph: ScenarioGraph = {
      start: { prompt: ['Bonjour !'], next: 'nowhere' },
    };
    const report = validateScenario(entry({ graph }));
    expect(report.errors.some((e) => e.code === 'dangling-next')).toBe(true);
  });

  it('flags a dangling intent target (police_station-style typo)', () => {
    const graph: ScenarioGraph = {
      start: { prompt: ['Bonjour !'], intents: { complaint: 'ask_complaint_subject' } },
    };
    const report = validateScenario(entry({ graph }));
    expect(report.errors.some((e) => e.code === 'dangling-intent-target')).toBe(true);
  });

  it('flags an unreachable state (library-style orphan)', () => {
    const graph: ScenarioGraph = {
      start: { prompt: ['Bonjour !'], next: 'end_session' },
      end_session: { prompt: ['Au revoir !'] },
      orphan: { prompt: ['Never reached'] },
    };
    const report = validateScenario(entry({ graph }));
    expect(report.errors.some((e) => e.code === 'unreachable-state' && e.path.endsWith('orphan'))).toBe(true);
  });

  it('flags a state with an empty prompt array', () => {
    const graph: ScenarioGraph = {
      start: { prompt: [], next: 'end_session' },
      end_session: { prompt: ['Au revoir !'] },
    };
    const report = validateScenario(entry({ graph }));
    expect(report.errors.some((e) => e.code === 'empty-prompt')).toBe(true);
  });

  it('flags a true dead end (no path to any terminal, even via cycles)', () => {
    const graph: ScenarioGraph = {
      start: { prompt: ['Bonjour !'], next: 'loop_a' },
      loop_a: { prompt: ['A'], next: 'loop_b' },
      loop_b: { prompt: ['B'], next: 'loop_a' },
    };
    const report = validateScenario(entry({ graph }));
    expect(report.errors.some((e) => e.code === 'no-path-to-terminal')).toBe(true);
  });

  it('does NOT flag a cycle that still has an escape to a terminal (bakery start <-> ask_anything_else shape)', () => {
    const graph: ScenarioGraph = {
      start: { prompt: ['Bonjour !'], intents: { bread: 'ask_bread', other: 'ask_other' } },
      ask_bread: { prompt: ['Which bread?'], next: 'ask_anything_else' },
      ask_other: { prompt: ['Other?'], next: 'ask_anything_else' },
      ask_anything_else: { prompt: ['Anything else?'], intents: { yes: 'start', no: 'end_session' } },
      end_session: { prompt: ['Bye'] },
    };
    const meta: Partial<ScenarioMeta> = {
      branches: {
        bread: { labelEn: 'bread', missions: [] },
        other: { labelEn: 'other', missions: [] },
      },
      triggers: [
        { state: 'start', intent: 'bread', terms: ['pain'] },
        { state: 'start', intent: 'other', terms: ['autre'] },
        { state: 'ask_anything_else', intent: 'yes', terms: ['oui'] },
        { state: 'ask_anything_else', intent: 'no', terms: ['non'] },
      ],
    };
    const report = validateScenario(entry({ graph, meta, deck: { entries: [] } }));
    expect(report.errors.filter((e) => e.code === 'no-path-to-terminal' || e.code === 'no-terminal-within-max-turns')).toEqual([]);
  });

  it('skips validation entirely for an unauthored scenario', () => {
    const graph: ScenarioGraph = { start: { prompt: [], next: 'nowhere' } };
    const report = validateScenario(entry({ graph, authored: false }));
    expect(report.errors).toEqual([]);
  });
});

describe('validateScenario — triggers', () => {
  it('flags a trigger referencing an unknown state', () => {
    const report = validateScenario(
      entry({
        graph: cleanGraph(),
        meta: { triggers: [{ state: 'nowhere', intent: 'x', terms: ['x'] }] },
      }),
    );
    expect(report.errors.some((e) => e.code === 'trigger-unknown-state')).toBe(true);
  });

  it('flags a trigger referencing an intent the graph does not declare', () => {
    const graph: ScenarioGraph = {
      start: { prompt: ['Bonjour !'], intents: { a: 'a_state' }, },
      a_state: { prompt: ['A'] },
    };
    const report = validateScenario(
      entry({ graph, meta: { triggers: [{ state: 'start', intent: 'b', terms: ['x'] }] } }),
    );
    expect(report.errors.some((e) => e.code === 'trigger-unknown-intent')).toBe(true);
  });

  it('errors on a missing trigger for an authored branch intent, warns for an unauthored sibling', () => {
    const graph: ScenarioGraph = {
      start: { prompt: ['Bonjour !'], intents: { known: 'a', unauthored_sibling: 'b' } },
      a: { prompt: ['A'], next: 'end_session' },
      b: { prompt: ['B'], next: 'end_session' },
      end_session: { prompt: ['Bye'] },
    };
    const report = validateScenario(
      entry({
        graph,
        meta: {
          branches: { known: { labelEn: 'known', missions: [] } },
          triggers: [], // deliberately no trigger for either intent
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'unreachable-by-speech' && e.path.includes('.known'))).toBe(true);
    expect(report.warnings.some((w) => w.code === 'unreachable-by-speech' && w.path.includes('.unauthored_sibling'))).toBe(
      true,
    );
  });

  it('does not require a trigger for a single-sibling intent', () => {
    const graph: ScenarioGraph = {
      start: { prompt: ['Bonjour !'], intents: { only: 'a' } },
      a: { prompt: ['A'], next: 'end_session' },
      end_session: { prompt: ['Bye'] },
    };
    const report = validateScenario(entry({ graph, meta: { triggers: [] } }));
    expect(report.errors.filter((e) => e.code === 'unreachable-by-speech')).toEqual([]);
    expect(report.warnings.filter((w) => w.code === 'unreachable-by-speech')).toEqual([]);
  });
});

describe('validateScenario — missions', () => {
  const graph: ScenarioGraph = {
    start: { prompt: ['Bonjour !'], intents: { branchA: 'a', branchB: 'b' } },
    a: { prompt: ['A'], capture: 'slot_a', next: 'end_session' },
    b: { prompt: ['B'], next: 'end_session' },
    end_session: { prompt: ['Bye'] },
  };
  const triggers = [
    { state: 'start', intent: 'branchA', terms: ['a'] },
    { state: 'start', intent: 'branchB', terms: ['b'] },
  ];

  it('flags a mission condition referencing an unknown state', () => {
    const report = validateScenario(
      entry({
        graph,
        meta: {
          branches: {
            branchA: {
              labelEn: 'A',
              missions: [{ id: 'm1', en: 'x', requires: [{ kind: 'intent', state: 'nowhere', intent: 'branchA' }] }],
            },
          },
          triggers,
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'mission-condition-unknown-state')).toBe(true);
  });

  it('flags a mission intent-condition referencing an intent the graph does not declare', () => {
    const report = validateScenario(
      entry({
        graph,
        meta: {
          branches: {
            branchA: {
              labelEn: 'A',
              missions: [{ id: 'm1', en: 'x', requires: [{ kind: 'intent', state: 'start', intent: 'ghost' }] }],
            },
          },
          triggers,
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'mission-condition-unknown-intent')).toBe(true);
  });

  it('flags a slot condition on a state with no capture', () => {
    const report = validateScenario(
      entry({
        graph,
        meta: {
          branches: {
            branchB: {
              labelEn: 'B',
              missions: [{ id: 'm1', en: 'x', requires: [{ kind: 'slot', state: 'b', slot: 'anything', minWords: 3 }] }],
            },
          },
          triggers,
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'slot-condition-no-capture')).toBe(true);
  });

  it('accepts a slot condition matching the state\'s actual capture', () => {
    const report = validateScenario(
      entry({
        graph,
        meta: {
          branches: {
            branchA: {
              labelEn: 'A',
              missions: [{ id: 'm1', en: 'x', requires: [{ kind: 'slot', state: 'a', slot: 'slot_a', minWords: 3 }] }],
            },
          },
          triggers,
        },
      }),
    );
    expect(report.errors.filter((e) => e.code === 'slot-condition-no-capture')).toEqual([]);
  });

  it('flags a mission uncompletable on its declared branch (hairdresser no_availability-style bug: a mission keyed to one branch requiring a state only reachable down the other branch)', () => {
    const forkedGraph: ScenarioGraph = {
      start: { prompt: ['Bonjour !'], intents: { branchA: 'a', branchB: 'b' } },
      a: { prompt: ['A'], intents: { yes: 'a_yes', no: 'a_no' } },
      a_yes: { prompt: ['A yes'], next: 'end_session' },
      a_no: { prompt: ['A no'], next: 'end_session' },
      b: { prompt: ['B'], next: 'end_session' },
      end_session: { prompt: ['Bye'] },
    };
    const report = validateScenario(
      entry({
        graph: forkedGraph,
        meta: {
          branches: {
            // Mirrors the real bug: a branch key ("branchB") whose only
            // mission requires a state ("a_no") that is only reachable via
            // the *other* branch's opening intent ("branchA").
            branchB: {
              labelEn: 'B (bug: mission requires branchA-only state)',
              missions: [{ id: 'm1', en: 'x', requires: [{ kind: 'intent', state: 'a', intent: 'no' }] }],
            },
            branchA: { labelEn: 'A', missions: [] },
          },
          triggers: [
            { state: 'start', intent: 'branchA', terms: ['a'] },
            { state: 'start', intent: 'branchB', terms: ['b'] },
            { state: 'a', intent: 'yes', terms: ['oui'] },
            { state: 'a', intent: 'no', terms: ['non'] },
          ],
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'mission-uncompletable-on-branch')).toBe(true);
  });

  it('flags duplicate mission ids', () => {
    const report = validateScenario(
      entry({
        graph,
        meta: {
          branches: {
            branchA: {
              labelEn: 'A',
              missions: [
                { id: 'dup', en: 'x', requires: [{ kind: 'intent', state: 'start', intent: 'branchA' }] },
                { id: 'dup', en: 'y', requires: [{ kind: 'intent', state: 'start', intent: 'branchA' }] },
              ],
            },
          },
          triggers,
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'duplicate-mission-id')).toBe(true);
  });
});

describe('validateScenario — deck', () => {
  const graph: ScenarioGraph = {
    start: { prompt: ["Je voudrais du pain, s'il vous plaît."], next: 'end_session' },
    end_session: { prompt: ['Bye'] },
  };

  it('accepts a core noun whose content word appears in the prompt despite a different article', () => {
    const report = validateScenario(
      entry({
        graph,
        deck: {
          entries: [
            { fr: 'le pain', en: 'bread', pos: 'noun', gender: 'm', article: 'le', register: 'neutral', usedInStates: ['start'], rank: 'core' },
          ],
        },
      }),
    );
    expect(report.errors.filter((e) => e.code === 'deck-provenance-mismatch')).toEqual([]);
  });

  it('flags a core entry whose text never appears in its usedInStates prompts', () => {
    const report = validateScenario(
      entry({
        graph,
        deck: {
          entries: [
            { fr: 'le fromage', en: 'cheese', pos: 'noun', gender: 'm', article: 'le', register: 'neutral', usedInStates: ['start'], rank: 'core' },
          ],
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'deck-provenance-mismatch')).toBe(true);
  });

  it('flags a deck entry referencing a nonexistent state', () => {
    const report = validateScenario(
      entry({
        graph,
        deck: {
          entries: [
            { fr: 'le pain', en: 'bread', pos: 'noun', gender: 'm', article: 'le', register: 'neutral', usedInStates: ['nowhere'], rank: 'extend' },
          ],
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'deck-unknown-state')).toBe(true);
  });

  it('flags a noun missing gender or article', () => {
    const report = validateScenario(
      entry({
        graph,
        deck: {
          entries: [{ fr: 'le pain', en: 'bread', pos: 'noun', register: 'neutral', usedInStates: ['start'], rank: 'extend' }],
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'noun-missing-gender-article')).toBe(true);
  });

  it('flags a core entry whose register mismatches npc.register', () => {
    const report = validateScenario(
      entry({
        graph,
        meta: { npc: { nameFr: 'N', roleFr: 'n', roleEn: 'n', emoji: '🧑', register: 'formal' } },
        deck: {
          entries: [
            { fr: 'le pain', en: 'bread', pos: 'noun', gender: 'm', article: 'le', register: 'informal', usedInStates: ['start'], rank: 'core' },
          ],
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'register-mismatch')).toBe(true);
  });

  it('does not flag a neutral-register core entry regardless of npc.register', () => {
    const report = validateScenario(
      entry({
        graph,
        meta: { npc: { nameFr: 'N', roleFr: 'n', roleEn: 'n', emoji: '🧑', register: 'formal' } },
        deck: {
          entries: [
            { fr: 'le pain', en: 'bread', pos: 'noun', gender: 'm', article: 'le', register: 'neutral', usedInStates: ['start'], rank: 'core' },
          ],
        },
      }),
    );
    expect(report.errors.filter((e) => e.code === 'register-mismatch')).toEqual([]);
  });

  it('flags a duplicated deck entry (same fr twice)', () => {
    const report = validateScenario(
      entry({
        graph,
        deck: {
          entries: [
            { fr: 'le pain', en: 'bread', pos: 'noun', gender: 'm', article: 'le', register: 'neutral', usedInStates: ['start'], rank: 'core' },
            { fr: 'le pain', en: 'bread (again)', pos: 'noun', gender: 'm', article: 'le', register: 'neutral', usedInStates: ['start'], rank: 'extend' },
          ],
        },
      }),
    );
    expect(report.errors.some((e) => e.code === 'deck-duplicate-entry')).toBe(true);
  });
});

describe('validateScenario — authored completeness', () => {
  it('flags an authored scenario with no branches, missions, triggers, or deck entries', () => {
    const report = validateScenario(entry({ graph: cleanGraph() }));
    expect(report.errors.map((e) => e.code)).toEqual(
      expect.arrayContaining([
        'authored-missing-branch',
        'authored-missing-mission',
        'authored-missing-trigger',
        'authored-missing-deck-entry',
      ]),
    );
  });
});

describe('validateRegistry — cross-scenario rules', () => {
  function minimalAuthored(id: string, deps: string[] = []): ScenarioEntryForValidation {
    return {
      id,
      authored: true,
      graph: {
        start: { prompt: ['Bonjour !'], intents: { go: 'a' } },
        a: { prompt: ['A'], next: 'end_session' },
        end_session: { prompt: ['Bye'] },
      },
      meta: baseMeta({
        id,
        dependencies: deps,
        branches: { go: { labelEn: 'go', missions: [{ id: `${id}_m1`, en: 'x', requires: [{ kind: 'intent', state: 'start', intent: 'go' }] }] } },
        triggers: [{ state: 'start', intent: 'go', terms: ['go'] }],
      }),
      deck: {
        entries: [
          { fr: 'le mot', en: 'word', pos: 'noun', gender: 'm', article: 'le', register: 'neutral', usedInStates: ['start'], rank: 'core' },
        ],
      },
    };
  }

  it('flags duplicate scenario ids', () => {
    const report = validateRegistry([minimalAuthored('dup'), minimalAuthored('dup')]);
    expect(report.errors.some((e) => e.code === 'duplicate-scenario-id')).toBe(true);
  });

  it('flags a dependency on an unknown scenario id', () => {
    const report = validateRegistry([minimalAuthored('a', ['ghost'])]);
    expect(report.errors.some((e) => e.code === 'unknown-dependency')).toBe(true);
  });

  it('flags a dependency cycle', () => {
    const report = validateRegistry([minimalAuthored('a', ['b']), minimalAuthored('b', ['a'])]);
    expect(report.errors.some((e) => e.code === 'dependency-cycle')).toBe(true);
  });

  it('does not flag a valid acyclic dependency chain', () => {
    const report = validateRegistry([minimalAuthored('a'), minimalAuthored('b', ['a']), minimalAuthored('c', ['b'])]);
    expect(report.errors.filter((e) => e.code === 'dependency-cycle' || e.code === 'unknown-dependency')).toEqual([]);
  });

  it('is silent on a dependency toward an unauthored scenario (locked, not an error)', () => {
    const unauthoredStub: ScenarioEntryForValidation = {
      id: 'stub',
      authored: false,
      graph: {},
      meta: baseMeta({ id: 'stub' }),
      deck: { entries: [] },
    };
    const report = validateRegistry([minimalAuthored('a', ['stub']), unauthoredStub]);
    expect(report.errors.filter((e) => e.code === 'unknown-dependency')).toEqual([]);
  });
});
