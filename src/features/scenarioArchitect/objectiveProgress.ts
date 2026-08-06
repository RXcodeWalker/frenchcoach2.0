/**
 * Client-side objective progress when the backend does not return
 * `completed_objectives`. Prefer API indices when present.
 */

const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with', 'your', 'you',
  'is', 'are', 'be', 'ask', 'get', 'make', 'find', 'use', 'about', 'that', 'this',
  'le', 'la', 'les', 'un', 'une', 'des', 'du', 'de', 'et', 'ou', 'à', 'au', 'aux',
  'en', 'pour', 'avec', 'sur', 'dans', 'que', 'qui', 'je', 'tu', 'il', 'elle',
  'nous', 'vous', 'ils', 'elles', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son',
  'sa', 'ses', 'ce', 'cette', 'ces', 'se', 'ne', 'pas', 'plus', 'très', 'bien',
]);

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function significantTokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter(t => t.length >= 4 && !STOPWORDS.has(t));
}

export interface ObjectiveMatchInput {
  objectives: string[];
  keyVocab: { fr: string; en: string }[];
  /** All student utterances so far (joined matching is fine). */
  studentTranscripts: string[];
  /** Previously completed objective indexes (monotonic). */
  alreadyCompleted: number[];
  /** Backend-provided indexes, if any. */
  apiCompleted?: number[] | null;
  /** When true, mark every remaining objective complete. */
  missionDone?: boolean;
}

/**
 * Returns the full set of completed objective indexes (superset of alreadyCompleted).
 * Never removes a previously completed index.
 */
export function resolveCompletedObjectives(input: ObjectiveMatchInput): number[] {
  const n = input.objectives.length;
  const completed = new Set<number>(
    input.alreadyCompleted.filter(i => i >= 0 && i < n)
  );

  if (input.apiCompleted && input.apiCompleted.length > 0) {
    for (const i of input.apiCompleted) {
      if (typeof i === 'number' && i >= 0 && i < n) completed.add(i);
    }
  }

  if (input.missionDone) {
    for (let i = 0; i < n; i++) completed.add(i);
    return [...completed].sort((a, b) => a - b);
  }

  const corpus = normalize(input.studentTranscripts.join(' '));
  if (!corpus) {
    return [...completed].sort((a, b) => a - b);
  }

  const vocabFr = input.keyVocab.map(v => normalize(v.fr)).filter(Boolean);

  for (let i = 0; i < n; i++) {
    if (completed.has(i)) continue;
    const tokens = significantTokens(input.objectives[i]);
    const hitObjective = tokens.some(t => corpus.includes(t));
    // Vocab credit: if the objective mentions a vocab English gloss or FR form, require FR in speech
    const relatedVocab = input.keyVocab.filter(v => {
      const objNorm = normalize(input.objectives[i]);
      return objNorm.includes(normalize(v.en)) || objNorm.includes(normalize(v.fr));
    });
    const hitVocab =
      relatedVocab.length > 0
        ? relatedVocab.some(v => corpus.includes(normalize(v.fr)))
        : vocabFr.some(fr => fr.length >= 3 && corpus.includes(fr));

    // Need an objective-keyword hit, or (when objective has no tokens) vocab use
    if (tokens.length === 0 ? hitVocab : hitObjective || (relatedVocab.length > 0 && hitVocab)) {
      completed.add(i);
    }
  }

  return [...completed].sort((a, b) => a - b);
}

/** Soft pacing: suggested max student turns before wrap-up nudge. */
export const SUGGESTED_TURN_BUDGET = 6;

export const XP_PER_OBJECTIVE = 20;
export const XP_MISSION_BONUS = 30;
