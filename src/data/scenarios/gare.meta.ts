import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 canonical worked example (see "9a. Deepen the graphs" in the
 * overhaul plan). gare shipped `authored: false` in Stage 1 because its only
 * intent-bearing state was `start` — every side-intent was a `next`-only
 * cul-de-sac, so no second mission condition was legal anywhere. This pass
 * deepens the primary `ticket` branch only (per the plan's priority order:
 * happy path first): `ask_destination` and the new `ask_departure_time` both
 * gained `capture`, and `show_total` / the new `ask_payment_method` gained
 * `intents` in place of the discarded "Vous le prenez ?" / payment question.
 * The other 15 `start` side-intents are untouched graph content — real, but
 * not yet authored into a branch (Stage 9 backlog for a later scenario pass).
 */
export const gareMeta: ScenarioMeta = {
  id: 'gare',
  title: 'Train Station',
  titleFr: 'La Gare',
  emoji: '🚆',
  tier: 1,
  category: 'Basics',
  dependencies: [],
  npc: {
    nameFr: 'Agent SNCF',
    roleFr: "l'agent de gare",
    roleEn: 'station agent',
    emoji: '🧑‍✈️',
    register: 'formal',
  },
  briefingEn:
    "You're at the train station ticket counter. Ask for a ticket, give your destination and travel date, then confirm the purchase and how you'll pay.",
  branches: {
    ticket: {
      labelEn: 'Buy a train ticket',
      missions: [
        {
          id: 'gare_ask_ticket',
          en: 'Say you want a ticket',
          modelFr: "Je voudrais un billet, s'il vous plaît.",
          requires: [{ kind: 'intent', state: 'start', intent: 'ticket' }],
        },
        {
          id: 'gare_give_destination',
          en: 'Say where you are travelling to',
          modelFr: 'Je voudrais aller à Lyon.',
          requires: [{ kind: 'slot', state: 'ask_destination', slot: 'destination', minWords: 3 }],
        },
        {
          id: 'gare_give_departure_time',
          en: 'Say when you are travelling',
          modelFr: "Je pars aujourd'hui, dans l'après-midi.",
          requires: [{ kind: 'slot', state: 'ask_departure_time', slot: 'departure_time', minWords: 3 }],
        },
        {
          id: 'gare_confirm_purchase',
          en: 'Say yes, you will take the ticket',
          modelFr: 'Oui, je le prends.',
          requires: [{ kind: 'intent', state: 'show_total', intent: 'yes' }],
        },
        {
          id: 'gare_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'ask_payment_method', intent: 'card' }],
        },
        {
          id: 'gare_decline_ticket',
          en: 'Say no, you do not want this ticket (if the price does not suit you)',
          modelFr: 'Non, ce sera tout, merci.',
          requires: [{ kind: 'intent', state: 'show_total', intent: 'no' }],
        },
        {
          id: 'gare_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'ask_payment_method', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'ticket', terms: ['billet', 'voudrais un billet'], priority: 1 },
    { state: 'show_total', intent: 'yes', terms: ['oui', 'je le prends'], priority: 1 },
    { state: 'show_total', intent: 'no', terms: ['non', 'ce sera tout'] },
    { state: 'ask_payment_method', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'ask_payment_method', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
