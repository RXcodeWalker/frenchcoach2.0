/**
 * The Role-play drill's offline answer check — pure, no network, no AI.
 *
 * A 0520 role-play answer is worth full marks when it communicates every part
 * of the task fully and correctly, however short (TN p.6, PRINCIPLE_RP_CONCISE
 * in src/domain/igcse/canonical.ts): « Au musée. » is a complete answer to
 * « Qu'est-ce que vous avez visité ? ». So the drill does not coach length,
 * vocabulary or style; it answers three plain questions about one reply:
 *
 *  1. Was anything heard?
 *  2. Which of the task's parts (`StoryTask.parts`) did it communicate?
 *  3. Did it use the wrong time frame for a question that demands a past or a
 *     future one?
 *
 * and hands back the task's own short model answer. It never produces a mark,
 * band, grade or score — only what was covered — and it must not be wired to a
 * model call (CLAUDE.md, "Role-play drill"). It sits outside src/domain/igcse/
 * and nothing in the scored pipeline may import it.
 *
 * Matching is accent- and case-insensitive (the matcher in
 * features/rolePlayDrill/answerKey.ts normalises both sides).
 */
import { checkAnswerParts, normalizeAnswer, type AnswerPart } from '../../features/rolePlayDrill/answerKey';

export type DrillTimeFrame = 'past' | 'present' | 'future';

/** The slice of a StoryTask the check reads. */
export interface CheckableTask {
  parts: readonly AnswerPart[];
  /** The time frame the question demands, when it demands one. */
  timeFrame?: DrillTimeFrame;
  /** The shortest answer that communicates every part (the model the card shows). */
  modelShort: string;
}

export interface TimeFrameIssue {
  /** What the question demands. Only past and future are ever checked. */
  expected: 'past' | 'future';
  /** The frame the answer's verbs are clearly in instead. */
  found: DrillTimeFrame;
}

export interface AnswerCheck {
  /** Something that can be read as an answer was said (not silence, noise or a filler). */
  heard: boolean;
  /** One entry per part, in the task's order — for a ✓/✗ list. */
  parts: { label: string; found: boolean }[];
  partsCovered: string[];
  partsMissing: string[];
  /** Every part was communicated (so `heard`, too). */
  complete: boolean;
  timeFrameIssue?: TimeFrameIssue;
  /** At most one short coaching line (English); absent when nothing needs saying. */
  tip?: string;
  modelShort: string;
}

/** Sounds a recogniser or a hesitating candidate produces that are not an answer. */
const FILLERS = new Set(['euh', 'heu', 'hum', 'hmm', 'hm', 'mm', 'mmm', 'uh', 'um', 'ah', 'eh', 'oh', 'ben', 'bah']);

function wordsOf(transcript: string): string[] {
  return normalizeAnswer(transcript).split(' ').filter(Boolean);
}

/**
 * True when the transcript holds nothing that can be read as an answer: empty,
 * punctuation only, or nothing but hesitation sounds. A single real word
 * (« Oui. », « Demain. ») is an answer.
 */
export function isSilentAnswer(transcript: string): boolean {
  return wordsOf(transcript).every((w) => FILLERS.has(w));
}

/**
 * Silent tries allowed on one exchange. The first nothing-heard answer is not
 * recorded: the examiner asks again (« Pardon ? »). The second moves on and the
 * exchange counts as missed.
 */
export const MAX_SILENT_TRIES = 2;

/** What the examiner says when an answer was not heard: « Pardon ? » and the question again. */
export function repeatLine(promptFr: string): string {
  return `Pardon ? ${promptFr}`;
}

// ── Time frame ──────────────────────────────────────────────────────────────
// Heuristics over the answer. They are deliberately conservative: a frame is
// reported only when the answer has a verb clearly in another frame and none
// in the demanded one, so an elliptical answer (« Le musée. »), a verb the
// patterns cannot read, or a recogniser that dropped its accents never raises
// a false alarm — the worst case is a missed flag.
//
// The text keeps its accents here (unlike the part matcher): « à » and « a »
// differ, and without the difference « À Nice. » would read as « il a Nice ».

const WORD = '[a-zà-ÿ0-9]+';

/** Lower case, punctuation and apostrophes to single spaces, accents kept. */
function lightNormalize(text: string): string {
  return text
    .normalize('NFC')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/[^a-zà-ÿ0-9]+/g, ' ')
    .trim();
}

const AUX_AVOIR = '(?:ai|as|a|avons|avez|ont)';
const AUX_ETRE = '(?:suis|es|est|sommes|êtes|etes|sont)';
/** Between the auxiliary and the participle: « j'ai déjà visité », « je n'ai pas vu ». */
const BETWEEN = '(?:(?:déjà|deja|jamais|pas|bien|aussi|vraiment|beaucoup|enfin|toujours|encore) )?';

/** Participles that do not end in -é (« du » and « eu » are left out: « il a du pain »). */
const IRREGULAR_PARTICIPLES = [
  'fait', 'pris', 'vu', 'été', 'ete', 'mis', 'dit', 'bu', 'lu', 'écrit', 'ecrit', 'ouvert', 'offert', 'découvert', 'decouvert',
  'vendu', 'perdu', 'voulu', 'pu', 'reçu', 'recu', 'appris', 'compris', 'conduit', 'connu', 'vécu', 'vecu', 'suivi',
  'fini', 'choisi', 'dormi', 'servi', 'réussi', 'reussi', 'attendu', 'entendu', 'rendu', 'répondu', 'repondu', 'tenu',
].join('|');

/** Motion verbs and the like that take « être » (accent optional, any agreement). */
const ETRE_PARTICIPLES = [
  'all[ée]', 'venu', 'parti', 'arriv[ée]', 'rest[ée]', 'sorti', 'rentr[ée]', 'tomb[ée]', 'n[ée]', 'mont[ée]', 'descendu',
  'entr[ée]', 'devenu', 'retourn[ée]', 'revenu',
].join('|');

function hasPastMarker(text: string): boolean {
  const avoir = new RegExp(`(?:^| )${AUX_AVOIR} ${BETWEEN}(?:${IRREGULAR_PARTICIPLES}|[a-zà-ÿ]{2,}é(?:e|s|es)?)(?: |$)`);
  const etre = new RegExp(`(?:^| )${AUX_ETRE} ${BETWEEN}(?:${ETRE_PARTICIPLES})(?:e|s|es)?(?: |$)`);
  return avoir.test(text) || etre.test(text) || hasImparfait(text);
}

/** Words in -ait/-aient that are nouns or present forms, not an imparfait. */
const NOT_IMPARFAIT = new Set(['lait', 'souhait', 'trait', 'portrait', 'fait', 'parfait', 'ait']);

/** « c'était », « il y avait », « je jouais »… — never « fait » (present) or « lait » (a noun). */
function hasImparfait(text: string): boolean {
  return text.split(' ').some((w) => (/^[a-zà-ÿ]{2,}ait$/.test(w) || /^[a-zà-ÿ]{2,}aient$/.test(w)) && !NOT_IMPARFAIT.has(w))
    || /(?:^| )(?:étais|etais|avais|étions|etions|avions|étiez|etiez|aviez)(?: |$)/.test(text);
}

function hasFutureMarker(text: string): boolean {
  const notFiller = '(?!bien\\b|mieux\\b|mal\\b)';
  // aller + a word, with its subject (« ça va », « je vais bien » and « comment allez-vous » are not the future)
  if (new RegExp(`(?:^| )(?:je|tu) (?:vais|vas) ${notFiller}${WORD}`).test(text)) return true;
  if (new RegExp(`(?:^| )(?:il|elle|on) va ${notFiller}${WORD}`).test(text)) return true;
  if (new RegExp(`(?:^| )(?:nous allons|vous allez|ils vont|elles vont) ${notFiller}${WORD}`).test(text)) return true;
  // futur simple: the common irregulars, then regular -er stems (« caméra », « opéra » are not verbs)
  if (/(?:^| )(?:ser|aur|ir|fer|viendr|pourr|voudr|verr|devr|saur|faudr|pleuvr|enverr|tiendr|recevr)(?:ai|as|a|ons|ez|ont)(?: |$)/.test(text)) return true;
  return text.split(' ').some((w) => /^[a-zà-ÿ]{3,}(?:erai|eras|erons|erez|eront)$/.test(w) || (/^[a-zà-ÿ]{3,}era$/.test(w) && w !== 'camera' && w !== 'opera'));
}

function timeFrameIssueFor(frame: DrillTimeFrame | undefined, transcript: string): TimeFrameIssue | undefined {
  if (frame !== 'past' && frame !== 'future') return undefined;
  const text = lightNormalize(transcript);
  const past = hasPastMarker(text);
  const future = hasFutureMarker(text);
  if (frame === 'past' && future && !past) return { expected: 'past', found: 'future' };
  if (frame === 'future' && past && !future) return { expected: 'future', found: 'past' };
  return undefined;
}

// ── Tip ─────────────────────────────────────────────────────────────────────

function joinLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? '';
  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function buildTip(check: Pick<AnswerCheck, 'heard' | 'partsMissing' | 'timeFrameIssue'>): string | undefined {
  if (!check.heard) return "Nothing was heard — say your answer again.";
  if (check.partsMissing.length > 0) {
    return `Still to say: ${joinLabels(check.partsMissing)}. A few words is enough.`;
  }
  if (check.timeFrameIssue?.expected === 'past') {
    return 'This question is about the past — use a past tense, like « J’ai visité… » or « C’était… ».';
  }
  if (check.timeFrameIssue?.expected === 'future') {
    return 'This question is about the future — use « Je vais… » and a verb.';
  }
  return undefined;
}

/**
 * Checks one spoken (or typed) reply to a drill task. Pure and total: any
 * string in, an `AnswerCheck` out. Nothing here is a mark.
 */
export function checkAnswer(transcript: string, task: CheckableTask): AnswerCheck {
  const heard = !isSilentAnswer(transcript);
  const { parts } = checkAnswerParts(heard ? transcript : '', task.parts);
  const partsCovered = parts.filter((p) => p.found).map((p) => p.label);
  const partsMissing = parts.filter((p) => !p.found).map((p) => p.label);
  const complete = heard && parts.length > 0 && partsMissing.length === 0;
  const timeFrameIssue = heard ? timeFrameIssueFor(task.timeFrame, transcript) : undefined;
  const tip = buildTip({ heard, partsMissing, timeFrameIssue });
  return {
    heard,
    parts,
    partsCovered,
    partsMissing,
    complete,
    ...(timeFrameIssue ? { timeFrameIssue } : {}),
    ...(tip ? { tip } : {}),
    modelShort: task.modelShort,
  };
}
