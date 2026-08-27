import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- gym`'s word list
 * (141 candidates from the full graph). Only the `membership` branch is
 * authored (Stage 9a), so the deck is scoped to that path — vocab for the
 * other 9 unauthored start intents is a later Stage 9 pass. register is
 * 'informal' to match gym's npc.register.
 */
export const gymDeck: ScenarioDeck = {
  entries: [
    {
      fr: "l'abonnement", en: 'membership / subscription', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['start', 'membership_info_start'], rank: 'core',
    },
    {
      fr: 'mensuel', en: 'monthly', pos: 'adj',
      register: 'neutral', usedInStates: ['membership_info_start'], rank: 'core',
    },
    {
      fr: "l'objectif", en: 'goal', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['goals_inquiry_start'], rank: 'core',
    },
    {
      fr: 'la perte de poids', en: 'weight loss', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['goals_inquiry_start'], rank: 'core',
    },
    {
      fr: "la pièce d'identité", en: 'ID document', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['registration_process'], rank: 'core',
    },
    {
      fr: "C'est pour une séance d'essai ou vous êtes déjà membre ?", en: 'Is it for a trial session or are you already a member?',
      pos: 'question', register: 'informal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Quelle formule d\'abonnement préférez-vous ?', en: 'Which membership plan do you prefer?',
      pos: 'question', register: 'informal', usedInStates: ['membership_info_start'], rank: 'core',
    },
    {
      fr: 'Quel est votre objectif principal ?', en: 'What is your main goal?',
      pos: 'question', register: 'informal', usedInStates: ['goals_inquiry_start'], rank: 'core',
    },
    {
      fr: 'Bon entraînement !', en: 'Have a good workout!', pos: 'phrase',
      register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: "l'engagement annuel", en: 'annual contract', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['membership_info_start'], rank: 'extend',
    },
    {
      fr: 'la musculation', en: 'weight training', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'extend',
    },
    {
      fr: 'finaliser', en: 'to finalize', pos: 'verb',
      register: 'neutral', usedInStates: ['confirm_registration'], rank: 'extend',
    },
    {
      fr: "l'inscription", en: 'registration', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['confirm_registration'], rank: 'extend',
    },
    {
      fr: 'Bienvenue chez nous !', en: 'Welcome to our gym!', pos: 'phrase',
      register: 'informal', usedInStates: ['confirm_registration'], rank: 'extend',
    },
  ],
};
