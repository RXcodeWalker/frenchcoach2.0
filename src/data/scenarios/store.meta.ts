import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 1. The `clothing` branch's `next` chain already reached 6
 * turns (`start→ask_clothing_type→ask_size→check_stock→go_to_cashier→
 * ask_payment→end_session`) but had 0 mission-legal points. This pass adds
 * `capture` to `ask_clothing_type` and `ask_size`, and turns `ask_payment`
 * into a payment-method `intents` branch (was `next`-only, and dropped the
 * gift-cheque option since it's not modelled as a branch). Only `clothing`
 * is authored; the other 16 `start` side-intents and the parallel `shoes`
 * branch remain unauthored (Stage 9 backlog).
 */
export const storeMeta: ScenarioMeta = {
  id: 'store',
  title: 'Clothing Store',
  titleFr: 'Le Magasin de Vêtements',
  emoji: '👕',
  tier: 1,
  category: 'Basics',
  dependencies: [],
  npc: {
    nameFr: 'Vendeur',
    roleFr: 'le vendeur',
    roleEn: 'shop assistant',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're shopping for clothes. Say what kind of clothing you're looking for, give your size, then go pay and confirm how you'll pay.",
  branches: {
    clothing: {
      labelEn: 'Buy clothing',
      missions: [
        {
          id: 'store_ask_clothing',
          en: 'Say you are looking for clothes',
          modelFr: 'Je cherche des vêtements.',
          requires: [{ kind: 'intent', state: 'start', intent: 'clothing' }],
        },
        {
          id: 'store_say_clothing_type',
          en: 'Say what type of clothing you want',
          modelFr: 'Je cherche un pull.',
          requires: [{ kind: 'slot', state: 'ask_clothing_type', slot: 'clothing_type', minWords: 2 }],
        },
        {
          id: 'store_say_size',
          en: 'Say your size',
          modelFr: 'Je fais du M.',
          requires: [{ kind: 'slot', state: 'ask_size', slot: 'clothing_size', minWords: 2 }],
        },
        {
          id: 'store_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'card' }],
        },
        {
          id: 'store_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'clothing', terms: ['vetements', 'cherche des vetements'], priority: 1 },
    { state: 'ask_payment', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'ask_payment', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
