import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- bank`'s word list
 * (244 candidates from the full graph). Only the `account` branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for the
 * other 15 unauthored start intents is a later Stage 9 pass. register is
 * 'formal' to match bank's npc.register.
 */
export const bankDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le compte', en: 'account', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'ask_account'], rank: 'core',
    },
    {
      fr: 'le compte courant', en: 'checking account', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_account'], rank: 'core',
    },
    {
      fr: 'l\'épargne', en: 'savings', pos: 'noun', gender: 'f', article: 'l\'',
      register: 'neutral', usedInStates: ['ask_account'], rank: 'core',
    },
    {
      fr: 'la pièce d\'identité', en: 'ID document', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_id_document'], rank: 'core',
    },
    {
      fr: 'la carte d\'identité', en: 'ID card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_id_document'], rank: 'core',
    },
    {
      fr: 'le passeport', en: 'passport', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_id_document'], rank: 'core',
    },
    {
      fr: 'Comment puis-je vous aider ?', en: 'How can I help you?', pos: 'question',
      register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Vous souhaitez ouvrir quel type de compte ?', en: 'What type of account would you like to open?',
      pos: 'question', register: 'formal', usedInStates: ['ask_account'], rank: 'core',
    },
    {
      fr: 'C\'est pour une utilisation personnelle ou professionnelle ?', en: 'Is it for personal or professional use?',
      pos: 'question', register: 'formal', usedInStates: ['ask_account_purpose'], rank: 'core',
    },
    {
      fr: 'Avez-vous une pièce d\'identité valide sur vous ?', en: 'Do you have a valid ID document on you?',
      pos: 'question', register: 'formal', usedInStates: ['ask_id_document'], rank: 'core',
    },
    {
      fr: 'Bonne journée !', en: 'Have a good day!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'professionnel', en: 'professional / business', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_account_purpose'], rank: 'extend',
    },
    {
      fr: 'personnel', en: 'personal', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_account_purpose'], rank: 'extend',
    },
    {
      fr: 'ouvrir', en: 'to open', pos: 'verb',
      register: 'neutral', usedInStates: ['ask_account', 'confirm_account_opening'], rank: 'extend',
    },
    {
      fr: 'jour ouvré', en: 'business day', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['confirm_account_opening'], rank: 'extend',
    },
    {
      fr: 'le courrier', en: 'the mail / post', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['confirm_account_opening'], rank: 'extend',
    },
    {
      fr: 'Parfait, tout est en ordre.', en: 'Perfect, everything is in order.',
      pos: 'phrase', register: 'formal', usedInStates: ['confirm_account_opening'], rank: 'extend',
    },
    {
      fr: 'Merci de votre visite, au revoir !', en: 'Thank you for coming, goodbye!',
      pos: 'phrase', register: 'formal', usedInStates: ['end_session'], rank: 'extend',
    },
  ],
};
