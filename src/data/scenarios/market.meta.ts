import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 1. The `fruit` branch's `next` chain already reached 5 turns
 * (`start→ask_fruit_type→ask_quantity→ask_anything_else→calculate_price→
 * ask_payment→end_session`) but had 0 mission-legal points — no `capture`/
 * `intents` anywhere except `ask_anything_else` looping back to `start`.
 * This pass adds `capture` to `ask_fruit_type` and `ask_quantity`, and turns
 * `ask_payment` into a payment-method `intents` branch (was `next`-only).
 * Only the `fruit` branch is authored; the other 19 `start` side-intents and
 * the parallel `vegetable` branch remain unauthored (Stage 9 backlog).
 */
export const marketMeta: ScenarioMeta = {
  id: 'market',
  title: 'Market',
  titleFr: 'Le Marché',
  emoji: '🍎',
  tier: 1,
  category: 'Basics',
  dependencies: [],
  npc: {
    nameFr: 'Marchand',
    roleFr: 'le marchand',
    roleEn: 'market vendor',
    emoji: '🧑‍🌾',
    register: 'informal',
  },
  briefingEn:
    "You're at a market stall. Ask for fruit, say which kind and how much you want, say you don't need anything else, then confirm how you'll pay.",
  branches: {
    fruit: {
      labelEn: 'Buy fruit',
      missions: [
        {
          id: 'market_ask_fruit',
          en: 'Say you want fruit',
          modelFr: "Je voudrais des fruits, s'il vous plaît.",
          requires: [{ kind: 'intent', state: 'start', intent: 'fruit' }],
        },
        {
          id: 'market_say_fruit_type',
          en: 'Say which fruit you want',
          modelFr: 'Je voudrais des pommes.',
          requires: [{ kind: 'slot', state: 'ask_fruit_type', slot: 'fruit_type', minWords: 2 }],
        },
        {
          id: 'market_say_quantity',
          en: 'Say how much you want',
          modelFr: 'Un kilo, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'ask_quantity', slot: 'quantity', minWords: 2 }],
        },
        {
          id: 'market_decline_more',
          en: "Say that's everything, nothing more needed",
          modelFr: "Non merci, ce sera tout.",
          requires: [{ kind: 'intent', state: 'ask_anything_else', intent: 'no' }],
        },
        {
          id: 'market_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'card' }],
        },
        {
          id: 'market_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'fruit', terms: ['fruits', 'des fruits'], priority: 1 },
    { state: 'ask_anything_else', intent: 'no', terms: ['non', 'ce sera tout'], priority: 1 },
    { state: 'ask_anything_else', intent: 'yes', terms: ['oui', 'encore'] },
    { state: 'ask_payment', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'ask_payment', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
