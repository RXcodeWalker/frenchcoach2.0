/**
 * Stage 10 (Story Mode rebuild) — the single source Story Mode reads from.
 *
 * Retires the roleplays.json <-> questions.json join: 110 of that join's 120
 * question_ids don't exist in questions.json, so 22 of 24 stories resolved
 * `undefined` and crashed into StoryMode's old fabricated-5.0 catch block.
 *
 * Assembled from the two intact, self-contained sources named in the plan:
 *  - roleplayCards.ts        — 6 cards, prompt_fr + prompt_en on every task.
 *  - igcse_master.json's
 *    role_play_cards          — 15 cards, prompts[] only, no join.
 *
 * Not lossless (see "Stage 10 — Story Mode rebuild" in the overhaul plan):
 *  - question_ids are retired; nothing else in the app consumes them.
 *  - English task instructions exist for the 6 roleplayCards.ts cards and for
 *    rpc_24_01 (whose 5 real `instruction` strings survive in questions.json
 *    as q_rp_24_c1_1..5, carried over verbatim below). The other 14
 *    igcse_master cards have no authored English instruction anywhere in the
 *    repo; inventing 70 of them is new pedagogical content this stage isn't
 *    authoring, so per the plan's documented fallback they render
 *    French-prompt-only, which is exam-accurate (the real IGCSE speaking test
 *    gives the candidate only the French card).
 *  - NPC identity (nameFr/roleFr/roleEn/emoji) doesn't exist in either source
 *    as structured data — igcse_master's `scenario` field states in prose who
 *    the examiner plays ("L'examinateur joue le rôle du..."), so identity is
 *    extracted from that sentence per card, not invented.
 */
import allQuestions from './raw/questions.json';
import { ROLEPLAY_CARDS } from './roleplayCards';
import igcseMaster from './raw/igcse_master.json';
import type { CharacterNpc } from '../components/ui/CharacterAvatar';

export interface StoryTask {
  taskId: number;
  promptFr: string;
  /** Absent when no authored English instruction exists for this task (see module doc). */
  promptEn?: string;
}

export interface StoryCard {
  id: string;
  scenario: string;
  /** Null for the 6 roleplayCards.ts cards, which carry no exam paper provenance. */
  paperId: string | null;
  npc: CharacterNpc;
  tasks: StoryTask[];
}

const NPC_BY_CARD_ID: Record<string, CharacterNpc> = {
  // roleplayCards.ts — role stated in `setting`.
  rp_tourism_01: { nameFr: "L'employé(e)", emoji: '🗺️' },
  rp_hotel_01: { nameFr: 'Le/la réceptionniste', emoji: '🛎️' },
  rp_restaurant_01: { nameFr: 'Le serveur/la serveuse', emoji: '🍽️' },
  rp_train_01: { nameFr: "L'agent de la gare", emoji: '🚆' },
  rp_camping_01: { nameFr: 'Le gérant du camping', emoji: '⛺' },
  rp_lost_property_01: { nameFr: 'Objets trouvés', emoji: '🎒' },
  // igcse_master role_play_cards — role stated in `scenario`'s final sentence.
  rpc_24_01: { nameFr: 'Le touriste', emoji: '🗺️' },
  rpc_24_02: { nameFr: 'Le/la réceptionniste', emoji: '🛎️' },
  rpc_24_03: { nameFr: 'Le loueur', emoji: '⛵' },
  rpc_24_04: { nameFr: 'Le vendeur', emoji: '🎫' },
  rpc_24_05: { nameFr: 'Un employé de la gare', emoji: '🚆' },
  rpc_24_06: { nameFr: 'Le/la vendeur(euse)', emoji: '🎁' },
  rpc_24_07: { nameFr: "L'ami(e)", emoji: '⚽' },
  rpc_24_08: { nameFr: 'Le guide touristique', emoji: '🏰' },
  rpc_24_09: { nameFr: 'Le patron', emoji: '💼' },
  rpc_23_01: { nameFr: "L'ami(e)", emoji: '⛺' },
  rpc_23_02: { nameFr: "L'ami(e)", emoji: '⛸️' },
  rpc_23_03: { nameFr: 'Le loueur', emoji: '⛵' },
  rpc_23_04: { nameFr: 'Le/la responsable du club', emoji: '🏅' },
  rpc_23_05: { nameFr: 'Le vendeur du buffet', emoji: '🥐' },
  rpc_23_06: { nameFr: "L'agent de la gare", emoji: '🚆' },
};

const DEFAULT_NPC: CharacterNpc = { nameFr: "L'examinateur", emoji: '🎭' };

// The only igcse_master card with real per-task English instructions
// surviving in questions.json (q_rp_24_c1_1..5) — carried over verbatim.
const RPC_24_01_INSTRUCTIONS: Record<number, string> = {};
allQuestions.forEach((q) => {
  const match = /^q_rp_24_c1_(\d)$/.exec(q.id);
  if (match && 'instruction' in q && typeof q.instruction === 'string') {
    RPC_24_01_INSTRUCTIONS[Number(match[1])] = q.instruction;
  }
});

function fromRoleplayCards(): StoryCard[] {
  return ROLEPLAY_CARDS.map((card) => ({
    id: card.id,
    scenario: card.setting,
    paperId: null,
    npc: NPC_BY_CARD_ID[card.id] ?? DEFAULT_NPC,
    tasks: card.tasks.map((t) => ({
      taskId: t.task_id,
      promptFr: t.prompt_fr,
      promptEn: t.prompt_en,
    })),
  }));
}

interface RawMasterCard {
  id: string;
  paper_id: string;
  scenario: string;
  prompts: string[];
}

function fromIgcseMaster(): StoryCard[] {
  const cards = igcseMaster.role_play_cards as RawMasterCard[];
  return cards.map((card) => ({
    id: card.id,
    scenario: card.scenario,
    paperId: card.paper_id,
    npc: NPC_BY_CARD_ID[card.id] ?? DEFAULT_NPC,
    tasks: card.prompts.map((promptFr, i) => ({
      taskId: i + 1,
      promptFr,
      promptEn: card.id === 'rpc_24_01' ? RPC_24_01_INSTRUCTIONS[i + 1] : undefined,
    })),
  }));
}

export const STORY_CARDS: StoryCard[] = [...fromRoleplayCards(), ...fromIgcseMaster()];
