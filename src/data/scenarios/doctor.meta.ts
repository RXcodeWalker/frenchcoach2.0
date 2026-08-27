import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 3. The `sick` branch's `next` chain was
 * `ask_symptoms→diagnosis→end_session` — 3 turns, 0 mission-legal points.
 * This pass adds `capture` to `ask_symptoms` and a new `ask_duration`
 * (capture), then turns `diagnosis` into a yes/no `intents` branch (sick
 * leave) before a new `confirm_sick_leave` terminal step. Only `sick` is
 * authored; the other 10 `start` side-intents remain unauthored (Stage 9
 * backlog).
 */
export const doctorMeta: ScenarioMeta = {
  id: 'doctor',
  title: 'Doctor',
  titleFr: 'Le Médecin',
  emoji: '🩺',
  tier: 3,
  category: 'Health',
  dependencies: [],
  npc: {
    nameFr: 'Médecin',
    roleFr: 'le médecin',
    roleEn: 'doctor',
    emoji: '🧑‍⚕️',
    register: 'formal',
  },
  briefingEn:
    "You're at the doctor's feeling unwell. Say what's wrong, how long you've felt this way, then decide whether you need a sick note.",
  branches: {
    sick: {
      labelEn: 'See the doctor for an illness',
      missions: [
        {
          id: 'doctor_say_sick',
          en: "Say you don't feel well",
          modelFr: 'Je ne me sens pas bien.',
          requires: [{ kind: 'intent', state: 'start', intent: 'sick' }],
        },
        {
          id: 'doctor_say_symptoms',
          en: 'Describe your symptoms',
          modelFr: "J'ai mal à la gorge et de la fièvre.",
          requires: [{ kind: 'slot', state: 'ask_symptoms', slot: 'symptoms', minWords: 3 }],
        },
        {
          id: 'doctor_say_duration',
          en: 'Say how long you have felt this way',
          modelFr: 'Depuis deux jours.',
          requires: [{ kind: 'slot', state: 'ask_duration', slot: 'symptom_duration', minWords: 2 }],
        },
        {
          id: 'doctor_accept_sick_leave',
          en: 'Say yes, you want a sick note',
          modelFr: "Oui, j'aimerais un arrêt de travail.",
          requires: [{ kind: 'intent', state: 'diagnosis', intent: 'yes' }],
        },
        {
          id: 'doctor_decline_sick_leave',
          en: "Say no, you don't need a sick note",
          modelFr: "Non merci, ce n'est pas nécessaire.",
          requires: [{ kind: 'intent', state: 'diagnosis', intent: 'no' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'sick', terms: ['malade', 'ne me sens pas bien'], priority: 1 },
    { state: 'diagnosis', intent: 'yes', terms: ['oui', "arret de travail"], priority: 1 },
    { state: 'diagnosis', intent: 'no', terms: ['non', 'merci'] },
  ],
};
