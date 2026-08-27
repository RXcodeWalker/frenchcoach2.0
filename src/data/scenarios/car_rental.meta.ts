import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. Unlike most scenarios in this corpus, `car_rental`'s
 * `no_res` (walk-in, no reservation) branch already had extensive `capture`/
 * `intents` structure authored into the graph before Stage 9 — well beyond
 * the plan's minimum bar (>=5 turns, >=2 mission-legal points). This pass
 * makes no graph changes; it only authors `.meta.ts` (missions covering the
 * core happy-path decision points: car type, duration, insurance, payment,
 * keys) and `.deck.ts`. Only `no_res` is authored as a mission branch; the
 * `reservation`/`return`/`incident` branches and other `start` side-intents
 * remain unauthored (Stage 9 backlog) even though their graph content is
 * already rich.
 */
export const carRentalMeta: ScenarioMeta = {
  id: 'car_rental',
  title: 'Car Rental',
  titleFr: 'La Location de Voiture',
  emoji: '🚗',
  tier: 3,
  category: 'Travel',
  dependencies: [],
  npc: {
    nameFr: 'Agent de location',
    roleFr: "l'agent de location",
    roleEn: 'rental agent',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're renting a car without a reservation. Say what type of car you want, how long you need it, whether you want insurance, then confirm payment and take the keys.",
  branches: {
    no_res: {
      labelEn: 'Rent a car without a reservation',
      missions: [
        {
          id: 'car_rental_no_reservation',
          en: "Say you don't have a reservation",
          modelFr: "Non, je n'ai pas de réservation.",
          requires: [{ kind: 'intent', state: 'start', intent: 'no_res' }],
        },
        {
          id: 'car_rental_say_car_type',
          en: 'Say what type of car you want',
          modelFr: 'Je voudrais une citadine.',
          requires: [{ kind: 'slot', state: 'ask_car_type', slot: 'car_category', minWords: 2 }],
        },
        {
          id: 'car_rental_say_duration',
          en: 'Say how many days you need the car',
          modelFr: "J'en ai besoin pour trois jours.",
          requires: [{ kind: 'slot', state: 'ask_duration', slot: 'rental_details', minWords: 3 }],
        },
        {
          id: 'car_rental_decline_insurance',
          en: 'Say no to the extra insurance',
          modelFr: 'Non merci, ça ira.',
          requires: [{ kind: 'intent', state: 'ask_insurance', intent: 'no' }],
        },
        {
          id: 'car_rental_accept_insurance',
          en: 'Say yes to the extra insurance',
          modelFr: "Oui, je veux l'assurance tous risques.",
          requires: [{ kind: 'intent', state: 'ask_insurance', intent: 'yes' }],
        },
        {
          id: 'car_rental_confirm_payment',
          en: 'Say yes, you will pay by card',
          modelFr: 'Oui, par carte bancaire.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'yes' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'no_res', terms: ['pas de reservation', 'sans reservation'], priority: 1 },
    { state: 'start', intent: 'reservation', terms: ['reservation'] },
    { state: 'ask_insurance', intent: 'yes', terms: ['oui', "tous risques"], priority: 1 },
    { state: 'ask_insurance', intent: 'no', terms: ['non', 'merci'] },
    { state: 'ask_payment', intent: 'yes', terms: ['oui', 'carte bancaire'], priority: 1 },
    { state: 'ask_payment', intent: 'no', terms: ['non'] },
  ],
};
