import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. The `membership` branch's `next` chain was
 * `membership_info_start→registration_process→end_session` — 3 turns, 0
 * mission-legal points. This pass adds `capture` to `membership_info_start`
 * (now routed through the existing `goals_inquiry_start` capture step), and
 * turns `registration_process` into a yes/no `intents` branch (was
 * `next`-only). Only `membership` is authored; the other 9 `start`
 * side-intents remain unauthored (Stage 9 backlog).
 */
export const gymMeta: ScenarioMeta = {
  id: 'gym',
  title: 'Gym',
  titleFr: 'La Salle de Sport',
  emoji: '🏋️',
  tier: 3,
  category: 'Leisure',
  dependencies: [],
  npc: {
    nameFr: 'Réceptionniste',
    roleFr: 'le/la réceptionniste',
    roleEn: 'gym receptionist',
    emoji: '🧑‍💼',
    register: 'informal',
  },
  briefingEn:
    "You're signing up at a gym. Choose a membership plan, say your fitness goal, then confirm you have ID to finish registering.",
  branches: {
    membership: {
      labelEn: 'Sign up for a membership',
      missions: [
        {
          id: 'gym_ask_membership',
          en: 'Say you want information about membership',
          modelFr: "Je voudrais des informations sur l'abonnement.",
          requires: [{ kind: 'intent', state: 'start', intent: 'membership' }],
        },
        {
          id: 'gym_say_plan',
          en: 'Say which membership plan you want',
          modelFr: "L'abonnement mensuel, s'il vous plaît.",
          requires: [{ kind: 'slot', state: 'membership_info_start', slot: 'membership_plan', minWords: 2 }],
        },
        {
          id: 'gym_say_goal',
          en: 'Say your fitness goal',
          modelFr: 'Mon objectif est de perdre du poids.',
          requires: [{ kind: 'slot', state: 'goals_inquiry_start', slot: 'fitness_goal', minWords: 3 }],
        },
        {
          id: 'gym_confirm_id',
          en: 'Say yes, you have an ID document',
          modelFr: "Oui, j'ai ma carte d'identité.",
          requires: [{ kind: 'intent', state: 'registration_process', intent: 'yes' }],
        },
        {
          id: 'gym_no_id',
          en: "Say no, you don't have ID with you",
          modelFr: "Non, je ne l'ai pas sur moi.",
          requires: [{ kind: 'intent', state: 'registration_process', intent: 'no' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'membership', terms: ['abonnement'], priority: 1 },
    { state: 'registration_process', intent: 'yes', terms: ['oui'], priority: 1 },
    { state: 'registration_process', intent: 'no', terms: ['non'] },
  ],
};
