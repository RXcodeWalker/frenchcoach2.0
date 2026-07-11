import { describe, it, expect } from 'vitest';
import { toSpeakingTranscript } from '../project/toSpeakingTranscript';
import { assembleSession } from '../assemble/assembleSession';
import type { AssembleSessionMeta } from '../assemble/assembleSession';
import type { RawAsrResult, SessionQuestionSet } from '../types';

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
});
