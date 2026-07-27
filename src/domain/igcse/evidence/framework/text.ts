/**
 * Shared canonical-text, tokenisation, and deterministic-id helpers for Phase 3
 * detectors (§10.3). One place for the "composite identity key" hashing rule
 * (§9.2) so every detector produces byte-identical ids for identical input —
 * never a timestamp or random value.
 */

import type { SpeakingTranscript } from '../../judgement/types';
import type { Span } from './observation';

export interface ResponseUnit {
  /** e.g. "rolePlay:t1", "topic1:q2" — matches the existing questionId convention. */
  unitId: string;
  source: 'rolePlay' | 'topic1' | 'topic2';
  text: string;
  /** Offset of this unit's text within the full canonical transcript text. */
  startOffset: number;
}

/**
 * The canonical candidate text: every response unit's text concatenated with a
 * single newline separator, in transcript order (rolePlay tasks, then topic1
 * turns, then topic2 turns). Spans are offsets into this string. Building it
 * once per transcript keeps every detector's span arithmetic consistent.
 */
export function buildCanonicalUnits(transcript: SpeakingTranscript): ResponseUnit[] {
  const units: ResponseUnit[] = [];
  let cursor = 0;

  for (const task of transcript.rolePlay) {
    const text = task.candidateResponse;
    units.push({ unitId: `rolePlay:${task.taskId}`, source: 'rolePlay', text, startOffset: cursor });
    cursor += text.length + 1;
  }

  for (const conversation of transcript.topicConversations) {
    for (const turn of conversation.turns) {
      const text = turn.candidateResponse;
      units.push({
        unitId: `${conversation.conversationId}:${turn.turnId}`,
        source: conversation.conversationId,
        text,
        startOffset: cursor,
      });
      cursor += text.length + 1;
    }
  }

  return units;
}

export function canonicalText(units: ResponseUnit[]): string {
  return units.map((u) => u.text).join('\n');
}

export function fullUnitSpan(unit: ResponseUnit): Span[] {
  return [{ startOffset: unit.startOffset, endOffset: unit.startOffset + unit.text.length }];
}

export function fullResponseSpan(units: ResponseUnit[]): Span[] {
  if (units.length === 0) return [{ startOffset: 0, endOffset: 0 }];
  const last = units[units.length - 1];
  return [{ startOffset: 0, endOffset: last.startOffset + last.text.length }];
}

/**
 * Locates `needle`'s FIRST occurrence within `unit.text`, offset into the
 * canonical text. Only correct when `needle` occurs once (or all occurrences
 * are equivalent for the caller's purposes) — a detector whose regex/search
 * can match the same substring more than once in one unit MUST use
 * `matchIndexSpan` (with the real match offset from `matchAll` against RAW
 * text) or `findNormalizedOccurrenceSpan` (for accent/case-insensitive,
 * occurrence-aware search), or every repeat collapses onto the same span and
 * the runner's set-not-bag duplicate check (§9.2) rejects the whole detector
 * run.
 */
export function spanWithinUnit(unit: ResponseUnit, needle: string): Span[] {
  const idx = unit.text.indexOf(needle);
  if (idx === -1) return fullUnitSpan(unit);
  return [{ startOffset: unit.startOffset + idx, endOffset: unit.startOffset + idx + needle.length }];
}

/** Span from a real `matchAll` match's own `.index` — correct even when the same substring repeats within a unit. */
export function matchIndexSpan(unit: ResponseUnit, matchIndex: number, matchText: string): Span[] {
  return [
    { startOffset: unit.startOffset + matchIndex, endOffset: unit.startOffset + matchIndex + matchText.length },
  ];
}

/**
 * Nth (0-indexed) EXACT-substring occurrence of `needle` within `unit.text`
 * — for callers whose `needle` is already a byte-identical substring of
 * `unit.text` (e.g. a sentence produced by `segmentSentences`), so no accent/
 * case folding is wanted. Occurrence-aware, unlike `spanWithinUnit`.
 */
export function nthExactOccurrenceSpan(unit: ResponseUnit, needle: string, occurrence: number): Span[] {
  let idx = -1;
  for (let i = 0; i <= occurrence; i += 1) {
    idx = unit.text.indexOf(needle, idx + 1);
    if (idx === -1) break;
  }
  if (idx === -1) return fullUnitSpan(unit);
  return [{ startOffset: unit.startOffset + idx, endOffset: unit.startOffset + idx + needle.length }];
}

const COMBINING_MARKS = /[̀-ͯ]/g;

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/'/g, ' ')
    .toLowerCase()
    .replace(/[^a-z'\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escapes a string for literal use inside a RegExp source. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * NFD-decompose + strip combining marks (accents), case-fold. Deliberately
 * NOT `normalize()`: that also collapses whitespace runs and trims, both
 * length-changing operations that would desync offsets from the raw string.
 * Stripping only combining marks is length-preserving per base character, so
 * `stripAccentsLower(text)[i]` always corresponds to `text[i]`.
 */
function stripAccentsLower(text: string): string {
  return text.normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();
}

/**
 * Finds the (0-indexed) `occurrence`-th match of `needle` (a normalized,
 * space-separated phrase, e.g. "a mon avis") within `unit.text`, by matching
 * an accent/case-insensitive regex directly against a length-preserving
 * accent-stripped view of the raw text. Because the match's own `.index`
 * comes from matching against that same-length view, it is always a correct
 * offset into the RAW text — no separate offset-translation step, which is
 * what made an earlier version of this helper silently wrong whenever a
 * response had irregular whitespace (translating an index found in
 * `normalize()`'d text, which had already collapsed/trimmed whitespace, back
 * onto raw-text offsets).
 */
export function findNormalizedOccurrenceSpan(
  unit: ResponseUnit,
  needle: string,
  occurrence: number,
): Span[] {
  const words = needle.split(' ').filter(Boolean).map(escapeRegExp);
  if (words.length === 0) return fullUnitSpan(unit);
  const pattern = new RegExp(`(?<![a-z])${words.join('[^a-z]+')}(?![a-z])`, 'g');
  const scanText = stripAccentsLower(unit.text);

  let index = -1;
  let matchLength = 0;
  let count = 0;
  for (const match of scanText.matchAll(pattern)) {
    if (count === occurrence) {
      index = match.index;
      matchLength = match[0].length;
      break;
    }
    count += 1;
  }

  if (index === -1) return fullUnitSpan(unit);
  return [{ startOffset: unit.startOffset + index, endOffset: unit.startOffset + index + matchLength }];
}

export interface Token {
  raw: string;
  normalized: string;
}

export function tokenizeUnit(unit: ResponseUnit): Token[] {
  const normalized = normalize(unit.text);
  if (!normalized) return [];
  return normalized.split(' ').filter(Boolean).map((t) => ({ raw: t, normalized: t }));
}

/**
 * Deterministic, non-cryptographic content hash (FNV-1a, 32-bit) of the
 * composite identity key `(detectorId, detectorVersion, type, canonicalSpanKey,
 * valueKey)` (§9.2). Never a timestamp or random value — identical input +
 * versions yields byte-identical ids, keeping golden/version-pin hashes stable.
 * Mirrors src/services/coach/evidenceProjection.ts's fnv1a (kept local here so
 * the evidence framework has no dependency on the coach layer).
 */
function fnv1a(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function canonicalSpanKey(spans: Span[]): string {
  return spans.map((s) => `${s.startOffset}:${s.endOffset}`).join(',');
}

export function computeObservationId(
  detectorId: string,
  detectorVersion: string,
  type: string,
  spans: Span[],
  value: string | number | boolean,
): string {
  const key = `${detectorId}|${detectorVersion}|${type}|${canonicalSpanKey(spans)}|${String(value)}`;
  return fnv1a(key);
}

/** baseConfidence per §10.2: high -> 0.90, med -> 0.70, low -> 0.50. */
export const CONF_HIGH = 0.9;
export const CONF_MED = 0.7;
export const CONF_LOW = 0.5;
