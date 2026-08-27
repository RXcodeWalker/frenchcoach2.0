import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- hotel`'s word list
 * (281 candidates from the full graph). Only the `no` (walk-in) branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for `yes`
 * and the other 19 unauthored start intents is a later Stage 9 pass.
 * register is 'formal' to match hotel's npc.register.
 */
export const hotelDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'la réservation', en: 'reservation', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'la nuit', en: 'night', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['check_availability'], rank: 'core',
    },
    {
      fr: 'la chambre double', en: 'double room', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['offer_room'], rank: 'core',
    },
    {
      fr: 'la chambre simple', en: 'single room', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['offer_room'], rank: 'core',
    },
    {
      fr: "la pièce d'identité", en: 'ID document', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_id'], rank: 'core',
    },
    {
      fr: 'le passeport', en: 'passport', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_id'], rank: 'core',
    },
    {
      fr: 'la clé', en: 'key', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['give_key'], rank: 'core',
    },
    {
      fr: 'Vous avez une réservation ?', en: 'Do you have a reservation?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Pour combien de nuits souhaitez-vous rester ?', en: 'How many nights would you like to stay?',
      pos: 'question', register: 'formal', usedInStates: ['check_availability'], rank: 'core',
    },
    {
      fr: 'Souhaitez-vous une chambre simple, une chambre double ou une suite ?', en: 'Would you like a single, double, or suite?',
      pos: 'question', register: 'formal', usedInStates: ['offer_room'], rank: 'core',
    },
    {
      fr: 'Merci de votre visite et à très bientôt !', en: 'Thank you for visiting, see you soon!',
      pos: 'phrase', register: 'formal', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'la suite', en: 'suite', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['offer_room'], rank: 'extend',
    },
    {
      fr: "l'ascenseur", en: 'lift / elevator', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['give_key'], rank: 'extend',
    },
    {
      fr: 'la carte magnétique', en: 'key card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['give_key'], rank: 'extend',
    },
    {
      fr: "disponible", en: 'available', pos: 'adj',
      register: 'neutral', usedInStates: ['check_availability'], rank: 'extend',
    },
    {
      fr: 'Voici votre clé !', en: 'Here is your key!', pos: 'phrase',
      register: 'formal', usedInStates: ['give_key'], rank: 'extend',
    },
  ],
};
