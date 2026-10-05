/**
 * Exam-mode pronunciation analysis — types (exam-pronunciation plan, Batch 5).
 *
 * Two families, kept apart on purpose:
 *
 *  - EVIDENCE (`ExamPronunciationTurnEvidence`): what the backend stores and
 *    returns for one turn (POST/GET /api/exam/pronunciation). It carries
 *    Azure's per-word accuracy because the fairness rules need it. It is never
 *    rendered directly.
 *  - DISPLAY (`ExamPronunciationReport`, `ExamPronunciationPartCard`): what the
 *    UI renders. No accuracy, no score, no level, no overall pronunciation
 *    number — ever (ADR 0005, ADR 0009). The only numbers are the turn key (a
 *    ConductLog seq) and a clip's playback range in seconds; a type test pins
 *    that (`__tests__/types.test.ts`).
 *
 * Nothing here is imported by, or can reach, the scored pipeline.
 */

import type { SessionPart } from '../igcse/stt/types';

// ── Evidence (wire shape; matches backend models/exam_pronunciation.py) ──────

export type EvidenceErrorType = 'correct' | 'mispronounced' | 'skipped' | 'extra';

/** Recognition-trust reasons the backend assessor computes (no tuned thresholds). */
export type AssessorSuppressionReason = 'asr_disagreement' | 'near_seam' | 'short_word' | 'number';

export interface ExamPronunciationEvidenceWord {
  /** The Whisper-reference word Azure assessed. */
  word: string;
  accuracyScore: number | null;
  errorType: EvidenceErrorType | null;
  /** Milliseconds inside the uploaded (silence-trimmed) clip. */
  offsetMs: number | null;
  durationMs: number | null;
  nearChunkBoundary: boolean;
  phonemeScores: Array<number | null>;
  /** The exam-transcript word aligned to this word, if any. */
  examWord: string | null;
  /** null in single-recogniser mode (the exam transcript is itself Whisper). */
  recognizersAgree: boolean | null;
  suppressed: AssessorSuppressionReason[];
}

export interface ExamPronunciationTurnEvidence {
  sessionId: string;
  part: SessionPart;
  /** The candidate ConductLog entry's `seq`, as a string. */
  turnKey: string;
  assessorVersion: string;
  fairnessVersion: string;
  examTranscript: string;
  referenceText: string;
  words: ExamPronunciationEvidenceWord[];
  couldNotAssess: boolean;
  couldNotAssessReason: string | null;
  singleRecognizer: boolean;
  snrDb: number | null;
  azureConfidence: number | null;
  chunkCount: number;
  chunksFailed: number;
  rawS: number | null;
  trimmedS: number;
  pauseStats: { pausesOver2s: number; longestPauseS: number } | null;
  clippedRatio: number | null;
  createdAt: string | null;
}

// ── Fairness output (internal; feeds the display builders) ───────────────────

/** Meaning-carrying sound categories. French R, stress, rhythm and vowel colour are deliberately absent. */
export type SoundCategory = 'nasalVowel' | 'vowelQuality' | 'silentEnding' | 'liaison';

export type SuppressionReason =
  | AssessorSuppressionReason
  | 'above_floor'
  | 'not_meaning_carrying'
  | 'may_be_french_r'
  | 'clipped'
  | 'low_snr'
  | 'low_confidence'
  | 'proper_noun'
  | 'loanword'
  | 'turn_not_assessed';

export interface FairnessWordVerdict {
  turnKey: number;
  part: SessionPart;
  /** Index into the turn's evidence `words`. */
  index: number;
  word: string;
  category: SoundCategory | null;
  reported: boolean;
  /** Empty when reported. Never displayed — kept for calibration. */
  reasons: SuppressionReason[];
  /** Single-recogniser turn: only the very-low floor applied. */
  lowerConfidence: boolean;
}

// ── Display (no marks, no scores) ────────────────────────────────────────────

export interface PlaybackClip {
  /** Seconds in the ORIGINAL in-memory recording (not the trimmed upload). */
  startS: number;
  endS: number;
}

export interface ReportedWord {
  /** As the candidate's exam transcript shows it (falls back to the assessed word). */
  word: string;
  turnKey: number;
  part: SessionPart;
  category: SoundCategory | null;
  /** null when the recording is no longer in memory ("recording not kept"). */
  clip: PlaybackClip | null;
  lowerConfidence: boolean;
}

export interface SoundPattern {
  category: SoundCategory;
  label: string;
  explanation: string;
  /** Up to 3 distinct words from the candidate's own answers. */
  examples: string[];
  provenance: 'inferred';
}

export interface TranscriptToken {
  text: string;
  reported: boolean;
}

export interface TranscriptTurn {
  turnKey: number;
  part: SessionPart;
  tokens: TranscriptToken[];
}

export interface ExamPronunciationPartReport {
  part: SessionPart;
  reportedWords: ReportedWord[];
  patterns: SoundPattern[];
  fluencyNote: string | null;
  /** True when any analysed turn of the part had only one recogniser. */
  lowerConfidence: boolean;
}

export interface ExamPronunciationReport {
  fairnessVersion: string;
  parts: ExamPronunciationPartReport[];
  transcript: TranscriptTurn[];
  /** The top 2–3 patterns across the whole exam. */
  patterns: SoundPattern[];
  fluencyNote: string | null;
  lowerConfidence: boolean;
}

/** The Coached rail's end-of-part card: up to 2 words and 1 pattern. */
export interface ExamPronunciationPartCard {
  part: SessionPart;
  words: string[];
  pattern: SoundPattern | null;
}
