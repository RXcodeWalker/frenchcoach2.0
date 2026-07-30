/**
 * Provider-agnostic pronunciation assessment contract. Deliberately outside
 * src/domain/igcse/ — that module is the audited Cambridge scorer, and per
 * CLAUDE.md this must not get future-roadmap (S7) work early. Kept as a
 * sibling module with zero import coupling into/out of domain/igcse or
 * services/coaching/services/coach.
 *
 * Provider-agnostic by construction, not just by naming:
 *  - `score` and every field in `subScores` share ONE scale, 0-100, end to
 *    end. No separate 0-10 top-level scale (that was a legacy convention on
 *    FeedbackV2.pronunciation.score with no reason to carry forward here).
 *  - `errorType` is this module's own product vocabulary
 *    ('correct'|'mispronounced'|'skipped'|'extra'), never Azure's literal
 *    enum (None/Mispronunciation/Omission/Insertion, which also varies by
 *    API version). The backend's Azure normalizer maps into this vocabulary;
 *    this file never sees Azure's own labels.
 *
 * Contract stability policy: `score`, `transcript`, `issues`, `words`,
 * `provider` are guaranteed present on every response from every tier
 * (arrays may be empty, but the fields always exist) — any consumer may
 * depend on them unconditionally. `subScores` and per-word
 * `accuracyScore`/`errorType` are tier-gated: `null` specifically means
 * "this tier cannot structurally produce this field" (the whisper-heuristic
 * tier always sends `null` here, never a guess) — deliberately distinct from
 * `?:`/`undefined`, which is reserved for fields added in a future version
 * that older parsed responses won't have. No field is ever removed or has
 * its meaning changed without bumping PRONUNCIATION_ASSESSOR_VERSION
 * (version.ts) — enforced by __tests__/version-pin.test.ts.
 */

export type PronunciationErrorType = 'correct' | 'mispronounced' | 'skipped' | 'extra';
export type PronunciationSeverity = 'low' | 'medium' | 'high';
export type PronunciationProvider = 'azure' | 'whisper-heuristic';

export interface PronunciationAssessmentRequest {
  audioBlob: Blob;
  targetText: string;
  languageCode: 'fr-FR';
}

export interface PronunciationWordResult {
  word: string;
  /** 0-100. null when this tier cannot structurally produce a per-word accuracy signal. */
  accuracyScore: number | null;
  errorType: PronunciationErrorType | null;
  /**
   * 0-1, per word — ASR transcription confidence, NOT a pronunciation-accuracy
   * signal. Mainly populated by the whisper-heuristic tier, where it IS the
   * basis of the score. Do not confuse with accuracyScore.
   */
  confidence: number | null;
}

export interface PronunciationDrillHint {
  hint: string;
  repeatPhrase: string;
}

export interface PronunciationIssue {
  word: string;
  ipaExpected: string;
  ipaHeard: string;
  problem: string;
  severity: PronunciationSeverity;
  drill: PronunciationDrillHint;
  expected?: string;
  heard?: string | null;
}

export interface PronunciationSubScores {
  accuracy: number; // 0-100
  fluency: number; // 0-100
  completeness: number; // 0-100
}

export interface PronunciationAssessment {
  score: number; // 0-100
  transcript: string;
  issues: PronunciationIssue[];
  words: PronunciationWordResult[];
  provider: PronunciationProvider;
  /** null when this tier cannot structurally produce sub-scores (whisper-heuristic). */
  subScores: PronunciationSubScores | null;
}
