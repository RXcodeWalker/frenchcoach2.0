/**
 * Stage 6: the projection hands the judge the marked text of each spoken
 * answer (Category A respelled) and its ambiguous spans; typed answers pass
 * through verbatim.
 */
import { describe, expect, it } from 'vitest';
import { ORIGINAL_QUESTION_SET_1 } from '../../../../data/exam/originalQuestionSets';
import { buildSessionTranscript } from '../../session/buildSessionTranscript';
import { candidateTurnToLogEntry, examinerActionToLogEntry } from '../../session/conductEngine';
import type { CandidateTurnResult, ConductLog } from '../../session/types';
import { buildEvidenceProfile } from '../../evidence/buildEvidence';
import { toSpeakingTranscript } from '../project/toSpeakingTranscript';
import type { UtteranceRecognition } from '../types';

const qs = ORIGINAL_QUESTION_SET_1;
const META = {
  sessionId: 'marked-session',
  recordedAt: '2026-01-01T00:00:00.000Z',
  contentProvenance: 'original-practice' as const,
  audio: { sha256: '0'.repeat(64), durationS: 60, sampleRateHz: 16000, channels: 1 },
  questionSetHash: '1'.repeat(64),
};

const turn = (transcript: string, extra: Partial<CandidateTurnResult> = {}): CandidateTurnResult => ({
  didRespond: true,
  relevant: true,
  transcript,
  wordCount: transcript.split(/\s+/).length,
  responseDurationS: 4,
  requestedRepeat: false,
  ...extra,
});

const topic1Q1 = qs.questions.find((q) => q.part === 'topic1')!;

/** seq 2: rp1 spoken (Whisper read it); seq 4: rp2 typed; seq 6: topic1 first question, live-captions fallback. */
function log(): ConductLog {
  const rp1 = qs.questions.find((q) => q.questionId === 'rp1')!;
  const rp2 = qs.questions.find((q) => q.questionId === 'rp2')!;
  return {
    sessionId: META.sessionId,
    questionSetId: qs.questionSetId,
    entries: [
      examinerActionToLogEntry({ kind: 'READ_MAIN', part: 'rolePlay', questionId: 'rp1', variant: 'main', text: rp1.mainText, trigger: 'scripted' }, 1, 0),
      candidateTurnToLogEntry(turn('Ils sont en chien'), 2, 2, 'rolePlay', 'rp1', true, 'answer'),
      examinerActionToLogEntry({ kind: 'READ_MAIN', part: 'rolePlay', questionId: 'rp2', variant: 'main', text: rp2.mainText, trigger: 'scripted' }, 3, 8),
      candidateTurnToLogEntry(turn('Ils mangent un pomme', { inputMode: 'text' }), 4, 10, 'rolePlay', 'rp2', true, 'answer'),
      examinerActionToLogEntry({ kind: 'READ_MAIN', part: 'topic1', questionId: topic1Q1.questionId, variant: 'main', text: topic1Q1.mainText, trigger: 'scripted' }, 5, 16),
      candidateTurnToLogEntry(turn("J'ai un frère. Ils mangent le soir."), 6, 18, 'topic1', topic1Q1.questionId, true, 'answer'),
    ],
  };
}

const whisper: UtteranceRecognition = {
  primary: { text: 'Ils ont un chien', model: 'whisper-large-v3', promptHash: 'a'.repeat(64), segments: [] },
  secondary: { source: 'web-speech-live', text: 'Ils sont en chien' },
  selected: 'primary',
  fallbackReason: null,
};
const fallback: UtteranceRecognition = {
  secondary: { source: 'web-speech-live', text: "J'ai un frère. Ils mangent le soir." },
  selected: 'secondary',
  fallbackReason: 'asr-timeout',
};

function project() {
  const session = buildSessionTranscript(log(), qs, {
    ...META,
    recognitionByTurnKey: new Map([
      [2, whisper],
      [6, fallback],
    ]),
  });
  return toSpeakingTranscript(session, qs);
}

describe('toSpeakingTranscript — marked text (stage 6)', () => {
  it('a spoken answer read by both recognisers carries their Category B disagreement', () => {
    const rp1 = project().rolePlay[0];
    expect(rp1.candidateResponse).toBe('Ils ont un chien');
    expect(rp1.ambiguousSpans).toEqual([
      expect.objectContaining({ kind: 'nearHomophone', basis: 'disagreement', heard: 'ont un', alternatives: ['sont en'] }),
    ]);
  });

  it('a typed answer is verbatim and carries no spans', () => {
    const rp2 = project().rolePlay[1];
    expect(rp2.candidateResponse).toBe('Ils mangent un pomme');
    expect(rp2.ambiguousSpans).toBeUndefined();
  });

  it('a live-captions fallback is respelled and every Category B word is uncertain', () => {
    const q1 = project().topicConversations[0].turns[0];
    expect(q1.candidateResponse).toBe("J'ai un frère. Il mange le soir.");
    expect(q1.ambiguousSpans?.map((s) => [s.heard, s.basis])).toEqual([
      ["J'ai", 'single-recogniser'],
      ['un', 'single-recogniser'],
      ['le', 'single-recogniser'],
    ]);
  });

  it('a task nobody answered carries no spans', () => {
    expect(project().rolePlay[4].ambiguousSpans).toBeUndefined();
  });

  it('the evidence profile keeps an audit copy of every answer with spans', () => {
    const evidence = buildEvidenceProfile(project());
    expect(evidence.ambiguousSpansByTurn.map((r) => [r.source, r.turnId, r.spans.length])).toEqual([
      ['rolePlay', 'rp1', 1],
      ['topic1', topic1Q1.questionId, 3],
    ]);
  });
});
