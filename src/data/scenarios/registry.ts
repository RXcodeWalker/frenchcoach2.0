import type { ScenarioDeck, ScenarioGraph, ScenarioMeta } from '../../features/roleplay/types';

import hairdresserGraph from './hairdresser.json';
import bakeryGraph from './bakery.json';
import gareGraph from './gare.json';
import cafeGraph from './cafe.json';
import marketGraph from './market.json';
import storeGraph from './store.json';
import { hairdresserMeta } from './hairdresser.meta';
import { hairdresserDeck } from './hairdresser.deck';
import { bakeryMeta } from './bakery.meta';
import { bakeryDeck } from './bakery.deck';
import { gareMeta } from './gare.meta';
import { gareDeck } from './gare.deck';
import { cafeMeta } from './cafe.meta';
import { cafeDeck } from './cafe.deck';
import { marketMeta } from './market.meta';
import { marketDeck } from './market.deck';
import { storeMeta } from './store.meta';
import { storeDeck } from './store.deck';

/**
 * Deep-freezes a value in place and returns it. Applied to every authored
 * graph, meta, and deck at module load so the session reducer can never
 * mutate authored content — see "Runtime invariants" #1 in the overhaul plan.
 */
function deepFreeze<T>(value: T): T {
  if (value !== null && (typeof value === 'object' || typeof value === 'function')) {
    const obj = value as unknown as Record<string, unknown>;
    for (const key of Object.getOwnPropertyNames(obj)) {
      const prop = obj[key];
      if (prop !== null && (typeof prop === 'object' || typeof prop === 'function') && !Object.isFrozen(prop)) {
        deepFreeze(prop);
      }
    }
    Object.freeze(obj);
  }
  return value;
}

interface ScenarioEntry {
  meta: ScenarioMeta;
  graph: ScenarioGraph;
  deck: ScenarioDeck;
}

/**
 * Handoff note for Stage 4 (session reducer — not built yet):
 *
 * `OfflineScenarioState.memory` (e.g. hairdresser's `set_balayage` node
 * carrying `memory: { service: 'Balayage' }`) has nowhere to land in the
 * reducer state shape sketched in the plan
 * (`{ scenarioId, branchId, currentState, outcomes[], slots{}, turnIndex,
 * misfireCount, phase, rngSeed }`). It needs a `memory: Record<string,
 * unknown>` accumulator alongside `slots{}`:
 *   - a node's `memory` object is shallow-merged into the accumulator on
 *     state entry
 *   - later entries overwrite earlier keys on collision
 *   - the accumulator is session-scoped only — it must never be written
 *     back into the frozen graph (registry invariant #1)
 *
 * Open question Stage 4 still has to answer: is `memory` purely
 * presentational (prompt interpolation, e.g. `go_to_cashier`'s
 * `{price}`, and the debrief screen), or should it become a mission
 * condition type (`{ kind: 'memory'; key; equals }` or similar)? It is
 * currently neither — hairdresser's `set_*` nodes are the only evidence
 * either way, and Stage 1 deliberately does not decide this; adding a
 * condition type is a plan change, not an implementation detail.
 */

/**
 * Every scenario id known to the tree. `bakery` and `hairdresser` are
 * authored in Stage 1 (reference implementations — bakery for a shallow
 * multi-mission branch, hairdresser for deep branching + slot conditions +
 * a non-success terminal). `gare`, `cafe`, `market`, and `store` are authored
 * in Stage 9 (gare: canonical worked example; cafe/market/store: Tier 1) —
 * each has only its primary branch authored; remaining `start` side-intents
 * (and, for market/store, a parallel `vegetable`/`shoes` branch) remain
 * unauthored graph content for a later Stage 9 pass. The rest ship as
 * `authored: false` stubs and render locked in the Explore tree until their
 * own Stage 9 pass.
 */
const SCENARIO_IDS = [
  'airport', 'bakery', 'bank', 'bookstore', 'cafe', 'camping', 'car_rental',
  'cinema', 'dentist', 'doctor', 'flight', 'flower_shop', 'gare', 'gas_station',
  'gym', 'hairdresser', 'hotel', 'job_interview', 'market', 'museum',
  'pharmacy', 'post_office', 'real_estate', 'restaurant', 'ski_resort',
  'store', 'taxi', 'tourist_office', 'police_station', 'library',
] as const;

export type ScenarioId = (typeof SCENARIO_IDS)[number];

function emptyMeta(id: string): ScenarioMeta {
  return {
    id,
    title: id,
    titleFr: id,
    emoji: '❓',
    tier: 1,
    category: 'Unauthored',
    dependencies: [],
    npc: { nameFr: '', roleFr: '', roleEn: '', emoji: '❓', register: 'informal' },
    briefingEn: '',
    branches: {},
    triggers: [],
  };
}

const AUTHORED_ENTRIES: Partial<Record<ScenarioId, ScenarioEntry>> = {
  bakery: { meta: bakeryMeta, graph: bakeryGraph, deck: bakeryDeck },
  hairdresser: { meta: hairdresserMeta, graph: hairdresserGraph, deck: hairdresserDeck },
  gare: { meta: gareMeta, graph: gareGraph, deck: gareDeck },
  cafe: { meta: cafeMeta, graph: cafeGraph, deck: cafeDeck },
  market: { meta: marketMeta, graph: marketGraph, deck: marketDeck },
  store: { meta: storeMeta, graph: storeGraph, deck: storeDeck },
};

const REGISTRY: Record<ScenarioId, ScenarioEntry> = Object.fromEntries(
  SCENARIO_IDS.map((id) => {
    const authored = AUTHORED_ENTRIES[id];
    const entry: ScenarioEntry = authored ?? {
      meta: emptyMeta(id),
      graph: {},
      deck: { entries: [] },
    };
    return [id, deepFreeze(entry)];
  }),
) as Record<ScenarioId, ScenarioEntry>;

/** True only for scenarios with real authored content (Stage 1: bakery, hairdresser; Stage 9: gare, cafe, market, store). */
export function isAuthored(id: string): boolean {
  return id in AUTHORED_ENTRIES;
}

/**
 * Whether a tree node can be entered right now. Stage 3: unlocked (today's
 * static EXPLORE_TREE literal) AND authored (this registry). Stage 8 grows
 * this into the real derived-progress selector (dependency ratios replacing
 * the static `unlocked` literal) — call sites are meant to stay unchanged
 * when that happens, only this function's body grows.
 */
export function isPlayable(nodeId: string, unlocked: boolean): boolean {
  return unlocked && isAuthored(nodeId);
}

export function getScenario(id: string): ScenarioEntry | undefined {
  return REGISTRY[id as ScenarioId];
}

export function listScenarios(): ScenarioEntry[] {
  return SCENARIO_IDS.map((id) => REGISTRY[id]);
}

export function listScenarioIds(): readonly ScenarioId[] {
  return SCENARIO_IDS;
}
