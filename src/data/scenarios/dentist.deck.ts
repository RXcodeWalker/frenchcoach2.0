import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- dentist`'s word list
 * (117 candidates from the full graph). Only the `pain` branch is authored
 * (Stage 9a), so the deck is scoped to that path — vocab for the other 9
 * unauthored start intents is a later Stage 9 pass. register is 'formal'
 * to match dentist's npc.register.
 */
export const dentistDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'la douleur', en: 'pain', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'les dents', en: 'teeth', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les dents',
      register: 'neutral', usedInStates: ['diagnosis'], rank: 'core',
    },
    {
      fr: 'la carie', en: 'cavity', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['diagnosis'], rank: 'core',
    },
    {
      fr: 'le rendez-vous', en: 'appointment', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['appointment', 'confirm_next_appointment'], rank: 'core',
    },
    {
      fr: 'Vous avez une douleur ?', en: 'Do you have a pain?',
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Où avez-vous mal exactement ?', en: 'Where exactly does it hurt?',
      pos: 'question', register: 'formal', usedInStates: ['pain_start'], rank: 'core',
    },
    {
      fr: 'Depuis combien de temps avez-vous cette douleur ?', en: 'How long have you had this pain?',
      pos: 'question', register: 'formal', usedInStates: ['ask_how_long'], rank: 'core',
    },
    {
      fr: 'Voulez-vous reprendre rendez-vous dans six mois ?', en: 'Would you like to book a follow-up in six months?',
      pos: 'question', register: 'formal', usedInStates: ['appointment'], rank: 'core',
    },
    {
      fr: 'Au revoir !', en: 'Goodbye!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'soigner', en: 'to treat', pos: 'verb',
      register: 'neutral', usedInStates: ['diagnosis'], rank: 'extend',
    },
    {
      fr: 'la mâchoire', en: 'jaw', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['pain_start'], rank: 'extend',
    },
    {
      fr: 'noter', en: 'to note down', pos: 'verb',
      register: 'neutral', usedInStates: ['confirm_next_appointment'], rank: 'extend',
    },
    {
      fr: 'Je vois une petite carie.', en: 'I see a small cavity.',
      pos: 'phrase', register: 'formal', usedInStates: ['diagnosis'], rank: 'extend',
    },
    {
      fr: "N'oubliez pas de bien vous brosser les dents !", en: "Don't forget to brush your teeth well!",
      pos: 'phrase', register: 'formal', usedInStates: ['end_session'], rank: 'extend',
    },
  ],
};
