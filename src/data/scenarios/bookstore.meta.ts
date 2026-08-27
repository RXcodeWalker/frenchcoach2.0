import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 2. The `fiction` branch reached `check_stock`'s buy/browse
 * `intents` (1 mission-legal point) via a `next`-only `fiction_start` and
 * then a `next`-only `go_to_cashier` — 4 turns, 1 point. This pass adds
 * `capture` to `fiction_start` and turns `go_to_cashier` into a payment-
 * method `intents` branch. Only `fiction` is authored; the other 9 `start`
 * side-intents (including the sibling `nonfiction`/`comics`/`search`
 * branches that already share `check_stock`) remain unauthored (Stage 9
 * backlog).
 */
export const bookstoreMeta: ScenarioMeta = {
  id: 'bookstore',
  title: 'Bookstore',
  titleFr: 'La Librairie',
  emoji: '📚',
  tier: 2,
  category: 'Services',
  dependencies: [],
  npc: {
    nameFr: 'Libraire',
    roleFr: 'le libraire',
    roleEn: 'bookseller',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're looking for a novel at the bookshop. Say you want fiction, pick a genre, confirm you want to buy it, then confirm how you'll pay.",
  branches: {
    fiction: {
      labelEn: 'Buy a novel',
      missions: [
        {
          id: 'bookstore_ask_fiction',
          en: 'Say you are looking for a novel',
          modelFr: 'Je cherche un roman.',
          requires: [{ kind: 'intent', state: 'start', intent: 'fiction' }],
        },
        {
          id: 'bookstore_say_genre',
          en: 'Say what genre you want',
          modelFr: 'Un roman policier, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'fiction_start', slot: 'fiction_genre', minWords: 2 }],
        },
        {
          id: 'bookstore_confirm_buy',
          en: 'Say you want to buy it',
          modelFr: 'Oui, je le prends.',
          requires: [{ kind: 'intent', state: 'check_stock', intent: 'buy' }],
        },
        {
          id: 'bookstore_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'go_to_cashier', intent: 'card' }],
        },
        {
          id: 'bookstore_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'go_to_cashier', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'fiction', terms: ['roman', 'cherche un roman'], priority: 1 },
    { state: 'check_stock', intent: 'buy', terms: ['prends', 'je le prends'], priority: 1 },
    { state: 'check_stock', intent: 'browse', terms: ['regarder', 'continuer a regarder'] },
    { state: 'go_to_cashier', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'go_to_cashier', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
