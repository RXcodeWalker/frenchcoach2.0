import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- car_rental`'s word
 * list (488 candidates from the full graph — this is a large, pre-existing
 * deeply-branched graph). Only the `no_res` branch is authored (Stage 9a
 * meta only, no graph changes), so the deck is scoped to that path's core
 * decision points (car type, duration, insurance, payment). register is
 * 'formal' to match car_rental's npc.register.
 */
export const carRentalDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'la citadine', en: 'city car (small hatchback)', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_car_type'], rank: 'core',
    },
    {
      fr: 'le véhicule', en: 'vehicle', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_car_type', 'provide_keys'], rank: 'core',
    },
    {
      fr: 'le jour', en: 'day', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_duration'], rank: 'core',
    },
    {
      fr: "l'assurance", en: 'insurance', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['ask_insurance'], rank: 'core',
    },
    {
      fr: 'la franchise', en: 'deductible (insurance excess)', pos: 'noun', gender: 'f', article: 'la',
      note: 'False friend: not a business "franchise" — an insurance excess.',
      register: 'neutral', usedInStates: ['ask_insurance'], rank: 'core',
    },
    {
      fr: 'la carte bancaire', en: 'bank card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'la caution', en: 'deposit', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['show_total'], rank: 'core',
    },
    {
      fr: 'les clés', en: 'keys', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les clés',
      register: 'neutral', usedInStates: ['provide_keys'], rank: 'core',
    },
    {
      fr: 'Vous avez une réservation ?', en: 'Do you have a reservation?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Quel type de véhicule recherchez-vous ?', en: 'What type of vehicle are you looking for?',
      pos: 'question', register: 'formal', usedInStates: ['ask_car_type'], rank: 'core',
    },
    {
      fr: 'Pour combien de jours en avez-vous besoin ?', en: 'How many days do you need it for?',
      pos: 'question', register: 'formal', usedInStates: ['ask_duration'], rank: 'core',
    },
    {
      fr: 'Souhaitez-vous souscrire à l\'assurance tous risques ?', en: 'Would you like to take out full-coverage insurance?',
      pos: 'question', register: 'formal', usedInStates: ['ask_insurance'], rank: 'core',
    },
    {
      fr: 'On procède au paiement par carte bancaire ?', en: 'Shall we proceed with payment by bank card?',
      pos: 'question', register: 'formal', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'Bonne route !', en: 'Have a safe trip!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'louer', en: 'to rent', pos: 'verb',
      register: 'neutral', usedInStates: ['start', 'ask_car_type'], rank: 'extend',
    },
    {
      fr: 'le permis de conduire', en: "driver's licence", pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['verify_docs'], rank: 'extend',
    },
    {
      fr: 'tous risques', en: 'fully comprehensive (insurance)', pos: 'phrase',
      register: 'neutral', usedInStates: ['ask_insurance', 'set_full_insurance'], rank: 'extend',
    },
    {
      fr: 'le plein', en: 'full tank', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['provide_keys'], rank: 'extend',
    },
    {
      fr: 'Voici les clés.', en: 'Here are the keys.', pos: 'phrase',
      register: 'formal', usedInStates: ['provide_keys'], rank: 'extend',
    },
  ],
};
