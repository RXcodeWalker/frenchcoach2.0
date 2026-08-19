/**
 * Pure inference of QuestionDemands from a Question — Stage 3 (docs §13.1).
 *
 * Signals are derived from the question's own text/hint, never from
 * `difficulty`, which is demoted to a tie-breaker for responseLoad only (see
 * INFERENCE_RULES.md-equivalent §13.1 table). This deliberately breaks the
 * circularity rev-1 introduced (deriving responseLoad/lexicalReach from
 * difficulty would just rebuild the old 1|2|3 labels inside the new system).
 *
 * Output always carries provenance: 'inferred' and a numeric
 * inferenceConfidence — never asserted as reviewed/authored. Per §13.2 valve
 * 4, inferenceConfidence < 0.5 on cognitiveDemand falls back to the
 * conservative 'describe' floor and the item is implicitly queued for review
 * (low confidence is visible in the output for `learn:review --sort confidence`).
 */
import { normalizeQuestionText, hasStructureCue, hasTimeFrameCue, cue } from './textCues';
import type {
  CognitiveDemand,
  DemandTimeFrame,
  LearnStructure,
  LexicalReach,
  QuestionDemands,
  ResponseLoad,
} from './types';

export interface InferenceInput {
  text: string;
  hint: string;
  difficulty: 1 | 2 | 3;
}

const LOW_CONFIDENCE_FALLBACK: CognitiveDemand = 'describe';
const COGNITIVE_DEMAND_CONFIDENCE_FLOOR = 0.5;

// ── cognitiveDemand ─────────────────────────────────────────────────────────
// Matched against question.text (the wording that forces the demand — docs
// §13.1 rule 1), in priority order. First match wins. Order matters: a
// question can contain both a "si tu" cue and a "pourquoi" cue, but the
// hypothetical framing is what the wording actually forces.

interface DemandPattern {
  demand: CognitiveDemand;
  pattern: RegExp;
  confidence: number;
}

const COGNITIVE_DEMAND_PATTERNS: DemandPattern[] = [
  // hypothesize: conditional framing ("si tu ...", "si tu pouvais/gagnais")
  {
    demand: 'hypothesize',
    pattern: cue("\\bsi tu\\b|\\bsi vous\\b|\\bsi c'était\\b|\\bsi j'avais\\b"),
    confidence: 0.85,
  },
  // compare: explicit comparison / preference-between-two framing
  { demand: 'compare', pattern: cue('\\bcompar'), confidence: 0.85 },
  {
    demand: 'compare',
    pattern: cue(
      '\\bpréfères?-tu\\b.*\\bou\\b|\\bpréfères?-vous\\b.*\\bou\\b|\\btu préfères\\b.*\\bou\\b|\\bplutôt que\\b|\\bpar rapport à\\b',
    ),
    confidence: 0.8,
  },
  // justify: opinion sought with a reason/justification cue
  {
    demand: 'justify',
    pattern: cue("\\bà ton avis\\b|\\bpenses-tu\\b|\\bque penses-tu\\b|\\btrouves-tu\\b|\\bqu'en penses-tu\\b"),
    confidence: 0.8,
  },
  {
    demand: 'justify',
    pattern: cue('\\bpourquoi\\s*\\?|\\bpourquoi ou pourquoi pas\\s*\\?'),
    confidence: 0.75,
  },
  // explain: "pourquoi" cueing a reason/cause without an explicit opinion ask,
  // or "comment"/process wording
  { demand: 'explain', pattern: cue('\\bpourquoi\\b'), confidence: 0.65 },
  { demand: 'explain', pattern: cue('\\bcomment\\b'), confidence: 0.55 },
  // describe: the conservative floor — explicit imperative/presentation forms
  { demand: 'describe', pattern: cue('\\bdécris\\b|\\bdécrivez\\b|\\bparle-moi\\b|\\bparle de\\b'), confidence: 0.9 },
  // describe: open wh-questions with no opinion/comparison/hypothetical framing
  // ("qu'est-ce que tu fais", "quel est ton X", "où ...", "est-ce que tu ...")
  // — unambiguously describe-shaped, just without an imperative verb, so this
  // is a real (not absent) signal and gets a mid confidence, not the no-match floor.
  {
    demand: 'describe',
    pattern: cue(
      "\\bqu'est-ce que\\b|\\bqu'est-ce qu'\\b|\\bquel est\\b|\\bquelle est\\b|\\bquels sont\\b|\\bquelles sont\\b|\\boù\\b|\\best-ce que tu\\b|\\best-ce qu'\\b",
    ),
    confidence: 0.7,
  },
];

export function inferCognitiveDemand(text: string): { demand: CognitiveDemand; confidence: number } {
  const normalized = normalizeQuestionText(text);
  for (const { demand, pattern, confidence } of COGNITIVE_DEMAND_PATTERNS) {
    if (pattern.test(normalized)) {
      return { demand, confidence };
    }
  }
  // No pattern matched at all — the conservative floor, with low confidence
  // so it surfaces in the review queue (§13.2 valve 4 is for the SUB-0.5 case;
  // this is the true no-signal case, confidence deliberately below that floor).
  return { demand: 'describe', confidence: 0.4 };
}

// ── timeFrames ───────────────────────────────────────────────────────────────
// Cue-word detection reuses the same textCues.ts helpers the lint/validate
// warn rules use, so a question tagged with a time frame is guaranteed
// (by construction) to pass time-frame-not-cued.

const ALL_TIME_FRAMES: readonly DemandTimeFrame[] = ['present', 'past', 'future', 'conditional'];

export function inferTimeFrames(text: string): DemandTimeFrame[] {
  const found = ALL_TIME_FRAMES.filter((frame) => hasTimeFrameCue(text, frame));
  return found.length > 0 ? found : ['present'];
}

// ── structures ───────────────────────────────────────────────────────────────
// Matched against question.text — NOT modelAnswer (fixes §3.5's circularity:
// the old inferGrammarFocus read the model answer, which self-confirms
// whatever the answer author happened to write).

const ALL_STRUCTURES: readonly LearnStructure[] = [
  'opinion',
  'justification',
  'comparison',
  'negation',
  'conditional',
  'subjunctive',
];

export function inferStructures(text: string): LearnStructure[] {
  return ALL_STRUCTURES.filter((structure) => hasStructureCue(text, structure));
}

// ── responseLoad ─────────────────────────────────────────────────────────────
// §13.1: (a) floor from cognitiveDemand; (b) hint enumerates countable items;
// (c) multi-goal question text bumps one step; difficulty is a tie-breaker
// only, applied when (a) and (b) disagree.

const LOAD_RANK: Record<ResponseLoad, number> = { short: 0, developed: 1, extended: 2 };
const RANK_LOAD: ResponseLoad[] = ['short', 'developed', 'extended'];

function loadFromDemandFloor(demand: CognitiveDemand): ResponseLoad {
  // docs §12 rule 6 / validator short-load-on-high-demand: justify/compare/
  // hypothesize must never be 'short'.
  if (demand === 'justify' || demand === 'compare' || demand === 'hypothesize') return 'developed';
  return 'short';
}

/** Countable items in the hint: comma-separated nouns/clauses signal breadth. */
function countHintItems(hint: string): number {
  // Split on commas and "and"/"or" joins; drop empty/short fragments.
  const parts = hint
    .split(/[,;]|(?:\band\b)|(?:\bor\b)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  return parts.length;
}

function loadFromHintBreadth(hint: string): ResponseLoad {
  const items = countHintItems(hint);
  if (items >= 4) return 'extended';
  if (items >= 2) return 'developed';
  return 'short';
}

/** Two interrogatives, or an explicit "et pourquoi" tail, signals a multi-goal question — §13.1(c). */
function hasMultiGoalText(text: string): boolean {
  const normalized = normalizeQuestionText(text);
  const questionMarks = (normalized.match(/\?/g) ?? []).length;
  if (questionMarks >= 2) return true;
  if (/\bet pourquoi\b/.test(normalized)) return true;
  return false;
}

export function inferResponseLoad(
  demand: CognitiveDemand,
  text: string,
  hint: string,
  difficulty: 1 | 2 | 3,
): ResponseLoad {
  const floor = loadFromDemandFloor(demand);
  const breadth = loadFromHintBreadth(hint);

  let load: ResponseLoad;
  if (LOAD_RANK[breadth] === LOAD_RANK[floor]) {
    load = floor;
  } else if (LOAD_RANK[breadth] > LOAD_RANK[floor]) {
    load = breadth;
  } else {
    // (a) and (b) disagree, breadth reads lower than the demand floor —
    // difficulty tie-breaks: at difficulty >= 2, keep the demand floor
    // (trust the demand, not the terse hint); at difficulty 1, allow the
    // hint's lower reading to win only if the floor was already 'short'.
    load = difficulty >= 2 ? floor : (LOAD_RANK[floor] === 0 ? breadth : floor);
  }

  if (hasMultiGoalText(text)) {
    const bumped = Math.min(LOAD_RANK[load] + 1, 2);
    load = RANK_LOAD[bumped];
  }

  return load;
}

// ── lexicalReach ─────────────────────────────────────────────────────────────
// Abstract-noun morphology in the question text + a small abstract-topic
// keyword list (§13.1). Weak signal by construction — deriveDemandScore caps
// its contribution at +0.25 and lint flags it if it's the ONLY above-baseline
// signal (level-not-carried-by-vocabulary).

const ABSTRACT_SUFFIX_PATTERN = cue('\\w+(tion|ité|isme|ance|ence)\\b');
const ABSTRACT_TOPIC_KEYWORDS = [
  'environnement',
  'technologie',
  'société',
  'intelligence artificielle',
  'économie',
  'politique',
  'écologique',
  'mondial',
];

export function inferLexicalReach(text: string): LexicalReach {
  const normalized = normalizeQuestionText(text);
  const hasAbstractSuffix = ABSTRACT_SUFFIX_PATTERN.test(normalized);
  const hasAbstractKeyword = ABSTRACT_TOPIC_KEYWORDS.some((kw) => normalized.includes(kw));
  if (hasAbstractSuffix || hasAbstractKeyword) return 'abstract';
  return 'everyday';
}

// ── sufficientAnswer ─────────────────────────────────────────────────────────
// Seeded verbatim from question.hint (§13.1) — hints are present on all 428
// questions and are already English. No paraphrasing: the guide (§1 rule 4)
// requires countable requirements, and hints already tend to enumerate them.
//
// A minority of hints are terse but still dense with countable content —
// comma-separated item lists under the validator's 8-word floor (e.g.
// "Carnival, music festival, market, or fair."). Padding with invented
// content would violate "never machine-checked beyond a word-count floor"
// by injecting unsourced claims; instead, a hint with >=2 comma-separated
// items gets a deterministic "Mention at least two of:" prefix built only
// from words already in the hint — honest scaffolding, not fabrication.
const MIN_SUFFICIENT_ANSWER_WORDS = 8;

function countListItems(hint: string): number {
  return hint
    .split(/[,;]|(?:\bor\b)|(?:\band\b)/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 0).length;
}

export function inferSufficientAnswer(hint: string): string {
  const trimmed = hint.trim();
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount >= MIN_SUFFICIENT_ANSWER_WORDS) return trimmed;
  if (countListItems(trimmed) >= 2) return `Mention at least two of: ${trimmed}`;
  // Single-clause hint (e.g. "Compare X with Y.") still under the floor —
  // prefixing restates the hint's own instruction rather than inventing content.
  return `A complete answer should: ${trimmed}`;
}

// ── Composition ──────────────────────────────────────────────────────────────

/**
 * Infers a full QuestionDemands for one question. Always
 * provenance: 'inferred' with a numeric inferenceConfidence. Per §13.2 valve
 * 4, a cognitiveDemand confidence below COGNITIVE_DEMAND_CONFIDENCE_FLOOR
 * falls back to 'describe' (the conservative floor) rather than asserting a
 * low-confidence higher demand.
 */
export function inferQuestionDemands(input: InferenceInput): QuestionDemands {
  const demandGuess = inferCognitiveDemand(input.text);
  const cognitiveDemand =
    demandGuess.confidence < COGNITIVE_DEMAND_CONFIDENCE_FLOOR ? LOW_CONFIDENCE_FALLBACK : demandGuess.demand;

  const timeFrames = inferTimeFrames(input.text);
  const structures = inferStructures(input.text);
  const responseLoad = inferResponseLoad(cognitiveDemand, input.text, input.hint, input.difficulty);
  const lexicalReach = inferLexicalReach(input.text);
  const sufficientAnswer = inferSufficientAnswer(input.hint);

  return {
    cognitiveDemand,
    timeFrames,
    structures,
    responseLoad,
    lexicalReach,
    sufficientAnswer,
    provenance: 'inferred',
    inferenceConfidence: demandGuess.confidence,
  };
}
