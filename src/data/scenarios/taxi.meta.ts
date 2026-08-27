import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 4. The `destination` branch's `next` chain was
 * `estimate_trip→end_session` — 2 turns, 0 mission-legal points. This pass
 * inserts a new `ask_destination_address` (capture) before `estimate_trip`,
 * turns `estimate_trip` into a yes/no `intents` branch (accept the fare
 * estimate or change destination), and adds a new `confirm_departure`
 * payment-method `intents` branch. Only `destination` is authored; the
 * other 15 `start` side-intents remain unauthored (Stage 9 backlog).
 */
export const taxiMeta: ScenarioMeta = {
  id: 'taxi',
  title: 'Taxi',
  titleFr: 'Le Taxi',
  emoji: '🚕',
  tier: 4,
  category: 'Travel',
  dependencies: [],
  npc: {
    nameFr: 'Chauffeur de taxi',
    roleFr: 'le chauffeur',
    roleEn: 'taxi driver',
    emoji: '🧑‍✈️',
    register: 'informal',
  },
  briefingEn:
    "You're getting into a taxi. Give your destination, accept the fare estimate, then say how you'll pay.",
  branches: {
    destination: {
      labelEn: 'Take a taxi to a destination',
      missions: [
        {
          id: 'taxi_give_destination',
          en: 'Say where you want to go',
          modelFr: 'Je voudrais aller à la gare.',
          requires: [{ kind: 'intent', state: 'start', intent: 'destination' }],
        },
        {
          id: 'taxi_say_address',
          en: 'Give the exact address',
          modelFr: 'Le 12 rue de la République.',
          requires: [{ kind: 'slot', state: 'ask_destination_address', slot: 'destination_address', minWords: 3 }],
        },
        {
          id: 'taxi_accept_fare',
          en: 'Say yes, the fare estimate is fine',
          modelFr: "Oui, ça me convient.",
          requires: [{ kind: 'intent', state: 'estimate_trip', intent: 'yes' }],
        },
        {
          id: 'taxi_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'confirm_departure', intent: 'card' }],
        },
        {
          id: 'taxi_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'confirm_departure', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'destination', terms: ['aller a', 'voudrais aller'], priority: 1 },
    { state: 'estimate_trip', intent: 'yes', terms: ['oui', 'convient'], priority: 1 },
    { state: 'estimate_trip', intent: 'no', terms: ['non'] },
    { state: 'confirm_departure', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'confirm_departure', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
