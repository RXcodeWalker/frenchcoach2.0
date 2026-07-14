import type { RawAsrResult, RawAsrWord, SessionQuestionSet } from '../types';

export const CLEAN_QUESTION_SET: SessionQuestionSet = {
  questionSetId: 'qs-clean-001',
  questions: [
    {
      questionId: 'q1',
      part: 'topic1',
      mainText: "Qu'est-ce que tu aimes faire le week-end ?",
      alternativeTexts: ['Que fais-tu pendant le week-end ?'],
      topicArea: 'A',
    },
    {
      questionId: 'q2',
      part: 'topic2',
      mainText: 'Quelle est ta matière préférée au collège ?',
      alternativeTexts: ['Quel est ton cours préféré ?'],
      topicArea: 'B',
    },
  ],
  furtherQuestions: {
    topic1: ['Further question 1?', 'Further question 2?'],
    topic2: ['Further question 3?', 'Further question 4?'],
  },
};

function w(text: string, startS: number, endS: number, speakerCluster: string, confidence = 0.95): RawAsrWord {
  return { text, startS, endS, confidence, speakerCluster };
}

/**
 * Clean two-question, two-speaker session: examiner asks q1 (topic1), candidate
 * answers, examiner asks q2 (topic2), candidate answers. No overlaps, no repeats.
 */
export const CLEAN_RAW_ASR_RESULT: RawAsrResult = {
  provider: 'whisperx',
  model: 'whisper-large-v3',
  modelVersion: '20231117',
  languageCode: 'fr',
  alignmentModel: 'wav2vec2-fr-align',
  diarizationModel: 'pyannote/speaker-diarization-3.1',
  decodeParamsHash: 'clean0000000000000000000000000000000000000000000000000000001',
  confidenceSource: 'whisperx-align-score',
  promptBiasedRetries: 0,
  transcribedAt: '2026-05-01T09:00:00.000Z',
  words: [
    // Examiner: q1 main question
    w("Qu'est-ce", 0.0, 0.3, 'SPEAKER_00'),
    w('que', 0.3, 0.4, 'SPEAKER_00'),
    w('tu', 0.4, 0.5, 'SPEAKER_00'),
    w('aimes', 0.5, 0.8, 'SPEAKER_00'),
    w('faire', 0.8, 1.1, 'SPEAKER_00'),
    w('le', 1.1, 1.2, 'SPEAKER_00'),
    w('week-end', 1.2, 1.7, 'SPEAKER_00'),
    w('?', 1.7, 1.7, 'SPEAKER_00'),

    // Candidate answer (after silence gap)
    w("J'aime", 3.5, 3.9, 'SPEAKER_01'),
    w('lire', 3.9, 4.2, 'SPEAKER_01'),
    w('des', 4.2, 4.3, 'SPEAKER_01'),
    w('livres', 4.3, 4.8, 'SPEAKER_01'),
    w('le', 4.8, 4.9, 'SPEAKER_01'),
    w('week-end', 4.9, 5.4, 'SPEAKER_01'),

    // Examiner: q2 main question (after silence gap)
    w('Quelle', 7.0, 7.3, 'SPEAKER_00'),
    w('est', 7.3, 7.5, 'SPEAKER_00'),
    w('ta', 7.5, 7.6, 'SPEAKER_00'),
    w('matière', 7.6, 8.0, 'SPEAKER_00'),
    w('préférée', 8.0, 8.5, 'SPEAKER_00'),
    w('au', 8.5, 8.6, 'SPEAKER_00'),
    w('collège', 8.6, 9.1, 'SPEAKER_00'),
    w('?', 9.1, 9.1, 'SPEAKER_00'),

    // Candidate answer
    w('Ma', 10.5, 10.6, 'SPEAKER_01'),
    w('matière', 10.6, 11.0, 'SPEAKER_01'),
    w('préférée', 11.0, 11.5, 'SPEAKER_01'),
    w('est', 11.5, 11.6, 'SPEAKER_01'),
    w('le', 11.6, 11.7, 'SPEAKER_01'),
    w('français', 11.7, 12.2, 'SPEAKER_01'),
  ],
};

export const CLEAN_ASSEMBLE_META = {
  sessionId: 'clean-001',
  contentProvenance: 'confidential-internal' as const,
  recordedAt: '2026-05-01T09:00:00.000Z',
  audio: {
    sha256: 'clean-audio-0000000000000000000000000000000000000000000000000001',
    durationS: 13,
    sampleRateHz: 16000,
    channels: 1,
  },
  questionSetHash: 'clean-qsh-00000000000000000000000000000000000000000000000001',
  annotationSource: 'asr-annotation' as const,
};
