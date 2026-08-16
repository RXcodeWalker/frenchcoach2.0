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
 * `provider` are guaranteed present (as keys) on every response from every
 * tier (arrays may be empty, but the fields always exist) — any consumer may
 * read them unconditionally without an `in`/`?.` check. `subScores` and
 * per-word `accuracyScore`/`errorType` are tier-gated: `null` specifically
 * means "this tier cannot structurally produce this field" (the
 * whisper-heuristic tier always sends `null` here, never a guess) —
 * deliberately distinct from `?:`/`undefined`, which is reserved for fields
 * added in a future version that older parsed responses won't have.
 *
 * `score` is `number | null`: `null` exclusively when `couldNotAssess` is
 * true (silence, no speech recognized, or a rejected/missing Azure
 * assessment block) — never a fabricated `0`. Every consumer displaying
 * `score` must check `couldNotAssess` first.
 *
 * No field is ever removed or has its meaning changed without bumping
 * PRONUNCIATION_ASSESSOR_VERSION (version.ts) — enforced by
 * __tests__/version-pin.test.ts.
 */

export type PronunciationErrorType = 'correct' | 'mispronounced' | 'skipped' | 'extra';
export type PronunciationSeverity = 'low' | 'medium' | 'high';
export type PronunciationProvider = 'azure' | 'whisper-heuristic';
export type PronunciationProvenance = 'authoritative' | 'derived' | 'inferred';
export type PhonologicalCategory =
  | 'liaison' | 'nasalVowel' | 'frenchR' | 'silentLetter' | 'elision' | 'vowelQuality';

export interface PronunciationAssessmentRequest {
  audioBlob: Blob;
  /**
   * Scripted mode: the sentence the learner was asked to say — a real
   * reference text. Freeform mode: this is IGNORED server-side; the backend
   * substitutes its own Whisper transcript of the same audio as the
   * reference (there is no independent target for an open-ended answer —
   * see accent-analyzer plan defect #5). Pass the best text available
   * anyway (never empty) since it's what the whisper-heuristic fallback
   * tier uses when Azure is unavailable in scripted mode.
   */
  targetText: string;
  languageCode: 'fr-FR';
  /**
   * 'scripted' (default): targetText is authoritative, enables Azure's
   * miscue detection (omission/insertion) and completeness score.
   * 'freeform': for open-ended answers with no fixed target sentence.
   * completeness is always null in this mode — you cannot "omit" a word
   * from your own transcript.
   */
  mode?: 'scripted' | 'freeform';
  /**
   * 'none' (default): no detailed coaching pass, no auth required.
   * 'full': requests the server-metered, Groq-backed shadowing coaching
   * pass (Phase 4). Requires a bearer token; degrades gracefully (never
   * blocks the assessment) if unauthenticated, quota-exhausted, or Groq is
   * unavailable — see coachingQuota on the response.
   */
  coaching?: 'none' | 'full';
  /** Idempotency key for the coaching quota consume/refund RPCs. Only read when coaching === 'full'. */
  coachingRequestId?: string;
}

export interface PronunciationPhoneme {
  phoneme: string;
  accuracyScore: number | null;
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
  phonemes?: PronunciationPhoneme[] | null;
  /** ms from clip start, re-indexed across chunk seams on multi-chunk answers. Absent on a single-chunk response. */
  offsetMs?: number | null;
  durationMs?: number | null;
  /** True when within ~150ms of a chunk seam — fluency/liaison claims involving this word are suppressed (plan §4). */
  nearChunkBoundary?: boolean | null;
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
  /** 0-100. null in freeform mode: completeness is meaningless against a self-transcribed reference. */
  completeness: number | null;
  /** 0-100. null when Azure doesn't return ProsodyScore, even with EnableProsodyAssessment set. */
  prosody: number | null;
}

export interface PronunciationRhythmMetrics {
  speechRateWpm: number | null;
  articulationRateSyllPerSec: number | null;
  pauseCount: number | null;
  longestPauseMs: number | null;
  pauseRatio: number | null;
  /** Normalised pairwise variability of syllable durations — French is syllable-timed; anglophone speech imports stress-timed rhythm. */
  rhythmRegularity: number | null;
  finalSyllableLengthening: boolean | null;
}

export interface PhonologicalFinding {
  category: PhonologicalCategory;
  word: string;
  explanation: string;
  /** Ceilinged per the capability matrix (e.g. liaison capped at 0.6 — inference from timing, not measurement). */
  confidence: number;
  provenance: PronunciationProvenance;
}

export interface AudioQuality {
  snrDb: number | null;
  durationMs: number | null;
  recognitionStatus: string | null;
  clipped: boolean;
}

export interface PronunciationConfidence {
  /** 0-1. UNVALIDATED weights until real calibration data exists — see practiceThresholds.ts's convention. */
  overall: number;
  basis: string[];
  transcriptAgreement: number | null;
}

export interface PronunciationCoaching {
  summary: string;
  topPriority: string;
  tips: string[];
  /** False when the LLM pass failed and this is a template fallback. */
  grounded: boolean;
}

export interface PronunciationCoachingQuota {
  used: number;
  limit: number;
  granted: boolean;
  /** 'daily_limit_reached' | 'unauthenticated' | 'quota_unavailable' | 'could_not_assess' | 'coaching_unavailable' */
  reason?: string | null;
}

export interface PronunciationAssessment {
  /** 0-100. null exclusively when couldNotAssess is true — never a fabricated 0. */
  score: number | null;
  transcript: string;
  issues: PronunciationIssue[];
  words: PronunciationWordResult[];
  provider: PronunciationProvider;
  /** null when this tier cannot structurally produce sub-scores (whisper-heuristic). */
  subScores: PronunciationSubScores | null;
  /** True when the audio could not be assessed at all (silence, no speech recognized, Azure returned no assessment block). score is null iff this is true. */
  couldNotAssess: boolean;
  /** e.g. "no_speech_recognized", "silence", "noise", "assessment_unavailable". null when couldNotAssess is false. */
  couldNotAssessReason: string | null;

  // ── Phase 1 additions (all optional-with-null: added after v3's initial
  // shape, may be absent on an older cached/mocked response) ──────────────
  mode?: 'scripted' | 'freeform';
  locale?: string;
  assessorVersion?: string;
  chunkCount?: number;
  chunksFailed?: number;
  /** Never Azure-authoritative for fr-FR — always derived. null when the capability matrix marks it unavailable for this (mode, tier). */
  prosodyMetrics?: PronunciationRhythmMetrics | null;
  phonologicalFindings?: PhonologicalFinding[];
  audioQuality?: AudioQuality | null;
  confidence?: PronunciationConfidence | null;
  coaching?: PronunciationCoaching | null;
  /** Present only when the request sent coaching: 'full'. Display-only — the server is always authoritative. */
  coachingQuota?: PronunciationCoachingQuota | null;
}
