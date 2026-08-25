/**
 * Stage 6 — the narrow adapter from a roleplay graph turn to the minimal
 * `Question` shape `getAIFeedback` actually reads (id, text, topicKey,
 * difficulty, modelAnswer, keyVocab — see apiClient.ts's requestBody
 * construction). Not a synthetic `Question`-shaped lie: every field is
 * derived from real authored content (the NPC line actually spoken, the
 * active mission's model answer, deck entries provenanced to this state).
 *
 * `id` is namespaced `roleplay:<scenarioId>:<state>` so it can never collide
 * with a real question id from questions.json.
 *
 * Deliberately NOT set here: `Session.topicKey`. That's a separate object
 * built by the caller — leaving it undefined is what keeps synthetic
 * roleplay ids out of the review pool (see "Language scoring & failure
 * semantics" in the overhaul plan).
 */
import type { Question } from '../../types';
import type { Mission, ScenarioDeck, ScenarioMeta } from './types';

/** Question.difficulty only has 3 bands; scenario tiers have 5. Monotonic clamp. */
function tierToDifficulty(tier: ScenarioMeta['tier']): 1 | 2 | 3 {
  if (tier <= 2) return 1;
  if (tier === 3) return 2;
  return 3;
}

export interface ToScoringInputParams {
  scenarioId: string;
  /** The graph state this turn was submitted from (TurnOutcome.state). */
  state: string;
  /** The NPC line actually spoken/shown at that state. */
  npcLine: string;
  meta: ScenarioMeta;
  deck: ScenarioDeck;
  /** The missions in play on the branch taken so far (session.missions). */
  missions: readonly Mission[];
  /** Mission ids already completed before this turn (session.status.completed). */
  completedMissionIds: readonly string[];
}

export function toScoringInput(params: ToScoringInputParams): Question {
  // The mission this turn is working toward: the first not-yet-completed
  // mission with a condition anchored at this state. If none — e.g. a state
  // with no mission condition on it, or every mission here is already done —
  // there is no model answer to show; modelAnswer falls back to empty rather
  // than showing a stale or unrelated mission's target sentence.
  const activeMission = params.missions.find(
    (m) =>
      !params.completedMissionIds.includes(m.id) &&
      m.requires.some((c) => c.state === params.state),
  );

  const keyVocab = params.deck.entries
    .filter((entry) => entry.usedInStates.includes(params.state))
    .map((entry) => ({ fr: entry.fr, en: entry.en }));

  return {
    id: `roleplay:${params.scenarioId}:${params.state}`,
    topicKey: params.scenarioId,
    text: params.npcLine,
    hint: activeMission?.en ?? '',
    difficulty: tierToDifficulty(params.meta.tier),
    followUps: [],
    modelAnswer: activeMission?.modelFr ?? '',
    keyVocab,
  };
}
