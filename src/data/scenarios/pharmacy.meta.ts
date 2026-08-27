import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 2. The `prescription` branch's `next` chain already reached 6
 * turns (`start→ask_prescription→prepare_meds→ask_other_needs→show_total→
 * ask_payment→end_session`) but had 0 mission-legal points (`ask_other_needs`
 * loops back to `start`, `ask_payment` was `next`-only). This pass adds
 * `capture` to `ask_prescription` and turns `ask_payment` into a payment-
 * method `intents` branch. Only `prescription` is authored; the other 20
 * `start` side-intents and the parallel `sick`/symptom branch remain
 * unauthored (Stage 9 backlog).
 */
export const pharmacyMeta: ScenarioMeta = {
  id: 'pharmacy',
  title: 'Pharmacy',
  titleFr: 'La Pharmacie',
  emoji: '💊',
  tier: 2,
  category: 'Services',
  dependencies: [],
  npc: {
    nameFr: 'Pharmacien',
    roleFr: 'le pharmacien',
    roleEn: 'pharmacist',
    emoji: '🧑‍⚕️',
    register: 'formal',
  },
  briefingEn:
    "You're at the pharmacy with a prescription. Say what medication you need, say you don't need anything else, then confirm how you'll pay.",
  branches: {
    prescription: {
      labelEn: 'Fill a prescription',
      missions: [
        {
          id: 'pharmacy_ask_prescription',
          en: 'Say you have a prescription',
          modelFr: "J'ai une ordonnance.",
          requires: [{ kind: 'intent', state: 'start', intent: 'prescription' }],
        },
        {
          id: 'pharmacy_say_medication',
          en: 'Say what medication was prescribed',
          modelFr: 'On m\'a prescrit du sirop pour la toux.',
          requires: [{ kind: 'slot', state: 'ask_prescription', slot: 'prescribed_medication', minWords: 3 }],
        },
        {
          id: 'pharmacy_decline_more',
          en: "Say that's everything, nothing more needed",
          modelFr: 'Non merci, ce sera tout.',
          requires: [{ kind: 'intent', state: 'ask_other_needs', intent: 'no' }],
        },
        {
          id: 'pharmacy_pay_card',
          en: 'Say you will pay by card',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'card' }],
        },
        {
          id: 'pharmacy_pay_cash',
          en: 'Say you will pay in cash',
          modelFr: 'Je paie en espèces.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'cash' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'prescription', terms: ['ordonnance'], priority: 1 },
    { state: 'ask_other_needs', intent: 'no', terms: ['non', 'ce sera tout'], priority: 1 },
    { state: 'ask_other_needs', intent: 'yes', terms: ['oui', 'encore'] },
    { state: 'ask_payment', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'ask_payment', intent: 'cash', terms: ['especes', 'liquide'] },
  ],
};
