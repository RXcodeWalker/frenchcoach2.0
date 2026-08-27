import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. The `movie` branch's `next` chain was
 * `ask_time→show_total→end_session` — 3 turns, 0 mission-legal points. This
 * pass adds `capture` to `ask_time` and a new `ask_ticket_count` (capture),
 * then turns `show_total` into a payment-method `intents` branch (was
 * `next`-only). Only `movie` is authored; the other 15 `start` side-intents
 * remain unauthored (Stage 9 backlog).
 */
export const cinemaMeta: ScenarioMeta = {
  id: 'cinema',
  title: 'Cinema',
  titleFr: 'Le Cinéma',
  emoji: '🎬',
  tier: 3,
  category: 'Leisure',
  dependencies: [],
  npc: {
    nameFr: 'Caissier',
    roleFr: 'le caissier',
    roleEn: 'cinema cashier',
    emoji: '🧑‍💼',
    register: 'informal',
  },
  briefingEn:
    "You're buying cinema tickets. Say which showtime you want, how many tickets, then confirm the total and how you'll pay.",
  branches: {
    movie: {
      labelEn: 'Buy movie tickets',
      missions: [
        {
          id: 'cinema_ask_movie',
          en: 'Say you want tickets for a film',
          modelFr: 'Je voudrais des places pour ce film.',
          requires: [{ kind: 'intent', state: 'start', intent: 'movie' }],
        },
        {
          id: 'cinema_say_time',
          en: 'Say which showtime you want',
          modelFr: 'La séance de 19h, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'ask_time', slot: 'showtime', minWords: 2 }],
        },
        {
          id: 'cinema_say_ticket_count',
          en: 'Say how many tickets you need',
          modelFr: 'Deux billets, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'ask_ticket_count', slot: 'ticket_count', minWords: 2 }],
        },
        {
          id: 'cinema_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'show_total', intent: 'card' }],
        },
        {
          id: 'cinema_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'show_total', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'movie', terms: ['places', 'billets'], priority: 1 },
    { state: 'show_total', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'show_total', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
