import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- library`'s word
 * list (1489 candidates from the full graph — the largest pre-existing
 * graph in the corpus). Scoped to the `search` branch's core decision
 * points (book query, loan, card check). register is 'formal' to match
 * library's npc.register.
 */
export const libraryDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le livre', en: 'book', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'ask_book_details'], rank: 'core',
    },
    {
      fr: 'le roman', en: 'novel', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_book_details'], rank: 'core',
    },
    {
      fr: 'emprunter', en: 'to borrow', pos: 'verb',
      register: 'neutral', usedInStates: ['ask_loan'], rank: 'core',
    },
    {
      fr: 'la carte de bibliothèque', en: 'library card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_loan'], rank: 'core',
    },
    {
      fr: 'le code-barres', en: 'barcode', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['check_card'], rank: 'core',
    },
    {
      fr: 'Que cherchez-vous ?', en: 'What are you looking for?', pos: 'question',
      register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Souhaitez-vous emprunter ce livre ou simplement le consulter sur place ?', en: 'Would you like to borrow this book or just read it here?',
      pos: 'question', register: 'formal', usedInStates: ['ask_loan'], rank: 'core',
    },
    {
      fr: 'Pouvez-vous passer votre code-barres devant le lecteur ?', en: 'Can you scan your barcode on the reader?',
      pos: 'question', register: 'formal', usedInStates: ['check_card'], rank: 'core',
    },
    {
      fr: 'Bonne lecture et à bientôt à la bibliothèque !', en: 'Enjoy your reading, see you soon at the library!',
      pos: 'phrase', register: 'formal', usedInStates: ['confirm_loan'], rank: 'core',
    },
    {
      fr: 'disponible', en: 'available', pos: 'adj',
      register: 'neutral', usedInStates: ['check_availability'], rank: 'extend',
    },
    {
      fr: 'le rayon', en: 'shelf / section', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['check_availability'], rank: 'extend',
    },
    {
      fr: 'prêté', en: 'lent out / on loan', pos: 'adj',
      register: 'neutral', usedInStates: ['check_availability'], rank: 'extend',
    },
    {
      fr: 'scanner', en: 'to scan', pos: 'verb',
      register: 'neutral', usedInStates: ['check_card'], rank: 'extend',
    },
    {
      fr: 'valide', en: 'valid', pos: 'adj',
      register: 'neutral', usedInStates: ['check_card'], rank: 'extend',
    },
  ],
};
