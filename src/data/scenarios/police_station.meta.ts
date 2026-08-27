import type { ScenarioMeta } from '../../features/roleplay/types';

/**
 * Stage 9 Tier 4. Like `car_rental`/`job_interview`/`real_estate`/
 * `ski_resort`, `police_station`'s `theft` branch already had extensive
 * `capture`/`intents` structure authored into the graph before Stage 9 —
 * incident details, description, ID verification, report processing, and
 * receipt, far beyond the plan's minimum bar. This pass makes no graph
 * changes; it only authors `.meta.ts` (missions covering the core
 * theft-report beats) and `.deck.ts`. Only `theft` is authored as a mission
 * branch; `loss`/`complaint`/etc. and the other `start` side-intents remain
 * unauthored (Stage 9 backlog) even though their graph content is already
 * rich.
 */
export const policeStationMeta: ScenarioMeta = {
  id: 'police_station',
  title: 'Police Station',
  titleFr: 'Le Commissariat',
  emoji: '👮',
  tier: 4,
  category: 'Services',
  dependencies: [],
  npc: {
    nameFr: 'Policier',
    roleFr: "l'agent de police",
    roleEn: 'police officer',
    emoji: '👮',
    register: 'formal',
  },
  briefingEn:
    "You're reporting a theft at the police station. Say what was stolen, describe it, show ID, then get your report receipt.",
  branches: {
    theft: {
      labelEn: 'Report a theft',
      missions: [
        {
          id: 'police_report_theft',
          en: 'Say you want to report a theft',
          modelFr: "Je voudrais signaler un vol.",
          requires: [{ kind: 'intent', state: 'start', intent: 'theft' }],
        },
        {
          id: 'police_say_theft_details',
          en: 'Say what was stolen and when',
          modelFr: "On m'a volé mon téléphone hier soir.",
          requires: [{ kind: 'slot', state: 'ask_theft_details', slot: 'theft_info', minWords: 4 }],
        },
        {
          id: 'police_say_description',
          en: 'Describe the stolen item',
          modelFr: "C'est un téléphone noir avec une coque bleue.",
          requires: [{ kind: 'slot', state: 'ask_description', slot: 'item_description', minWords: 3 }],
        },
        {
          id: 'police_show_id',
          en: 'Show your ID',
          modelFr: "Voici ma pièce d'identité.",
          requires: [{ kind: 'slot', state: 'ask_id', slot: 'identity', minWords: 2 }],
        },
        {
          id: 'police_decline_more',
          en: "Say no, that's everything",
          modelFr: 'Non merci, ce sera tout.',
          requires: [{ kind: 'intent', state: 'provide_copy', intent: 'no' }],
        },
      ],
    },
  },
  triggers: [
    { state: 'start', intent: 'theft', terms: ['vol', 'signaler un vol'], priority: 1 },
    { state: 'provide_copy', intent: 'no', terms: ['non', 'ce sera tout'], priority: 1 },
    { state: 'provide_copy', intent: 'yes', terms: ['oui'] },
  ],
};
