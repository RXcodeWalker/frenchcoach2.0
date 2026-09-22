import { describe, it, expect } from 'vitest';
import { toSpeakingTranscript } from '../project/toSpeakingTranscript';
import { assembleSession } from '../assemble/assembleSession';
import type { AssembleSessionMeta } from '../assemble/assembleSession';
import type { RawAsrResult, SessionQuestionSet, SessionTranscript, Utterance } from '../types';

import structGolden from './fixtures/structurally-complete.golden.json';
import structRaw from './fixtures/structurally-complete-raw-asr.json';
import structQuestions from './fixtures/structurally-complete-questions.json';

const meta: AssembleSessionMeta = {
  sessionId: 'structurally-complete-001',
  contentProvenance: 'confidential-internal',
  recordedAt: '2026-05-01T09:00:00.000Z',
  audio: {
    sha256: 'struct-audio-00000000000000000000000000000000000000000000001',
    durationS: (structRaw as RawAsrResult).words[(structRaw as RawAsrResult).words.length - 1].endS,
    sampleRateHz: 16000,
    channels: 1,
  },
  questionSetHash: 'struct-qsh-000000000000000000000000000000000000000000001',
  annotationSource: 'asr-annotation',
};

describe('toSpeakingTranscript', () => {
  it('produces five role-play tasks in order', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    expect(transcript.rolePlay).toHaveLength(5);
    expect(transcript.rolePlay.map((t) => t.taskId)).toEqual(['rp1', 'rp2', 'rp3', 'rp4', 'rp5']);
  });

  it('produces exactly two topic conversations', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    expect(transcript.topicConversations).toHaveLength(2);
    expect(transcript.topicConversations[0].conversationId).toBe('topic1');
    expect(transcript.topicConversations[1].conversationId).toBe('topic2');
  });

  it('excludes examiner speech from candidate responses', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    for (const task of transcript.rolePlay) {
      expect(task.candidateResponse).not.toContain(task.taskPrompt);
    }
  });

  it('carries expectedTimeFrame and partsExpected across', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    const rp3 = transcript.rolePlay.find((t) => t.taskId === 'rp3');
    expect(rp3?.partsExpected).toBe(2);

    const pastTurn = transcript.topicConversations[0].turns.find((t) => t.turnId === 't1q4');
    expect(pastTurn?.expectedTimeFrame).toBe('past');
  });

  it('joins multi-utterance candidate turns with a single space', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);
    const turn = transcript.topicConversations[0].turns[0];
    expect(turn.candidateResponse).not.toMatch(/\s{2,}/);
  });

  it('uses the golden fixture unchanged', () => {
    expect(structGolden.utterances.length).toBeGreaterThan(0);
  });

  it('sums candidate utterance durations into candidateResponseDurationS per turn', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);

    for (const conversation of transcript.topicConversations) {
      for (const turn of conversation.turns) {
        const candidateUtterances = session.utterances.filter(
          (u) => u.role === 'candidate' && u.part === conversation.conversationId && u.questionId === turn.turnId,
        );
        const expectedDuration = candidateUtterances.reduce((sum, u) => sum + (u.endS - u.startS), 0);
        expect(turn.candidateResponseDurationS).toBe(expectedDuration);
      }
    }
  });

  it('leaves ConversationTurn.inputMode undefined for ASR-annotated recordings (no dual-input provenance)', () => {
    const session = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const transcript = toSpeakingTranscript(session, structQuestions as SessionQuestionSet);

    for (const conversation of transcript.topicConversations) {
      for (const turn of conversation.turns) {
        expect(turn.inputMode).toBeUndefined();
      }
    }
  });

  describe('W1: ConversationTurn.inputMode derivation', () => {
    const qs: SessionQuestionSet = {
      questionSetId: 'input-mode-qs',
      questions: [
        { questionId: 'q1', part: 'topic1', mainText: 'Q1?', alternativeTexts: [] },
        { questionId: 'q2', part: 'topic1', mainText: 'Q2?', alternativeTexts: [] },
        { questionId: 'q3', part: 'topic1', mainText: 'Q3?', alternativeTexts: [] },
      ],
      furtherQuestions: { topic1: ['f1', 'f2'], topic2: ['f1', 'f2'] },
    };

    function candidateUtterance(over: Partial<Utterance>): Utterance {
      return {
        utteranceId: 'u',
        role: 'candidate',
        speakerCluster: 'user',
        part: 'topic1',
        questionId: 'q1',
        startS: 0,
        endS: 1,
        text: 'Réponse.',
        words: [],
        ...over,
      };
    }

    function sessionWith(utterances: Utterance[]): SessionTranscript {
      return {
        schemaVersion: 'session-transcript-v1',
        assemblerVersion: 'test',
        sessionId: 'input-mode-session',
        recordedAt: '2026-01-01T00:00:00.000Z',
        contentProvenance: 'original-practice',
        userCorrected: false,
        audio: { sha256: '0'.repeat(64), durationS: 10, sampleRateHz: 16000, channels: 1 },
        stt: {
          model: 'test',
          modelVersion: 'test',
          provider: 'test',
          languageCode: 'fr',
          alignmentModel: null,
          diarizationModel: null,
          decodeParamsHash: '0'.repeat(64),
          confidenceSource: 'faster-whisper-probability',
          promptBiasedRetries: 0,
          transcribedAt: '2026-01-01T00:00:00.000Z',
        },
        annotationSource: 'session-engine-log',
        questionSetId: qs.questionSetId,
        questionSetHash: '1'.repeat(64),
        matchThreshold: 1,
        roleLabelConfidence: 1,
        utterances,
        examinerEvents: [],
      };
    }

    it("is 'text' when every candidate utterance behind the turn was typed", () => {
      const session = sessionWith([candidateUtterance({ questionId: 'q1', inputMode: 'text' })]);
      const transcript = toSpeakingTranscript(session, qs);
      expect(transcript.topicConversations[0].turns.find((t) => t.turnId === 'q1')?.inputMode).toBe('text');
    });

    it("is 'speech' when at least one candidate utterance behind the turn was spoken", () => {
      const session = sessionWith([
        candidateUtterance({ utteranceId: 'u1', questionId: 'q2', inputMode: 'text' }),
        candidateUtterance({ utteranceId: 'u2', questionId: 'q2', inputMode: 'speech' }),
      ]);
      const transcript = toSpeakingTranscript(session, qs);
      expect(transcript.topicConversations[0].turns.find((t) => t.turnId === 'q2')?.inputMode).toBe('speech');
    });

    it('is undefined when no candidate utterance carries inputMode provenance', () => {
      const session = sessionWith([candidateUtterance({ questionId: 'q3', inputMode: undefined })]);
      const transcript = toSpeakingTranscript(session, qs);
      expect(transcript.topicConversations[0].turns.find((t) => t.turnId === 'q3')?.inputMode).toBeUndefined();
    });
  });
});
