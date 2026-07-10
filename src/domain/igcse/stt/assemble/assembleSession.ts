/**
 * S3 orchestration — the only exported entry point for turning a RawAsrResult
 * into a durable SessionTranscript. Pure: given the same inputs, always the
 * same output. Hashing is pure over bytes/digests the caller supplies; no
 * node:fs import here (that would break tsconfig.app.json typecheck).
 */

import { STT_ASSEMBLER_VERSION, STT_SCHEMA_VERSION, MATCH_THRESHOLD } from '../version';
import { segmentUtterances } from './segmentUtterances';
import { labelSpeakers } from './labelSpeakers';
import { annotateExaminer } from './annotateExaminer';
import type {
  AnnotationSource,
  AudioProvenance,
  ContentProvenance,
  RawAsrResult,
  SessionQuestionSet,
  SessionTranscript,
} from '../types';

export interface AssembleSessionMeta {
  sessionId: string;
  contentProvenance: ContentProvenance;
  recordedAt: string;
  audio: AudioProvenance;
  questionSetHash: string;
  /** 'asr-annotation' for teacher recordings (04 §6.1); 'session-engine-log' for app sessions (04 §6.5). */
  annotationSource: AnnotationSource;
}

export function assembleSession(
  raw: RawAsrResult,
  questionSet: SessionQuestionSet,
  meta: AssembleSessionMeta,
): SessionTranscript {
  const segmented = segmentUtterances(raw.words, questionSet);
  const { utterances, roleLabelConfidence } = labelSpeakers(segmented, questionSet);
  const examinerEvents = annotateExaminer(utterances, questionSet);

  return {
    schemaVersion: STT_SCHEMA_VERSION,
    assemblerVersion: STT_ASSEMBLER_VERSION,
    sessionId: meta.sessionId,
    recordedAt: meta.recordedAt,
    contentProvenance: meta.contentProvenance,
    userCorrected: false,
    audio: meta.audio,
    stt: {
      model: raw.model,
      modelVersion: raw.modelVersion,
      provider: raw.provider,
      languageCode: raw.languageCode,
      alignmentModel: raw.alignmentModel,
      diarizationModel: raw.diarizationModel,
      decodeParamsHash: raw.decodeParamsHash,
      confidenceSource: raw.confidenceSource,
      promptBiasedRetries: raw.promptBiasedRetries,
      transcribedAt: raw.transcribedAt,
    },
    annotationSource: meta.annotationSource,
    questionSetId: questionSet.questionSetId,
    questionSetHash: meta.questionSetHash,
    matchThreshold: MATCH_THRESHOLD,
    roleLabelConfidence,
    utterances,
    examinerEvents,
  };
}
