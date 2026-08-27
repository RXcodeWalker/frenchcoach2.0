import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 2. `ask_destination` was a `next`-only cul-de-sac (straight to
 * `show_total` then `end_session`) — 3 turns, 0 mission-legal points. This
 * pass adds `capture` to `ask_destination`, a new `ask_delivery_speed`
 * `intents` branch, and turns `show_total` into a payment-method `intents`
 * branch (was `next`-only). Only the `package` branch is authored; the other
 * 15 `start` side-intents remain unauthored graph content (Stage 9 backlog).
 */
export const postOfficeMeta: ScenarioMeta = {
  id: 'post_office',
  title: 'Post Office',
  titleFr: 'La Poste',
  emoji: '📮',
  tier: 2,
  category: 'Services',
  dependencies: [],
  npc: {
    nameFr: 'Employé de la poste',
    roleFr: "l'employé de la poste",
    roleEn: 'post office clerk',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're sending a package at the post office. Say where it's going, choose standard or express delivery, then confirm the total and how you'll pay.",
  branches: {
    package: {
      labelEn: 'Send a package',
      missions: [
        {
          id: 'post_ask_package',
          en: 'Say you want to send a package',
          modelFr: 'Je voudrais envoyer un colis.',
          requires: [{ kind: 'intent', state: 'start', intent: 'package' }],
        },
        {
          id: 'post_say_destination',
          en: 'Say where the package is going',
          modelFr: 'Je voudrais l\'envoyer en Espagne.',
          requires: [{ kind: 'slot', state: 'ask_destination', slot: 'destination', minWords: 3 }],
        },
        {
          id: 'post_choose_standard',
          en: 'Say you want standard delivery',
          modelFr: 'Un envoi standard, s\'il vous plaît.',
          requires: [{ kind: 'intent', state: 'ask_delivery_speed', intent: 'standard' }],
        },
        {
          id: 'post_choose_express',
          en: 'Say you want express delivery',
          modelFr: 'Je voudrais l\'envoi express.',
          requires: [{ kind: 'intent', state: 'ask_delivery_speed', intent: 'express' }],
        },
        {
          id: 'post_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'show_total', intent: 'card' }],
        },
        {
          id: 'post_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'show_total', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'package', terms: ['colis', 'envoyer un colis'], priority: 1 },
    { state: 'ask_delivery_speed', intent: 'standard', terms: ['standard', 'normal'], priority: 1 },
    { state: 'ask_delivery_speed', intent: 'express', terms: ['express', 'rapide'] },
    { state: 'show_total', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'show_total', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
