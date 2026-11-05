/**
 * Offline "What you did well": up to four quoted strengths, strongest first,
 * in the same shape the AI coach returns (`strengths[]`), so the teacher's
 * conversation can point at the learner's own words instead of one generic
 * line.
 *
 * Honest by construction:
 *  - every quote is a verbatim slice of the transcript;
 *  - a quote never overlaps a span the offline rules flagged as an error (or
 *    an English run), so the coach never praises a phrase it also corrects;
 *  - presence comes from the same closed-list detectors the rest of Learn
 *    uses (diagnosticEngine.findMarker) plus a few narrow patterns here — a
 *    hit is reported, a miss is never reported as a failure.
 *
 * The `why` lines describe what the learner did; they never mention a mark,
 * band or grade (ADR 0005).
 */
import type { CoachStrength, Question } from '../../../types';
import { findMarker, type MarkerKind } from '../diagnosticEngine';
import { FR_LETTER, NOT_BEFORE } from '../regexBoundary';

export interface BlockedSpan {
  start: number;
  end: number;
}

export type StrengthKind =
  | 'conditional'
  | 'subjunctive'
  | 'past'
  | 'future'
  | 'justification'
  | 'opinion'
  | 'comparison'
  | 'connectors'
  | 'relative'
  | 'negation'
  | 'avoirExpression'
  | 'topicVocab';

export interface OfflineStrength extends CoachStrength {
  kind: StrengthKind;
  start: number;
  end: number;
}

export const MAX_STRENGTHS = 4;

/** What each kind of strength shows, in the coach's voice. */
export const STRENGTH_WHY: Record<StrengthKind, string> = {
  conditional: "A conditional — you're talking about what would happen, not only what does.",
  subjunctive: 'A subjunctive after its trigger — a more complex structure, and you used it.',
  past: 'A past tense — you can talk about what happened, not only what happens.',
  future: "You talked about the future — that's range beyond the present tense.",
  justification: 'You backed up your point with a reason.',
  opinion: 'You gave your own opinion and signposted it clearly.',
  comparison: 'You compared two things — a good way to develop an answer.',
  connectors: 'A linking word beyond « et » — it makes your answer flow.',
  relative: 'A relative clause — you joined two ideas into one sentence.',
  negation: 'A full negation with ne, built correctly.',
  avoirExpression: 'You used avoir the French way, not a word-for-word translation from English.',
  topicVocab: 'Topic vocabulary from the question — it keeps your answer on target.',
};

/** Strongest first: the structures that show the most range lead. */
const ORDER: StrengthKind[] = [
  'conditional',
  'subjunctive',
  'past',
  'future',
  'justification',
  'opinion',
  'comparison',
  'connectors',
  'relative',
  'negation',
  'avoirExpression',
  'topicVocab',
];

const AP = "['’]";
const NUMBER_WORDS = 'un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|dix-sept|dix-huit|dix-neuf|vingt';
const L = FR_LETTER;
/** Up to `n` more words after a match, stopping at punctuation. */
const tail = (n: number) => `(?:\\s+[${L}'’-]+){0,${n}}`;

const OWN_PATTERNS: Partial<Record<StrengthKind, RegExp>> = {
  opinion: new RegExp(
    `${NOT_BEFORE}(?:je pense qu${AP}|je pense que|je trouve qu${AP}|je trouve que|je crois qu${AP}|je crois que|à mon avis|selon moi|il me semble que|pour moi|personnellement)${tail(4)}`,
    'gi',
  ),
  subjunctive: new RegExp(
    `${NOT_BEFORE}(?:il faut qu${AP}|il faut que|pour qu${AP}|pour que|bien qu${AP}|bien que|avant qu${AP}|avant que)\\s*[${L}'’-]+\\s+(?:fasse|fassent|sois|soit|soient|puisse|puissent|aille|ailles|aillent|sache|prenne|prennent|vienne|viennent|ait|aies|aient|aie)(?![${L}])${tail(2)}`,
    'gi',
  ),
  comparison: new RegExp(
    `${NOT_BEFORE}(?:(?:plus|moins|aussi)\\s+[${L}]+\\s+qu(?:e|${AP})|meilleure?s?\\s+qu(?:e|${AP})|mieux\\s+qu(?:e|${AP}))${tail(2)}`,
    'gi',
  ),
  relative: new RegExp(`${NOT_BEFORE}[${L}]{3,}\\s+(?:qui|où)\\s+[${L}'’-]+${tail(2)}`, 'gi'),
  negation: new RegExp(
    `${NOT_BEFORE}(?:ne\\s+|n${AP})[${L}'’-]+\\s+(?:pas|jamais|rien|plus|personne)(?![${L}])${tail(2)}`,
    'gi',
  ),
  avoirExpression: new RegExp(
    `${NOT_BEFORE}(?:j${AP}ai|il a|elle a|on a|nous avons|ils ont|elles ont)\\s+(?:(?:\\d+|${NUMBER_WORDS})\\s+ans|faim|soif|froid|chaud|peur|raison|besoin\\s+d(?:e|${AP})[${L}'’-]*)(?![${L}])`,
    'gi',
  ),
};

const MARKER_KINDS: Partial<Record<StrengthKind, { marker: MarkerKind; extend: number }>> = {
  conditional: { marker: 'conditional', extend: 3 },
  past: { marker: 'past', extend: 3 },
  future: { marker: 'future', extend: 3 },
  justification: { marker: 'justification', extend: 0 },
  connectors: { marker: 'connectors', extend: 4 },
};

const NEGATIVE_BEFORE_PLUS = new RegExp(`(?:^|[^${L}])(?:ne|n${AP})(?:\\s+[${L}'’-]+){0,2}\\s*$`, 'i');

function overlaps(a: BlockedSpan, b: BlockedSpan): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Words a quote should not end on — they promise more than the quote shows (« au tennis et »). */
const DANGLING = new Set([
  'et', 'ou', 'mais', 'en', 'pour', 'de', 'du', 'des', 'd', 'à', 'au', 'aux', 'le', 'la', 'les', 'l', 'un', 'une',
  'que', 'qu', 'avec', 'dans', 'sur', 'par', 'très', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
  'notre', 'nos', 'leur', 'leurs', 'ce', 'cet', 'cette', 'ces', 'si', 'car', 'donc', 'puis', 'quand', 'parce',
]);
const SUBJECT_BEFORE = new RegExp(`(?:^|[^${L}])((?:j${AP}|(?:je|tu|il|elle|on|nous|vous|ils|elles)\\s+(?:(?:ne|n${AP})\\s*)?))$`, 'i');

/** Drop trailing words a quote should not end on. */
function trimDangling(transcript: string, span: BlockedSpan, minEnd: number): BlockedSpan {
  let end = span.end;
  for (;;) {
    const m = new RegExp(`\\s+([${L}'’-]+)$`, 'i').exec(transcript.slice(span.start, end));
    if (!m || end - m[0].length < minEnd) break;
    const word = m[1].toLowerCase().replace(/['’]$/, '');
    if (!DANGLING.has(word)) break;
    end -= m[0].length;
  }
  return { start: span.start, end };
}

/**
 * The quote for a marker hit: the hit plus a few following words (fewer if
 * the next ones are blocked), the subject in front of a bare verb (« irais »
 * → « j'irais »), and no dangling last word.
 */
function quoteAround(transcript: string, core: BlockedSpan, n: number, clean: (s: BlockedSpan) => boolean): BlockedSpan | null {
  const before = SUBJECT_BEFORE.exec(transcript.slice(0, core.start));
  const withSubject = before ? { start: core.start - before[1].length, end: core.end } : core;
  for (const base of before ? [withSubject, core] : [core]) {
    for (let words = n; words >= 0; words--) {
      const m = words > 0 ? new RegExp(`^${tail(words)}`, 'i').exec(transcript.slice(base.end)) : null;
      const span = trimDangling(transcript, { start: base.start, end: base.end + (m ? m[0].length : 0) }, base.end);
      if (clean(span)) return span;
    }
  }
  return null;
}

/** The first acceptable span for one kind, or null. */
function findSpan(transcript: string, kind: StrengthKind, blocked: BlockedSpan[], question?: Question): BlockedSpan | null {
  const clean = (s: BlockedSpan) => s.end > s.start && !blocked.some((b) => overlaps(s, b));

  const viaMarker = MARKER_KINDS[kind];
  if (viaMarker) {
    // findMarker reports the first hit; when that one is blocked (« nous avons
    // allé » is an error), keep looking further on (« c'était génial »).
    let offset = 0;
    while (offset < transcript.length) {
      const rest = transcript.slice(offset);
      const hit = findMarker(rest, viaMarker.marker);
      if (!hit) return null;
      const at = rest.indexOf(hit.quote);
      if (at === -1) return null;
      const core = { start: offset + at, end: offset + at + hit.quote.length };
      const span = quoteAround(transcript, core, viaMarker.extend, clean);
      if (span) return span;
      offset = core.end;
    }
    return null;
  }

  if (kind === 'topicVocab') return topicVocabSpan(transcript, question, clean);

  const re = OWN_PATTERNS[kind];
  if (!re) return null;
  for (const m of transcript.matchAll(re)) {
    if (m.index === undefined) continue;
    const raw = { start: m.index, end: m.index + m[0].trimEnd().length };
    const span = kind === 'avoirExpression' || kind === 'comparison' ? raw : trimDangling(transcript, raw, raw.start + 1);
    if (kind === 'comparison' && /^plus/i.test(m[0]) && NEGATIVE_BEFORE_PLUS.test(transcript.slice(0, m.index))) continue;
    if (clean(span)) return span;
  }
  return null;
}

/** The question's key vocabulary, reduced to the word itself (« le collège » → « collège », « fascinant(e) » → « fascinant »). */
function vocabTerms(question?: Question): string[] {
  const terms: string[] = [];
  for (const v of question?.keyVocab ?? []) {
    const term = v.fr
      .replace(/\([^)]*\)/g, '')
      .split(/[/,;]/)[0]
      .trim()
      .replace(/^(?:le|la|les|un|une|des|du|de)\s+|^l['’]/i, '')
      .trim();
    if (term.length >= 4) terms.push(term);
  }
  return terms;
}

function topicVocabSpan(transcript: string, question: Question | undefined, clean: (s: BlockedSpan) => boolean): BlockedSpan | null {
  for (const term of vocabTerms(question)) {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(`${NOT_BEFORE}${escaped}(?![${L}])`, 'i');
    const m = re.exec(transcript);
    if (!m || m.index === undefined) continue;
    const span = { start: m.index, end: m.index + m[0].length };
    if (clean(span)) return span;
  }
  return null;
}

/**
 * Up to MAX_STRENGTHS quoted strengths, strongest first, none overlapping a
 * blocked span or each other.
 */
export function findOfflineStrengths(transcript: string, blocked: BlockedSpan[], question?: Question): OfflineStrength[] {
  const found: OfflineStrength[] = [];
  for (const kind of ORDER) {
    if (found.length >= MAX_STRENGTHS) break;
    const taken = [...blocked, ...found];
    const span = findSpan(transcript, kind, taken, question);
    if (!span) continue;
    const quote = transcript.slice(span.start, span.end).trim();
    if (!quote) continue;
    found.push({ kind, quote, why: STRENGTH_WHY[kind], start: span.start, end: span.end });
  }
  return found;
}
