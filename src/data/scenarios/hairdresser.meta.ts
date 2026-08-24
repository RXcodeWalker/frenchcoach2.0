import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Reference implementation (Stage 1). hairdresser is the deepest graph in
 * the corpus (60 nodes, 17 intent-bearing states, 11 capture slots) and the
 * only one with a non-success terminal (`end_session_fail`), so it exercises
 * multi-turn branching, slot conditions, and a failed-branch mission set that
 * `bakery` alone can't demonstrate. Missions are authored per branch — see
 * "Mission semantics" in the plan.
 *
 * `memory`-only nodes (e.g. `set_balayage`, `set_treatment_keratin`) are not
 * modelled as separate mission conditions: they carry no user turn of their
 * own, so the mission condition targets the parent state's intent instead
 * (e.g. `{ kind: 'intent', state: 'ask_color_details', intent: 'balayage' }`).
 */
export const hairdresserMeta: ScenarioMeta = {
  id: 'hairdresser',
  title: 'Hairdresser',
  titleFr: 'Le Salon de Coiffure',
  emoji: '💇',
  tier: 5,
  category: 'Services',
  dependencies: ['bank'],
  npc: {
    nameFr: 'Coiffeuse',
    roleFr: 'la coiffeuse',
    roleEn: 'hairdresser',
    emoji: '💇‍♀️',
    register: 'informal',
  },
  briefingEn:
    "You're at the hair salon without an appointment. Ask if there's space today, choose a cut, and see it through to payment.",
  branches: {
    no_appointment: {
      labelEn: 'Walk in without an appointment and get a cut',
      missions: [
        {
          id: 'hairdresser_ask_walkin',
          en: 'Say you don\'t have an appointment',
          modelFr: "Je n'ai pas de rendez-vous.",
          requires: [{ kind: 'intent', state: 'start', intent: 'no_appointment' }],
        },
        {
          id: 'hairdresser_accept_slot',
          en: 'Say yes to the available slot',
          modelFr: "Oui, ça m'irait très bien.",
          requires: [{ kind: 'intent', state: 'check_availability', intent: 'yes' }],
        },
        {
          id: 'hairdresser_describe_cut',
          en: 'Describe the cut you want',
          modelFr: 'Je voudrais juste rafraîchir les pointes.',
          requires: [{ kind: 'slot', state: 'ask_cut_details', slot: 'cut_style', minWords: 3 }],
        },
        {
          id: 'hairdresser_pay',
          en: 'Say how you want to pay',
          modelFr: 'Je paie par carte.',
          requires: [{ kind: 'intent', state: 'ask_payment', intent: 'card' }],
        },
        {
          id: 'hairdresser_decline_slot',
          en: 'Say no to the offered slot (if it does not suit you)',
          modelFr: "Non, ça ne m'arrange pas.",
          requires: [{ kind: 'intent', state: 'check_availability', intent: 'no' }],
        },
      ],
    },
    appointment: {
      labelEn: 'Check in for an existing appointment',
      missions: [
        {
          id: 'hairdresser_confirm_appointment',
          en: 'Say you have an appointment',
          modelFr: "J'ai rendez-vous.",
          requires: [{ kind: 'intent', state: 'start', intent: 'appointment' }],
        },
        {
          id: 'hairdresser_give_name',
          en: 'Give the name the appointment is under',
          modelFr: "C'est au nom de Dupont.",
          requires: [{ kind: 'slot', state: 'check_appointment', slot: 'client_name', minWords: 3 }],
        },
      ],
    },
    color: {
      labelEn: 'Ask for a colour treatment',
      missions: [
        {
          id: 'hairdresser_ask_color',
          en: 'Ask for a colour',
          modelFr: 'Je voudrais une coloration.',
          requires: [{ kind: 'intent', state: 'start', intent: 'color' }],
        },
        {
          id: 'hairdresser_choose_balayage',
          en: 'Ask for a balayage',
          modelFr: 'Un balayage, s\'il vous plaît.',
          requires: [{ kind: 'intent', state: 'ask_color_details', intent: 'balayage' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'appointment', terms: ['jai rendez-vous', 'rendez-vous'], priority: 1 },
    { state: 'start', intent: 'no_appointment', terms: ['pas de rendez-vous', 'sans rendez-vous'], priority: 1 },
    { state: 'start', intent: 'cut', terms: ['coupe', 'couper les cheveux'] },
    { state: 'start', intent: 'color', terms: ['coloration', 'couleur'] },
    { state: 'start', intent: 'beard', terms: ['barbe'] },
    { state: 'start', intent: 'treatment', terms: ['soin profond', 'soin'] },
    { state: 'start', intent: 'reschedule', terms: ['deplacer mon rendez-vous', 'changer mon rendez-vous'] },
    { state: 'start', intent: 'student_discount', terms: ['reduction etudiant', 'forfait etudiant'] },
    { state: 'start', intent: 'wedding', terms: ['mariage'] },
    { state: 'start', intent: 'gift_card', terms: ['carte cadeau'] },
    { state: 'start', intent: 'refund', terms: ['remboursement'] },
    { state: 'start', intent: 'hours', terms: ['horaires', 'heures douverture'] },
    { state: 'check_availability', intent: 'yes', terms: ['oui'], priority: 1 },
    { state: 'check_availability', intent: 'no', terms: ['non'] },
    { state: 'ask_color_details', intent: 'balayage', terms: ['balayage'], priority: 1 },
    { state: 'ask_color_details', intent: 'total', terms: ['coloration complete', 'coloration totale'] },
    { state: 'ask_color_details', intent: 'roots', terms: ['racines'] },
    { state: 'ask_payment', intent: 'card', terms: ['carte'], priority: 1 },
    { state: 'ask_payment', intent: 'cash', terms: ['especes', 'liquide'] },
    { state: 'ask_payment', intent: 'app', terms: ['application'] },
  ],
};
