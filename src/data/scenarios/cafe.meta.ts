import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 1. `ask_coffee` was a `next`-only cul-de-sac (straight to
 * `show_total` then `end_session`) — 3 turns, 0 mission-legal points. This
 * pass adds a `capture` for the coffee order and a milk/sugar follow-up, then
 * turns `show_total` into a payment-method `intents` branch (was `next`-only).
 * Only the `coffee` branch is authored; the other 19 `start` side-intents
 * remain unauthored graph content (Stage 9 backlog).
 */
export const cafeMeta: ScenarioMeta = {
  id: 'cafe',
  title: 'Café',
  titleFr: 'Le Café',
  emoji: '☕',
  tier: 1,
  category: 'Basics',
  dependencies: [],
  npc: {
    nameFr: 'Serveur',
    roleFr: 'le serveur',
    roleEn: 'waiter',
    emoji: '🧑‍🍳',
    register: 'informal',
  },
  briefingEn:
    "You're ordering at a café. Order a coffee, say how you take it, then confirm the total and how you'll pay.",
  branches: {
    coffee: {
      labelEn: 'Order a coffee',
      missions: [
        {
          id: 'cafe_order_coffee',
          en: 'Say you want a coffee',
          modelFr: 'Je voudrais un café, s\'il vous plaît.',
          requires: [{ kind: 'intent', state: 'start', intent: 'coffee' }],
        },
        {
          id: 'cafe_say_type',
          en: 'Say what kind of coffee you want',
          modelFr: 'Un cappuccino, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'ask_coffee', slot: 'coffee_order', minWords: 2 }],
        },
        {
          id: 'cafe_say_milk_sugar',
          en: 'Say how you take it (milk, sugar, or neither)',
          modelFr: 'Avec du lait, sans sucre.',
          requires: [{ kind: 'slot', state: 'ask_milk_sugar', slot: 'milk_sugar', minWords: 2 }],
        },
        {
          id: 'cafe_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'show_total', intent: 'card' }],
        },
        {
          id: 'cafe_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'show_total', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'coffee', terms: ['cafe', 'voudrais un cafe'], priority: 1 },
    { state: 'show_total', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'show_total', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
