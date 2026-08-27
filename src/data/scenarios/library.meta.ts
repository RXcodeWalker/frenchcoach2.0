import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 final pass (largest graphs, per the plan's ordering). Like
 * `museum`, `library`'s `search` branch already had extensive `capture`/
 * `intents` structure authored into the graph before Stage 9 — book query,
 * availability check, loan decision, and card check, far beyond the plan's
 * minimum bar. This pass makes no graph changes; it only authors
 * `.meta.ts` (missions covering the core book-loan beats) and `.deck.ts`.
 * Only `search` is authored as a mission branch; `return`/`register`/etc.
 * and the other `start` side-intents remain unauthored (Stage 9 backlog)
 * even though their graph content is already rich.
 */
export const libraryMeta: ScenarioMeta = {
  id: 'library',
  title: 'Library',
  titleFr: 'La Bibliothèque',
  emoji: '📖',
  tier: 5,
  category: 'Leisure',
  dependencies: [],
  npc: {
    nameFr: 'Bibliothécaire',
    roleFr: 'le/la bibliothécaire',
    roleEn: 'librarian',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're looking for a book at the library. Say what book you want, decide to borrow it, then scan your library card.",
  branches: {
    search: {
      labelEn: 'Search for and borrow a book',
      missions: [
        {
          id: 'library_ask_search',
          en: 'Say you are looking for a book',
          modelFr: 'Je cherche un livre.',
          requires: [{ kind: 'intent', state: 'start', intent: 'search' }],
        },
        {
          id: 'library_say_book_query',
          en: 'Say which book you want',
          modelFr: "Je cherche un roman de Victor Hugo.",
          requires: [{ kind: 'slot', state: 'ask_book_details', slot: 'book_query', minWords: 3 }],
        },
        {
          id: 'library_accept_loan',
          en: 'Say yes, you want to borrow the book',
          modelFr: 'Oui, je voudrais l\'emprunter.',
          requires: [{ kind: 'intent', state: 'ask_loan', intent: 'yes' }],
        },
        {
          id: 'library_report_late_fees',
          en: 'Ask about late fees',
          modelFr: "J'ai une question sur les frais de retard.",
          requires: [{ kind: 'intent', state: 'check_card', intent: 'late_fees' }],
        },
        {
          id: 'library_report_lost_card',
          en: 'Say you lost your library card',
          modelFr: "J'ai perdu ma carte de bibliothèque.",
          requires: [{ kind: 'intent', state: 'check_card', intent: 'lost_card' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'search', terms: ['cherche un livre', 'livre'], priority: 1 },
    { state: 'ask_loan', intent: 'yes', terms: ['oui', 'emprunter'], priority: 1 },
    { state: 'check_card', intent: 'late_fees', terms: ['frais de retard', 'retard'], priority: 1 },
    { state: 'check_card', intent: 'lost_card', terms: ['perdu ma carte', 'carte perdue'] },
  ],
};
