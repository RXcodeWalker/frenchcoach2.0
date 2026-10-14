/**
 * Junior answer matcher (junior-track §6): what was heard against the target
 * sentence the kid built by picking a picture. Pure, deterministic, instant and
 * free — no LLM call per turn.
 *
 * The key words of a frame are the pattern's core words (« j'aime ») plus the
 * chosen word (« bleu », or an accepted variant: « verte » for « vert », « 10 »
 * for « dix »). The article is not a key word, so « J'aime la bleu » still counts
 * — this is speaking practice, not a grammar check. Across all frames of a turn:
 *  - `got`    — every key word heard;
 *  - `almost` — at least one key word heard;
 *  - `none`   — nothing usable heard.
 *
 * Matching is on the French form only: « blue », « blou », « red », « green » are
 * never « bleu », « rouge », « vert ». Accents and case are folded (« ete » =
 * « été »), and elided clitics are split on both sides (« l'été » → « l' été »,
 * « j'aime » → « j' aime ») so « J'aime l'été » hears « été », and a recogniser
 * that drops the apostrophe (« j aime ») still hears « j'aime ».
 *
 * Whole-word matching reuses `phraseHeard` from Learn's fixMatch.ts (the same
 * "report what was heard, never a verdict" approach as compareRetake.ts). The
 * result lists the AUTHORED forms of the key words heard and missed (chips for
 * the Postcard), never the raw transcript.
 */
import type { JuniorPattern, JuniorQuestion, JuniorSlotKind, JuniorSlotOption } from '../../data/junior/types';
import { phraseHeard } from '../learn/feedback/fixMatch';
import type { MatchOutcome } from './types';

/** One picture the kid may have said, with every form the matcher accepts for it. */
export interface SlotAlternative {
  optionId: string;
  /** Display form (the authored word, never the transcript). */
  word: string;
  forms: readonly string[];
}

/** What one frame of a turn must hear. */
export interface FrameTarget {
  patternId: string;
  coreWords: readonly string[];
  /** Echo/Frame: the one chosen picture. Free: every picture of the theme's vocabulary (any one counts). */
  slot: readonly SlotAlternative[];
}

export interface FrameMatch {
  outcome: MatchOutcome;
  /** Authored key words heard, in sentence-key order (core words, then the chosen word). */
  heard: string[];
  /** Authored key words not heard. In the Free step an unheard slot has no one word to name, so it is left out. */
  missing: string[];
  /** The picture whose word was heard, or null. */
  slotOptionId: string | null;
}

export interface MatchResult {
  outcome: MatchOutcome;
  frames: FrameMatch[];
  /** Every authored key word heard across the turn's frames. */
  heard: string[];
}

const APOSTROPHES = /[‘’´`ʼ]/g;
/** An elided clitic at the start of a word (« l' », « j' », « c' », « qu' »…). */
const ELIDED_CLITIC = /(?<!\p{L})(qu|[cdjlmnst])'/giu;

/** Split elided clitics off so « l'été » contains the word « été ». Applied to both sides. */
function splitElision(text: string): string {
  return text.replace(APOSTROPHES, "'").replace(ELIDED_CLITIC, "$1' ");
}

function heardWord(transcript: string, form: string): boolean {
  const key = splitElision(form);
  return key.trim().length > 0 && phraseHeard(transcript, key);
}

/**
 * Every form the matcher accepts for a picture: the word, its authored variants,
 * and — for a number slot — its digits (Batch 1's `num()` stores them as `en`).
 */
export function optionForms(option: JuniorSlotOption, slotKind: JuniorSlotKind): string[] {
  const forms = [option.word, ...option.variants];
  if (slotKind === 'number' && /^\d+$/.test(option.en)) forms.push(option.en);
  return forms;
}

function alternative(option: JuniorSlotOption, slotKind: JuniorSlotKind): SlotAlternative {
  return { optionId: option.id, word: option.word, forms: optionForms(option, slotKind) };
}

/** Echo and Frame steps: the target is the sentence the kid built from their chosen picture. */
export function frameTarget(pattern: JuniorPattern, option: JuniorSlotOption): FrameTarget {
  return { patternId: pattern.id, coreWords: pattern.coreWords, slot: [alternative(option, pattern.slotKind)] };
}

/** Free step: the pattern with ANY word of the theme's vocabulary counts (junior-track §6). */
export function freeFrameTarget(pattern: JuniorPattern, vocabulary: readonly JuniorSlotOption[]): FrameTarget {
  return { patternId: pattern.id, coreWords: pattern.coreWords, slot: vocabulary.map((o) => alternative(o, pattern.slotKind)) };
}

/** Every picture offered anywhere in a theme, once each (by id and word). */
export function themeVocabulary(questions: readonly JuniorQuestion[], themeId: string): JuniorSlotOption[] {
  const seen = new Set<string>();
  const out: JuniorSlotOption[] = [];
  for (const q of questions) {
    if (q.themeId !== themeId) continue;
    for (const f of q.frames) {
      for (const o of f.slotOptions) {
        const key = `${o.id}|${o.word}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(o);
      }
    }
  }
  return out;
}

function outcomeOf(heard: number, total: number): MatchOutcome {
  if (total > 0 && heard === total) return 'got';
  return heard > 0 ? 'almost' : 'none';
}

function matchFrame(transcript: string, target: FrameTarget): FrameMatch {
  const heard: string[] = [];
  const missing: string[] = [];
  for (const core of target.coreWords) (heardWord(transcript, core) ? heard : missing).push(core);

  const slotHit = target.slot.find((alt) => alt.forms.some((f) => heardWord(transcript, f))) ?? null;
  if (slotHit) heard.push(slotHit.word);
  // Free step: there is no one word to name as missing, but the slot still counts as a key.
  else if (target.slot.length === 1) missing.push(target.slot[0].word);

  return {
    outcome: outcomeOf(heard.length, target.coreWords.length + 1),
    heard,
    missing,
    slotOptionId: slotHit?.optionId ?? null,
  };
}

/** Transcript + the turn's 1–2 frame targets → got | almost | none, plus the key words heard. */
export function matchAnswer(transcript: string, targets: readonly FrameTarget[]): MatchResult {
  const text = splitElision(transcript ?? '');
  if (!/[\p{L}\p{N}]/u.test(text)) {
    const frames = targets.map((t) => matchFrame('', t));
    return { outcome: 'none', frames, heard: [] };
  }
  const frames = targets.map((t) => matchFrame(text, t));
  const heardCount = frames.reduce((n, f) => n + f.heard.length, 0);
  const total = targets.reduce((n, t) => n + t.coreWords.length + 1, 0);
  return { outcome: outcomeOf(heardCount, total), frames, heard: frames.flatMap((f) => f.heard) };
}
