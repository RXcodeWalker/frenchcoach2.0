import { describe, expect, it } from 'vitest';
import { lintPatterns } from '../patternLint';
import { validateAuthoredQuestionSet } from '../validate';
import { buildCleanSet } from './fixtures';

function codes(set = buildCleanSet()): string[] {
  return lintPatterns(set.content).map((i) => i.code);
}

function issuesFor(code: string, set = buildCleanSet()) {
  return lintPatterns(set.content).filter((i) => i.code === code);
}

describe('lintPatterns — clean baseline', () => {
  it('reports nothing on the clean fixture', () => {
    expect(lintPatterns(buildCleanSet().content)).toEqual([]);
  });

  it('is never part of runtime validation (D12): an off-pattern set still validates', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[0].partsExpected = 2;
    set.content.rolePlay.tasks[0].secondPartText = 'Pour combien de personnes ?';
    expect(validateAuthoredQuestionSet(set).errors).toEqual([]);
    expect(codes(set)).toContain('two-part-position');
  });
});

describe('two-part-position (error)', () => {
  it('passes with second parts only on rp3–rp5 and Q3–Q5', () => {
    expect(issuesFor('two-part-position')).toEqual([]);
  });

  it('fires on a two-part rp1', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[1].partsExpected = 2;
    set.content.rolePlay.tasks[1].secondPartText = 'Et pour le retour ?';
    const hits = issuesFor('two-part-position', set);
    expect(hits.map((h) => [h.path, h.severity])).toEqual([['rolePlay.tasks[1]', 'error']]);
  });

  it('fires on a two-part topic Q2', () => {
    const set = buildCleanSet();
    set.content.topic2.questions[1].partsExpected = 2;
    set.content.topic2.questions[1].secondPartText = 'Pourquoi ?';
    expect(issuesFor('two-part-position', set).map((h) => h.path)).toEqual(['topic2.questions[1]']);
  });
});

describe('roleplay-two-part-count (error)', () => {
  it('passes with 2 two-part tasks', () => {
    expect(issuesFor('roleplay-two-part-count')).toEqual([]);
  });

  it('passes with 3 two-part tasks', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[4].partsExpected = 2;
    set.content.rolePlay.tasks[4].secondPartText = 'Pour quelle raison ?';
    expect(issuesFor('roleplay-two-part-count', set)).toEqual([]);
  });

  it('fires with only 1 two-part task', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[3].partsExpected = 1;
    delete set.content.rolePlay.tasks[3].secondPartText;
    expect(issuesFor('roleplay-two-part-count', set).map((h) => h.severity)).toEqual(['error']);
  });
});

describe('q3-q5-time-frames (error)', () => {
  it('passes when Q3–Q5 have a past and a future (or conditional)', () => {
    expect(issuesFor('q3-q5-time-frames')).toEqual([]);
  });

  it('fires when the only past question is Q2', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[1].expectedTimeFrame = 'past';
    set.content.topic1.questions[2].expectedTimeFrame = 'present';
    const hits = issuesFor('q3-q5-time-frames', set);
    expect(hits.map((h) => h.path)).toEqual(['topic1']);
    expect(hits[0].message).toContain('past');
  });

  it('fires when Q3–Q5 have no future or conditional', () => {
    const set = buildCleanSet();
    set.content.topic2.questions[4].expectedTimeFrame = 'present';
    expect(issuesFor('q3-q5-time-frames', set)[0].message).toContain('future/conditional');
  });
});

describe('register-mismatch (warning)', () => {
  it('passes a vous role play written in vous', () => {
    expect(issuesFor('register-mismatch')).toEqual([]);
  });

  it('fires on tu in a vous role play', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[1].mainText = 'Quand veux-tu partir ?';
    const hits = issuesFor('register-mismatch', set);
    expect(hits.map((h) => [h.path, h.severity])).toEqual([['rolePlay.tasks[1].mainText', 'warning']]);
  });

  it("catches an elided t' as a tu marker", () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[4].mainText = "Comment est-ce qu'on t'appelle ?";
    expect(issuesFor('register-mismatch', set).map((h) => h.path)).toEqual(['rolePlay.tasks[4].mainText']);
  });

  it('fires on vous in a topic question', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].mainText = 'Que mangez-vous au petit-déjeuner ?';
    expect(issuesFor('register-mismatch', set).map((h) => h.path)).toEqual(['topic1.questions[0].mainText']);
  });

  it('fires on vous in a tu role play', () => {
    const set = buildCleanSet();
    set.content.rolePlay.examinerRegister = 'tu';
    set.content.rolePlay.setup = 'Tu es chez ton ami. Je suis ton ami.';
    for (const t of set.content.rolePlay.tasks) {
      t.mainText = 'Que veux-tu faire ?';
      if (t.secondPartText) t.secondPartText = 'Avec qui ?';
    }
    set.content.rolePlay.tasks[0].mainText = 'Voulez-vous un café ?';
    expect(issuesFor('register-mismatch', set).map((h) => h.path)).toEqual(['rolePlay.tasks[0].mainText']);
  });
});

describe('echo-choice (error)', () => {
  it('passes open role-play questions', () => {
    expect(issuesFor('echo-choice')).toEqual([]);
  });

  it('fires on a single-part "X ou Y ?" task', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[1].mainText = 'Vous voulez partir le matin ou le soir ?';
    expect(issuesFor('echo-choice', set).map((h) => [h.path, h.severity])).toEqual([['rolePlay.tasks[1]', 'error']]);
  });

  it('passes a choice followed by a second part that asks for more', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[2].mainText = 'Vous préférez voyager en train ou en car ?';
    set.content.rolePlay.tasks[2].secondPartText = 'Pourquoi ?';
    expect(issuesFor('echo-choice', set)).toEqual([]);
  });

  it('fires when the second part is itself a choice', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[2].mainText = 'Vous préférez voyager en train ou en car ?';
    set.content.rolePlay.tasks[2].secondPartText = 'En première ou en seconde classe ?';
    expect(issuesFor('echo-choice', set).map((h) => h.path)).toEqual(['rolePlay.tasks[2]']);
  });

  it('does not mistake "où" (where) for "ou" (or)', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[0].mainText = 'Où voulez-vous aller ?';
    expect(issuesFor('echo-choice', set)).toEqual([]);
  });
});

describe('trivial-closing (error)', () => {
  it('passes an rp5 that asks for real content', () => {
    expect(issuesFor('trivial-closing')).toEqual([]);
  });

  it('fires on "Autre chose ?" as rp5', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[4].mainText = 'Vous désirez autre chose ?';
    expect(issuesFor('trivial-closing', set).map((h) => [h.path, h.severity])).toEqual([['rolePlay.tasks[4].mainText', 'error']]);
  });

  it('fires on "Ça vous convient ?" as rp5', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[4].mainText = 'Le train de dix heures, ça vous convient ?';
    expect(issuesFor('trivial-closing', set)).toHaveLength(1);
  });

  it('only checks rp5', () => {
    const set = buildCleanSet();
    set.content.rolePlay.tasks[1].mainText = "C'est tout ?";
    expect(issuesFor('trivial-closing', set)).toEqual([]);
  });
});

describe('loaded-negative (error)', () => {
  it('passes neutral questions', () => {
    expect(issuesFor('loaded-negative')).toEqual([]);
  });

  it('fires on "Ne penses-tu pas… ?"', () => {
    const set = buildCleanSet();
    set.content.topic2.questions[3].mainText = 'Ne penses-tu pas que la pollution est grave ?';
    expect(issuesFor('loaded-negative', set).map((h) => [h.path, h.severity])).toEqual([['topic2.questions[3].mainText', 'error']]);
  });

  it('fires on "N\'as-tu pas… ?" in an alternative', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[2].alternativeTexts = ["N'as-tu pas mangé au restaurant ?"];
    expect(issuesFor('loaded-negative', set).map((h) => h.path)).toEqual(['topic1.questions[2].alternativeTexts[0]']);
  });

  it('fires on "Est-ce que tu ne… pas ?" in a further question', () => {
    const set = buildCleanSet();
    set.content.topic1.furtherQuestions = ["Est-ce que tu ne manges pas trop de sucre ?", 'Qui cuisine chez toi ?'];
    expect(issuesFor('loaded-negative', set).map((h) => h.path)).toEqual(['topic1.furtherQuestions[0]']);
  });

  it('does not fire on a neutral negation inside an open question', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].mainText = "Qu'est-ce que tu ne manges jamais ?";
    expect(issuesFor('loaded-negative', set)).toEqual([]);
  });
});

describe('yes-no-question (warning)', () => {
  it('passes open questions and yes/no openers that carry a second part', () => {
    expect(issuesFor('yes-no-question')).toEqual([]);
  });

  it('fires on a bare inversion with no question word and no second part', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].mainText = 'Aimes-tu le fromage ?';
    expect(issuesFor('yes-no-question', set).map((h) => [h.path, h.severity])).toEqual([['topic1.questions[0].mainText', 'warning']]);
  });

  it('fires on a bare "Est-ce que…" further question', () => {
    const set = buildCleanSet();
    set.content.topic2.furtherQuestions = ['Est-ce que tu recycles ?', 'Quelle saison préfères-tu ?'];
    expect(issuesFor('yes-no-question', set).map((h) => h.path)).toEqual(['topic2.furtherQuestions[0]']);
  });

  it('does not fire on an inversion that contains a question word', () => {
    const set = buildCleanSet();
    set.content.topic1.questions[0].mainText = 'Manges-tu quels fruits le matin ?';
    expect(issuesFor('yes-no-question', set)).toEqual([]);
  });
});

describe('assumed-experience (warning)', () => {
  it('passes past questions that offer a way in', () => {
    expect(issuesFor('assumed-experience')).toEqual([]);
  });

  it('fires on a past question presupposing a trip abroad', () => {
    const set = buildCleanSet();
    set.content.topic2.questions[2].mainText = "Quel temps a-t-il fait pendant ton séjour à l'étranger ?";
    expect(issuesFor('assumed-experience', set).map((h) => [h.path, h.severity])).toEqual([['topic2.questions[2].mainText', 'warning']]);
  });

  it('ignores the keyword on a non-past question', () => {
    const set = buildCleanSet();
    set.content.topic2.questions[4].mainText = "Voudrais-tu habiter à l'étranger un jour ?";
    expect(issuesFor('assumed-experience', set)).toEqual([]);
  });
});
