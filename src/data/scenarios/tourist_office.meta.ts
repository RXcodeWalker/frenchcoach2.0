import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 final pass (largest graphs, per the plan's ordering). The
 * `activities` branch already had `capture` at `ask_interests` and
 * `book_tour`, plus `intents` at `ask_tour` — 6 turns, 4 mission-legal
 * points. `ask_payment` had a `tax_refund` intent but no payment-method
 * branch and was `next`-only for the happy path. This pass adds a
 * card/cash `intents` branch to `ask_payment` (was `next`-only) and a new
 * `confirm_payment_card`/`confirm_payment_cash` pair, bringing this branch
 * to parity with the payment pattern used across the rest of the corpus.
 * Only `activities` is authored; the other 16 `start` side-intents remain
 * unauthored (Stage 9 backlog).
 */
export const touristOfficeMeta: ScenarioMeta = {
  id: 'tourist_office',
  title: 'Tourist Office',
  titleFr: "L'Office de Tourisme",
  emoji: 'ℹ️',
  tier: 5,
  category: 'Travel',
  dependencies: [],
  npc: {
    nameFr: 'Conseiller touristique',
    roleFr: 'le conseiller touristique',
    roleEn: 'tourist office advisor',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're at the tourist office asking about activities. Say your interests, decide on a guided tour, say how many people, then confirm payment.",
  branches: {
    activities: {
      labelEn: 'Ask about activities',
      missions: [
        {
          id: 'tourist_ask_activities',
          en: 'Say you want activity suggestions',
          modelFr: "Je cherche des activités à faire.",
          requires: [{ kind: 'intent', state: 'start', intent: 'activities' }],
        },
        {
          id: 'tourist_say_interests',
          en: 'Say what you are interested in',
          modelFr: "Je m'intéresse à l'histoire et à la gastronomie.",
          requires: [{ kind: 'slot', state: 'ask_interests', slot: 'interests', minWords: 3 }],
        },
        {
          id: 'tourist_accept_tour',
          en: 'Say yes to the guided tour',
          modelFr: 'Oui, ça me tente.',
          requires: [{ kind: 'intent', state: 'ask_tour', intent: 'yes' }],
        },
        {
          id: 'tourist_say_tour_count',
          en: 'Say how many people to register',
          modelFr: 'Nous sommes deux adultes.',
          requires: [{ kind: 'slot', state: 'book_tour', slot: 'tour_count', minWords: 2 }],
        },
        {
          id: 'tourist_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'card' }],
        },
        {
          id: 'tourist_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'activities', terms: ['activites'], priority: 1 },
    { state: 'ask_tour', intent: 'yes', terms: ['oui', 'tente'], priority: 1 },
    { state: 'ask_tour', intent: 'no', terms: ['non'] },
    { state: 'ask_payment', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'ask_payment', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
