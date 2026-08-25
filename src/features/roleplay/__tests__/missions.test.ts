import { describe, it, expect } from 'vitest';
import {
  applicableMissions,
  completionRatio,
  hadSkips,
  isMissionComplete,
  missionStatus,
  resolveBranchId,
} from '../missions';
import { bakeryMeta } from '../../../data/scenarios/bakery.meta';
import type { LanguageResult, Mission, TurnOutcome, TurnOutcomeIntentResult } from '../types';
import type { FeedbackV2 } from '../../../types/index';

/** Minimal valid FeedbackV2 — only used to satisfy the type; invariant #6 asserts the fold never reads `language`'s contents. */
const MOCK_FEEDBACK: FeedbackV2 = {
  scores: { overall: 9, communication: 9, language: 9, fluency: 9 },
  grammar: { critical: [], polish: [] },
  vocabulary: [],
  style: [],
  fillers: [],
  wordCount: 4,
};

/**
 * The fold never reads `language`, so every fixture here carries the same
 * placeholder — see the invariant-#6 test at the bottom, which varies it and
 * asserts nothing moves.
 */
const NO_LANGUAGE: LanguageResult = { kind: 'unscored', feedback: null };

let nextTurn = 0;
function outcome(
  state: string,
  intentResult: TurnOutcomeIntentResult,
  slotFilled?: { slot: string; wordCount: number },
): TurnOutcome {
  return {
    turnIndex: nextTurn++,
    state,
    transcript: '',
    intentResult,
    ...(slotFilled ? { slotFilled } : {}),
    language: NO_LANGUAGE,
  };
}

const matched = (intent: string) => ({ kind: 'matched', intent, score: 1 }) as const;

describe('isMissionComplete — AND across conditions', () => {
  const mission: Mission = {
    id: 'm',
    en: 'Do both things',
    requires: [
      { kind: 'intent', state: 'start', intent: 'bread' },
      { kind: 'intent', state: 'ask_anything_else', intent: 'yes' },
    ],
  };

  it('is incomplete with only one condition satisfied', () => {
    expect(isMissionComplete(mission, [outcome('start', matched('bread'))])).toBe(false);
  });

  it('completes only when every condition is satisfied', () => {
    const log = [
      outcome('start', matched('bread')),
      outcome('ask_anything_else', matched('yes')),
    ];
    expect(isMissionComplete(mission, log)).toBe(true);
  });

  it('is order-independent — the conditions may be satisfied in either order', () => {
    const forwards = [outcome('start', matched('bread')), outcome('ask_anything_else', matched('yes'))];
    const backwards = [outcome('ask_anything_else', matched('yes')), outcome('start', matched('bread'))];
    expect(isMissionComplete(mission, forwards)).toBe(true);
    expect(isMissionComplete(mission, backwards)).toBe(true);
  });

  it('never completes a mission with no conditions', () => {
    expect(isMissionComplete({ id: 'empty', en: '', requires: [] }, [])).toBe(false);
  });
});

describe('isMissionComplete — intent conditions require a real match', () => {
  const mission: Mission = {
    id: 'm',
    en: 'Ask for bread',
    requires: [{ kind: 'intent', state: 'start', intent: 'bread' }],
  };

  it('is not satisfied by auto_advance', () => {
    expect(isMissionComplete(mission, [outcome('start', { kind: 'auto_advance' })])).toBe(false);
  });

  it('is not satisfied by a skip', () => {
    expect(isMissionComplete(mission, [outcome('start', { kind: 'skipped' })])).toBe(false);
  });

  it('is not satisfied by no_match or ambiguous', () => {
    expect(isMissionComplete(mission, [outcome('start', { kind: 'no_match' })])).toBe(false);
    expect(
      isMissionComplete(mission, [outcome('start', { kind: 'ambiguous', candidates: ['bread', 'pastry'] })]),
    ).toBe(false);
  });

  it('is not satisfied by the right intent matched at the wrong state', () => {
    expect(isMissionComplete(mission, [outcome('ask_anything_else', matched('bread'))])).toBe(false);
  });
});

describe('isMissionComplete — slot conditions', () => {
  const mission: Mission = {
    id: 'm',
    en: 'Say where you are travelling to',
    requires: [{ kind: 'slot', state: 'ask_destination', slot: 'destination', minWords: 3 }],
  };

  it('does not complete below minWords', () => {
    const log = [outcome('ask_destination', { kind: 'auto_advance' }, { slot: 'destination', wordCount: 2 })];
    expect(isMissionComplete(mission, log)).toBe(false);
  });

  it('completes at exactly minWords', () => {
    const log = [outcome('ask_destination', { kind: 'auto_advance' }, { slot: 'destination', wordCount: 3 })];
    expect(isMissionComplete(mission, log)).toBe(true);
  });

  it('is satisfiable by auto_advance through a capture node', () => {
    const log = [outcome('ask_destination', { kind: 'auto_advance' }, { slot: 'destination', wordCount: 6 })];
    expect(isMissionComplete(mission, log)).toBe(true);
  });

  it('is not satisfied by a skipped turn, however many words were captured', () => {
    const log = [outcome('ask_destination', { kind: 'skipped' }, { slot: 'destination', wordCount: 20 })];
    expect(isMissionComplete(mission, log)).toBe(false);
  });

  it('is not satisfied by a different slot at the same state', () => {
    const log = [outcome('ask_destination', { kind: 'auto_advance' }, { slot: 'date', wordCount: 6 })];
    expect(isMissionComplete(mission, log)).toBe(false);
  });
});

describe('missionStatus — idempotence and retry', () => {
  const missions: Mission[] = [
    { id: 'a', en: 'A', requires: [{ kind: 'intent', state: 'start', intent: 'bread' }] },
    { id: 'b', en: 'B', requires: [{ kind: 'intent', state: 'ask_anything_else', intent: 'no' }] },
  ];

  it('completes a mission once even when its outcome repeats', () => {
    const log = [
      outcome('start', matched('bread')),
      outcome('start', matched('bread')),
      outcome('start', matched('bread')),
    ];
    expect(missionStatus(missions, log).completed).toEqual(['a']);
  });

  it('un-completes when a retry replaces a matched outcome with a miss', () => {
    const log = [outcome('start', matched('bread'))];
    expect(missionStatus(missions, log).completed).toEqual(['a']);

    // Retry REPLACES the last outcome rather than appending it.
    const retried = [...log.slice(0, -1), outcome('start', { kind: 'no_match' })];
    expect(missionStatus(missions, retried).completed).toEqual([]);
  });

  it('re-completes when the retry succeeds instead', () => {
    const log = [outcome('start', { kind: 'no_match' })];
    const retried = [...log.slice(0, -1), outcome('start', matched('bread'))];
    expect(missionStatus(missions, retried).completed).toEqual(['a']);
  });

  it('reports skipped when any turn was resolved by a recovery skip', () => {
    expect(hadSkips([outcome('start', matched('bread'))])).toBe(false);
    const withSkip = [outcome('start', matched('bread')), outcome('ask_anything_else', { kind: 'skipped' })];
    expect(missionStatus(missions, withSkip)).toEqual({
      completed: ['a'],
      applicable: 2,
      skipped: true,
    });
  });
});

describe('resolveBranchId / applicableMissions — branch scoping', () => {
  it('returns undefined before any branch has been entered', () => {
    expect(resolveBranchId(bakeryMeta.branches, [])).toBeUndefined();
    expect(applicableMissions(bakeryMeta.branches, [])).toEqual([]);
  });

  it('resolves the branch from the matched intent at start', () => {
    const log = [outcome('start', matched('pastry'))];
    expect(resolveBranchId(bakeryMeta.branches, log)).toBe('pastry');
  });

  it('ignores a matched start intent that is not a branch key', () => {
    // `owner` is a real bakery side-intent but opens no branch.
    const log = [outcome('start', matched('owner'))];
    expect(resolveBranchId(bakeryMeta.branches, log)).toBeUndefined();
  });

  it('keeps the FIRST branch when the graph loops back through start', () => {
    // bakery's pastry branch: order a pastry, say yes to "anything else?",
    // then order bread. The second start visit must not re-assign the branch.
    const log = [
      outcome('start', matched('pastry')),
      outcome('ask_anything_else', matched('yes')),
      outcome('start', matched('bread')),
    ];
    expect(resolveBranchId(bakeryMeta.branches, log)).toBe('pastry');
  });

  it('scores a short branch out of its own mission count, not the scenario total', () => {
    // breakfast has 1 mission; bakery has 5 across all three branches.
    const log = [outcome('start', matched('breakfast'))];
    const status = missionStatus(applicableMissions(bakeryMeta.branches, log), log);
    expect(status).toEqual({ completed: ['bakery_ask_breakfast'], applicable: 1, skipped: false });
    expect(completionRatio(status)).toBe(1);
  });

  it('completes the real bakery pastry branch end to end', () => {
    const log = [
      outcome('start', matched('pastry')),
      outcome('ask_anything_else', matched('yes')),
      outcome('start', matched('bread')),
    ];
    const status = missionStatus(applicableMissions(bakeryMeta.branches, log), log);
    expect(status.applicable).toBe(2);
    expect(status.completed.sort()).toEqual(['bakery_add_more', 'bakery_ask_pastry']);
    expect(completionRatio(status)).toBe(1);
  });
});

describe('completionRatio', () => {
  it('is 0 when no branch has been entered', () => {
    expect(completionRatio({ completed: [], applicable: 0, skipped: false })).toBe(0);
  });

  it('is a partial ratio mid-branch', () => {
    expect(completionRatio({ completed: ['a'], applicable: 2, skipped: false })).toBe(0.5);
  });

  it('cannot exceed 1 even if the mission set shrank under a stale log', () => {
    expect(completionRatio({ completed: ['a', 'b', 'c'], applicable: 2, skipped: false })).toBe(1);
  });
});

describe('invariant #6 — task and language are independent', () => {
  it('produces identical mission status regardless of the language result', () => {
    const missions: Mission[] = [
      { id: 'a', en: 'A', requires: [{ kind: 'intent', state: 'start', intent: 'bread' }] },
    ];
    const base = outcome('start', matched('bread'));
    const scored: TurnOutcome = {
      ...base,
      language: { kind: 'scored', feedback: MOCK_FEEDBACK },
    };
    const unscored: TurnOutcome = { ...base, language: { kind: 'unscored', feedback: null } };
    expect(missionStatus(missions, [scored])).toEqual(missionStatus(missions, [unscored]));
    expect(missionStatus(missions, [scored]).completed).toEqual(['a']);
  });
});
