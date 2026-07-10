/**
 * S3 STT schema — zod validation for SessionTranscript and RawAsrResult.
 * Read-dispatch on schemaVersion: writes always emit current; reads accept known
 * versions and reject unknown ones loudly (never silently coerce — 02 §3.8 regrade
 * semantics require re-scoring a *stored* transcript, so old versions stay readable).
 */

import { z } from 'zod';
import { STT_SCHEMA_VERSION } from './version';
import type { RawAsrResult, SessionTranscript } from './types';

export class SessionTranscriptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionTranscriptValidationError';
  }
}

const SpeakerRoleSchema = z.enum(['examiner', 'candidate']);
const ContentProvenanceSchema = z.enum(['original-practice', 'confidential-internal']);
const SessionPartSchema = z.enum(['rolePlay', 'topic1', 'topic2']);
const ConfidenceSourceSchema = z.enum(['whisperx-align-score', 'faster-whisper-probability']);
const AnnotationSourceSchema = z.enum(['asr-annotation', 'session-engine-log']);
const ExaminerEventKindSchema = z.enum([
  'main_question',
  'repetition',
  'alternative_question',
  'extension_prompt',
  'unmatched',
]);

const WordSchema = z.object({
  text: z.string(),
  startS: z.number().min(0),
  endS: z.number().min(0),
  confidence: z.number().min(0).max(1),
});

const UtteranceSchema = z.object({
  utteranceId: z.string(),
  role: SpeakerRoleSchema,
  speakerCluster: z.string(),
  part: SessionPartSchema,
  questionId: z.string().nullable(),
  startS: z.number().min(0),
  endS: z.number().min(0),
  text: z.string(),
  words: z.array(WordSchema),
});

const ExaminerEventSchema = z.object({
  eventId: z.string(),
  utteranceId: z.string(),
  atS: z.number().min(0),
  part: SessionPartSchema,
  kind: ExaminerEventKindSchema,
  questionId: z.string().nullable(),
  matchScore: z.number().min(0).max(1),
});

const SttMetadataSchema = z.object({
  model: z.string(),
  modelVersion: z.string(),
  provider: z.string(),
  languageCode: z.literal('fr'),
  alignmentModel: z.string().nullable(),
  diarizationModel: z.string().nullable(),
  decodeParamsHash: z.string(),
  confidenceSource: ConfidenceSourceSchema,
  promptBiasedRetries: z.number().int().min(0),
  transcribedAt: z.string(),
});

const AudioProvenanceSchema = z.object({
  sha256: z.string(),
  durationS: z.number().min(0),
  sampleRateHz: z.number().int().min(1),
  channels: z.number().int().min(1),
});

const SessionTranscriptSchema = z.object({
  schemaVersion: z.literal('session-transcript-v1'),
  assemblerVersion: z.string(),
  sessionId: z.string(),
  recordedAt: z.string(),
  contentProvenance: ContentProvenanceSchema,
  userCorrected: z.boolean(),
  audio: AudioProvenanceSchema,
  stt: SttMetadataSchema,
  annotationSource: AnnotationSourceSchema,
  questionSetId: z.string(),
  questionSetHash: z.string(),
  matchThreshold: z.number().min(0).max(1),
  roleLabelConfidence: z.number().min(0).max(1),
  utterances: z.array(UtteranceSchema),
  examinerEvents: z.array(ExaminerEventSchema),
});

const RawAsrWordSchema = z.object({
  text: z.string(),
  startS: z.number().min(0),
  endS: z.number().min(0),
  confidence: z.number().min(0).max(1),
  speakerCluster: z.string(),
});

const RawAsrResultSchema = z.object({
  provider: z.string(),
  model: z.string(),
  modelVersion: z.string(),
  languageCode: z.literal('fr'),
  alignmentModel: z.string().nullable(),
  diarizationModel: z.string().nullable(),
  decodeParamsHash: z.string(),
  confidenceSource: ConfidenceSourceSchema,
  promptBiasedRetries: z.number().int().min(0),
  transcribedAt: z.string(),
  words: z.array(RawAsrWordSchema),
});

/**
 * Parse + validate a SessionTranscript. Dispatches on schemaVersion: only
 * STT_SCHEMA_VERSION is currently known. A future bump adds a new arm here
 * (and, if the shape changed, an upcaster) — never a silent coercion.
 */
export function parseSessionTranscript(raw: unknown): SessionTranscript {
  if (typeof raw !== 'object' || raw === null || !('schemaVersion' in raw)) {
    throw new SessionTranscriptValidationError('Missing schemaVersion');
  }
  const version = (raw as { schemaVersion: unknown }).schemaVersion;
  if (version !== STT_SCHEMA_VERSION) {
    throw new SessionTranscriptValidationError(
      `Unknown schemaVersion "${String(version)}"; expected "${STT_SCHEMA_VERSION}"`,
    );
  }

  const result = SessionTranscriptSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new SessionTranscriptValidationError(`SessionTranscript failed validation: ${issues}`);
  }
  return result.data as SessionTranscript;
}

export function parseRawAsrResult(raw: unknown): RawAsrResult {
  const result = RawAsrResultSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new SessionTranscriptValidationError(`RawAsrResult failed validation: ${issues}`);
  }
  return result.data as RawAsrResult;
}
