import type { OfflineScenarioState, FeedbackV2 } from '../../types/index';

export interface MissionConditionIntent {
  kind: 'intent';
  state: string;
  intent: string;
}

export interface MissionConditionSlot {
  kind: 'slot';
  state: string;
  slot: string;
  minWords: number;
}

/** ALL entries must be satisfied — AND. Use two missions for OR. */
export type MissionCondition = MissionConditionIntent | MissionConditionSlot;

export interface Mission {
  id: string; // unique within the scenario
  en: string; // 'Say where you are travelling to and when'
  modelFr?: string; // shown only after the turn resolves, never before
  requires: MissionCondition[];
}

export interface BranchTrigger {
  state: string;
  intent: string;
  /** Multi-word entries match as ordered phrases; single words match as whole tokens. */
  terms: string[];
  /** Higher wins ties. Default 0. Use for a catch-all vs a specific sibling. */
  priority?: number;
}

export type IntentResult =
  | { kind: 'matched'; intent: string; score: number }
  | { kind: 'ambiguous'; candidates: string[] }
  | { kind: 'no_match' };

export type TurnOutcomeIntentResult =
  | IntentResult
  | { kind: 'auto_advance' }
  | { kind: 'skipped' };

export interface LanguageResultScored {
  kind: 'scored';
  feedback: FeedbackV2;
}

export interface LanguageResultUnscored {
  kind: 'unscored';
  /** Null for a passthrough turn (PASSTHROUGH_LANGUAGE) — no utterance ever
   *  existed to grade, so there is no FeedbackV2 to carry, honest or otherwise. */
  feedback: FeedbackV2 | null;
}

/** A turn was spoken but its feedback hasn't come back yet — a real, distinct
 *  state (not a default), so `TurnOutcome.language` can honestly stay this
 *  for the rest of the in-memory session (nothing downstream reads it). */
export interface LanguageResultPending {
  kind: 'pending';
}

export type LanguageResult = LanguageResultScored | LanguageResultUnscored | LanguageResultPending;

export interface TurnOutcome {
  turnIndex: number;
  state: string;
  transcript: string;
  intentResult: TurnOutcomeIntentResult;
  slotFilled?: { slot: string; wordCount: number };
  language: LanguageResult;
}

export interface ScenarioMeta {
  id: string; // matches the JSON filename and the EXPLORE_TREE node id
  title: string;
  titleFr: string;
  emoji: string;
  tier: 1 | 2 | 3 | 4 | 5;
  category: string;
  dependencies: string[];
  npc: {
    nameFr: string;
    roleFr: string;
    roleEn: string;
    emoji: string;
    register: 'formal' | 'informal';
  };
  briefingEn: string;
  /** Keyed by the `start` intent that opens it — one branch is one playable session. */
  branches: Record<string, { labelEn: string; missions: Mission[] }>;
  triggers: BranchTrigger[];
}

export interface VocabEntry {
  fr: string;
  en: string;
  pos: 'noun' | 'verb' | 'adj' | 'adv' | 'phrase' | 'connective' | 'question';
  gender?: 'm' | 'f' | 'mf' | 'pl'; // required for nouns
  article?: string; // required for nouns
  pluralFr?: string; // when irregular
  verbGroup?: 1 | 2 | 3;
  isIrregular?: boolean;
  takesEtre?: boolean;
  register: 'formal' | 'neutral' | 'informal';
  literalEn?: string; // required when non-compositional
  note?: string; // the trap, not trivia
  ipa?: string;
  usedInStates: string[]; // provenance — validated
  rank: 'core' | 'extend';
}

export type ScenarioGraph = Record<string, OfflineScenarioState>;

export interface ScenarioDeck {
  entries: VocabEntry[];
}
