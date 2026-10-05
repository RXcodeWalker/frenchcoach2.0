/**
 * Exam-mode pronunciation analysis — the fairness rules (exam-pronunciation
 * plan §2, Batch 5). Deterministic and pure: stored turn evidence in, a
 * reported/suppressed verdict per mispronounced word out.
 *
 * The axis is comprehensibility, never nativeness (Teacher's Notes p.12: the
 * Quality of Language scale runs down to "understood with some effort" — no
 * band mentions accent). So a word is REPORTED only if ALL of these hold:
 *
 *  1. Azure called it `mispronounced` and its accuracy is below the floor
 *     (`accuracyFloor`). Mid-range scores are where accent lives.
 *  2. Its inferred category is meaning-carrying: nasal vs oral vowel, a
 *     minimal-pair vowel (tout/tu, les/le), a pronounced silent ending that
 *     changes the form, or an obligatory distinguishing liaison (ils‿ont vs
 *     ils sont). French R, stress, rhythm and "foreign" vowel colour are never
 *     reported: any word containing an r is suppressed, because a low score on
 *     it may be the R alone. An uncategorised word is reported only below the
 *     very-low floor and when it has at least `uncategorisedMinLetters` letters.
 *  3. Both recognisers agree on it (the exam transcript and Whisper's
 *     reference, aligned by the backend). With a single recogniser (the exam
 *     transcript IS Whisper) only the very-low floor applies and the result is
 *     marked lower-confidence.
 *  4. The signal is good: not near a chunk seam, not clipped, SNR and Azure
 *     confidence above the floors, not ≤2 letters, not a number, not a proper
 *     noun, not a loanword.
 *  5. (patterns.ts) A sound pattern needs ≥2 distinct words.
 *
 * Every number and word list is in FAIRNESS_CONFIG, pinned by
 * EXAM_PRONUNCIATION_VERSION (version.ts) — any change is a deliberate bump.
 * All of it is UNVALIDATED until the Batch 7 calibration passes; the feature
 * stays admin-only until then.
 *
 * Suppressed words and their reasons are returned for calibration and are
 * never displayed. Category inference is orthographic and labelled
 * `inferred`: fr-FR Azure returns no phoneme names.
 */

import type {
  ExamPronunciationEvidenceWord,
  ExamPronunciationTurnEvidence,
  FairnessWordVerdict,
  SoundCategory,
  SuppressionReason,
} from './types';

export const FAIRNESS_CONFIG = {
  /** Rule 1: a categorised word is reported only below this accuracy. UNVALIDATED. */
  accuracyFloor: 45,
  /** Uncategorised words, and every word in single-recogniser mode. UNVALIDATED. */
  veryLowFloor: 30,
  uncategorisedMinLetters: 3,
  /** Rule 4: words of this many letters or fewer are never reported. */
  shortWordMaxLetters: 2,
  /** Rule 4: turn-level signal floors (the worst chunk's value). UNVALIDATED. */
  minSnrDb: 10,
  minAzureConfidence: 0.5,
  maxClippedRatio: 0.01,
  /** Rule 5 and the report's shape. */
  patternMinDistinctWords: 2,
  patternMaxExamples: 3,
  maxPatterns: 3,
  partCardMaxWords: 2,
  partCardMaxPatterns: 1,
  /** Fluency note (fluencyNote.ts). */
  longPauseS: 2,
  lexicon: {
    /** Words with a minimal-pair partner by vowel quality (u/ou, e/é, eu/é). r-words are excluded on purpose. */
    minimalPairVowels: [
      'les', 'des', 'ces', 'mes', 'tes', 'ses', 'tout', 'toute', 'vous', 'vue', 'doux', 'sous', 'loup',
      'nous', 'dessus', 'dessous', 'bout', 'boue', 'poule', 'tue', 'mou', 'deux', 'jeu', 'peu', 'feu',
    ],
    /** Words after which liaison into a vowel-initial word is obligatory. */
    obligatoryLiaisonBefore: [
      'ils', 'elles', 'les', 'des', 'ces', 'mes', 'tes', 'ses', 'nos', 'vos', 'leurs', 'aux', 'nous', 'vous',
      'on', 'en', 'un', 'deux', 'trois', 'mon', 'ton', 'son',
    ],
    /** A following -ent verb ending is silent. */
    silentEntAfter: ['ils', 'elles', "qu'ils", "qu'elles"],
    /** Final consonant is pronounced (or ambiguous), so it is not a "silent ending". */
    pronouncedFinals: [
      'bus', 'fils', 'sens', 'tennis', 'os', 'plus', 'tous', 'hélas', 'maïs', 'oasis', 'net', 'sept', 'huit',
      'but', 'août', 'ouest', 'est', 'dot', 'gaz', 'jazz', 'sud', 'stand', 'vis', 'mas',
    ],
    loanwords: [
      'week-end', 'weekend', 'football', 'foot', 'sandwich', 'parking', 'shopping', 'email', 'mail', 'internet',
      'ok', 'okay', 'cool', 'hamburger', 'pizza', 'netflix', 'youtube', 'instagram', 'tiktok', 'smartphone',
      'jean', 'jeans', 'basket', 'tennis', 'rugby', 'golf', 'hockey', 'camping', 'job', 'stop', 'fun', 'look',
      'selfie', 'wifi', 'web', 'blog', 'chat', 'snack', 'fast-food', 'baby-sitting', 'jogging', 'pull',
    ],
  },
} as const;

const VOWELS = 'aeiouyàâäéèêëîïôöùûüœ';
const NASAL = new RegExp(`[${VOWELS}][nm](?![${VOWELS}nmh])`);
const VOWEL_INITIAL = new RegExp(`^[${VOWELS}]`);
const SILENT_FINAL = new RegExp(`[${VOWELS}][tdsxz]$`);

const MINIMAL_PAIRS = new Set<string>(FAIRNESS_CONFIG.lexicon.minimalPairVowels);
const LIAISON_BEFORE = new Set<string>(FAIRNESS_CONFIG.lexicon.obligatoryLiaisonBefore);
const SILENT_ENT_AFTER = new Set<string>(FAIRNESS_CONFIG.lexicon.silentEntAfter);
const PRONOUNCED_FINALS = new Set<string>(FAIRNESS_CONFIG.lexicon.pronouncedFinals);
const LOANWORDS = new Set<string>(FAIRNESS_CONFIG.lexicon.loanwords);

/** Lowercase, NFC, curly apostrophe straightened, edge punctuation stripped. */
export function normalizeWord(word: string): string {
  return word.normalize('NFC').toLowerCase().replace(/’/g, "'").replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

function letterCount(word: string): number {
  return [...word].filter((c) => /\p{L}/u.test(c)).length;
}

/**
 * The meaning-carrying category a mispronunciation of `word` could belong to,
 * inferred from spelling and the previous word. null = none of the four.
 */
export function inferCategory(word: string, previousWord: string | null): SoundCategory | null {
  const w = normalizeWord(word);
  const prev = previousWord ? normalizeWord(previousWord) : null;
  if (!w) return null;
  if (prev && LIAISON_BEFORE.has(prev) && VOWEL_INITIAL.test(w)) return 'liaison';
  if (prev && SILENT_ENT_AFTER.has(prev) && w.endsWith('ent')) return 'silentEnding';
  if (NASAL.test(w)) return 'nasalVowel';
  if (MINIMAL_PAIRS.has(w)) return 'vowelQuality';
  if (w.length >= 3 && SILENT_FINAL.test(w) && !PRONOUNCED_FINALS.has(w)) return 'silentEnding';
  return null;
}

function isProperNoun(evidenceWord: ExamPronunciationEvidenceWord, index: number): boolean {
  const shown = evidenceWord.examWord ?? '';
  const first = [...shown][0] ?? '';
  return index > 0 && first !== first.toLowerCase() && first === first.toUpperCase();
}

function turnSignalReasons(turn: ExamPronunciationTurnEvidence): SuppressionReason[] {
  const reasons: SuppressionReason[] = [];
  if (turn.clippedRatio !== null && turn.clippedRatio > FAIRNESS_CONFIG.maxClippedRatio) reasons.push('clipped');
  if (turn.snrDb !== null && turn.snrDb < FAIRNESS_CONFIG.minSnrDb) reasons.push('low_snr');
  if (turn.azureConfidence !== null && turn.azureConfidence < FAIRNESS_CONFIG.minAzureConfidence) {
    reasons.push('low_confidence');
  }
  return reasons;
}

/** Rules 1–4 for one turn. Only `mispronounced` words get a verdict; every other word is not a candidate at all. */
export function judgeTurn(turn: ExamPronunciationTurnEvidence): FairnessWordVerdict[] {
  if (turn.couldNotAssess) return [];
  const turnKey = Number(turn.turnKey);
  const signal = turnSignalReasons(turn);
  const verdicts: FairnessWordVerdict[] = [];

  turn.words.forEach((ev, index) => {
    if (ev.errorType !== 'mispronounced' || ev.accuracyScore === null) return;
    const w = normalizeWord(ev.word);
    const category = inferCategory(ev.word, index > 0 ? turn.words[index - 1].word : null);
    const reasons = new Set<SuppressionReason>();

    // Rules 1–3: accuracy floors, category, recogniser agreement.
    if (turn.singleRecognizer) {
      if (ev.accuracyScore >= FAIRNESS_CONFIG.veryLowFloor) reasons.add('above_floor');
    } else if (category !== null) {
      if (ev.accuracyScore >= FAIRNESS_CONFIG.accuracyFloor) reasons.add('above_floor');
    } else if (ev.accuracyScore >= FAIRNESS_CONFIG.veryLowFloor || letterCount(w) < FAIRNESS_CONFIG.uncategorisedMinLetters) {
      reasons.add('not_meaning_carrying');
    }
    if (w.includes('r')) reasons.add('may_be_french_r');
    if (!turn.singleRecognizer && ev.recognizersAgree !== true) reasons.add('asr_disagreement');

    // Rule 4: signal quality and word shape (the backend's reasons are kept too).
    for (const r of ev.suppressed) reasons.add(r);
    if (ev.nearChunkBoundary) reasons.add('near_seam');
    for (const r of signal) reasons.add(r);
    if (letterCount(w) <= FAIRNESS_CONFIG.shortWordMaxLetters) reasons.add('short_word');
    if (/\d/.test(w)) reasons.add('number');
    if (isProperNoun(ev, index)) reasons.add('proper_noun');
    if (LOANWORDS.has(w)) reasons.add('loanword');

    verdicts.push({
      turnKey,
      part: turn.part,
      index,
      word: ev.examWord ?? ev.word,
      category,
      reported: reasons.size === 0,
      reasons: [...reasons],
      lowerConfidence: turn.singleRecognizer,
    });
  });
  return verdicts;
}

/** Rules 1–4 across turns, in turn order. */
export function judgeTurns(turns: readonly ExamPronunciationTurnEvidence[]): FairnessWordVerdict[] {
  return [...turns]
    .sort((a, b) => Number(a.turnKey) - Number(b.turnKey))
    .flatMap((t) => judgeTurn(t));
}
