import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. The `yes` (found seat) branch's `next` chain was
 * `ask_drink→ask_meal→end_session` — 3 turns, 0 mission-legal points. This
 * pass adds `capture` to `ask_drink` and `ask_meal`, and a new
 * `ask_anything_else` `intents` branch (looping "yes" back into
 * `cabin_adjustment_start`, matching this graph's existing path-independent
 * fold semantics). Only `yes` is authored; the other 15 `start` side-
 * intents remain unauthored (Stage 9 backlog).
 */
export const flightMeta: ScenarioMeta = {
  id: 'flight',
  title: 'On the Plane',
  titleFr: "Dans l'Avion",
  emoji: '🛫',
  tier: 3,
  category: 'Travel',
  dependencies: [],
  npc: {
    nameFr: "Steward / Hôtesse",
    roleFr: "l'hôtesse de l'air",
    roleEn: 'flight attendant',
    emoji: '🧑‍✈️',
    register: 'formal',
  },
  briefingEn:
    "You're on a plane and found your seat. Choose a drink, choose a meal, then say whether you need anything else.",
  branches: {
    yes: {
      labelEn: 'In-flight service',
      missions: [
        {
          id: 'flight_confirm_seat',
          en: 'Say you found your seat',
          modelFr: "Oui, j'ai trouvé ma place.",
          requires: [{ kind: 'intent', state: 'start', intent: 'yes' }],
        },
        {
          id: 'flight_choose_drink',
          en: 'Choose a drink',
          modelFr: "De l'eau, s'il vous plaît.",
          requires: [{ kind: 'slot', state: 'ask_drink', slot: 'drink_choice', minWords: 2 }],
        },
        {
          id: 'flight_choose_meal',
          en: 'Choose a meal',
          modelFr: 'Je prends le poulet, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'ask_meal', slot: 'meal_choice', minWords: 2 }],
        },
        {
          id: 'flight_decline_more',
          en: "Say no, that's everything",
          modelFr: 'Non merci, ce sera tout.',
          requires: [{ kind: 'intent', state: 'ask_anything_else', intent: 'no' }],
        },
        {
          id: 'flight_ask_more',
          en: 'Say yes, you need something else',
          modelFr: "Oui, j'ai besoin d'autre chose.",
          requires: [{ kind: 'intent', state: 'ask_anything_else', intent: 'yes' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'yes', terms: ['oui', 'trouve ma place'], priority: 1 },
    { state: 'ask_anything_else', intent: 'no', terms: ['non', 'ce sera tout'], priority: 1 },
    { state: 'ask_anything_else', intent: 'yes', terms: ['oui', 'besoin'] },
  ],
};
