/**
 * Tier-0 `tag-verbs` detector (§10.3): heuristic verb tagging. Reuses the
 * morphological-ending heuristics already proven in ../timeFrame.ts
 * (isLikelyParticiple/Imparfait/FutureSimple/Conditional), generalised to tag
 * each individual verb-shaped token (not just classify the whole response).
 * Feature-only (skillNodeId: null) — the shared substrate for `tense`,
 * `agreement`, `aux`, `constructions`.
 */

import type { Detector } from '../framework/detector';
import { buildCanonicalUnits, computeObservationId, findNormalizedOccurrenceSpan, normalize } from '../framework/text';
import type { Observation } from '../framework/observation';
import type { TimeFrame } from '../types';

export const AVOIR_FORMS = new Set(['ai', 'as', 'a', 'avons', 'avez', 'ont']);
export const ETRE_FORMS = new Set(['suis', 'es', 'est', 'sommes', 'etes', 'sont']);
export const ALLER_FORMS = new Set(['vais', 'vas', 'va', 'allons', 'allez', 'vont']);

export type VerbMorphTag =
  | 'present'
  | 'passe_compose_participle'
  | 'imparfait'
  | 'futur_simple'
  | 'futur_proche'
  | 'conditionnel'
  | 'auxiliary';

export interface TaggedVerb {
  word: string;
  tag: VerbMorphTag;
  /** Present only for passe_compose_participle: the auxiliary token that preceded it. */
  auxiliary?: string;
}

function isLikelyParticiple(word: string): boolean {
  return /(e|es|ee|ees|i|is|ie|ies|u|us|ue|ues)$/.test(word);
}

function isLikelyInfinitive(word: string): boolean {
  return /(er|ir|re)$/.test(word);
}

function isLikelyConditional(word: string): boolean {
  return /(rais|rait|rions|riez|raient)$/.test(word);
}

function isLikelyImparfait(word: string): boolean {
  if (word.length <= 4 && /(ais|ait)$/.test(word)) return false;
  return /(ais|ait|ions|iez|aient)$/.test(word);
}

function isLikelyFutureSimple(word: string): boolean {
  return /(rai|ras|ra|rons|rez|ront)$/.test(word);
}

/** Tags verb-shaped tokens in a single normalised word list, in order. */
export function tagVerbTokens(words: string[]): Array<{ index: number; verb: TaggedVerb }> {
  const tagged: Array<{ index: number; verb: TaggedVerb }> = [];
  const consumedAsParticiple = new Set<number>();

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];

    if (AVOIR_FORMS.has(word) || ETRE_FORMS.has(word)) {
      tagged.push({ index: i, verb: { word, tag: 'auxiliary' } });
      const next = words[i + 1];
      if (next && isLikelyParticiple(next) && !isLikelyImparfait(next)) {
        tagged.push({ index: i + 1, verb: { word: next, tag: 'passe_compose_participle', auxiliary: word } });
        consumedAsParticiple.add(i + 1);
      }
      continue;
    }

    if (consumedAsParticiple.has(i)) continue;

    if (ALLER_FORMS.has(word)) {
      const next = words[i + 1];
      if (next && isLikelyInfinitive(next)) {
        tagged.push({ index: i, verb: { word, tag: 'futur_proche' } });
        continue;
      }
      tagged.push({ index: i, verb: { word, tag: 'present' } });
      continue;
    }

    if (isLikelyConditional(word)) {
      tagged.push({ index: i, verb: { word, tag: 'conditionnel' } });
      continue;
    }
    if (isLikelyFutureSimple(word)) {
      tagged.push({ index: i, verb: { word, tag: 'futur_simple' } });
      continue;
    }
    if (isLikelyImparfait(word)) {
      tagged.push({ index: i, verb: { word, tag: 'imparfait' } });
      continue;
    }
    if (/(e|es|ons|ez|ent)$/.test(word) && word.length >= 4) {
      tagged.push({ index: i, verb: { word, tag: 'present' } });
    }
  }

  return tagged;
}

export function tagToTimeFrame(tag: VerbMorphTag): TimeFrame {
  switch (tag) {
    case 'passe_compose_participle':
    case 'imparfait':
      return 'past';
    case 'futur_simple':
    case 'futur_proche':
      return 'future';
    case 'conditionnel':
      return 'conditional';
    default:
      return 'present';
  }
}

export const tagVerbsDetector: Detector = {
  id: 'tag-verbs',
  version: '1',
  tier: 0,
  // No real data dependency on `tokenize` — tag-verbs re-derives its own
  // normalised word list from ctx.transcript directly (same pattern every
  // detector in this fleet uses; evidenceView is only consulted by detectors
  // that read another detector's OBSERVATIONS, not raw tokens). §9.1 defines
  // tier 0 as "depend on the transcript only, never on another detector" —
  // tag-verbs genuinely qualifies, and a same-tier dependsOn would violate
  // the tier-DAG rule the registry enforces.
  dependsOn: [],
  produces: ['verb'],
  baseConfidence: 0.7,
  defaultMarkInfluence: 'forbidden',
  run(ctx) {
    const units = buildCanonicalUnits(ctx.transcript);
    const observations: Observation[] = [];

    for (const unit of units) {
      const normalized = normalize(unit.text);
      if (!normalized) continue;
      const words = normalized.split(' ').filter(Boolean);
      const tagged = tagVerbTokens(words);
      // Occurrence index disambiguates a verb-shaped word repeated across
      // the unit (§9.2 set-not-bag) — counted per surface word, matching
      // how findNormalizedOccurrenceSpan enumerates matches of that word.
      const seenCount = new Map<string, number>();

      for (const { verb } of tagged) {
        const occurrence = seenCount.get(verb.word) ?? 0;
        seenCount.set(verb.word, occurrence + 1);
        const span = findNormalizedOccurrenceSpan(unit, verb.word, occurrence);
        const value = verb.auxiliary ? `${verb.tag}:${verb.auxiliary}+${verb.word}` : `${verb.tag}:${verb.word}`;
        observations.push({
          observationId: computeObservationId('tag-verbs', '1', 'verb', span, value),
          detectorId: 'tag-verbs',
          detectorVersion: '1',
          type: 'verb',
          value,
          spans: span,
          confidence: 0.7,
          markInfluence: 'forbidden',
          skillNodeId: null,
        });
      }
    }

    return observations;
  },
};
