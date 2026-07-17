import { describe, expect, it } from 'vitest';
import { lintCorpus } from '../corpusLint';
import { buildCleanSet } from './fixtures';
import type { AuthoredQuestionSet } from '../types';

function cloneSet(set: AuthoredQuestionSet, questionSetId: string): AuthoredQuestionSet {
  const clone = structuredClone(set);
  clone.questionSetId = questionSetId;
  return clone;
}

describe('lintCorpus — quiet on a clean multi-set corpus', () => {
  it('produces no issues when sets are distinct', () => {
    const setA = buildCleanSet();
    const setB = cloneSet(setA, 'test-set-2');
    // Distinguish every text field so setB isn't a trivial full-corpus duplicate.
    setB.content.rolePlay.title = 'Une autre situation';
    setB.content.rolePlay.tasks[0].mainText = 'Saluez le professeur present.';
    setB.content.rolePlay.tasks[1].mainText = 'Indiquez le jour de votre arrivee.';
    setB.content.rolePlay.tasks[2].mainText = 'Demandez le tarif du sejour.';
    setB.content.rolePlay.tasks[2].secondPartText = "Demandez s'il y a un supplement le week-end.";
    setB.content.rolePlay.tasks[3].mainText = 'Dites que vous reglez en especes.';
    setB.content.rolePlay.tasks[4].mainText = 'Remerciez la personne et partez.';
    setB.content.topic1.questions[0].mainText = 'Quel sport pratiques-tu le week-end ?';
    setB.content.topic1.questions[0].alternativeTexts = [];
    setB.content.topic1.questions[1].mainText = 'Decris ton quartier prefere.';
    setB.content.topic1.questions[1].alternativeTexts = [];
    setB.content.topic1.questions[2].mainText = 'As-tu deja participe a une competition sportive ?';
    setB.content.topic1.questions[2].alternativeTexts = ['Raconte un evenement sportif marquant.'];
    setB.content.topic1.questions[3].mainText = 'Preferes-tu le sport individuel ou en equipe ?';
    setB.content.topic1.questions[3].alternativeTexts = ['Quel sport aimes-tu regarder ?'];
    setB.content.topic1.questions[4].mainText = 'Quel sport voudrais-tu essayer bientot ?';
    setB.content.topic1.questions[4].alternativeTexts = ['Quels sont tes projets sportifs ?'];
    setB.content.topic2.questions[0].mainText = 'Que penses-tu du recyclage chez toi ?';
    setB.content.topic2.questions[0].alternativeTexts = [];
    setB.content.topic2.questions[1].mainText = 'Decris un parc que tu aimes visiter.';
    setB.content.topic2.questions[1].alternativeTexts = [];
    setB.content.topic2.questions[2].mainText = 'As-tu deja assiste a un evenement culturel local ?';
    setB.content.topic2.questions[2].alternativeTexts = ['Parle-moi d’une sortie culturelle recente.'];
    setB.content.topic2.questions[3].mainText = 'Penses-tu que ta ville protege assez la nature ?';
    setB.content.topic2.questions[3].alternativeTexts = ['Que penses-tu des espaces verts en ville ?'];
    setB.content.topic2.questions[4].mainText = 'Comment imagines-tu ta ville dans dix ans ?';
    setB.content.topic2.questions[4].alternativeTexts = ['Ou aimerais-tu habiter plus tard ?'];
    setB.content.topic1.furtherQuestions = ['Question supplementaire unique un.', 'Question supplementaire unique deux.'];
    setB.content.topic2.furtherQuestions = ['Autre question totalement differente.', 'Encore une question bien distincte.'];

    const report = lintCorpus([setA, setB]);
    expect(report.issues).toEqual([]);
  });
});

describe('lintCorpus — fires on deliberately duplicated content across sets', () => {
  it('flags a mainText recycled verbatim in another set', () => {
    const setA = buildCleanSet();
    const setB = cloneSet(setA, 'test-set-2');
    // setB is left as an exact clone of setA's topic1 Q1 mainText.
    const report = lintCorpus([setA, setB]);
    expect(report.issues.some((i) => i.code === 'cross-set-duplicate-main-text')).toBe(true);
  });

  it('flags an alternativeText recycled across sets', () => {
    const setA = buildCleanSet();
    const setB = cloneSet(setA, 'test-set-2');
    setB.content.topic1.questions[0].mainText = 'Une question totalement differente ici.';
    setB.content.topic1.questions[1].mainText = 'Encore une question bien distincte.';
    setB.content.topic1.questions[2].alternativeTexts = [setA.content.topic1.questions[2].alternativeTexts[0]];
    const report = lintCorpus([setA, setB]);
    expect(report.issues.some((i) => i.code === 'cross-set-duplicate-alternative')).toBe(true);
  });

  it('flags a further question recycled across sets', () => {
    const setA = buildCleanSet();
    const setB = cloneSet(setA, 'test-set-2');
    setB.content.topic1.furtherQuestions = [...setA.content.topic1.furtherQuestions] as [string, string];
    const report = lintCorpus([setA, setB]);
    expect(report.issues.some((i) => i.code === 'cross-set-duplicate-further-question')).toBe(true);
  });

  it('flags a near-identical role-play title across sets', () => {
    const setA = buildCleanSet();
    const setB = cloneSet(setA, 'test-set-2');
    setB.content.topic1.questions[0].mainText = 'Une question totalement differente ici.';
    setB.content.topic1.questions[1].mainText = 'Encore une question bien distincte.';
    // rolePlay.title left identical to setA's.
    const report = lintCorpus([setA, setB]);
    expect(report.issues.some((i) => i.code === 'cross-set-duplicate-role-play')).toBe(true);
  });

  it('does not flag within-set similarity as a cross-set issue (same setId pairs are skipped)', () => {
    const setA = buildCleanSet();
    const report = lintCorpus([setA]);
    expect(report.issues.filter((i) => i.code.startsWith('cross-set-duplicate'))).toEqual([]);
  });
});

describe('lintCorpus — overused prompt stems', () => {
  it('flags a stem repeated in more than 3 sets', () => {
    const sets: AuthoredQuestionSet[] = [];
    for (let n = 0; n < 4; n += 1) {
      const s = cloneSet(buildCleanSet(), `test-set-${n}`);
      s.content.topic1.questions[0].mainText = 'Que penses-tu de ce sujet numero ' + n + ' ?';
      sets.push(s);
    }
    const report = lintCorpus(sets);
    expect(report.issues.some((i) => i.code === 'corpus-overused-stem')).toBe(true);
  });
});

describe('lintCorpus — tag duplication (finding #4)', () => {
  it('flags a question-level topicArea that disagrees with its topic-level topicArea', () => {
    const setA = buildCleanSet();
    setA.content.topic1.questions[0].topicArea = 'B';
    const report = lintCorpus([setA]);
    expect(report.issues.some((i) => i.code === 'topic-area-mismatch')).toBe(true);
  });

  it('flags a question-level subTopic that disagrees with its topic-level subTopic', () => {
    const setA = buildCleanSet();
    setA.content.topic1.questions[0].subTopic = 'Something Else';
    const report = lintCorpus([setA]);
    expect(report.issues.some((i) => i.code === 'sub-topic-mismatch')).toBe(true);
  });
});

describe('lintCorpus — legacy app bank overlap', () => {
  it('flags authored text recycled from the legacy question bank when texts are supplied', () => {
    const setA = buildCleanSet();
    const legacyTexts = [setA.content.topic1.questions[0].mainText];
    const report = lintCorpus([setA], legacyTexts);
    expect(report.issues.some((i) => i.code === 'legacy-bank-overlap')).toBe(true);
  });

  it('is silent when no legacy texts are supplied', () => {
    const setA = buildCleanSet();
    const report = lintCorpus([setA]);
    expect(report.issues.some((i) => i.code === 'legacy-bank-overlap')).toBe(false);
  });
});

describe('lintCorpus — coverage diagnostics', () => {
  it('reports pair, role-play area, topic-slot, structure, conditional, and difficulty coverage', () => {
    const setA = buildCleanSet();
    const report = lintCorpus([setA]);
    const codes = new Set(report.coverage.map((c) => c.code));
    expect(codes.has('corpus-pair-coverage')).toBe(true);
    expect(codes.has('corpus-roleplay-area-coverage')).toBe(true);
    expect(codes.has('corpus-topic-slot-coverage')).toBe(true);
    expect(codes.has('corpus-structure-coverage')).toBe(true);
    expect(codes.has('corpus-conditional-topic-count')).toBe(true);
    expect(codes.has('corpus-difficulty-coverage')).toBe(true);
  });

  it('counts the A+C pair once for the clean fixture (topic1=A, topic2=C)', () => {
    const setA = buildCleanSet();
    const report = lintCorpus([setA]);
    const pairDiag = report.coverage.find((c) => c.code === 'corpus-pair-coverage' && c.value === 'A+C:1');
    expect(pairDiag).toBeDefined();
  });
});
