/**
 * S3 STT ingest types — the durable SessionTranscript artifact and its inputs.
 * Field names deliberately mirror 02-scoring-pipeline-architecture.md §3.3 and §3.8.
 */

import type { TimeFrame } from '../evidence/types';

export type SpeakerRole = 'examiner' | 'candidate';

/**
 * Confidentiality gates redistribution, not scoring (see judgement/types.ts
 * ContentProvenance — this is the same union, redeclared here so stt/ has no
 * runtime import from judgement/).
 */
export type ContentProvenance = 'original-practice' | 'confidential-internal';

export type SessionPart = 'rolePlay' | 'topic1' | 'topic2';

/**
 * W1: which input channel produced a candidate utterance — mic (STT) or the
 * always-available text field (see the exam-overhaul plan's W4). Optional:
 * absent for every pre-existing ASR-annotated/hand-authored transcript, which
 * predates dual input and is speech by construction.
 */
export type CandidateInputMode = 'speech' | 'text';

export interface Word {
  text: string;
  startS: number;
  endS: number;
  /** 0..1 */
  confidence: number;
}

/**
 * Why an exam answer was marked from the live captions (Web Speech) instead of
 * the batch recogniser. Recorded per answer so the results page can say so.
 *  - no-audio:     a spoken answer whose recording was not kept
 *  - asr-failed:   the batch call errored or the provider was unavailable
 *  - asr-timeout:  the batch call did not finish in time
 *  - asr-rejected: the batch result looked unusable (no speech detected,
 *                  prompt echoed, or empty while the captions heard words)
 *  - consent:      the account may not upload audio yet (guardian pending)
 *  - quota:        the daily transcription allowance was used up
 */
export type RecognitionFallbackReason =
  | 'no-audio'
  | 'asr-failed'
  | 'asr-timeout'
  | 'asr-rejected'
  | 'consent'
  | 'quota';

/** One Whisper segment with its own confidence signals (all null when the provider gave none). */
export interface RecognitionSegment {
  startS: number;
  endS: number;
  text: string;
  avgLogprob: number | null;
  noSpeechProb: number | null;
  compressionRatio: number | null;
}

/** The batch recogniser's reading of one answer. */
export interface PrimaryRecognition {
  text: string;
  /** The model ID the backend reported (GROQ_WHISPER_MODEL), for audit. */
  model: string;
  /** sha256 of the context prompt sent with the audio (the prompt itself is not stored). */
  promptHash: string;
  segments: RecognitionSegment[];
}

/** The live captions the examiner flow ran on. */
export interface SecondaryRecognition {
  source: 'web-speech-live';
  text: string;
}

/**
 * Both recognisers' readings of one spoken answer, and which one `Utterance.text`
 * carries. Absent on typed answers, on answers from before batch recognition,
 * and when the candidate edited the text (a typed edit drops it).
 *
 * Invariant (enforced by the schema): `selected === 'primary'` iff `primary` is
 * present and `fallbackReason` is null; and `Utterance.text` is exactly the
 * selected recogniser's text.
 */
export interface UtteranceRecognition {
  primary?: PrimaryRecognition;
  secondary: SecondaryRecognition;
  selected: 'primary' | 'secondary';
  fallbackReason: RecognitionFallbackReason | null;
}

export interface Utterance {
  utteranceId: string;
  role: SpeakerRole;
  /** Raw diarizer label, kept for audit. */
  speakerCluster: string;
  part: SessionPart;
  /** Which question this answers/asks; null if unattributable. */
  questionId: string | null;
  startS: number;
  endS: number;
  /** == words.map(w => w.text).join(' ') */
  text: string;
  words: Word[];
  /** Candidate utterances only — undefined for examiner utterances and for any transcript predating dual input. */
  inputMode?: CandidateInputMode;
  /**
   * session-transcript-v2, engine-built candidate utterances only: the
   * candidate ConductLog entry's `seq`, the key the exam audio store, the
   * corrections rail and the batch recogniser all share.
   */
  turnKey?: number;
  /** session-transcript-v2: both recognisers' readings of a spoken answer. See UtteranceRecognition. */
  recognition?: UtteranceRecognition;
}

export type ExaminerEventKind =
  | 'main_question'
  | 'repetition'
  | 'alternative_question'
  | 'extension_prompt'
  | 'unmatched';

/** Raw observation. Aggregation into repetitions_used etc. is L1's job, not S3's. */
export interface ExaminerEvent {
  eventId: string;
  utteranceId: string;
  atS: number;
  part: SessionPart;
  kind: ExaminerEventKind;
  /** null iff kind is extension_prompt | unmatched */
  questionId: string | null;
  /** 0..1 — auditable, not a boolean */
  matchScore: number;
}

export type ConfidenceSource = 'whisperx-align-score' | 'faster-whisper-probability';

export interface SttMetadata {
  model: string;
  modelVersion: string;
  provider: string;
  languageCode: 'fr';
  /** wav2vec2 fr aligner — this produces the word scores, not the ASR model. */
  alignmentModel: string | null;
  /** Pinned: 'pyannote/speaker-diarization-3.1' */
  diarizationModel: string | null;
  /** sha256 of resolved decode config; full params in raw-asr.json */
  decodeParamsHash: string;
  confidenceSource: ConfidenceSource;
  /** Always 0 in S3 core — two-pass biased-decoding retry is deferred. */
  promptBiasedRetries: number;
  /** ISO 8601 */
  transcribedAt: string;
}

export interface AudioProvenance {
  /** Content identity — NOT a path. */
  sha256: string;
  durationS: number;
  sampleRateHz: number;
  channels: number;
}

/** How the examiner events were derived. 04 §6.1 (recordings) vs §6.5 (app sessions). */
export type AnnotationSource = 'asr-annotation' | 'session-engine-log';

export interface SessionTranscript {
  schemaVersion: 'session-transcript-v2';
  assemblerVersion: string;
  sessionId: string;
  recordedAt: string;
  contentProvenance: ContentProvenance;
  /** false in S3; the review step is a later UI phase. */
  userCorrected: boolean;
  audio: AudioProvenance;
  stt: SttMetadata;
  annotationSource: AnnotationSource;
  questionSetId: string;
  /** sha256 of the canonicalized SessionQuestionSet */
  questionSetHash: string;
  /** Inlined so a stored transcript is self-explaining. */
  matchThreshold: number;
  /** 0..1 from labelSpeakers */
  roleLabelConfidence: number;
  /** Time-ordered, both speakers, whole session. */
  utterances: Utterance[];
  /** Time-ordered. */
  examinerEvents: ExaminerEvent[];
}

// ── Annotator input contract (hand-authored per recording; NOT the S11 question bank) ──

export interface SessionQuestion {
  questionId: string;
  part: SessionPart;
  mainText: string;
  /** Cambridge requires alternatives. */
  alternativeTexts: string[];
  /** S8 anchor-selection key; carried to TopicConversation.topicArea. */
  topicArea?: 'A' | 'B' | 'C' | 'D' | 'E';
  /** Carried to ConversationTurn. */
  expectedTimeFrame?: TimeFrame;
  /** Carried to RolePlayTaskResponse. */
  partsExpected?: 1 | 2;
  /**
   * Second-part prompt for a two-part question (role-play PAUSE task or a topic
   * question whose main text embeds a follow-up like "…? Pourquoi ?"). Delivered
   * as a distinct examiner utterance after the main part is answered — never a
   * re-read of mainText. Additive; not part of the SessionTranscript schema.
   */
  secondPartText?: string;
}

export interface SessionQuestionSet {
  questionSetId: string;
  questions: SessionQuestion[];
  /**
   * Authored on-topic "further question" padding (C2), asked when a topic
   * conversation is below the speaking floor after Q1-Q5 are exhausted (see
   * conductEngine MAX_FURTHER_QUESTIONS_PER_TOPIC). Fixed-length tuple (not
   * string[]) so furtherQuestions[part][askedSoFar] can never read undefined —
   * an author must supply exactly the cap's worth of questions per topic.
   * Additive; not part of the SessionTranscript schema.
   */
  furtherQuestions: {
    topic1: readonly [string, string];
    topic2: readonly [string, string];
  };
}

// ── Provider contract (adapter's job: normalise vendor JSON into this) ──

export interface RawAsrWord {
  text: string;
  startS: number;
  endS: number;
  confidence: number;
  /** Raw diarizer cluster label for the speaker who said this word. */
  speakerCluster: string;
}

export interface RawAsrResult {
  provider: string;
  model: string;
  modelVersion: string;
  languageCode: 'fr';
  alignmentModel: string | null;
  diarizationModel: string | null;
  decodeParamsHash: string;
  confidenceSource: ConfidenceSource;
  promptBiasedRetries: number;
  transcribedAt: string;
  /** Flat, time-ordered word stream across both speakers. */
  words: RawAsrWord[];
}

export interface TranscriptQuality {
  /** Mean over words, not utterances — one confident long sentence must not mask a garbled short one. */
  meanWordConfidence: number;
  lowConfidenceSpanRatio: number;
  lowConfidenceSpanCount: number;
}
