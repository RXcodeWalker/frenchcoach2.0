/**
 * What the marker reads for one spoken answer (transcription-accuracy plan,
 * Phase 4, stage 6). Two owner rules are applied here, before the judge sees
 * anything:
 *
 *  - Category A (spellings that sound the same: il mange / ils mangent,
 *    et/est, a/à…): the text is respelled to its context-consistent spelling
 *    (`homophones/respell.ts`). Only the spelling changes, never a sound, a
 *    word count or the punctuation.
 *  - Category B (audible but accent-confusable: un/en, ont/sont, le/les…):
 *    the words the marker cannot be sure of are returned as `nearHomophone`
 *    spans. With two recognisers that is where they disagreed on such a word
 *    (`domain/transcription/alignRecognisers.ts`, the one aligner Learn uses
 *    too); with only one recogniser it is every such word, because nothing
 *    confirms it. Clearly different words are `different` spans: the primary
 *    reading stays the marked text, but until the STT benchmark they are
 *    uncertain too (judgement/homophoneErrors.ts DIFFERENT_WORDS_ARE_UNCERTAIN).
 *
 * Typed text is never respelled and carries no spans: a typed spelling is what
 * the candidate wrote. Pure and deterministic.
 */

import { alignRecognisers } from '../../../transcription/alignRecognisers';
import type { AmbiguousSpan } from '../../judgement/types';
import { NEAR_PAIRS } from '../homophones/nearPairs';
import { respell } from '../homophones/respell';
import { tokenize } from '../homophones/text';
import type { Utterance } from '../types';

export interface MarkedText {
  /** The text the marker reads (Category A respelled). Same word count as the input. */
  text: string;
  spans: AmbiguousSpan[];
}

/** Whitespace-separated word count — the token model AmbiguousSpan indexes into. */
export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/** Category B partners of a word ("de" → des, du), or [] when it is in no pair. */
function nearPartners(lower: string): { partners: string[]; pairIds: string[] } {
  const pairs = NEAR_PAIRS.filter((p) => p.a === lower || p.b === lower);
  return { partners: pairs.map((p) => (p.a === lower ? p.b : p.a)), pairIds: pairs.map((p) => p.id) };
}

/** One recogniser only: every Category B word is uncertain. */
function singleRecogniserSpans(text: string): AmbiguousSpan[] {
  const spans: AmbiguousSpan[] = [];
  tokenize(text).forEach((token, i) => {
    const { partners, pairIds } = nearPartners(token.lower);
    if (pairIds.length === 0) return;
    spans.push({
      kind: 'nearHomophone',
      basis: 'single-recogniser',
      start: i,
      end: i + 1,
      heard: token.raw,
      alternatives: partners,
      pairIds,
    });
  });
  return spans;
}

/**
 * The marked text of a spoken answer. `secondary` is the other recogniser's
 * reading, or null/blank when only one recogniser read it.
 */
export function markSpokenText(primary: string, secondary: string | null): MarkedText {
  if (secondary === null || secondary.trim() === '' || primary.trim() === '') {
    const text = respell(primary).text;
    return { text, spans: singleRecogniserSpans(text) };
  }
  const alignment = alignRecognisers(primary, secondary);
  return {
    text: alignment.primaryText,
    spans: alignment.spans.map((s) => ({
      kind: s.kind,
      basis: 'disagreement' as const,
      start: s.start,
      end: s.end,
      heard: s.primaryWords,
      alternatives: s.secondaryWords ? [s.secondaryWords] : [],
      pairIds: [...s.pairIds],
    })),
  };
}

/**
 * The marked text of one candidate utterance. Typed: unchanged, no spans.
 * Spoken: compared with the other recogniser when the batch reading is the
 * marked one and the live captions heard something; otherwise (a live-captions
 * fallback, a transcript from before batch recognition, a recording read by
 * one recogniser) a single-recogniser reading.
 */
export function markUtterance(utterance: Utterance): MarkedText & { spoken: boolean } {
  if (utterance.inputMode === 'text') return { text: utterance.text, spans: [], spoken: false };
  const recognition = utterance.recognition;
  const secondary = recognition?.selected === 'primary' && recognition.primary ? recognition.secondary.text : null;
  return { ...markSpokenText(utterance.text, secondary), spoken: true };
}

/** Joins utterances into one answer (single spaces), shifting each one's spans to the joined text's word indexes. */
export function joinMarked(parts: readonly MarkedText[]): MarkedText {
  const spans: AmbiguousSpan[] = [];
  let offset = 0;
  for (const part of parts) {
    for (const s of part.spans) spans.push({ ...s, start: s.start + offset, end: s.end + offset });
    offset += wordCount(part.text);
  }
  return { text: parts.map((p) => p.text).join(' '), spans };
}
