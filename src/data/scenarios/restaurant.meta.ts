import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 4. The `no` (no reservation) branch's `next` chain already
 * reached ~9 turns (`start→check_availability→offer_table→menu_intro→
 * ask_food_ready→order_main→confirm_order→meal_wait→ask_bill→ask_payment→
 * end_session`) but had 0 mission-legal points. This pass adds `capture` to
 * `check_availability` and `order_main`, and turns `ask_payment` into a
 * payment-method `intents` branch (was `next`-only). Only `no` (walk-in) is
 * authored; `yes` (→ `ask_name`) and the other 19 `start` side-intents
 * remain unauthored (Stage 9 backlog).
 */
export const restaurantMeta: ScenarioMeta = {
  id: 'restaurant',
  title: 'Restaurant',
  titleFr: 'Le Restaurant',
  emoji: '🍽️',
  tier: 4,
  category: 'Leisure',
  dependencies: [],
  npc: {
    nameFr: 'Serveur',
    roleFr: 'le serveur',
    roleEn: 'waiter',
    emoji: '🧑‍🍳',
    register: 'formal',
  },
  briefingEn:
    "You're at a restaurant without a reservation. Say how many people you are, order your main dish, then confirm how you'll pay.",
  branches: {
    no: {
      labelEn: 'Dine without a reservation',
      missions: [
        {
          id: 'restaurant_no_reservation',
          en: "Say you don't have a reservation",
          modelFr: "Non, je n'ai pas réservé.",
          requires: [{ kind: 'intent', state: 'start', intent: 'no' }],
        },
        {
          id: 'restaurant_say_party_size',
          en: 'Say how many people you are',
          modelFr: 'Nous sommes quatre personnes.',
          requires: [{ kind: 'slot', state: 'check_availability', slot: 'party_size', minWords: 2 }],
        },
        {
          id: 'restaurant_order_main',
          en: 'Order your main dish',
          modelFr: 'Je prendrai le poulet rôti.',
          requires: [{ kind: 'slot', state: 'order_main', slot: 'main_dish', minWords: 2 }],
        },
        {
          id: 'restaurant_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'card' }],
        },
        {
          id: 'restaurant_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'no', terms: ['pas reserve', 'non'], priority: 1 },
    { state: 'start', intent: 'yes', terms: ['reservation'] },
    { state: 'ask_payment', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'ask_payment', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
