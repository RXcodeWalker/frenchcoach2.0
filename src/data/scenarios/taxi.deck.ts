import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- taxi`'s word list
 * (193 candidates from the full graph). Only the `destination` branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for the
 * other 15 unauthored start intents is a later Stage 9 pass. register is
 * 'informal' to match taxi's npc.register.
 */
export const taxiDeck: ScenarioDeck = {
  entries: [
    {
      fr: "l'adresse", en: 'address', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['start', 'ask_destination_address'], rank: 'core',
    },
    {
      fr: 'le trajet', en: 'journey / trip', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['estimate_trip'], rank: 'core',
    },
    {
      fr: 'la carte', en: 'card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['confirm_departure', 'confirm_payment_card'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['confirm_departure', 'confirm_payment_cash'], rank: 'core',
    },
    {
      fr: "Où est-ce que je vous emmène ?", en: 'Where shall I take you?',
      pos: 'question', register: 'informal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: "Quelle est l'adresse exacte ?", en: 'What is the exact address?',
      pos: 'question', register: 'informal', usedInStates: ['ask_destination_address'], rank: 'core',
    },
    {
      fr: 'Pour ce trajet, ça devrait faire environ 25 euros.', en: 'For this trip, it should be about 25 euros.',
      pos: 'phrase', register: 'informal', usedInStates: ['estimate_trip'], rank: 'core',
    },
    {
      fr: 'Vous préférez payer par carte ou en espèces à l\'arrivée ?', en: 'Do you prefer to pay by card or cash on arrival?',
      pos: 'question', register: 'informal', usedInStates: ['confirm_departure'], rank: 'core',
    },
    {
      fr: 'Merci pour la course.', en: 'Thanks for the ride.', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'le compteur', en: 'meter (taxi)', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['estimate_trip'], rank: 'extend',
    },
    {
      fr: 'la course', en: 'ride / fare', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['end_session'], rank: 'extend',
    },
    {
      fr: "l'arrivée", en: 'arrival', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['confirm_payment_card', 'confirm_payment_cash'], rank: 'extend',
    },
    {
      fr: 'en route', en: 'on the way / let\'s go', pos: 'phrase',
      register: 'informal', usedInStates: ['confirm_departure'], rank: 'extend',
    },
    {
      fr: 'Parfait, en route !', en: "Perfect, let's go!", pos: 'phrase',
      register: 'informal', usedInStates: ['confirm_departure'], rank: 'extend',
    },
  ],
};
