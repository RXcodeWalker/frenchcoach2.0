import { describe, expect, it } from 'vitest';
import { parseAuthoredQuestionSet, validateAuthoredQuestionSet, QuestionBankValidationError } from '../validate';
import { buildCleanSet } from './fixtures';

describe('validateAuthoredQuestionSet — clean set', () => {
  it('returns no blocking errors on a clean, approved, fully-tagged set', () => {
    const report = validateAuthoredQuestionSet(buildCleanSet());
    expect(report.errors).toEqual([]);
  });

  it('parseAuthoredQuestionSet does not throw on a clean set', () => {
    expect(() => parseAuthoredQuestionSet(buildCleanSet())).not.toThrow();
  });

  it('reports info diagnostics for coverage', () => {
    const report = validateAuthoredQuestionSet(buildCleanSet());
    expect(report.info.some((d) => d.code === 'question-count')).toBe(true);
    expect(report.info.some((d) => d.code === 'difficulty-coverage')).toBe(true);
    expect(report.info.some((d) => d.code === 'time-frame-coverage')).toBe(true);
    expect(report.info.some((d) => d.code === 'target-structure-coverage')).toBe(true);
  });
});

describe('validateAuthoredQuestionSet — schemaVersion dispatch', () => {
  it('throws on missing schemaVersion', () => {
    const raw = { ...buildCleanSet() } as Record<string, unknown>;
    delete raw.schemaVersion;
    expect(() => validateAuthoredQuestionSet(raw)).toThrow(QuestionBankValidationError);
  });

  it('throws on unknown schemaVersion', () => {
    const raw = { ...buildCleanSet(), schemaVersion: 'question-bank-v99' };
    expect(() => validateAuthoredQuestionSet(raw)).toThrow(QuestionBankValidationError);
  });
});

describe('validateAuthoredQuestionSet — blocking structural errors', () => {
  it('rejects a role-play missing setup', () => {
    const set = buildCleanSet();
    const rolePlay = set.content.rolePlay as Partial<typeof set.content.rolePlay>;
    delete rolePlay.setup;
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('rejects a role-play with an empty-string setup', () => {
    const set = buildCleanSet();
    set.content.rolePlay.setup = '';
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('rejects a role-play with != 5 tasks', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks = set.content.rolePlay.tasks.slice(0, 4);
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'wrong-task-count')).toBe(true);
  });

  it('rejects a topic with != 5 questions', () => {
    const set = buildCleanSet();
    set.content.topic1.questions = set.content.topic1.questions.slice(0, 3);
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'wrong-question-count')).toBe(true);
  });

  it('rejects partsExpected===2 with missing secondPartText', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[2].secondPartText = undefined;
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'missing-second-part-text')).toBe(true);
  });

  it('rejects secondPartText identical to mainText', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[2].secondPartText = set.content.rolePlay.tasks[2].mainText;
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'second-part-equals-main')).toBe(true);
  });

  it('rejects partsExpected===1 carrying a secondPartText', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[0].secondPartText = 'Unexpected follow-up';
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'unexpected-second-part-text')).toBe(true);
  });

  it('rejects topic Q3 with zero alternativeTexts', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[2].alternativeTexts = [];
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'missing-alternative')).toBe(true);
  });

  it('allows topic Q1/Q2 (index 0,1) with zero alternativeTexts', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].alternativeTexts = [];
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'missing-alternative')).toBe(false);
  });

  it('rejects a topic question missing topicArea', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].topicArea = undefined;
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'missing-topic-area')).toBe(true);
  });

  it('rejects a topic question missing subTopic', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].subTopic = undefined;
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'missing-sub-topic')).toBe(true);
  });

  it('rejects a topic question missing difficulty', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].difficulty = undefined;
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'missing-difficulty')).toBe(true);
  });

  it('rejects a topic question missing targetStructures', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].targetStructures = [];
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'missing-target-structures')).toBe(true);
  });

  it('rejects a topic question missing expectedTimeFrame', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].expectedTimeFrame = undefined;
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'missing-expected-time-frame')).toBe(true);
  });

  it('does NOT require topic metadata on role-play tasks', () => {
    const set = buildCleanSet();
    // role-play tasks never carry subTopic/difficulty/targetStructures/expectedTimeFrame
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.path.startsWith('rolePlay') && e.code === 'missing-sub-topic')).toBe(false);
  });

  it('rejects duplicate questionIds across the set', () => {
    const set = buildCleanSet();
    set.content.topic2.questions[0].questionId = set.content.topic1.questions[0].questionId;
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'duplicate-question-id')).toBe(true);
  });

  it('rejects an unapproved (draft) set from entering the live registry', () => {
    const set = buildCleanSet();
    set.review = { status: 'draft' };
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'not-approved')).toBe(true);
  });

  it('rejects a bad questionId format (uppercase)', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[0].questionId = 'RP1';
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'bad-question-id-format')).toBe(true);
  });

  it('rejects a mainText containing a reserved canonicalization delimiter', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[0].mainText = `bad${String.fromCharCode(0x1e)}text`;
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'reserved-delimiter')).toBe(true);
  });

  it('rejects a mainText containing a control character', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[0].mainText = 'bad\ntext';
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'control-character')).toBe(true);
  });

  it('accepts kebab-case questionIds containing hyphens (does not false-positive on control-character)', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[0].questionId = 'rp-one';
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'control-character' && e.path.includes('questionId'))).toBe(false);
  });
});

describe('validateAuthoredQuestionSet — tag duplication (finding #4)', () => {
  it('flags a question-level topicArea that disagrees with its topic-level topicArea', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].topicArea = 'B';
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'topic-area-mismatch')).toBe(true);
  });

  it('flags a question-level subTopic that disagrees with its topic-level subTopic', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].subTopic = 'Something Else';
    const report = validateAuthoredQuestionSet(set);
    expect(report.errors.some((e) => e.code === 'sub-topic-mismatch')).toBe(true);
  });
});

describe('parseAuthoredQuestionSet', () => {
  it('throws only when errors is non-empty', () => {
    const set = buildCleanSet();
    set.content.topic1.questions = set.content.topic1.questions.slice(0, 3);
    expect(() => parseAuthoredQuestionSet(set)).toThrow(QuestionBankValidationError);
  });
});
