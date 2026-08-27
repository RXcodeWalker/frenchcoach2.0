import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. The `bouquet` branch's `next` chain was
 * `bouquet_start→ask_colors→ask_budget→go_to_cashier→end_session` — 5
 * turns, 0 mission-legal points. This pass adds `capture` to `bouquet_start`
 * and `ask_budget`, and turns `go_to_cashier` into a payment-method
 * `intents` branch (was `next`-only). Only `bouquet` is authored; the other
 * 9 `start` side-intents remain unauthored (Stage 9 backlog).
 */
export const flowerShopMeta: ScenarioMeta = {
  id: 'flower_shop',
  title: 'Flower Shop',
  titleFr: 'Le Fleuriste',
  emoji: '💐',
  tier: 3,
  category: 'Services',
  dependencies: [],
  npc: {
    nameFr: 'Fleuriste',
    roleFr: 'le/la fleuriste',
    roleEn: 'florist',
    emoji: '🧑‍🌾',
    register: 'informal',
  },
  briefingEn:
    "You're buying a bouquet. Say the style you want, your budget, then confirm how you'll pay.",
  branches: {
    bouquet: {
      labelEn: 'Buy a bouquet',
      missions: [
        {
          id: 'flower_ask_bouquet',
          en: 'Say you want a bouquet',
          modelFr: 'Je voudrais un bouquet.',
          requires: [{ kind: 'intent', state: 'start', intent: 'bouquet' }],
        },
        {
          id: 'flower_say_style',
          en: 'Say what style/colours you want',
          modelFr: 'Des couleurs vives, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'bouquet_start', slot: 'bouquet_style', minWords: 2 }],
        },
        {
          id: 'flower_say_budget',
          en: 'Say your budget',
          modelFr: "J'ai un budget de 30 euros.",
          requires: [{ kind: 'slot', state: 'ask_budget', slot: 'budget', minWords: 3 }],
        },
        {
          id: 'flower_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'go_to_cashier', intent: 'card' }],
        },
        {
          id: 'flower_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'go_to_cashier', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'bouquet', terms: ['bouquet'], priority: 1 },
    { state: 'go_to_cashier', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'go_to_cashier', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
