/**
 * S3 public surface. S4 imports from here and nowhere else in stt/.
 *
 * Exactly four symbols S4 needs (see docs/architecture — S3 plan §7):
 *   - TranscriptStore (type)   — inject FileTranscriptStore in the CLI harness,
 *                                 FixtureTranscriptStore in tests
 *   - toSpeakingTranscript()   — produces the input to buildEvidenceSubset + scoreSpeaking
 *   - summariseQuality()       — populates ScoringEnvelope.transcriptConfidence;
 *                                 userCorrected reads straight off the transcript
 *   - session.stt              — populates ScoringEnvelope.stt (a field on
 *                                 SessionTranscript, not a separate export)
 *
 * Doc drift for S4 to resolve: 02 §3.8's ScoringEnvelope.stt declares only four
 * fields (model, modelVersion, languageCode, promptBiasedRetries). SttMetadata is
 * a strict superset and is the better artifact — S4 should embed it wholesale
 * rather than lossily projecting down to four fields, and record the doc drift
 * in verification-log.md.
 */

export type { TranscriptStore, TranscriptionProvider, TranscriptionInput } from './ports';

export { toSpeakingTranscript } from './project/toSpeakingTranscript';
export { summariseQuality } from './quality/summariseQuality';

export { assembleSession } from './assemble/assembleSession';
export type { AssembleSessionMeta } from './assemble/assembleSession';

export { parseSessionTranscript, parseRawAsrResult, SessionTranscriptValidationError } from './schema';

export { createFixtureProvider } from './providers/fixtureProvider';
export { createFixtureTranscriptStore } from './providers/fixtureTranscriptStore';

export type {
  SessionTranscript,
  SessionQuestion,
  SessionQuestionSet,
  RawAsrResult,
  RawAsrWord,
  SttMetadata,
  TranscriptQuality,
  Utterance,
  Word,
  ExaminerEvent,
  ExaminerEventKind,
  SpeakerRole,
  SessionPart,
  ContentProvenance,
  AnnotationSource,
  AudioProvenance,
} from './types';
