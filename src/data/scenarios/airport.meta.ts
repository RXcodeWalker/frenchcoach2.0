import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. `check_documents` was a single-hop cul-de-sac
 * (`check_documents→end_session`) — 2 turns, 0 mission-legal points. This
 * pass adds `capture` to `check_documents` (destination) and a new
 * `ask_baggage` (capture), then a new `ask_seat_preference` `intents`
 * branch before a new `confirm_checkin` terminal step. Only `checkin` is
 * authored; the other 19 `start` side-intents remain unauthored (Stage 9
 * backlog).
 */
export const airportMeta: ScenarioMeta = {
  id: 'airport',
  title: 'Airport',
  titleFr: "L'Aéroport",
  emoji: '✈️',
  tier: 3,
  category: 'Travel',
  dependencies: [],
  npc: {
    nameFr: 'Agent d\'enregistrement',
    roleFr: "l'agent d'enregistrement",
    roleEn: 'check-in agent',
    emoji: '🧑‍✈️',
    register: 'formal',
  },
  briefingEn:
    "You're checking in for a flight. Say you want to check in, give your destination and bags, choose a seat, then get your boarding pass.",
  branches: {
    checkin: {
      labelEn: 'Check in for a flight',
      missions: [
        {
          id: 'airport_ask_checkin',
          en: 'Say you want to check in',
          modelFr: "Je voudrais m'enregistrer.",
          requires: [{ kind: 'intent', state: 'start', intent: 'checkin' }],
        },
        {
          id: 'airport_say_destination',
          en: 'Say your destination',
          modelFr: 'Je vais à Madrid.',
          requires: [{ kind: 'slot', state: 'check_documents', slot: 'flight_destination', minWords: 2 }],
        },
        {
          id: 'airport_say_baggage',
          en: 'Say how many bags you have',
          modelFr: "J'ai une valise à enregistrer.",
          requires: [{ kind: 'slot', state: 'ask_baggage', slot: 'baggage_count', minWords: 2 }],
        },
        {
          id: 'airport_choose_aisle',
          en: 'Say you want an aisle seat',
          modelFr: "Un siège côté couloir, s'il vous plaît.",
          requires: [{ kind: 'intent', state: 'ask_seat_preference', intent: 'aisle' }],
        },
        {
          id: 'airport_choose_window',
          en: 'Say you want a window seat',
          modelFr: 'Je voudrais un siège côté hublot.',
          requires: [{ kind: 'intent', state: 'ask_seat_preference', intent: 'window' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'checkin', terms: ["m'enregistrer", 'enregistrement'], priority: 1 },
    { state: 'ask_seat_preference', intent: 'aisle', terms: ['couloir'], priority: 1 },
    { state: 'ask_seat_preference', intent: 'window', terms: ['hublot'] },
  ],
};
