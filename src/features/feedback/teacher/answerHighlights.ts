import { findMarker, type MarkerHit } from '../../../services/coaching/diagnosticEngine';
import type { FirstId } from './firsts';
import type { PredictionCheckId } from './predictionQuestions';

/**
 * What this answer actually does, in the learner's own words — the line the
 * teacher says right after the opening so the feedback starts from THIS answer,
 * not a general remark (owner, 2026-11-13: "make it more specific to the
 * answer").
 *
 * Pure and deterministic: the same presence-reliable markers as the Predict
 * checks, each part quoting what was found verbatim. A marker that finds
 * nothing says nothing (never "you didn't"). Parts the learner already hears
 * elsewhere are left out: a Predict check they answered on the same thing, or a
 * milestone "first" about the same time frame.
 */

export interface AnswerHighlight {
  /** The Predict check this part overlaps, so a calibration line can replace it. */
  id: Exclude<PredictionCheckId, 'mistakes' | 'comparison'>;
  /** « parce que c'est drôle » — verbatim from the answer. */
  quote: string;
  /** "gave a reason" — completes "In your answer you …". */
  phrase: string;
}

const MAX_PARTS = 2;

// The A2 sequencers as well as the diagnostic engine's B1 `connectors`.
const LINKING = /(?<![\p{L}'’])(?:d[’']abord|ensuite|puis|de plus|en plus|par contre|cependant|pourtant|donc|finalement|enfin|en effet|d[’']ailleurs|ainsi)(?![\p{L}])/iu;

function linking(transcript: string): MarkerHit | null {
  const m = LINKING.exec(transcript);
  return m ? { quote: m[0].trim() } : null;
}

const CANDIDATES: ReadonlyArray<{
  id: AnswerHighlight['id'];
  phrase: string;
  find: (t: string) => MarkerHit | null;
  first?: FirstId;
}> = [
  { id: 'reason', phrase: 'gave a reason', find: (t) => findMarker(t, 'justification') },
  { id: 'tense', phrase: 'talked about the past', find: (t) => findMarker(t, 'past'), first: 'past' },
  { id: 'tense', phrase: 'talked about the future', find: (t) => findMarker(t, 'future'), first: 'future' },
  { id: 'conditional', phrase: 'said what you would do', find: (t) => findMarker(t, 'conditional') },
  { id: 'opinion', phrase: 'gave your opinion', find: (t) => findMarker(t, 'opinion') },
  { id: 'linking', phrase: 'linked your ideas', find: linking },
];

export function answerHighlights(
  transcript: string,
  skip: { checks?: ReadonlySet<PredictionCheckId>; firsts?: readonly FirstId[] } = {},
): AnswerHighlight[] {
  const out: AnswerHighlight[] = [];
  if (!transcript.trim()) return out;
  for (const c of CANDIDATES) {
    if (out.length >= MAX_PARTS) break;
    if (skip.checks?.has(c.id)) continue;
    if (c.first && skip.firsts?.includes(c.first)) continue;
    if (out.some((h) => h.id === c.id)) continue;
    const hit = c.find(transcript);
    if (hit?.quote) out.push({ id: c.id, quote: hit.quote, phrase: c.phrase });
  }
  return out;
}
