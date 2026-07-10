import { describe, it, expect } from 'vitest';
import { assembleSession } from '../assemble/assembleSession';
import { parseSessionTranscript } from '../schema';
import type { AssembleSessionMeta } from '../assemble/assembleSession';
import type { RawAsrResult, SessionQuestionSet } from '../types';

import appConducted from './fixtures/app-conducted.json';
import cleanGolden from './fixtures/clean-session.golden.json';

import adversarialGolden from './fixtures/adversarial-session.golden.json';
import adversarialRaw from './fixtures/adversarial-raw-asr.json';
import adversarialQuestions from './fixtures/adversarial-questions.json';

import structGolden from './fixtures/structurally-complete.golden.json';
import structRaw from './fixtures/structurally-complete-raw-asr.json';
import structQuestions from './fixtures/structurally-complete-questions.json';

import shortGolden from './fixtures/short-duration.golden.json';
import shortRaw from './fixtures/short-duration-raw-asr.json';
import shortQuestions from './fixtures/short-duration-questions.json';

const ALL_FIXTURES = [
  ['app-conducted', appConducted],
  ['clean-session', cleanGolden],
  ['adversarial-session', adversarialGolden],
  ['structurally-complete', structGolden],
  ['short-duration', shortGolden],
] as const;

describe('every committed fixture JSON parses under the current schema', () => {
  for (const [name, fixture] of ALL_FIXTURES) {
    it(`${name} parses`, () => {
      expect(() => parseSessionTranscript(fixture)).not.toThrow();
    });
  }
});

describe('adversarial fixture', () => {
  const meta: AssembleSessionMeta = {
    sessionId: 'adversarial-001',
    contentProvenance: 'confidential-internal',
    recordedAt: '2026-05-01T09:00:00.000Z',
    audio: {
      sha256: 'adv-audio-000000000000000000000000000000000000000000000000001',
      durationS: 7,
      sampleRateHz: 16000,
      channels: 1,
    },
    questionSetHash: 'adv-qsh-0000000000000000000000000000000000000000000000001',
    annotationSource: 'asr-annotation',
  };

  it('overlapping speech, an echoing candidate, and a low-confidence span all survive assembly', () => {
    const result = assembleSession(
      adversarialRaw as RawAsrResult,
      adversarialQuestions as SessionQuestionSet,
      meta,
    );
    expect(result).toEqual(adversarialGolden);

    const candidateUtterance = result.utterances.find((u) => u.role === 'candidate');
    expect(candidateUtterance).toBeDefined();
    const minConfidence = Math.min(...candidateUtterance!.words.map((w) => w.confidence));
    expect(minConfidence).toBeLessThan(0.3);
  });

  it('candidate echoing the question text is not misclassified as an examiner event', () => {
    const result = assembleSession(
      adversarialRaw as RawAsrResult,
      adversarialQuestions as SessionQuestionSet,
      meta,
    );
    const mainQuestionEvents = result.examinerEvents.filter((e) => e.kind === 'main_question');
    expect(mainQuestionEvents).toHaveLength(1);
  });

  it('examiner back-channel is recorded as unmatched, not dropped', () => {
    const result = assembleSession(
      adversarialRaw as RawAsrResult,
      adversarialQuestions as SessionQuestionSet,
      meta,
    );
    const unmatched = result.examinerEvents.filter((e) => e.kind === 'unmatched');
    expect(unmatched).toHaveLength(1);
  });
});

describe('structurally complete fixture', () => {
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

  it('produces 5 role-play tasks and 5+5 topic questions, matching the golden output', () => {
    const result = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    expect(result).toEqual(structGolden);

    const rolePlayQuestionIds = new Set(
      result.examinerEvents.filter((e) => e.part === 'rolePlay').map((e) => e.questionId),
    );
    const topic1QuestionIds = new Set(
      result.examinerEvents.filter((e) => e.part === 'topic1').map((e) => e.questionId),
    );
    const topic2QuestionIds = new Set(
      result.examinerEvents.filter((e) => e.part === 'topic2').map((e) => e.questionId),
    );
    expect(rolePlayQuestionIds.size).toBe(5);
    expect(topic1QuestionIds.size).toBe(5);
    expect(topic2QuestionIds.size).toBe(5);
  });

  it('per-part candidate speaking time is derivable directly from utterances (S5 guardrail precondition)', () => {
    const result = assembleSession(structRaw as RawAsrResult, structQuestions as SessionQuestionSet, meta);
    const topic1Duration = result.utterances
      .filter((u) => u.role === 'candidate' && u.part === 'topic1')
      .reduce((sum, u) => sum + (u.endS - u.startS), 0);
    expect(topic1Duration).toBeGreaterThan(0);
  });
});

describe('short-duration fixture', () => {
  const meta: AssembleSessionMeta = {
    sessionId: 'short-duration-001',
    contentProvenance: 'confidential-internal',
    recordedAt: '2026-05-01T09:00:00.000Z',
    audio: {
      sha256: 'short-audio-0000000000000000000000000000000000000000000001',
      durationS: 12,
      sampleRateHz: 16000,
      channels: 1,
    },
    questionSetHash: 'short-qsh-00000000000000000000000000000000000000000001',
    annotationSource: 'asr-annotation',
  };

  it('candidate speaking time across topic1+topic2 is well under 4 minutes, matching golden output', () => {
    const result = assembleSession(shortRaw as RawAsrResult, shortQuestions as SessionQuestionSet, meta);
    expect(result).toEqual(shortGolden);

    const totalCandidateTopicDuration = result.utterances
      .filter((u) => u.role === 'candidate' && (u.part === 'topic1' || u.part === 'topic2'))
      .reduce((sum, u) => sum + (u.endS - u.startS), 0);
    expect(totalCandidateTopicDuration).toBeLessThan(240);
  });

  it('proves part attribution on Utterance actually works for a short session', () => {
    const result = assembleSession(shortRaw as RawAsrResult, shortQuestions as SessionQuestionSet, meta);
    expect(result.utterances.some((u) => u.part === 'rolePlay')).toBe(true);
    expect(result.utterances.some((u) => u.part === 'topic1')).toBe(true);
    expect(result.utterances.some((u) => u.part === 'topic2')).toBe(true);
  });
});
