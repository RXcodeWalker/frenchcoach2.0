import type { ScenarioDeck } from '../../features/roleplay/types';

/**
 * Stage 9 — curated from `npm run roleplay:skeleton -- museum`'s word list
 * (480 candidates from the full graph — a large, pre-existing deeply-
 * branched graph). Scoped to the `buy_tickets` branch's core decision
 * points (ticket type, exhibition, audio guide, payment). register is
 * 'formal' to match museum's npc.register.
 */
export const museumDeck: ScenarioDeck = {
  entries: [
    {
      fr: 'le billet', en: 'ticket', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['start', 'ask_ticket_type'], rank: 'core',
    },
    {
      fr: 'le tarif', en: 'rate / fare', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_ticket_type'], rank: 'core',
    },
    {
      fr: "l'exposition", en: 'exhibition', pos: 'noun', gender: 'f', article: "l'",
      register: 'neutral', usedInStates: ['ask_expo_type'], rank: 'core',
    },
    {
      fr: "l'audioguide", en: 'audio guide', pos: 'noun', gender: 'm', article: "l'",
      register: 'neutral', usedInStates: ['ask_audio_guide'], rank: 'core',
    },
    {
      fr: 'la carte', en: 'card', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'les espèces', en: 'cash', pos: 'noun', gender: 'f', article: 'les', pluralFr: 'les espèces',
      note: 'Only means "cash (money)" here — not the general English "species."',
      register: 'neutral', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'Bienvenue au Musée des Beaux-Arts.', en: 'Welcome to the Museum of Fine Arts.',
      pos: 'phrase', register: 'formal', usedInStates: ['start'], rank: 'core',
    },
    {
      fr: 'Quel tarif vous correspond ?', en: 'Which rate applies to you?',
      pos: 'question', register: 'formal', usedInStates: ['ask_ticket_type'], rank: 'core',
    },
    {
      fr: "Voulez-vous le billet combiné avec l'exposition temporaire ?", en: 'Would you like the combined ticket with the temporary exhibition?',
      pos: 'question', register: 'formal', usedInStates: ['ask_expo_type'], rank: 'core',
    },
    {
      fr: "Désirez-vous un audioguide pour accompagner votre visite ?", en: 'Would you like an audio guide for your visit?',
      pos: 'question', register: 'formal', usedInStates: ['ask_audio_guide'], rank: 'core',
    },
    {
      fr: 'Vous réglez par carte ou en espèces ?', en: 'Are you paying by card or in cash?',
      pos: 'question', register: 'formal', usedInStates: ['ask_payment'], rank: 'core',
    },
    {
      fr: 'la collection permanente', en: 'permanent collection', pos: 'noun', gender: 'f', article: 'la',
      register: 'neutral', usedInStates: ['start'], rank: 'extend',
    },
    {
      fr: 'le vestiaire', en: 'cloakroom', pos: 'noun', gender: 'm', article: 'le',
      register: 'neutral', usedInStates: ['ask_cloakroom'], rank: 'extend',
    },
    {
      fr: 'étudiant', en: 'student', pos: 'adj',
      register: 'neutral', usedInStates: ['ask_ticket_type'], rank: 'extend',
    },
    {
      fr: 'combiné', en: 'combined', pos: 'adj',
      register: 'neutral', usedInStates: ['set_combined_ticket'], rank: 'extend',
    },
  ],
};
