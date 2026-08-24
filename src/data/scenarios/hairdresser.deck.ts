import type { ScenarioDeck } from '../../features/roleplay/types';

export const hairdresserDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le rendez-vous', en: 'appointment', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'check_appointment'], rank: 'core',
    },
    {
      fr: 'la coupe', en: 'haircut', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'la couleur', en: 'colour', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'le soin profond', en: 'deep treatment', pos: 'phrase',
      literalEn: 'deep care', register: 'neutral',
      usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'le balayage', en: 'balayage (hair highlighting)', pos: 'noun', gender: 'm', article: 'le',
      note: 'Common salon term, borrowed into English unchanged.',
      register: 'neutral', usedInStates: ['ask_color_details', 'set_balayage'], rank: 'core',
    },
    {
      fr: 'les pointes', en: 'ends (of hair)', pos: 'noun', gender: 'pl', article: 'les',
      register: 'neutral', usedInStates: ['ask_cut_details'], rank: 'core',
    },
    {
      fr: 'dégager les oreilles', en: 'clear the ears (in a haircut)', pos: 'phrase',
      literalEn: 'to free the ears', register: 'informal',
      usedInStates: ['ask_cut_details'], rank: 'extend',
    },
    {
      fr: 'par carte', en: 'by card', pos: 'phrase',
      register: 'neutral', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'en espèces', en: 'in cash', pos: 'phrase',
      register: 'neutral', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'la carte étudiant', en: 'student card', pos: 'phrase',
      register: 'neutral', usedInStates: ['ask_student_id'], rank: 'extend',
    },
    {
      fr: 'à quel nom', en: 'under what name', pos: 'phrase',
      register: 'neutral', usedInStates: ['check_appointment'], rank: 'core',
    },
    {
      fr: 'le nuancier', en: 'colour chart', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['set_color_total'], rank: 'extend',
    },
    {
      fr: 'les racines', en: 'roots', pos: 'noun', gender: 'pl', article: 'les',
      register: 'neutral', usedInStates: ['set_color_roots'], rank: 'core',
    },
    {
      fr: 'le brushing', en: 'blow-dry styling', pos: 'noun', gender: 'm', article: 'le',
      note: 'False friend: not English "brushing" — it means a styled blow-dry.',
      register: 'informal', usedInStates: ['finish_cut'], rank: 'extend',
    },
    {
      fr: 'le pourboire', en: 'tip', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['process_tip'], rank: 'extend',
    },
    {
      fr: 'complets', en: 'fully booked', pos: 'adj',
      register: 'informal', usedInStates: ['end_session_fail'], rank: 'core',
    },
    {
      fr: 'vous avez rendez-vous', en: 'do you have an appointment', pos: 'phrase',
      literalEn: 'you have appointment', register: 'informal',
      usedInStates: ['start'], rank: 'core',
    },
  ],
};
