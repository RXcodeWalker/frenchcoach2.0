import { countWords, findMarker, type MarkerKind } from '../../../services/coaching/diagnosticEngine';

/**
 * "Firsts" (Learn feedback Batch 6c): an honest milestone line when the answer
 * does something for the first time. No XP, no confetti — just the teacher
 * saying so.
 *
 * "First" is a claim, so it is only made when it can be proven from what is
 * stored on this device (local analytics, which already holds the synced
 * sessions of the last 90 days):
 *  - this answer satisfies the milestone; AND
 *  - no earlier stored answer does; AND
 *  - it is not already in `firstsSeen`, so it is said once ever.
 * With no stored history at all there is nothing to check against, so nothing
 * fires — "no proof it's first → no line".
 *
 * v1 uses only reliable signals: word count, and the deterministic French
 * markers (Unicode-safe since Batch 6b-0). The conditional is left out on
 * purpose.
 *
 * Pure. The caller reads the history and persists `firstsSeen`.
 */

export type FirstId = 'long-answer' | 'two-reasons' | 'past' | 'future';

/** "Over 40 words" means more than this. */
export const LONG_ANSWER_WORDS = 40;

/** Display order. */
export const FIRST_IDS: readonly FirstId[] = ['long-answer', 'two-reasons', 'past', 'future'];

/** How many separate times `kind` appears in `text` (stops counting at `limit`). */
function countMarker(text: string, kind: MarkerKind, limit: number): number {
  let rest = text;
  let n = 0;
  while (n < limit) {
    const hit = findMarker(rest, kind);
    if (!hit) break;
    n++;
    // Step one character past where the marker starts. The quote can run on for
    // several words (« parce que c'est drôle et parce que… »), so skipping the whole
    // quote would swallow a second reason inside it; no marker pattern can match
    // from one character into itself.
    const at = rest.indexOf(hit.quote);
    rest = rest.slice(at === -1 ? rest.length : at + 1);
  }
  return n;
}

const SATISFIES: Record<FirstId, (text: string) => boolean> = {
  'long-answer': (t) => countWords(t) > LONG_ANSWER_WORDS,
  'two-reasons': (t) => countMarker(t, 'justification', 2) >= 2,
  past: (t) => findMarker(t, 'past') !== null,
  future: (t) => findMarker(t, 'future') !== null,
};

export function detectFirsts(
  attempt: string,
  priorTranscripts: readonly string[],
  firstsSeen: readonly string[],
): FirstId[] {
  const history = priorTranscripts.filter((t) => t.trim());
  if (history.length === 0) return [];
  const seen = new Set(firstsSeen);
  return FIRST_IDS.filter(
    (id) => !seen.has(id) && SATISFIES[id](attempt) && !history.some((earlier) => SATISFIES[id](earlier)),
  );
}
