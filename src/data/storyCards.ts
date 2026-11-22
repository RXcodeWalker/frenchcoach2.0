/**
 * The Role-play drill's cards (`/exam/role-play`) — the one source the drill,
 * homework and the teacher area read.
 *
 * Two kinds of card, both original practice content written for this app
 * (none is a Cambridge paper):
 *  - 6 "guided" task cards from roleplayCards.ts: the English task tells the
 *    candidate what to say, and the prep screen lists all five. Their French
 *    lines and English tasks stay in roleplayCards.ts, because the public
 *    role-play pages read them there (src/data/seo/); their answer keys are in
 *    rolePlayDrill/practiceCardKeys.ts.
 *  - 15 "exam style" cards (rolePlayDrill/examStyleCards.ts) in the current
 *    0520 format: the examiner asks five questions, 2–3 of them two-part, and
 *    the candidate hears each one only when it is asked. They have English
 *    tasks too, shown only when the learner asks for them.
 *
 * Card ids are permanent: every learner's drill progress is derived from
 * session ids `story-<cardId>-<ts>-<step>` (features/rolePlayDrill/drillProgress.ts),
 * and homework assignments name a card id.
 *
 * Every task carries an answer key: the parts it asks for, with accept
 * patterns (matcher: features/rolePlayDrill/answerKey.ts), an optional time
 * frame, the shortest answer worth 2 marks (TN p.6, PRINCIPLE_RP_CONCISE in
 * src/domain/igcse/canonical.ts) and one safe full sentence. Checked by
 * __tests__/storyCards.test.ts.
 */
import { ROLEPLAY_CARDS } from './roleplayCards';
import { EXAM_STYLE_CARDS } from './rolePlayDrill/examStyleCards';
import { PRACTICE_CARD_KEYS } from './rolePlayDrill/practiceCardKeys';
import type { AnswerPart } from '../features/rolePlayDrill/answerKey';
import type { CharacterNpc } from '../components/ui/CharacterAvatar';

export type TimeFrame = 'past' | 'present' | 'future';

export interface StoryTask {
  taskId: number;
  /** What the examiner says, exactly as spoken. Never a stage direction. */
  promptFr: string;
  /** The task in English. */
  promptEn: string;
  /** One entry per thing the task asks for (a two-part question has two). */
  parts: AnswerPart[];
  /** The time frame the question demands, when it demands one. */
  timeFrame?: TimeFrame;
  /** The shortest answer that communicates every part fully and correctly (2 marks, TN p.6). */
  modelShort: string;
  /** One safe, simple full sentence. */
  modelFull: string;
}

export interface StoryCard {
  id: string;
  /** Short French title for the card list. */
  title: string;
  scenario: string;
  /** The scenario's language: English on the guided cards, French on the exam-style ones. */
  scenarioLang: 'en' | 'fr';
  /** How the examiner addresses the candidate (a friend is « tu »). */
  register: 'tu' | 'vous';
  /** A guided task card (tasks listed up front, English shown with every question) rather than an exam-style card. */
  guided: boolean;
  /** Always null: no drill card is an exam paper. Kept for the export shape. */
  paperId: string | null;
  npc: CharacterNpc;
  tasks: StoryTask[];
}

const NPC_BY_CARD_ID: Record<string, CharacterNpc> = {
  rp_tourism_01: { nameFr: "L'employé(e)", emoji: '🗺️' },
  rp_hotel_01: { nameFr: 'Le/la réceptionniste', emoji: '🛎️' },
  rp_restaurant_01: { nameFr: 'Le serveur/la serveuse', emoji: '🍽️' },
  rp_train_01: { nameFr: "L'agent de la gare", emoji: '🚆' },
  rp_camping_01: { nameFr: 'Le gérant du camping', emoji: '⛺' },
  rp_lost_property_01: { nameFr: "L'employé(e) des objets trouvés", emoji: '🎒' },
};

const DEFAULT_NPC: CharacterNpc = { nameFr: "L'examinateur", emoji: '🎭' };

function fromRoleplayCards(): StoryCard[] {
  return ROLEPLAY_CARDS.map((card) => {
    const keys = PRACTICE_CARD_KEYS[card.id];
    if (!keys || keys.length !== card.tasks.length) {
      throw new Error(`storyCards: ${card.id} needs one answer key per task`);
    }
    return {
      id: card.id,
      title: card.title,
      scenario: card.setting,
      scenarioLang: 'en',
      register: 'vous',
      guided: true,
      paperId: null,
      npc: NPC_BY_CARD_ID[card.id] ?? DEFAULT_NPC,
      tasks: card.tasks.map((t, i) => ({
        taskId: t.task_id,
        promptFr: t.prompt_fr,
        promptEn: t.prompt_en,
        ...keys[i],
      })),
    };
  });
}

export const STORY_CARDS: StoryCard[] = [...fromRoleplayCards(), ...EXAM_STYLE_CARDS];

/** A guided task card — the drill's "With English instructions" group. */
export function isGuidedCard(card: StoryCard): boolean {
  return card.guided;
}
