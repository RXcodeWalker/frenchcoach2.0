/**
 * S3 STT schema — zod validation for SessionTranscript and RawAsrResult.
 * Read-dispatch on schemaVersion: writes always emit current; reads accept known
 * versions and reject unknown ones loudly (never silently coerce — 02 §3.8 regrade
 * semantics require re-scoring a *stored* transcript, so old versions stay readable).
 */

import { z } from 'zod';
import { STT_SCHEMA_VERSION } from './version';
import type { RawAsrResult, SessionTranscript } from './types';

/** The one older schema still readable (re-scoring a stored transcript needs old versions to stay readable). */
const STT_SCHEMA_VERSION_V1 = 'session-transcript-v1';

export class SessionTranscriptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionTranscriptValidationError';
  }
}

const SpeakerRoleSchema = z.enum(['examiner', 'candidate']);
const CandidateInputModeSchema = z.enum(['speech', 'text']);
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

const RecognitionFallbackReasonSchema = z.enum([
  'no-audio',
  'asr-failed',
  'asr-timeout',
  'asr-rejected',
  'consent',
  'quota',
]);

const RecognitionSegmentSchema = z.object({
  startS: z.number().min(0),
  endS: z.number().min(0),
  text: z.string(),
  avgLogprob: z.number().nullable(),
  noSpeechProb: z.number().min(0).max(1).nullable(),
  compressionRatio: z.number().nullable(),
});

const PrimaryRecognitionSchema = z.object({
  text: z.string(),
  model: z.string(),
  promptHash: z.string(),
  promptVersion: z.string().optional(),
  segments: z.array(RecognitionSegmentSchema),
});

const SecondaryRecognitionSchema = z.object({
  source: z.literal('web-speech-live'),
  text: z.string(),
});

const UtteranceRecognitionSchema = z
  .object({
    primary: PrimaryRecognitionSchema.optional(),
    secondary: SecondaryRecognitionSchema,
    selected: z.enum(['primary', 'secondary']),
    fallbackReason: RecognitionFallbackReasonSchema.nullable(),
  })
  .superRefine((r, ctx) => {
    const primarySelected = r.selected === 'primary';
    if (primarySelected && (r.primary === undefined || r.fallbackReason !== null)) {
      ctx.addIssue({ code: 'custom', message: 'selected "primary" needs a primary reading and no fallbackReason' });
    }
    if (!primarySelected && r.fallbackReason === null) {
      ctx.addIssue({ code: 'custom', message: 'selected "secondary" needs a fallbackReason' });
    }
  });

const UtteranceBaseSchema = z.object({
  utteranceId: z.string(),
  role: SpeakerRoleSchema,
  speakerCluster: z.string(),
  part: SessionPartSchema,
  questionId: z.string().nullable(),
  startS: z.number().min(0),
  endS: z.number().min(0),
  text: z.string(),
  words: z.array(WordSchema),
  inputMode: CandidateInputModeSchema.optional(),
});

/** v1 utterances: no turnKey, no recognition. */
const UtteranceV1Schema = UtteranceBaseSchema;

const UtteranceSchema = UtteranceBaseSchema.extend({
  turnKey: z.number().int().min(0).optional(),
  recognition: UtteranceRecognitionSchema.optional(),
}).superRefine((u, ctx) => {
  // What is marked must be exactly what a recogniser heard: the text is the selected reading.
  if (u.recognition === undefined) return;
  const selected =
    u.recognition.selected === 'primary' ? u.recognition.primary?.text : u.recognition.secondary.text;
  if (u.text !== selected) {
    ctx.addIssue({ code: 'custom', message: 'utterance text must equal the selected recognition text', path: ['text'] });
  }
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

const SessionTranscriptBaseSchema = z.object({
  schemaVersion: z.string(),
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
  examinerEvents: z.array(ExaminerEventSchema),
});

const SessionTranscriptSchema = SessionTranscriptBaseSchema.extend({
  schemaVersion: z.literal(STT_SCHEMA_VERSION),
  utterances: z.array(UtteranceSchema),
});

const SessionTranscriptV1Schema = SessionTranscriptBaseSchema.extend({
  schemaVersion: z.literal(STT_SCHEMA_VERSION_V1),
  utterances: z.array(UtteranceV1Schema),
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

function describeIssues(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
}

/**
 * Parse + validate a SessionTranscript. Dispatches on schemaVersion: the current
 * STT_SCHEMA_VERSION, plus v1, which is upcast (shape-identical; v2 only adds
 * optional fields, so nothing is invented — the result simply carries no
 * turnKey/recognition). Any other version is rejected loudly, never coerced.
 */
export function parseSessionTranscript(raw: unknown): SessionTranscript {
  if (typeof raw !== 'object' || raw === null || !('schemaVersion' in raw)) {
    throw new SessionTranscriptValidationError('Missing schemaVersion');
  }
  const version = (raw as { schemaVersion: unknown }).schemaVersion;

  if (version === STT_SCHEMA_VERSION_V1) {
    const v1 = SessionTranscriptV1Schema.safeParse(raw);
    if (!v1.success) {
      throw new SessionTranscriptValidationError(`SessionTranscript failed validation: ${describeIssues(v1.error)}`);
    }
    return { ...v1.data, schemaVersion: STT_SCHEMA_VERSION } as SessionTranscript;
  }

  if (version !== STT_SCHEMA_VERSION) {
    throw new SessionTranscriptValidationError(
      `Unknown schemaVersion "${String(version)}"; expected "${STT_SCHEMA_VERSION}" (or "${STT_SCHEMA_VERSION_V1}")`,
    );
  }

  const result = SessionTranscriptSchema.safeParse(raw);
  if (!result.success) {
    throw new SessionTranscriptValidationError(`SessionTranscript failed validation: ${describeIssues(result.error)}`);
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
