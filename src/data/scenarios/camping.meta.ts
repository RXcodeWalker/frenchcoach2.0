import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. The `yes` (has reservation) branch was
 * `ask_reservation_name→give_pitch→end_session` — 3 turns, 0 mission-legal
 * points. This pass adds `capture` to `ask_reservation_name` and a new
 * `ask_nights` (capture), then turns `give_pitch` into a payment-method
 * `intents` branch. Only the `yes` (reservation) branch is authored; `no`
 * (→ `ask_stay_type`) and the other 20 `start` side-intents remain
 * unauthored (Stage 9 backlog).
 */
export const campingMeta: ScenarioMeta = {
  id: 'camping',
  title: 'Campsite',
  titleFr: 'Le Camping',
  emoji: '⛺',
  tier: 3,
  category: 'Travel',
  dependencies: [],
  npc: {
    nameFr: 'Réceptionniste',
    roleFr: 'le/la réceptionniste',
    roleEn: 'campsite receptionist',
    emoji: '🧑‍💼',
    register: 'informal',
  },
  briefingEn:
    "You're checking in at a campsite with a reservation. Confirm your name, say how many nights you're staying, then confirm how you'll pay.",
  branches: {
    yes: {
      labelEn: 'Check in with a reservation',
      missions: [
        {
          id: 'camping_confirm_reservation',
          en: 'Say you have a reservation',
          modelFr: "Oui, j'ai une réservation.",
          requires: [{ kind: 'intent', state: 'start', intent: 'yes' }],
        },
        {
          id: 'camping_say_name',
          en: 'Give the name on the reservation',
          modelFr: 'C\'est réservé au nom de Dupont.',
          requires: [{ kind: 'slot', state: 'ask_reservation_name', slot: 'reservation_name', minWords: 2 }],
        },
        {
          id: 'camping_say_nights',
          en: 'Say how many nights you are staying',
          modelFr: 'Nous restons trois nuits.',
          requires: [{ kind: 'slot', state: 'ask_nights', slot: 'nights', minWords: 2 }],
        },
        {
          id: 'camping_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'give_pitch', intent: 'card' }],
        },
        {
          id: 'camping_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'give_pitch', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'yes', terms: ['oui', 'reservation'], priority: 1 },
    { state: 'start', intent: 'no', terms: ['non'] },
    { state: 'give_pitch', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'give_pitch', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
