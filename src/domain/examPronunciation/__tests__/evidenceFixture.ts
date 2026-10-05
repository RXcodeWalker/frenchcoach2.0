import type { ExamPronunciationEvidenceWord, ExamPronunciationTurnEvidence } from '../types';
import type { SessionPart } from '../../igcse/stt/types';

/** One assessed word; defaults to a clean, agreed, correctly pronounced word. */
export function ev(word: string, overrides: Partial<ExamPronunciationEvidenceWord> = {}): ExamPronunciationEvidenceWord {
  return {
    word,
    accuracyScore: 92,
    errorType: 'correct',
    offsetMs: 200,
    durationMs: 300,
    nearChunkBoundary: false,
    phonemeScores: [92],
    examWord: word,
    recognizersAgree: true,
    suppressed: [],
    ...overrides,
  };
}

/** A mispronounced word at `accuracy`. */
export function bad(word: string, accuracy: number, overrides: Partial<ExamPronunciationEvidenceWord> = {}) {
  return ev(word, { errorType: 'mispronounced', accuracyScore: accuracy, ...overrides });
}

export function turn(
  turnKey: number,
  words: ExamPronunciationEvidenceWord[],
  overrides: Partial<ExamPronunciationTurnEvidence> = {},
  part: SessionPart = 'topic1',
): ExamPronunciationTurnEvidence {
  // Lay words out one after another, 500 ms apart, unless a test set offsets itself.
  const laidOut = words.map((w, i) => (w.offsetMs === 200 ? { ...w, offsetMs: 200 + i * 500 } : w));
  return {
    sessionId: 's1',
    part,
    turnKey: String(turnKey),
    assessorVersion: 'exam-pronunciation-v1',
    fairnessVersion: 'exam-pronunciation-fairness-v1',
    examTranscript: words.map((w) => w.examWord ?? w.word).join(' '),
    referenceText: words.map((w) => w.word).join(' '),
    words: laidOut,
    couldNotAssess: false,
    couldNotAssessReason: null,
    singleRecognizer: false,
    snrDb: 25,
    azureConfidence: 0.9,
    chunkCount: 1,
    chunksFailed: 0,
    rawS: 6,
    trimmedS: 4,
    pauseStats: { pausesOver2s: 0, longestPauseS: 0.8 },
    clippedRatio: 0,
    createdAt: null,
    ...overrides,
  };
}
