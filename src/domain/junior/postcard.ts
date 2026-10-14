/**
 * The end-of-mission Postcard (junior-track §9): exactly 3 items, at most 4
 * lines, no marks, scores or numbers.
 *
 *  1. ⭐ "You said it great" — the TARGET sentence of a "got it" turn (never the
 *     raw transcript; JuniorTurnResult has no transcript field) + the kid's own
 *     recording.
 *  2. 🎯 "Practise this one" — an "almost" sentence, with the key words that were
 *     heard as chips (v1 "listen and compare"; no pronunciation verdict).
 *  3. 🏅 The sticker (computed by rewards.ts, which never sees outcomes).
 *
 * Edge cases (§9):
 *  - no "got it" turn      → ⭐ is "Great try!" with the best "almost" turn;
 *  - every turn "got it"   → 🎯 is "Challenge: say it without help", on the
 *                            mission's hardest pattern;
 *  - every turn "none"     → "You finished!" + one sentence to listen to + the
 *                            sticker. Never empty, never apologetic.
 *
 * Choices this file makes where the spec is silent:
 *  - ⭐ "You said it great" is the "got it" turn with the longest target sentence
 *    (latest on a tie); "Great try!" is the "almost" turn with the most key words
 *    heard (earliest on a tie).
 *  - 🎯 is the first "almost" turn not already on the ⭐; when there is none but
 *    some turn was "none", it is the first "none" turn (practising it is exactly
 *    what helps). The Challenge is only for a mission with no "almost" and no
 *    "none" turn.
 *  - The "hardest pattern" is the frame played with the most help (lowest scaffold
 *    step), the longest sentence on a tie.
 *
 * Pure. The « Et toi ? » and warm-up turns are not question turns and are not passed in.
 */
import type { JuniorSticker } from '../../data/junior/types';
import type { JuniorTurnFrame, JuniorTurnResult, ScaffoldStep } from './types';

export type PostcardItem =
  | { kind: 'saidGreat'; icon: '⭐'; label: 'You said it great'; sentence: string; recordingId: string | null }
  | { kind: 'greatTry'; icon: '⭐'; label: 'Great try!'; sentence: string; recordingId: string | null }
  | { kind: 'finished'; icon: '🎉'; label: 'You finished!' }
  | { kind: 'practise'; icon: '🎯'; label: 'Practise this one'; sentence: string; heard: readonly string[]; recordingId: string | null }
  | { kind: 'challenge'; icon: '🎯'; label: 'Challenge: say it without help'; sentence: string; patternId: string }
  | { kind: 'listen'; icon: '🔊'; label: 'Listen to Léo'; sentence: string }
  | { kind: 'sticker'; icon: '🏅'; label: 'New sticker'; sticker: JuniorSticker; gold: boolean };

export interface Postcard {
  /** Exactly 3: ⭐ (or 🎉), 🎯 (or 🔊), 🏅. */
  items: [PostcardItem, PostcardItem, PostcardItem];
}

export interface PostcardReward {
  sticker: JuniorSticker;
  gold: boolean;
}

/** The Postcard never shows more than this many lines (§9). */
export const MAX_POSTCARD_LINES = 4;

const STEP_HELP: Record<ScaffoldStep, number> = { echo: 0, frame: 1, free: 2 };

const sentenceOf = (turn: JuniorTurnResult): string => turn.frames.map((f) => f.sentence).join(' ');
const wordCount = (s: string): number => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

function hardestFrame(turns: readonly JuniorTurnResult[]): JuniorTurnFrame {
  let best: JuniorTurnFrame | null = null;
  for (const t of turns) {
    for (const f of t.frames) {
      if (
        !best ||
        STEP_HELP[f.step] < STEP_HELP[best.step] ||
        (STEP_HELP[f.step] === STEP_HELP[best.step] && wordCount(f.sentence) > wordCount(best.sentence))
      ) {
        best = f;
      }
    }
  }
  if (!best) throw new Error('A Junior Postcard needs at least one question turn with a frame');
  return best;
}

export function buildPostcard(turns: readonly JuniorTurnResult[], reward: PostcardReward): Postcard {
  if (turns.length === 0) throw new Error('A Junior Postcard needs at least one question turn');
  const sticker: PostcardItem = { kind: 'sticker', icon: '🏅', label: 'New sticker', sticker: reward.sticker, gold: reward.gold };

  const got = turns.filter((t) => t.outcome === 'got');
  const almost = turns.filter((t) => t.outcome === 'almost');
  const none = turns.filter((t) => t.outcome === 'none');

  if (got.length === 0 && almost.length === 0) {
    return {
      items: [
        { kind: 'finished', icon: '🎉', label: 'You finished!' },
        { kind: 'listen', icon: '🔊', label: 'Listen to Léo', sentence: sentenceOf(turns[0]) },
        sticker,
      ],
    };
  }

  let starTurn: JuniorTurnResult;
  let star: PostcardItem;
  if (got.length > 0) {
    starTurn = got.reduce((best, t) => (wordCount(sentenceOf(t)) >= wordCount(sentenceOf(best)) ? t : best));
    star = { kind: 'saidGreat', icon: '⭐', label: 'You said it great', sentence: sentenceOf(starTurn), recordingId: starTurn.recordingId };
  } else {
    starTurn = almost.reduce((best, t) => (t.heard.length > best.heard.length ? t : best));
    star = { kind: 'greatTry', icon: '⭐', label: 'Great try!', sentence: sentenceOf(starTurn), recordingId: starTurn.recordingId };
  }

  const practiseTurn = almost.find((t) => t !== starTurn) ?? none[0];
  const target: PostcardItem = practiseTurn
    ? {
        kind: 'practise',
        icon: '🎯',
        label: 'Practise this one',
        sentence: sentenceOf(practiseTurn),
        heard: practiseTurn.heard,
        recordingId: practiseTurn.recordingId,
      }
    : (() => {
        const frame = hardestFrame(turns);
        return { kind: 'challenge', icon: '🎯', label: 'Challenge: say it without help', sentence: frame.sentence, patternId: frame.patternId } as const;
      })();

  return { items: [star, target, sticker] };
}

/** The Postcard's text, one line per item, exactly as the kid sees it. */
export function postcardLines(postcard: Postcard): string[] {
  return postcard.items.map((item) => {
    switch (item.kind) {
      case 'finished':
        return `${item.icon} ${item.label}`;
      case 'sticker':
        return `${item.icon} ${item.label}: ${item.sticker.emoji} ${item.gold ? 'Gold ' : ''}${item.sticker.name}`;
      default:
        return `${item.icon} ${item.label}: ${item.sentence}`;
    }
  });
}
