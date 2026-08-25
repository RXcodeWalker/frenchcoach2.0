import { describe, it, expect } from 'vitest';
import {
  createSessionState,
  countWords,
  pickPrompt,
  roleplayReducer,
  stateKind,
  PASSTHROUGH_LANGUAGE,
  type ReducerContext,
  type RoleplayAction,
  type RoleplaySessionState,
} from '../useRoleplaySession';
import { MAX_CONSECUTIVE_MISFIRES, MAX_TURNS } from '../constants';
import { applicableMissions, missionStatus } from '../missions';
import { bakeryMeta } from '../../../data/scenarios/bakery.meta';
import { hairdresserMeta } from '../../../data/scenarios/hairdresser.meta';
import bakeryGraph from '../../../data/scenarios/bakery.json';
import hairdresserGraph from '../../../data/scenarios/hairdresser.json';
import { listScenarioIds } from '../../../data/scenarios/registry';
import type { LanguageResult, ScenarioGraph, ScenarioMeta } from '../types';
import type { FeedbackV2, OfflineScenarioState } from '../../../types/index';

const LANG: LanguageResult = { kind: 'unscored', feedback: null };

/** Minimal valid FeedbackV2 — only used to satisfy the type; these tests assert the reducer treats `language` as opaque, never its contents. */
const MOCK_FEEDBACK: FeedbackV2 = {
  scores: { overall: 9, communication: 9, language: 9, fluency: 9 },
  grammar: { critical: [], polish: [] },
  vocabulary: [],
  style: [],
  fillers: [],
  wordCount: 4,
};

function ctxFor(graph: unknown, meta: ScenarioMeta): ReducerContext {
  return { graph: graph as ScenarioGraph, meta };
}

const bakeryCtx = ctxFor(bakeryGraph, bakeryMeta);
const hairdresserCtx = ctxFor(hairdresserGraph, hairdresserMeta);

function run(
  ctx: ReducerContext,
  actions: RoleplayAction[],
  initial?: RoleplaySessionState,
): RoleplaySessionState {
  let state = initial ?? roleplayReducer(createSessionState('x', 1), { type: 'START' }, ctx);
  for (const action of actions) state = roleplayReducer(state, action, ctx);
  return state;
}

const say = (transcript: string): RoleplayAction => ({ type: 'SUBMIT_TURN', transcript, language: LANG });

describe('stateKind', () => {
  it('classifies the four node shapes', () => {
    expect(stateKind((bakeryGraph as ScenarioGraph).start)).toBe('choice');
    expect(stateKind((hairdresserGraph as ScenarioGraph).set_balayage)).toBe('passthrough');
    expect(stateKind((hairdresserGraph as ScenarioGraph).end_session)).toBe('terminal');
    expect(stateKind((hairdresserGraph as ScenarioGraph).end_session_fail)).toBe('terminal');
    expect(stateKind(undefined)).toBe('terminal');
  });

  it('classifies a next-only node carrying a capture slot as `capture`', () => {
    const node: OfflineScenarioState = { prompt: ['?'], next: 'b', capture: 'destination' };
    expect(stateKind(node)).toBe('capture');
  });
});

describe('countWords / pickPrompt', () => {
  it('counts words as a human would, not as matcher tokens', () => {
    expect(countWords("j'ai deux billets")).toBe(3);
    expect(countWords('   ')).toBe(0);
  });

  it('picks the same prompt for the same seed and state, every time', () => {
    const prompts = ['a', 'b', 'c'];
    expect(pickPrompt(prompts, 1, 'start')).toBe(pickPrompt(prompts, 1, 'start'));
    expect(pickPrompt([], 1, 'start')).toBe('');
  });
});

describe('reducer — a matched turn advances and records', () => {
  it('advances along the matched intent and completes its mission', () => {
    const state = run(bakeryCtx, [say('Bonjour, je voudrais du pain')]);
    expect(state.currentState).toBe((bakeryGraph as ScenarioGraph).start.intents!.bread);
    expect(state.outcomes).toHaveLength(1);
    expect(state.outcomes[0].intentResult).toEqual({ kind: 'matched', intent: 'bread', score: 1 });
    expect(state.branchId).toBe('bread');
    expect(state.misfireCount).toBe(0);

    const missions = applicableMissions(bakeryMeta.branches, state.outcomes);
    expect(missionStatus(missions, state.outcomes).completed).toEqual(['bakery_ask_bread']);
  });

  it('records the transcript and language verbatim without inspecting either', () => {
    const scored: LanguageResult = { kind: 'scored', feedback: MOCK_FEEDBACK };
    const state = run(bakeryCtx, [
      { type: 'SUBMIT_TURN', transcript: 'je voudrais du pain', language: scored },
    ]);
    expect(state.outcomes[0].transcript).toBe('je voudrais du pain');
    expect(state.outcomes[0].language).toBe(scored);
  });
});

describe('reducer — misfires do not advance', () => {
  it('holds position and increments misfireCount on a no_match', () => {
    const state = run(bakeryCtx, [say('blah blah blah')]);
    expect(state.currentState).toBe('start');
    expect(state.misfireCount).toBe(1);
    expect(state.outcomes[0].intentResult).toEqual({ kind: 'no_match' });
  });

  it('holds position and records the candidates on an ambiguous turn', () => {
    // `pastry` and `custom` are both authored at the default priority 0, so an
    // utterance naming both is a genuine tie the matcher must refuse to
    // resolve. (`bread` is authored at priority 1, which is why pairing
    // *it* with a sibling resolves outright instead.)
    const state = run(bakeryCtx, [say('un croissant et un sandwich')]);
    expect(state.currentState).toBe('start');
    expect(state.misfireCount).toBe(1);
    expect(state.outcomes[0].intentResult).toEqual({
      kind: 'ambiguous',
      candidates: ['custom', 'pastry'],
    });
  });

  it('lets an authored priority resolve what would otherwise be a tie', () => {
    // bakery.start authors `bread` at priority 1; `custom` defaults to 0.
    const state = run(bakeryCtx, [say('un pain et un sandwich')]);
    expect(state.currentState).toBe((bakeryGraph as ScenarioGraph).start.intents!.bread);
    expect(state.misfireCount).toBe(0);
  });

  it('resets misfireCount once a turn finally matches', () => {
    const state = run(bakeryCtx, [say('blah'), say('je voudrais du pain')]);
    expect(state.misfireCount).toBe(0);
    expect(state.outcomes).toHaveLength(2);
  });
});

describe('reducer — MAX_CONSECUTIVE_MISFIRES always skips and advances', () => {
  it('records `skipped` on the third consecutive miss and moves on', () => {
    const misses = Array.from({ length: MAX_CONSECUTIVE_MISFIRES }, () => say('blah blah'));
    const state = run(bakeryCtx, misses);
    const kinds = state.outcomes.map((o) => o.intentResult.kind);
    expect(kinds).toEqual(['no_match', 'no_match', 'skipped']);
    expect(state.currentState).not.toBe('start');
    expect(state.misfireCount).toBe(0);
  });

  it('advances a skip along the highest-priority authored branch', () => {
    // bakery.start authors `bread` at priority 1; every sibling defaults to 0.
    const misses = Array.from({ length: MAX_CONSECUTIVE_MISFIRES }, () => say('zzz'));
    const state = run(bakeryCtx, misses);
    expect(state.currentState).toBe((bakeryGraph as ScenarioGraph).start.intents!.bread);
  });

  it('grants no mission credit for a skipped session', () => {
    // Walk bakery entirely by skipping. Nothing may ever tick.
    let state = roleplayReducer(createSessionState('bakery', 1), { type: 'START' }, bakeryCtx);
    for (let i = 0; i < MAX_TURNS && state.phase === 'play'; i++) {
      state = roleplayReducer(state, say('zzz zzz zzz'), bakeryCtx);
    }
    expect(state.outcomes.some((o) => o.intentResult.kind === 'matched')).toBe(false);
    // Progression side effects key on this: with no `matched` outcome the
    // branch never resolves, so no mission is applicable and none completes.
    // (The XP half of the assertion lands in Stage 6's scoring.test.ts, which
    // owns orchestrateAttempt.)
    const missions = applicableMissions(bakeryMeta.branches, state.outcomes);
    const status = missionStatus(missions, state.outcomes);
    expect(state.branchId).toBeUndefined();
    expect(status).toEqual({ completed: [], applicable: 0, skipped: true });
  });
});

describe('reducer — capture and passthrough', () => {
  const graph: ScenarioGraph = {
    start: { prompt: ['Quelle est votre destination ?'], next: 'note', capture: 'destination' },
    note: { prompt: ['Bien.'], memory: { noted: true }, next: 'end_session' },
    end_session: { prompt: ['Au revoir.'] },
  };
  const meta: ScenarioMeta = { ...bakeryMeta, id: 'synthetic', branches: {}, triggers: [] };
  const ctx: ReducerContext = { graph, meta };

  it('records auto_advance plus the slot on a capture node', () => {
    const state = run(ctx, [say('je vais a Lyon demain matin')]);
    expect(state.outcomes[0].intentResult).toEqual({ kind: 'auto_advance' });
    expect(state.outcomes[0].slotFilled).toEqual({ slot: 'destination', wordCount: 6 });
    expect(state.slots.destination).toBe('je vais a Lyon demain matin');
    expect(state.currentState).toBe('note');
  });

  it('never misfires on a capture node, however off-topic the utterance', () => {
    const state = run(ctx, [say('zzz')]);
    expect(state.misfireCount).toBe(0);
    expect(state.currentState).toBe('note');
  });

  it('passes a memory node through on ADVANCE and merges its memory', () => {
    const state = run(ctx, [say('je vais a Lyon demain'), { type: 'ADVANCE' }]);
    expect(state.outcomes[1].intentResult).toEqual({ kind: 'auto_advance' });
    expect(state.outcomes[1].transcript).toBe('');
    expect(state.outcomes[1].language).toBe(PASSTHROUGH_LANGUAGE);
    expect(state.memory).toEqual({ noted: true });
    expect(state.currentState).toBe('end_session');
    expect(state.phase).toBe('debrief');
  });

  it('ignores ADVANCE on a node that is not a passthrough', () => {
    const before = roleplayReducer(createSessionState('x', 1), { type: 'START' }, ctx);
    expect(roleplayReducer(before, { type: 'ADVANCE' }, ctx)).toBe(before);
  });
});

describe('reducer — hairdresser memory setters (invariant #1 and #3)', () => {
  it('merges a set_* node’s memory on entry, without mutating the frozen graph', () => {
    // Driven along the real color branch: start -> ask_color_details -> set_balayage.
    const entered = run(hairdresserCtx, [say('je voudrais une coloration'), say('un balayage')]);
    expect(entered.currentState).toBe('set_balayage');
    // Memory is merged when the node is ENTERED, before it is passed through.
    expect(entered.memory).toEqual({ service: 'Balayage' });

    const advanced = roleplayReducer(entered, { type: 'ADVANCE' }, hairdresserCtx);
    expect(advanced.currentState).toBe('ask_shampoo');
    expect(advanced.outcomes[2].intentResult).toEqual({ kind: 'auto_advance' });
    expect(advanced.memory).toEqual({ service: 'Balayage' });

    // Invariant #1 — the authored graph is untouched; the accumulator is
    // session-scoped and a copy.
    expect((hairdresserGraph as ScenarioGraph).set_balayage.memory).toEqual({ service: 'Balayage' });
    expect(advanced.memory).not.toBe((hairdresserGraph as ScenarioGraph).set_balayage.memory);
  });

  it('credits the balayage mission to the intent turn, never to the set_* pass-through', () => {
    const entered = run(hairdresserCtx, [say('je voudrais une coloration'), say('un balayage')]);
    const missions = applicableMissions(hairdresserMeta.branches, entered.outcomes);
    expect(missionStatus(missions, entered.outcomes).completed.sort()).toEqual([
      'hairdresser_ask_color',
      'hairdresser_choose_balayage',
    ]);

    // The settled decision, asserted: strip the matched turns and leave only
    // the auto_advance through set_balayage — nothing may tick. This is why
    // `memory` is not a MissionCondition variant.
    const passThroughOnly = roleplayReducer(entered, { type: 'ADVANCE' }, hairdresserCtx).outcomes.slice(2);
    expect(passThroughOnly).toHaveLength(1);
    expect(missionStatus(missions, passThroughOnly).completed).toEqual([]);
  });

  it('treats end_session_fail as a clean ending, not an error', () => {
    const state: RoleplaySessionState = {
      ...roleplayReducer(createSessionState('hairdresser', 1), { type: 'START' }, hairdresserCtx),
      currentState: 'end_session_fail',
    };
    expect(stateKind((hairdresserGraph as ScenarioGraph).end_session_fail)).toBe('terminal');
    // A terminal consumes no further turns.
    expect(roleplayReducer(state, say('anything'), hairdresserCtx)).toBe(state);
  });
});

describe('reducer — RETRY replaces the last outcome', () => {
  it('rewinds the graph position and un-completes a mission', () => {
    const good = run(bakeryCtx, [say('je voudrais du pain')]);
    expect(good.outcomes).toHaveLength(1);

    const retried = roleplayReducer(good, { type: 'RETRY', transcript: 'zzz', language: LANG }, bakeryCtx);
    expect(retried.outcomes).toHaveLength(1);
    expect(retried.outcomes[0].intentResult).toEqual({ kind: 'no_match' });
    expect(retried.currentState).toBe('start');
    expect(retried.branchId).toBeUndefined();

    const missions = applicableMissions(bakeryMeta.branches, retried.outcomes);
    expect(missionStatus(missions, retried.outcomes).completed).toEqual([]);
  });

  it('re-completes when the retry succeeds', () => {
    const bad = run(bakeryCtx, [say('zzz')]);
    const retried = roleplayReducer(
      bad,
      { type: 'RETRY', transcript: 'je voudrais du pain', language: LANG },
      bakeryCtx,
    );
    expect(retried.outcomes).toHaveLength(1);
    expect(retried.branchId).toBe('bread');
    expect(retried.misfireCount).toBe(0);
  });

  it('restores the misfire counter it had before the replaced turn', () => {
    const twoMisses = run(bakeryCtx, [say('zzz'), say('zzz')]);
    expect(twoMisses.misfireCount).toBe(2);
    const retried = roleplayReducer(
      twoMisses,
      { type: 'RETRY', transcript: 'je voudrais du pain', language: LANG },
      bakeryCtx,
    );
    // The second miss is replaced by a match, so the counter resets rather
    // than tipping the next turn into a skip.
    expect(retried.misfireCount).toBe(0);
    expect(retried.outcomes).toHaveLength(2);
  });

  it('is a no-op before any turn has been taken', () => {
    const fresh = roleplayReducer(createSessionState('bakery', 1), { type: 'START' }, bakeryCtx);
    expect(roleplayReducer(fresh, { type: 'RETRY', transcript: 'x', language: LANG }, bakeryCtx)).toBe(fresh);
  });
});

describe('reducer — phases', () => {
  it('starts in briefing and enters play on START', () => {
    expect(createSessionState('bakery').phase).toBe('briefing');
    expect(roleplayReducer(createSessionState('bakery'), { type: 'START' }, bakeryCtx).phase).toBe('play');
  });

  it('moves to debrief when a terminal is reached', () => {
    const state = run(bakeryCtx, [say('je voudrais du pain')]);
    let s = state;
    for (let i = 0; i < MAX_TURNS && s.phase === 'play'; i++) {
      s = roleplayReducer(s, say('non merci, ce sera tout'), bakeryCtx);
    }
    expect(s.phase).toBe('debrief');
  });

  it('SET_PHASE returns the same object when the phase is unchanged', () => {
    const s = createSessionState('bakery');
    expect(roleplayReducer(s, { type: 'SET_PHASE', phase: 'briefing' }, bakeryCtx)).toBe(s);
  });
});

// ── Termination across the whole corpus ───────────────────────────────────────

const RAW_GRAPHS = import.meta.glob<ScenarioGraph>('../../../data/scenarios/*.json', {
  eager: true,
  import: 'default',
});

function graphFor(id: string): ScenarioGraph {
  const key = Object.keys(RAW_GRAPHS).find((k) => k.endsWith(`/${id}.json`));
  if (!key) throw new Error(`no graph JSON for scenario "${id}"`);
  return RAW_GRAPHS[key];
}

describe('termination — every state of all 30 graphs reaches a terminal within MAX_TURNS', () => {
  const ids = listScenarioIds();

  it('covers all thirty scenarios', () => {
    expect(ids).toHaveLength(30);
  });

  it.each(ids)('%s: every state has a terminal within MAX_TURNS edges', (id) => {
    const graph = graphFor(id);
    const terminals = Object.keys(graph).filter((k) => stateKind(graph[k]) === 'terminal');
    expect(terminals.length).toBeGreaterThan(0);

    // Reverse BFS from every terminal — the same shape as the Stage 2
    // validator's deadlock check, so a loop like bakery's start <-> ask_
    // anything_else is not mistaken for a dead end.
    const incoming = new Map<string, string[]>();
    for (const [from, node] of Object.entries(graph)) {
      const targets = [...(node.next ? [node.next] : []), ...Object.values(node.intents ?? {})];
      for (const to of targets) incoming.set(to, [...(incoming.get(to) ?? []), from]);
    }
    const distance = new Map<string, number>(terminals.map((t) => [t, 0]));
    const queue = [...terminals];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      for (const previous of incoming.get(current) ?? []) {
        if (!distance.has(previous)) {
          distance.set(previous, (distance.get(current) as number) + 1);
          queue.push(previous);
        }
      }
    }

    for (const stateId of Object.keys(graph)) {
      expect.soft(distance.get(stateId), `${id}.${stateId} cannot reach a terminal`).toBeDefined();
      expect.soft(distance.get(stateId) ?? Infinity).toBeLessThanOrEqual(MAX_TURNS);
    }
  });

  it.each(ids)('%s: the reducer always terminates under adversarial input', (id) => {
    const graph = graphFor(id);
    if (!graph.start) return;
    // No triggers and no branches: every choice state misfires, so this drives
    // the worst case — three misses then a forced skip, repeatedly.
    const meta: ScenarioMeta = { ...bakeryMeta, id, branches: {}, triggers: [] };
    const ctx: ReducerContext = { graph, meta };

    let state = roleplayReducer(createSessionState(id, 7), { type: 'START' }, ctx);
    let guard = 0;
    while (state.phase === 'play' && guard < MAX_TURNS * 2) {
      state = roleplayReducer(
        state,
        stateKind(graph[state.currentState]) === 'passthrough' ? { type: 'ADVANCE' } : say('zzz'),
        ctx,
      );
      guard++;
    }
    expect(state.phase).toBe('debrief');
    expect(state.turnIndex).toBeLessThanOrEqual(MAX_TURNS);
    // Nothing was ever achieved, so nothing may be credited.
    expect(state.outcomes.some((o) => o.intentResult.kind === 'matched')).toBe(false);
  });
});
