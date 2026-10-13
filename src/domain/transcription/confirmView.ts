/**
 * The Learn "did we hear you right?" panel's data, without any React.
 *
 * Learn gets two transcripts of one answer: Whisper (primary) and Chrome's live
 * captions (second opinion). This builds what the panel shows — the primary
 * text in its context-consistent spelling (Category A, the same respeller the
 * exam will use), with the words the recognisers disagree on, and the Category
 * B words, marked so the learner can swap one for what the other recogniser
 * heard. There is no free-text editing: a swap is the only way the text
 * changes, and the result is flagged `edited`.
 */

import { respell } from '../igcse/stt/homophones/respell';
import { matchCase, normalizeWord, tokenize, type Token } from '../igcse/stt/homophones/text';
import { alignRecognisers, type AlignmentResult, type AmbiguousSpanKind } from './alignRecognisers';

export type RecognitionSource = 'whisper' | 'chrome';

/** Why Learn is showing Chrome's text instead of Whisper's. */
export type RecognitionFallbackReason = 'asr-failed' | 'asr-timeout' | 'no-audio' | 'asr-empty' | 'prompt-echo';

export interface Recognition {
  /** Whisper's text, or null when it could not be used (see `fallbackReason`). */
  readonly whisperText: string | null;
  /** Chrome's live text for the same answer. */
  readonly chromeText: string;
  readonly fallbackReason?: RecognitionFallbackReason;
}

export interface ConfirmPiece {
  /** One whitespace-separated token of the displayed text, punctuation included. */
  readonly text: string;
  /** The underlined span this piece belongs to, or null. */
  readonly spanId: number | null;
}

export interface UnderlinedSpan {
  readonly id: number;
  readonly kind: AmbiguousSpanKind;
  readonly origin: 'disagreement' | 'single-recogniser';
  /** Piece range `[start, end)`. */
  readonly start: number;
  readonly end: number;
  /** Words as displayed (without edge punctuation). */
  readonly shownWords: readonly string[];
  /** What the learner may swap in; empty means only "re-record" is on offer. */
  readonly alternatives: readonly string[];
}

export interface ConfirmModel {
  readonly source: RecognitionSource;
  readonly fallbackReason?: RecognitionFallbackReason;
  /** The primary recogniser's own text, untouched. */
  readonly primaryText: string;
  /** The primary text in context-consistent (Category A) spelling: what is shown and, unless swapped, what feedback uses. */
  readonly displayText: string;
  readonly pieces: readonly ConfirmPiece[];
  readonly spans: readonly UnderlinedSpan[];
  readonly singleRecogniser: boolean;
  readonly alignment: AlignmentResult;
}

const PROMPT_MAX_CHARS = 1200;

/** Whisper's context prompt: the question first, then earlier confirmed answers (oldest first), newest kept when space runs out. */
export function buildLearnPrompt(question: string, earlierAnswers: readonly string[]): string {
  const q = question.trim().slice(0, PROMPT_MAX_CHARS);
  const kept: string[] = [];
  let used = q.length;
  for (let i = earlierAnswers.length - 1; i >= 0; i--) {
    const a = earlierAnswers[i].trim();
    if (!a) continue;
    if (used + 1 + a.length > PROMPT_MAX_CHARS) break;
    kept.unshift(a);
    used += 1 + a.length;
  }
  return [q, ...kept].join('\n');
}

function words(text: string): string {
  return tokenize(text)
    .map((t) => t.lower)
    .filter(Boolean)
    .join(' ');
}

/** Whisper sometimes returns its own prompt when the audio holds no speech. */
export function isPromptEcho(whisperText: string, question: string): boolean {
  const w = words(whisperText);
  return w.length > 0 && w === words(question);
}

function wordTokenIndexes(raw: readonly Token[]): number[] {
  const out: number[] = [];
  raw.forEach((t, i) => {
    if (t.lower) out.push(i);
  });
  return out;
}

export function buildConfirmModel(recognition: Recognition): ConfirmModel {
  const usingWhisper = recognition.whisperText !== null && recognition.whisperText.trim() !== '';
  const primaryText = usingWhisper ? (recognition.whisperText as string).trim() : recognition.chromeText.trim();
  const secondaryText = usingWhisper ? recognition.chromeText : '';
  const displayText = respell(primaryText).text;

  const alignment = alignRecognisers(displayText, secondaryText);
  const raw = tokenize(displayText);
  const wordAt = wordTokenIndexes(raw);

  const spans: UnderlinedSpan[] = [];
  const spanOfPiece: Array<number | null> = raw.map(() => null);
  for (const s of alignment.spans) {
    // A word only the other recogniser heard has nothing to underline.
    if (s.primaryEnd <= s.primaryStart) continue;
    const id = spans.length;
    const start = wordAt[s.primaryStart];
    const end = wordAt[s.primaryEnd - 1] + 1;
    for (let i = start; i < end; i++) spanOfPiece[i] = id;
    spans.push({
      id,
      kind: s.kind,
      origin: s.origin,
      start,
      end,
      shownWords: s.primaryWords,
      alternatives: s.alternatives,
    });
  }

  return {
    source: usingWhisper ? 'whisper' : 'chrome',
    fallbackReason: usingWhisper ? undefined : recognition.fallbackReason,
    primaryText,
    displayText,
    pieces: raw.map((t, i) => ({ text: t.raw, spanId: spanOfPiece[i] })),
    spans,
    singleRecogniser: alignment.singleRecogniser,
    alignment,
  };
}

/**
 * The text the learner confirmed: the display text with each chosen swap
 * applied. `choices` maps a span id to the replacement words. `edited` is true
 * when any swap actually changed the text.
 */
export function applyChoices(
  model: ConfirmModel,
  choices: Readonly<Record<number, string>>,
): { text: string; edited: boolean } {
  const raw = tokenize(model.displayText);
  const out: string[] = [];
  let edited = false;
  let i = 0;
  while (i < raw.length) {
    const spanId = model.pieces[i]?.spanId ?? null;
    const span = spanId === null ? undefined : model.spans[spanId];
    const choice = span ? choices[span.id] : undefined;
    if (span && choice !== undefined && span.start === i) {
      const first = raw[span.start];
      const last = raw[span.end - 1];
      const replacement = matchCase(first.core, choice.trim());
      if (normalizeWord(replacement) !== normalizeWord(raw.slice(span.start, span.end).map((t) => t.core).join(' '))) {
        edited = true;
      }
      out.push(`${first.lead}${replacement}${last.trail}`);
      i = span.end;
      continue;
    }
    out.push(raw[i].raw);
    i++;
  }
  return { text: edited ? out.join(' ') : model.displayText, edited };
}
