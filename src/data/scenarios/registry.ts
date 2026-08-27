import type { ScenarioDeck, ScenarioGraph, ScenarioMeta } from '../../features/roleplay/types';

import hairdresserGraph from './hairdresser.json';
import bakeryGraph from './bakery.json';
import gareGraph from './gare.json';
import cafeGraph from './cafe.json';
import marketGraph from './market.json';
import storeGraph from './store.json';
import bankGraph from './bank.json';
import postOfficeGraph from './post_office.json';
import pharmacyGraph from './pharmacy.json';
import bookstoreGraph from './bookstore.json';
import airportGraph from './airport.json';
import campingGraph from './camping.json';
import carRentalGraph from './car_rental.json';
import cinemaGraph from './cinema.json';
import dentistGraph from './dentist.json';
import doctorGraph from './doctor.json';
import flightGraph from './flight.json';
import flowerShopGraph from './flower_shop.json';
import gasStationGraph from './gas_station.json';
import gymGraph from './gym.json';
import hotelGraph from './hotel.json';
import jobInterviewGraph from './job_interview.json';
import realEstateGraph from './real_estate.json';
import restaurantGraph from './restaurant.json';
import skiResortGraph from './ski_resort.json';
import taxiGraph from './taxi.json';
import policeStationGraph from './police_station.json';
import museumGraph from './museum.json';
import libraryGraph from './library.json';
import touristOfficeGraph from './tourist_office.json';
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
import { bankMeta } from './bank.meta';
import { bankDeck } from './bank.deck';
import { postOfficeMeta } from './post_office.meta';
import { postOfficeDeck } from './post_office.deck';
import { pharmacyMeta } from './pharmacy.meta';
import { pharmacyDeck } from './pharmacy.deck';
import { bookstoreMeta } from './bookstore.meta';
import { bookstoreDeck } from './bookstore.deck';
import { airportMeta } from './airport.meta';
import { airportDeck } from './airport.deck';
import { campingMeta } from './camping.meta';
import { campingDeck } from './camping.deck';
import { carRentalMeta } from './car_rental.meta';
import { carRentalDeck } from './car_rental.deck';
import { cinemaMeta } from './cinema.meta';
import { cinemaDeck } from './cinema.deck';
import { dentistMeta } from './dentist.meta';
import { dentistDeck } from './dentist.deck';
import { doctorMeta } from './doctor.meta';
import { doctorDeck } from './doctor.deck';
import { flightMeta } from './flight.meta';
import { flightDeck } from './flight.deck';
import { flowerShopMeta } from './flower_shop.meta';
import { flowerShopDeck } from './flower_shop.deck';
import { gasStationMeta } from './gas_station.meta';
import { gasStationDeck } from './gas_station.deck';
import { gymMeta } from './gym.meta';
import { gymDeck } from './gym.deck';
import { hotelMeta } from './hotel.meta';
import { hotelDeck } from './hotel.deck';
import { jobInterviewMeta } from './job_interview.meta';
import { jobInterviewDeck } from './job_interview.deck';
import { realEstateMeta } from './real_estate.meta';
import { realEstateDeck } from './real_estate.deck';
import { restaurantMeta } from './restaurant.meta';
import { restaurantDeck } from './restaurant.deck';
import { skiResortMeta } from './ski_resort.meta';
import { skiResortDeck } from './ski_resort.deck';
import { taxiMeta } from './taxi.meta';
import { taxiDeck } from './taxi.deck';
import { policeStationMeta } from './police_station.meta';
import { policeStationDeck } from './police_station.deck';
import { museumMeta } from './museum.meta';
import { museumDeck } from './museum.deck';
import { libraryMeta } from './library.meta';
import { libraryDeck } from './library.deck';
import { touristOfficeMeta } from './tourist_office.meta';
import { touristOfficeDeck } from './tourist_office.deck';

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
 * Every scenario id known to the tree. All 30 are now authored: `bakery`
 * and `hairdresser` in Stage 1 (reference implementations — bakery for a
 * shallow multi-mission branch, hairdresser for deep branching + slot
 * conditions + a non-success terminal); the remaining 28 in Stage 9, in the
 * plan's stated order (gare as the canonical worked example, then Tier 1
 * through Tier 5, largest graphs last: museum/library/tourist_office). Every
 * scenario has only its primary branch authored — remaining `start`
 * side-intents (and, for some, a parallel sibling branch) are real graph
 * content but intentionally left unauthored, since authoring every side
 * intent for all 30 scenarios is outside Stage 9's scope as written.
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
  bank: { meta: bankMeta, graph: bankGraph, deck: bankDeck },
  post_office: { meta: postOfficeMeta, graph: postOfficeGraph, deck: postOfficeDeck },
  pharmacy: { meta: pharmacyMeta, graph: pharmacyGraph, deck: pharmacyDeck },
  bookstore: { meta: bookstoreMeta, graph: bookstoreGraph, deck: bookstoreDeck },
  airport: { meta: airportMeta, graph: airportGraph, deck: airportDeck },
  camping: { meta: campingMeta, graph: campingGraph, deck: campingDeck },
  car_rental: { meta: carRentalMeta, graph: carRentalGraph, deck: carRentalDeck },
  cinema: { meta: cinemaMeta, graph: cinemaGraph, deck: cinemaDeck },
  dentist: { meta: dentistMeta, graph: dentistGraph, deck: dentistDeck },
  doctor: { meta: doctorMeta, graph: doctorGraph, deck: doctorDeck },
  flight: { meta: flightMeta, graph: flightGraph, deck: flightDeck },
  flower_shop: { meta: flowerShopMeta, graph: flowerShopGraph, deck: flowerShopDeck },
  gas_station: { meta: gasStationMeta, graph: gasStationGraph, deck: gasStationDeck },
  gym: { meta: gymMeta, graph: gymGraph, deck: gymDeck },
  hotel: { meta: hotelMeta, graph: hotelGraph, deck: hotelDeck },
  job_interview: { meta: jobInterviewMeta, graph: jobInterviewGraph, deck: jobInterviewDeck },
  real_estate: { meta: realEstateMeta, graph: realEstateGraph, deck: realEstateDeck },
  restaurant: { meta: restaurantMeta, graph: restaurantGraph, deck: restaurantDeck },
  ski_resort: { meta: skiResortMeta, graph: skiResortGraph, deck: skiResortDeck },
  taxi: { meta: taxiMeta, graph: taxiGraph, deck: taxiDeck },
  police_station: { meta: policeStationMeta, graph: policeStationGraph, deck: policeStationDeck },
  museum: { meta: museumMeta, graph: museumGraph, deck: museumDeck },
  library: { meta: libraryMeta, graph: libraryGraph, deck: libraryDeck },
  tourist_office: { meta: touristOfficeMeta, graph: touristOfficeGraph, deck: touristOfficeDeck },
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

/** True for every scenario — all 30 are authored (Stage 1: bakery, hairdresser; Stage 9: the remaining 28). */
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
