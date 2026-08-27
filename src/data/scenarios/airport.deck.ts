import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- airport`'s word list
 * (272 candidates from the full graph). Only the `checkin` branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for the
 * other 19 unauthored start intents is a later Stage 9 pass. register is
 * 'formal' to match airport's npc.register.
 */
export const airportDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'Souhaitez-vous vous enregistrer ?', en: 'Would you like to check in?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'la destination', en: 'destination', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['check_documents'], rank: 'core',
    },
    {
      fr: 'la valise', en: 'suitcase', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_baggage'], rank: 'core',
    },
    {
      fr: 'la soute', en: 'cargo hold', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_baggage'], rank: 'core',
    },
    {
      fr: 'le couloir', en: 'aisle', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_seat_preference'], rank: 'core',
    },
    {
      fr: 'le hublot', en: 'window (of a plane)', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_seat_preference'], rank: 'core',
    },
    {
      fr: 'la carte d\'embarquement', en: 'boarding pass', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['confirm_checkin'], rank: 'core',
    },
    {
      fr: 'Quelle est votre destination aujourd\'hui ?', en: 'What is your destination today?',
      pos: 'question', register: 'formal', usedInStates: ['check_documents'], rank: 'core',
    },
    {
      fr: 'Combien de valises avez-vous à enregistrer ?', en: 'How many suitcases do you have to check in?',
      pos: 'question', register: 'formal', usedInStates: ['ask_baggage'], rank: 'core',
    },
    {
      fr: 'Vous préférez un siège côté couloir ou côté hublot ?', en: 'Do you prefer an aisle or window seat?',
      pos: 'question', register: 'formal', usedInStates: ['ask_seat_preference'], rank: 'core',
    },
    {
      fr: 'Bon vol et bon voyage !', en: 'Have a good flight and good trip!',
      pos: 'phrase', register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'la porte d\'embarquement', en: 'boarding gate', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['confirm_checkin'], rank: 'extend',
    },
    {
      fr: "l'embarquement", en: 'boarding', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['confirm_checkin'], rank: 'extend',
    },
    {
      fr: 'le siège', en: 'seat', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_seat_preference'], rank: 'extend',
    },
    {
      fr: 'le passeport', en: 'passport', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start'], rank: 'extend',
    },
    {
      fr: 'le billet', en: 'ticket', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start'], rank: 'extend',
    },
    {
      fr: "Parfait, voici votre carte d'embarquement.", en: 'Perfect, here is your boarding pass.',
      pos: 'phrase', register: 'formal', usedInStates: ['confirm_checkin'], rank: 'extend',
    },
  ],
};
