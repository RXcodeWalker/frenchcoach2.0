import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 2. `ask_account` was a single-hop cul-de-sac
 * (`ask_account→end_session`) — 2 turns, 0 mission-legal points. This pass
 * adds `capture` to `ask_account` and a new `ask_account_purpose`, then a
 * new `ask_id_document` `intents` branch (id_card/passport) before a new
 * `confirm_account_opening` terminal step. Only the `account` branch is
 * authored; the other 15 `start` side-intents remain unauthored graph
 * content (Stage 9 backlog).
 */
export const bankMeta: ScenarioMeta = {
  id: 'bank',
  title: 'Bank',
  titleFr: 'La Banque',
  emoji: '🏦',
  tier: 2,
  category: 'Services',
  dependencies: [],
  npc: {
    nameFr: 'Conseiller bancaire',
    roleFr: 'le conseiller',
    roleEn: 'bank advisor',
    emoji: '🧑‍💼',
    register: 'formal',
  },
  briefingEn:
    "You're at the bank to open an account. Say what type of account you want, what it's for, show ID, then confirm the opening.",
  branches: {
    account: {
      labelEn: 'Open a bank account',
      missions: [
        {
          id: 'bank_ask_account',
          en: 'Say you want to open an account',
          modelFr: 'Je voudrais ouvrir un compte.',
          requires: [{ kind: 'intent', state: 'start', intent: 'account' }],
        },
        {
          id: 'bank_say_account_type',
          en: 'Say what type of account you want',
          modelFr: 'Un compte courant, s\'il vous plaît.',
          requires: [{ kind: 'slot', state: 'ask_account', slot: 'account_type', minWords: 2 }],
        },
        {
          id: 'bank_say_purpose',
          en: 'Say what the account is for',
          modelFr: 'C\'est pour une utilisation personnelle.',
          requires: [{ kind: 'slot', state: 'ask_account_purpose', slot: 'account_purpose', minWords: 3 }],
        },
        {
          id: 'bank_show_id_card',
          en: 'Say you have your ID card',
          modelFr: 'J\'ai ma carte d\'identité.',
          requires: [{ kind: 'intent', state: 'ask_id_document', intent: 'id_card' }],
        },
        {
          id: 'bank_show_passport',
          en: 'Say you have your passport',
          modelFr: 'J\'ai mon passeport.',
          requires: [{ kind: 'intent', state: 'ask_id_document', intent: 'passport' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'account', terms: ['compte', 'ouvrir un compte'], priority: 1 },
    { state: 'ask_id_document', intent: 'id_card', terms: ["carte d'identite", 'carte nationale'], priority: 1 },
    { state: 'ask_id_document', intent: 'passport', terms: ['passeport'] },
  ],
};
