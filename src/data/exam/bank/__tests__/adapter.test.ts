import { describe, expect, it } from 'vitest';
import { toSessionQuestionSet } from '../adapter';
import { hashQuestionSet } from '../../../../domain/igcse/content/hashQuestionSet';
import { buildCleanSet } from './fixtures';

describe('toSessionQuestionSet — lossless round-trip on engine-relevant fields', () => {
  it('flattens role-play + topic1 + topic2 into one questions array in order', () => {
    const set = buildCleanSet();
    const projected = toSessionQuestionSet(set);
    expect(projected.questions.map((q) => q.questionId)).toEqual([
      'rp1', 'rp2', 'rp3', 'rp4', 'rp5',
      't1q1', 't1q2', 't1q3', 't1q4', 't1q5',
      't2q1', 't2q2', 't2q3', 't2q4', 't2q5',
    ]);
  });

  it('preserves questionSetId and furtherQuestions', () => {
    const set = buildCleanSet();
    const projected = toSessionQuestionSet(set);
    expect(projected.questionSetId).toBe(set.questionSetId);
    expect(projected.furtherQuestions.topic1).toEqual(set.content.topic1.furtherQuestions);
    expect(projected.furtherQuestions.topic2).toEqual(set.content.topic2.furtherQuestions);
  });

  it('carries every engine-relevant field for a two-part topic question', () => {
    const set = buildCleanSet();
    const projected = toSessionQuestionSet(set);
    const t1q4 = projected.questions.find((q) => q.questionId === 't1q4')!;
    const authored = set.content.topic1.questions[3];
    expect(t1q4.mainText).toBe(authored.mainText);
    expect(t1q4.alternativeTexts).toEqual(authored.alternativeTexts);
    expect(t1q4.partsExpected).toBe(2);
    expect(t1q4.secondPartText).toBe(authored.secondPartText);
    expect(t1q4.topicArea).toBe(authored.topicArea);
    expect(t1q4.expectedTimeFrame).toBe(authored.expectedTimeFrame);
  });

  it('drops operational and non-scoring selection metadata (subTopic/difficulty/targetStructures/review)', () => {
    const set = buildCleanSet();
    const projected = toSessionQuestionSet(set);
    const t1q1 = projected.questions.find((q) => q.questionId === 't1q1')! as unknown as Record<string, unknown>;
    expect(t1q1.subTopic).toBeUndefined();
    expect(t1q1.difficulty).toBeUndefined();
    expect(t1q1.targetStructures).toBeUndefined();
    expect((projected as unknown as Record<string, unknown>).review).toBeUndefined();
  });
});

describe('content hash excludes operational + non-scoring metadata (architecture doc §3.5)', () => {
  it('editing review/difficulty/subTopic does not change the hash', async () => {
    const set = buildCleanSet();
    const baseline = await hashQuestionSet(toSessionQuestionSet(set));

    set.review = { status: 'approved', reviewedBy: 'someone-else', notes: 'edited later' };
    set.content.topic1.questions[0].difficulty = 'higher';
    set.content.topic1.questions[0].subTopic = 'A different sub-topic label';

    const afterEdit = await hashQuestionSet(toSessionQuestionSet(set));
    expect(afterEdit).toBe(baseline);
  });

  it('editing mainText DOES change the hash', async () => {
    const set = buildCleanSet();
    const baseline = await hashQuestionSet(toSessionQuestionSet(set));

    set.content.topic1.questions[0].mainText = 'Une question completement differente ?';

    const afterEdit = await hashQuestionSet(toSessionQuestionSet(set));
    expect(afterEdit).not.toBe(baseline);
  });
});
