import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- doctor`'s word list
 * (147 candidates from the full graph). Only the `sick` branch is authored
 * (Stage 9a), so the deck is scoped to that path — vocab for the other 10
 * unauthored start intents is a later Stage 9 pass. register is 'formal'
 * to match doctor's npc.register.
 */
export const doctorDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'les symptômes', en: 'symptoms', pos: 'noun', gender: 'm', article: 'les', pluralFr: 'les symptômes',
      register: 'neutral', usedInStates: ['ask_symptoms'], rank: 'core',
    },
    {
      fr: "l'arrêt de travail", en: 'sick note', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['diagnosis', 'confirm_sick_leave'], rank: 'core',
    },
    {
      fr: "Qu'est-ce qui vous amène aujourd'hui ?", en: "What brings you in today?",
      pos: 'question', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Décrivez-moi vos symptômes, s\'il vous plaît.', en: 'Describe your symptoms to me, please.',
      pos: 'question', register: 'formal', usedInStates: ['ask_symptoms'], rank: 'core',
    },
    {
      fr: 'Depuis quand vous sentez-vous comme ça ?', en: 'Since when have you felt like this?',
      pos: 'question', register: 'formal', usedInStates: ['ask_duration'], rank: 'core',
    },
    {
      fr: 'Au revoir, bon rétablissement !', en: 'Goodbye, get well soon!',
      pos: 'phrase', register: 'neutral', usedInStates: ['end_session'], rank: 'core',
    },
    {
      fr: 'prescrire', en: 'to prescribe', pos: 'verb',
      register: 'neutral', usedInStates: ['diagnosis'], rank: 'extend',
    },
    {
      fr: 'se reposer', en: 'to rest', pos: 'verb',
      register: 'neutral', usedInStates: ['confirm_sick_leave'], rank: 'extend',
    },
    {
      fr: 'le traitement', en: 'treatment', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['diagnosis'], rank: 'extend',
    },
    {
      fr: "Vous voulez aussi un arrêt de travail ?", en: 'Do you also want a sick note?',
      pos: 'question', register: 'formal', usedInStates: ['diagnosis'], rank: 'extend',
    },
    {
      fr: 'Reposez-vous bien !', en: 'Rest well!', pos: 'phrase',
      register: 'formal', usedInStates: ['confirm_sick_leave'], rank: 'extend',
    },
  ],
};
