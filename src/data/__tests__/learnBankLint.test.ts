import { describe, expect, it } from 'vitest';
import type { Question } from '../../types';
import type { QuestionDemands } from '../../domain/learn/demand/types';
import { lintLearnBank } from '../learnBankLint';
import { QUESTIONS } from '../questions';

const DEMANDS = (timeFrames: QuestionDemands['timeFrames']): QuestionDemands => ({
  cognitiveDemand: 'describe',
  timeFrames,
  structures: [],
  responseLoad: 'developed',
  lexicalReach: 'everyday',
  sufficientAnswer: 'At least two reasons are given for the choice.',
  provenance: 'reviewed',
});

function q(over: Partial<Question> = {}): Question {
  return {
    id: 'sch_99',
    topicKey: 'school',
    text: 'Parle-moi de ton école.',
    hint: 'Talk about your school — size, subjects, teachers, uniform, facilities.',
    difficulty: 1,
    followUps: [],
    modelAnswer: '',
    keyVocab: [],
    ...over,
  };
}

const GOOD_HINT = {
  ideas: ["name two subjects and one you don't like", 'say what the lessons are like'],
  phrase: { fr: "Ce que j'aime le plus, c'est… parce que…", en: 'What I like most is… because…' },
};

const codes = (qs: Question[]) => lintLearnBank(qs).map((i) => i.code);

describe('lintLearnBank', () => {
  it('is quiet for a question with no Learn-only fields and a normal wording', () => {
    expect(lintLearnBank([q()])).toEqual([]);
  });

  describe('sub-topic-not-in-topic', () => {
    it('accepts a key from the topic list', () => {
      expect(codes([q({ subTopic: 'subjects' })])).toEqual([]);
    });
    it('errors on a key from another topic', () => {
      const [issue] = lintLearnBank([q({ subTopic: 'cooking' })]);
      expect(issue).toMatchObject({ code: 'sub-topic-not-in-topic', severity: 'error', questionId: 'sch_99' });
    });
    it('errors on any sub-topic for a topic without a list', () => {
      expect(codes([q({ topicKey: 'slang', subTopic: 'subjects' })])).toEqual(['sub-topic-not-in-topic']);
    });
  });

  describe('coach-hint-shape', () => {
    it('accepts a well-formed hint', () => {
      expect(codes([q({ coachHint: GOOD_HINT })])).toEqual([]);
    });
    it('errors on one idea, and on four', () => {
      const one = q({ coachHint: { ...GOOD_HINT, ideas: [GOOD_HINT.ideas[0]] } });
      const four = q({ coachHint: { ...GOOD_HINT, ideas: ['one two three', 'four five six', 'seven eight nine', 'ten eleven twelve'] } });
      expect(codes([one])).toEqual(['coach-hint-shape']);
      expect(codes([four])).toEqual(['coach-hint-shape']);
    });
    it('errors on a too-short idea and on an over-long one', () => {
      expect(codes([q({ coachHint: { ...GOOD_HINT, ideas: ['subjects', GOOD_HINT.ideas[1]] } })])).toEqual(['coach-hint-shape']);
      expect(codes([q({ coachHint: { ...GOOD_HINT, ideas: ['word '.repeat(30), GOOD_HINT.ideas[1]] } })])).toEqual(['coach-hint-shape']);
    });
    it('errors on a missing phrase half', () => {
      expect(codes([q({ coachHint: { ...GOOD_HINT, phrase: { fr: '', en: 'x' } } })])).toEqual(['coach-hint-shape']);
    });
  });

  describe('coach-hint-restates-question', () => {
    it('warns when an idea copies the legacy hint', () => {
      const bad = q({ coachHint: { ...GOOD_HINT, ideas: [q().hint, GOOD_HINT.ideas[1]] } });
      expect(lintLearnBank([bad])).toEqual([expect.objectContaining({ code: 'coach-hint-restates-question', severity: 'warning' })]);
    });
    it('warns when the phrase just repeats the question', () => {
      const bad = q({
        text: 'Quelles sont tes matières préférées et pourquoi ?',
        coachHint: { ...GOOD_HINT, phrase: { fr: 'Mes matières préférées sont… et pourquoi', en: 'My favourite subjects are…' } },
      });
      expect(codes([bad])).toEqual(['coach-hint-restates-question']);
    });
    it('does not warn on a genuine answer frame', () => {
      expect(codes([q({ text: 'Quelles sont tes matières préférées et pourquoi ?', coachHint: GOOD_HINT })])).toEqual([]);
    });
  });

  describe('coach-hint-tense-mismatch', () => {
    const past = (fr: string) => q({ demands: DEMANDS(['past']), coachHint: { ...GOOD_HINT, phrase: { fr, en: 'x' } } });
    it('warns when a past question gets a present frame', () => {
      expect(codes([past('En général, je fais… parce que…')])).toEqual(['coach-hint-tense-mismatch']);
    });
    it('accepts a passé composé frame for a past question', () => {
      expect(codes([past("La semaine dernière, j'ai… et c'était…")])).toEqual([]);
    });
    it('accepts a futur proche and a simple future for a future question', () => {
      const fut = (fr: string) => q({ demands: DEMANDS(['future']), coachHint: { ...GOOD_HINT, phrase: { fr, en: 'x' } } });
      expect(codes([fut("L'année prochaine, je vais…")])).toEqual([]);
      expect(codes([fut("Plus tard, j'irai…")])).toEqual([]);
    });
    it('accepts a conditional frame for a conditional question', () => {
      const cond = q({ demands: DEMANDS(['conditional']), coachHint: { ...GOOD_HINT, phrase: { fr: "Si j'étais le proviseur, je changerais…", en: 'x' } } });
      expect(codes([cond])).toEqual([]);
    });
    it('warns when a present-only question gets a past frame', () => {
      const bad = q({ demands: DEMANDS(['present']), coachHint: { ...GOOD_HINT, phrase: { fr: "Hier, j'ai…", en: 'x' } } });
      expect(codes([bad])).toEqual(['coach-hint-tense-mismatch']);
    });
    it('skips the tense check when the question has no demands tag', () => {
      expect(codes([q({ coachHint: { ...GOOD_HINT, phrase: { fr: "Hier, j'ai…", en: 'x' } } })])).toEqual([]);
    });
  });

  describe('wording rules (reuse patternLint)', () => {
    it('warns on a bare yes/no question', () => {
      expect(lintLearnBank([q({ text: 'Est-ce que tu aimes ton école ?' })])).toEqual([
        expect.objectContaining({ code: 'bare-yes-no-question', severity: 'warning' }),
      ]);
    });
    it('does not warn once the question has a second part, or is open', () => {
      expect(codes([q({ text: 'Est-ce que tu aimes ton école ? Pourquoi ?' })])).toEqual([]);
      expect(codes([q({ text: "Qu'est-ce que tu aimes dans ton école ?" })])).toEqual([]);
    });
    it('warns on a loaded negative', () => {
      expect(codes([q({ text: "Ne penses-tu pas que l'école est trop longue ?" })])).toContain('loaded-negative');
    });
  });
});

describe('the real bank', () => {
  it('has no lint errors (warnings are Batch 3b work)', () => {
    expect(lintLearnBank(QUESTIONS).filter((i) => i.severity === 'error')).toEqual([]);
  });
});
