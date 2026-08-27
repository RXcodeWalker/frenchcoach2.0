import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. The `pain` branch's `next` chain was
 * `pain_start→ask_how_long→diagnosis→appointment→end_session` — 5 turns, 0
 * mission-legal points. This pass adds `capture` to `pain_start` and
 * `ask_how_long`, and turns `appointment` into a yes/no `intents` branch
 * (was `next`-only). Only `pain` is authored; the other 9 `start` side-
 * intents remain unauthored (Stage 9 backlog).
 */
export const dentistMeta: ScenarioMeta = {
  id: 'dentist',
  title: 'Dentist',
  titleFr: 'Le Dentiste',
  emoji: '🦷',
  tier: 3,
  category: 'Health',
  dependencies: [],
  npc: {
    nameFr: 'Dentiste',
    roleFr: 'le dentiste',
    roleEn: 'dentist',
    emoji: '🧑‍⚕️',
    register: 'formal',
  },
  briefingEn:
    "You're at the dentist with tooth pain. Say where it hurts, how long it's hurt, then decide whether to book a follow-up.",
  branches: {
    pain: {
      labelEn: 'Describe tooth pain',
      missions: [
        {
          id: 'dentist_say_pain',
          en: 'Say you have a pain',
          modelFr: "J'ai une douleur.",
          requires: [{ kind: 'intent', state: 'start', intent: 'pain' }],
        },
        {
          id: 'dentist_say_location',
          en: 'Say where it hurts',
          modelFr: "J'ai mal en bas à droite.",
          requires: [{ kind: 'slot', state: 'pain_start', slot: 'pain_location', minWords: 3 }],
        },
        {
          id: 'dentist_say_duration',
          en: 'Say how long you have had the pain',
          modelFr: "Depuis trois jours.",
          requires: [{ kind: 'slot', state: 'ask_how_long', slot: 'pain_duration', minWords: 2 }],
        },
        {
          id: 'dentist_accept_followup',
          en: 'Say yes to a follow-up appointment',
          modelFr: 'Oui, je veux bien reprendre rendez-vous.',
          requires: [{ kind: 'intent', state: 'appointment', intent: 'yes' }],
        },
        {
          id: 'dentist_decline_followup',
          en: 'Say no to a follow-up appointment',
          modelFr: "Non merci, ce n'est pas nécessaire.",
          requires: [{ kind: 'intent', state: 'appointment', intent: 'no' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'pain', terms: ['douleur', "j'ai mal"], priority: 1 },
    { state: 'appointment', intent: 'yes', terms: ['oui'], priority: 1 },
    { state: 'appointment', intent: 'no', terms: ['non', 'merci'] },
  ],
};
