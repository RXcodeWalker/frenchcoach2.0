/**
 * Stage 7: the report's Category B notes are COPIED from the envelope's
 * excusedErrors (ADR 0011), never from the model.
 */
import { describe, expect, it } from 'vitest';
import type { ExcusedQolError } from '../../igcse/judgement/types';
import { buildSoundAlikeNotes, isExamFeedbackReport, parseExamFeedback } from '../schema';
import { buildExamFeedbackPrompt } from '../prompt';
import { EXAM_FEEDBACK_VERSION } from '../version';
import { buildFixtureEnvelope } from './envelopeFixture';

function excused(over: Partial<ExcusedQolError> = {}): ExcusedQolError {
  return {
    source: 'topic1',
    turnId: 'q1',
    quote: 'ils sont un chien',
    kind: 'grammar',
    correction: 'ils ont un chien',
    reason: 'ambiguousNear',
    nearPairIds: ['ont~sont'],
    ...over,
  } as ExcusedQolError;
}

const EMPTY_MODEL_REPLY = JSON.stringify({
  rolePlay: { tasks: [], strengths: [], nextStep: null },
  communication: { strengths: [], nextStep: null },
  qualityOfLanguage: { strengths: [], errorCategories: [], nextStep: null },
});

describe('buildSoundAlikeNotes', () => {
  it('copies an ambiguousNear and a recognisersDisagree error verbatim', () => {
    const env = buildFixtureEnvelope();
    env.excusedErrors = [excused(), excused({ quote: 'il monge', correction: 'ils mangent', reason: 'recognisersDisagree', nearPairIds: [], turnId: 'q2' })];
    expect(buildSoundAlikeNotes(env)).toEqual([
      { quote: 'ils sont un chien', correction: 'ils ont un chien', source: 'topic1', turnId: 'q1', reason: 'ambiguousNear' },
      { quote: 'il monge', correction: 'ils mangent', source: 'topic1', turnId: 'q2', reason: 'recognisersDisagree' },
    ]);
  });

  it('says nothing about a Category A (inaudible) excuse — a spelling that sounds the same was never an error', () => {
    const env = buildFixtureEnvelope();
    env.excusedErrors = [excused({ reason: 'inaudible', nearPairIds: [] })];
    expect(buildSoundAlikeNotes(env)).toEqual([]);
  });

  it('is empty for a pre-v0.5 envelope with no excusedErrors, and drops duplicates and identical corrections', () => {
    const env = buildFixtureEnvelope();
    delete env.excusedErrors;
    expect(buildSoundAlikeNotes(env)).toEqual([]);
    env.excusedErrors = [excused(), excused(), excused({ correction: 'Ils sont un chien.' })];
    expect(buildSoundAlikeNotes(env)).toHaveLength(1);
  });
});

describe('the report carries the notes without the model', () => {
  it('a report is stamped v0.2 and holds the envelope-copied notes even when the model says nothing', () => {
    const env = buildFixtureEnvelope();
    env.excusedErrors = [excused()];
    // The model reply proposes nothing grounded; use the fixture's own strengths path instead.
    const reply = JSON.stringify({
      rolePlay: { tasks: env.rolePlayTasks.map((t) => ({ taskId: t.taskId, reason: null, quote: null, error: null })), strengths: [], nextStep: null },
      communication: { strengths: [], nextStep: null },
      qualityOfLanguage: { strengths: [], errorCategories: [], nextStep: null },
    });
    const report = parseExamFeedback(reply, env);
    // Nothing the model proposed is grounded, so the one-retry path applies (null); the notes never
    // rescue an empty reply, and they are never read from it.
    expect(report).toBeNull();
    expect(EMPTY_MODEL_REPLY).toContain('qualityOfLanguage');
    expect(EXAM_FEEDBACK_VERSION).toBe('exam-feedback-v0.2');
  });

  it('the prompt never mentions the excused errors (the model cannot write the notes)', () => {
    const env = buildFixtureEnvelope();
    env.excusedErrors = [excused({ quote: 'zzz-unique-quote' })];
    expect(buildExamFeedbackPrompt(env)).not.toContain('zzz-unique-quote');
  });

  it('a stored v0.1 report (no soundAlikeNotes) is still a valid report; a malformed notes field is not', () => {
    const base = {
      feedbackVersion: 'exam-feedback-v0.1',
      rolePlay: { tasks: [], strengths: [], nextStep: null },
      communication: { strengths: [], nextStep: null },
      qualityOfLanguage: { strengths: [], errors: [], nextStep: null },
    };
    expect(isExamFeedbackReport(base)).toBe(true);
    expect(isExamFeedbackReport({ ...base, qualityOfLanguage: { ...base.qualityOfLanguage, soundAlikeNotes: [] } })).toBe(true);
    expect(isExamFeedbackReport({ ...base, qualityOfLanguage: { ...base.qualityOfLanguage, soundAlikeNotes: 'x' } })).toBe(false);
  });
});
