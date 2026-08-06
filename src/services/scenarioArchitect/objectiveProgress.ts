/**
 * Scenario Architect — real objective completion (MH1).
 *
 * Priority when resolving progress after a roleplay turn:
 *  1. API `completed_objectives` (0-based indices) when present and valid
 *  2. Content-based inference from what the student actually said
 *  3. `is_done` → mark every remaining objective complete
 *
 * Never advances objectives from turn count alone.
 */

export interface ObjectiveTurnSignal {
  is_done: boolean;
  /** Cumulative 0-based indices of objectives completed so far, if the API provides them. */
  completed_objectives?: number[] | null;
}

export interface KeyVocabItem {
  fr: string;
  en: string;
}

export interface ResolveObjectiveProgressInput {
  objectives: string[];
  previouslyCompleted: number[];
  studentUtterances: string[];
  turn: ObjectiveTurnSignal;
  keyVocab?: KeyVocabItem[];
}

export interface ResolveObjectiveProgressResult {
  completed: number[];
  newlyCompleted: number[];
}

const EN_STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'to', 'for', 'of', 'in', 'on', 'at', 'by',
  'your', 'you', 'that', 'this', 'with', 'from', 'about', 'into', 'if', 'can',
  'could', 'would', 'should', 'must', 'need', 'needs', 'ask', 'asks', 'asking',
  'say', 'says', 'tell', 'explain', 'order', 'buy', 'get', 'make', 'give',
  'person', 'someone', 'them', 'their', 'there', 'here', 'please', 'politely',
  'clearly', 'one', 'some', 'any', 'what', 'when', 'where', 'how', 'why',
  'have', 'has', 'been', 'being', 'be', 'is', 'are', 'was', 'were', 'do', 'does',
]);

/**
 * Speech-act patterns: English objective cue → French evidence in the transcript.
 * `requiresContent`: when true and the objective also has content nouns (e.g. "Order a croissant"),
 * both the speech act and a content hit are required. Standalone acts (greet, thank, ask price)
 * complete on evidence alone.
 */
const SPEECH_ACTS: { objectiveCue: RegExp; evidence: RegExp[]; requiresContent: boolean }[] = [
  {
    objectiveCue: /\b(greet|greeting|hello|say hi|introduce yourself)\b/i,
    evidence: [/\bbonjour\b/, /\bsalut\b/, /\bbonsoir\b/, /\bbonne\s+journee\b/, /\ballo\b/],
    requiresContent: false,
  },
  {
    objectiveCue: /\b(thank|thanks|express gratitude)\b/i,
    evidence: [/\bmerci\b/, /\bje\s+vous\s+remercie\b/, /\bje\s+te\s+remercie\b/],
    requiresContent: false,
  },
  {
    objectiveCue: /\b(apolog|sorry|excuse)\b/i,
    evidence: [/\bdesole\b/, /\bpardon\b/, /\bexcusez?[-\s]?moi\b/, /\bje\s+m[' ]excuse\b/],
    requiresContent: false,
  },
  {
    objectiveCue: /\b(ask\b.*\b(price|cost)|how much|find out (the )?price)\b/i,
    evidence: [/\bprix\b/, /\bcombien\b/, /\bcout(e|ent|er)?\b/, /\bca\s+fait\b/, /\bca\s+coute\b/],
    requiresContent: false,
  },
  {
    objectiveCue: /\b(pay|payment|bill|addition)\b/i,
    evidence: [
      /\bpayer\b/, /\bje\s+(vais\s+)?payer\b/, /\baddition\b/, /\bfacture\b/,
      /\bcarte\b/, /\bespeces\b/, /\ben\s+liquide\b/, /\bplus\s+tard\b/,
    ],
    requiresContent: false,
  },
  {
    objectiveCue: /\b(order|buy|purchase)\b/i,
    evidence: [
      /\bje\s+voudrais\b/, /\bj[' ]aimerais\b/, /\bje\s+prends\b/, /\bje\s+vais\s+prendre\b/,
      /\bpourrais?[-\s]je\s+(avoir|prendre)\b/, /\best[-\s]ce\s+que\s+je\s+(peux|pourrais)\s+(avoir|prendre)\b/,
      /\bje\s+cherche\b/, /\bil\s+me\s+faut\b/,
    ],
    requiresContent: true,
  },
  {
    objectiveCue: /\b(allerg|dietary|intoleran)\b/i,
    evidence: [/\ballergi(que|e)\b/, /\bintoleran/, /\bsans\s+\w+/, /\bje\s+ne\s+peux\s+pas\b/],
    requiresContent: false,
  },
  {
    objectiveCue: /\b(direction|where|lost|find (the )?way|how to get)\b/i,
    evidence: [/\bou\s+est\b/, /\bou\s+sont\b/, /\bcomment\s+(aller|y\s+aller)\b/, /\bje\s+suis\s+perdu/, /\ba\s+cote\b/],
    requiresContent: false,
  },
  {
    objectiveCue: /\b(explain|tell .+ that|mention|describe|say that)\b/i,
    evidence: [
      /\bje\s+(vous\s+|t[' ])?(explique|dis|precise)\b/, /\bc[' ]est\s+(parce\s+que|que)\b/,
      /\bj[' ]ai\b/, /\bje\s+suis\b/, /\bil\s+y\s+a\b/, /\bparce\s+que\b/, /\bj[' ]ai\s+oublie\b/,
    ],
    requiresContent: true,
  },
  {
    objectiveCue: /\b(ask|question|inquire|find out)\b/i,
    evidence: [
      /\?/, /\best[-\s]ce\s+que\b/, /\bpuis[-\s]je\b/, /\bpourriez[-\s]vous\b/,
      /\bavez[-\s]vous\b/, /\by\s+a[-\s]t[-\s]il\b/, /\bou\b/, /\bquand\b/, /\bcomment\b/, /\bpourquoi\b/,
    ],
    requiresContent: false,
  },
];

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]/g, "'")
    .replace(/[^\w\s'?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function uniqueSorted(indices: number[]): number[] {
  return [...new Set(indices)].filter(i => Number.isInteger(i) && i >= 0).sort((a, b) => a - b);
}

/** Validate API indices against the objective list length. */
export function sanitizeCompletedObjectives(
  raw: unknown,
  objectiveCount: number,
): number[] | null {
  if (!Array.isArray(raw)) return null;
  const indices = raw
    .map(v => (typeof v === 'number' ? v : Number(v)))
    .filter(n => Number.isInteger(n) && n >= 0 && n < objectiveCount);
  return uniqueSorted(indices);
}

function extractContentKeywords(objective: string): string[] {
  const normalized = normalizeText(objective);
  return normalized
    .split(/\s+/)
    .map(w => w.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ''))
    .filter(w => w.length >= 4 && !EN_STOPWORDS.has(w));
}

function vocabFrForEnglish(enWord: string, keyVocab: KeyVocabItem[]): string[] {
  const needle = normalizeText(enWord);
  const hits: string[] = [];
  for (const item of keyVocab) {
    const en = normalizeText(item.en);
    if (en === needle || en.includes(needle) || needle.includes(en)) {
      hits.push(normalizeText(item.fr));
    }
  }
  return hits;
}

function hasEvidence(haystack: string, patterns: RegExp[]): boolean {
  return patterns.some(re => re.test(haystack));
}

/**
 * Content-based: which objectives look accomplished given student French so far.
 * Conservative — requires speech-act and/or scenario vocab evidence, not turn count.
 */
export function inferCompletedObjectivesFromContent(
  objectives: string[],
  studentUtterances: string[],
  keyVocab: KeyVocabItem[] = [],
): number[] {
  const corpus = normalizeText(studentUtterances.filter(Boolean).join(' \n '));
  if (!corpus || objectives.length === 0) return [];

  const completed: number[] = [];

  objectives.forEach((objective, index) => {
    if (objectiveSatisfiedByContent(objective, corpus, keyVocab)) {
      completed.push(index);
    }
  });

  return completed;
}

export function objectiveSatisfiedByContent(
  objective: string,
  normalizedStudentCorpus: string,
  keyVocab: KeyVocabItem[] = [],
): boolean {
  if (!normalizedStudentCorpus.trim()) return false;

  // Prefer the most specific matching act (SPEECH_ACTS is ordered specific → generic)
  const matchedActs = SPEECH_ACTS.filter(act => act.objectiveCue.test(objective));
  const speechOk =
    matchedActs.length === 0
      ? false
      : matchedActs.some(act => hasEvidence(normalizedStudentCorpus, act.evidence));

  const keywords = extractContentKeywords(objective);
  const frForms = keywords.flatMap(kw => {
    const fromVocab = vocabFrForEnglish(kw, keyVocab);
    // Always also try the raw keyword (loanwords like "croissant", "wifi")
    return [...fromVocab, normalizeText(kw)];
  });

  const contentHits = [...new Set(frForms)].filter(
    fr => fr.length >= 3 && normalizedStudentCorpus.includes(fr),
  );
  const contentOk = keywords.length > 0 && contentHits.length >= 1;

  if (matchedActs.length > 0) {
    const primary = matchedActs[0];
    const needsContent = primary.requiresContent && keywords.length > 0;
    return needsContent ? speechOk && contentOk : speechOk;
  }
  if (keywords.length > 0) {
    // No speech-act cue — require at least one mapped vocab/content hit plus a minimal utterance
    return contentOk && normalizedStudentCorpus.split(/\s+/).length >= 3;
  }

  return false;
}

/**
 * Merge previous progress with this turn's signals.
 * Monotonic: completed indices never regress.
 */
export function resolveObjectiveProgress(
  input: ResolveObjectiveProgressInput,
): ResolveObjectiveProgressResult {
  const { objectives, previouslyCompleted, studentUtterances, turn, keyVocab = [] } = input;
  const count = objectives.length;
  const prev = uniqueSorted(previouslyCompleted.filter(i => i < count));

  let next = [...prev];

  const fromApi = sanitizeCompletedObjectives(turn.completed_objectives, count);
  if (fromApi) {
    next = uniqueSorted([...next, ...fromApi]);
  } else {
    const inferred = inferCompletedObjectivesFromContent(objectives, studentUtterances, keyVocab);
    next = uniqueSorted([...next, ...inferred]);
  }

  if (turn.is_done && count > 0) {
    next = uniqueSorted([...next, ...objectives.map((_, i) => i)]);
  }

  const prevSet = new Set(prev);
  const newlyCompleted = next.filter(i => !prevSet.has(i));

  return { completed: next, newlyCompleted };
}

/** 1-based label for toasts: "Objective 2 cleared". */
export function objectiveClearedLabel(zeroBasedIndex: number): string {
  return `Objective ${zeroBasedIndex + 1} cleared`;
}
