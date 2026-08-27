import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 final pass (largest graphs, per the plan's ordering). Like
 * `car_rental`/`job_interview`/`real_estate`/`ski_resort`/`police_station`,
 * `museum`'s `buy_tickets` branch already had extensive `capture`/`intents`
 * structure authored into the graph before Stage 9 — ticket type, expo
 * combo, audio guide, cloakroom, and payment, far beyond the plan's minimum
 * bar. This pass makes no graph changes; it only authors `.meta.ts`
 * (missions covering the core ticket-purchase beats) and `.deck.ts`. Only
 * `buy_tickets` is authored as a mission branch; `have_tickets`/
 * `group_tour`/etc. and the other `start` side-intents remain unauthored
 * (Stage 9 backlog) even though their graph content is already rich.
 */
export const museumMeta: ScenarioMeta = {
  id: 'museum',
  title: 'Museum',
  titleFr: 'Le Musée',
  emoji: '🖼️',
  tier: 5,
  category: 'Leisure',
  dependencies: [],
  npc: {
    nameFr: 'Agent de billetterie',
    roleFr: "l'agent de billetterie",
    roleEn: 'ticket desk agent',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're buying tickets at a museum. Choose your ticket rate, say whether you want the combined exhibition ticket, decide on an audio guide, then confirm payment.",
  branches: {
    buy_tickets: {
      labelEn: 'Buy museum tickets',
      missions: [
        {
          id: 'museum_ask_tickets',
          en: 'Say you want to buy tickets',
          modelFr: "Je voudrais acheter des billets.",
          requires: [{ kind: 'intent', state: 'start', intent: 'buy_tickets' }],
        },
        {
          id: 'museum_say_ticket_type',
          en: 'Say which rate applies to you',
          modelFr: 'Le tarif étudiant, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'ask_ticket_type', slot: 'ticket_details', minWords: 2 }],
        },
        {
          id: 'museum_accept_combined',
          en: 'Say yes to the combined exhibition ticket',
          modelFr: 'Oui, le billet combiné.',
          requires: [{ kind: 'intent', state: 'ask_expo_type', intent: 'yes' }],
        },
        {
          id: 'museum_decline_audio_guide',
          en: 'Say no to the audio guide',
          modelFr: "Non merci, pas d'audioguide.",
          requires: [{ kind: 'intent', state: 'ask_audio_guide', intent: 'no' }],
        },
        {
          id: 'museum_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'card' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'buy_tickets', terms: ['billets', 'acheter des billets'], priority: 1 },
    { state: 'ask_expo_type', intent: 'yes', terms: ['oui', 'combine'], priority: 1 },
    { state: 'ask_expo_type', intent: 'no', terms: ['non'] },
    { state: 'ask_audio_guide', intent: 'yes', terms: ['oui', 'audioguide'], priority: 1 },
    { state: 'ask_audio_guide', intent: 'no', terms: ['non', 'merci'] },
    { state: 'ask_payment', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'ask_payment', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
