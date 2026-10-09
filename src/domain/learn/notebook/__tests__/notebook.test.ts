import { describe, expect, it } from 'vitest';
import {
  NOTEBOOK_HISTORY_CAP,
  blankPhrases,
  groupNotebook,
  keyPhrases,
  parseNotebook,
  recallCheck,
  upsertEntry,
  type NotebookDraft,
  type NotebookEntry,
} from '../notebook';

const ANSWER = "Le week-end, je suis allé au cinéma avec mes amis parce que j'adore les films d'action.";

function draft(over: Partial<NotebookDraft> = {}): NotebookDraft {
  return {
    questionId: 'q1',
    question: 'Que fais-tu le week-end ?',
    topicKey: 'hobbies',
    subTopic: 'weekends',
    answer: ANSWER,
    phrases: ["j'adore les films d'action"],
    ...over,
  };
}

describe('upsertEntry', () => {
  it('adds a new question, newest first', () => {
    const a = upsertEntry([], draft(), '2026-10-01T10:00:00Z');
    const b = upsertEntry(a, draft({ questionId: 'q2', question: 'Autre ?' }), '2026-10-02T10:00:00Z');
    expect(b.map((e) => e.questionId)).toEqual(['q2', 'q1']);
    expect(b[1].history).toEqual([]);
  });

  it('replaces the answer for a known question and keeps the old one as history', () => {
    const a = upsertEntry([], draft(), '2026-10-01T10:00:00Z');
    const b = upsertEntry(a, draft({ answer: 'Je vais souvent au cinéma le week-end.', phrases: [] }), '2026-10-05T10:00:00Z');
    expect(b).toHaveLength(1);
    expect(b[0].answer).toBe('Je vais souvent au cinéma le week-end.');
    expect(b[0].savedAt).toBe('2026-10-05T10:00:00Z');
    expect(b[0].history).toEqual([{ answer: ANSWER, phrases: ["j'adore les films d'action"], savedAt: '2026-10-01T10:00:00Z' }]);
  });

  it('saving the same answer again changes nothing (same reference, no duplicate history)', () => {
    const a = upsertEntry([], draft(), '2026-10-01T10:00:00Z');
    expect(upsertEntry(a, draft({ answer: `  ${ANSWER.toUpperCase()}  ` }), '2026-10-09T10:00:00Z')).toBe(a);
  });

  it('caps the history', () => {
    let entries: NotebookEntry[] = [];
    for (let i = 0; i < NOTEBOOK_HISTORY_CAP + 4; i++) {
      entries = upsertEntry(entries, draft({ answer: `Version ${i}.` }), `2026-10-0${(i % 9) + 1}T10:00:00Z`);
    }
    expect(entries[0].history).toHaveLength(NOTEBOOK_HISTORY_CAP);
    expect(entries[0].answer).toBe(`Version ${NOTEBOOK_HISTORY_CAP + 3}.`);
  });

  it('ignores an empty answer or a missing question id', () => {
    expect(upsertEntry([], draft({ answer: '   ' }), 'x')).toEqual([]);
    expect(upsertEntry([], draft({ questionId: '' }), 'x')).toEqual([]);
  });

  it('omits a missing sub-topic rather than storing undefined', () => {
    const [e] = upsertEntry([], draft({ subTopic: undefined }), 'x');
    expect('subTopic' in e).toBe(false);
  });
});

describe('keyPhrases', () => {
  it('keeps strengths that are in the answer as whole words, in answer order, without duplicates', () => {
    expect(keyPhrases(ANSWER, ["j'adore les films d'action", 'je suis allé', 'JE SUIS ALLÉ', 'au cinéma avec mes amis'])).toEqual([
      'je suis allé',
      'au cinéma avec mes amis',
      "j'adore les films d'action",
    ]);
  });

  it('drops a strength the improved answer reworded, and a partial-word hit', () => {
    expect(keyPhrases(ANSWER, ['je suis allée', 'cinéma av', 'ciné'])).toEqual([]);
  });

  it('matches across typographic apostrophes and trailing punctuation', () => {
    expect(keyPhrases(ANSWER, ['j’adore les films d’action.'])).toEqual(['j’adore les films d’action.']);
  });

  it('keeps the earlier of two overlapping phrases', () => {
    expect(keyPhrases(ANSWER, ['au cinéma avec mes amis', 'avec mes amis parce que'])).toEqual(['au cinéma avec mes amis']);
  });
});

describe('blankPhrases', () => {
  it('splits the answer into text and blanks that rebuild the answer', () => {
    const segs = blankPhrases(ANSWER, ['je suis allé', "j'adore les films d'action"]);
    expect(segs.filter((s) => s.kind === 'blank').map((s) => s.kind === 'blank' && s.phrase)).toEqual(['je suis allé', "j'adore les films d'action"]);
    expect(segs.map((s) => (s.kind === 'text' ? s.text : s.phrase)).join('')).toBe(ANSWER);
  });

  it('with no phrases is the whole answer as one text segment', () => {
    expect(blankPhrases(ANSWER, [])).toEqual([{ kind: 'text', text: ANSWER }]);
  });

  it('skips a phrase that is not in the answer', () => {
    expect(blankPhrases(ANSWER, ['pas dans la réponse'])).toEqual([{ kind: 'text', text: ANSWER }]);
  });
});

describe('recallCheck', () => {
  const phrases = ['je suis allé', "j'adore les films d'action"];

  it('separates the phrases said from the rest', () => {
    const r = recallCheck(phrases, 'le week-end je suis allé au cinéma');
    expect(r.empty).toBe(false);
    expect(r.recalled).toEqual(['je suis allé']);
    expect(r.notHeard).toEqual(["j'adore les films d'action"]);
  });

  it('an empty take is not a verdict', () => {
    const r = recallCheck(phrases, '   ');
    expect(r.empty).toBe(true);
    expect(r.recalled).toEqual([]);
  });

  it('a paraphrase is neutral: nothing recalled, nothing negative', () => {
    const r = recallCheck(phrases, 'à la fin de la semaine je regarde un film');
    expect(r.empty).toBe(false);
    expect(r.recalled).toEqual([]);
    expect(r.notHeard).toEqual(phrases);
  });
});

describe('parseNotebook', () => {
  it('reads a stored value and drops malformed rows', () => {
    const good = upsertEntry([], draft(), '2026-10-01T10:00:00Z');
    const out = parseNotebook([
      ...good,
      null,
      'x',
      { questionId: 'q9' },
      { ...good[0], questionId: 'q1' },
      { ...good[0], questionId: 'q3', answer: '   ' },
      { ...good[0], questionId: 'q4', phrases: 'nope', history: [{ answer: 'ok', savedAt: 's' }, { bad: true }] },
    ]);
    expect(out.map((e) => e.questionId)).toEqual(['q1', 'q4']);
    expect(out[1].phrases).toEqual([]);
    expect(out[1].history).toEqual([{ answer: 'ok', phrases: [], savedAt: 's' }]);
  });

  it('is empty for anything that is not an array', () => {
    expect(parseNotebook(null)).toEqual([]);
    expect(parseNotebook({})).toEqual([]);
    expect(parseNotebook('x')).toEqual([]);
  });
});

describe('groupNotebook', () => {
  it('groups by topic then sub-topic, in the given orders, no sub-topic last', () => {
    let e: NotebookEntry[] = [];
    e = upsertEntry(e, draft({ questionId: 'a', topicKey: 'school', subTopic: 'exams' }), '1');
    e = upsertEntry(e, draft({ questionId: 'b', topicKey: 'hobbies', subTopic: 'sport' }), '2');
    e = upsertEntry(e, draft({ questionId: 'c', topicKey: 'hobbies', subTopic: undefined }), '3');
    e = upsertEntry(e, draft({ questionId: 'd', topicKey: 'hobbies', subTopic: 'music' }), '4');
    const groups = groupNotebook(e, ['hobbies', 'school'], (t) => (t === 'hobbies' ? ['music', 'sport'] : []));
    expect(groups.map((g) => g.topicKey)).toEqual(['hobbies', 'school']);
    expect(groups[0].subTopics.map((s) => s.subTopic)).toEqual(['music', 'sport', null]);
    expect(groups[0].subTopics[2].entries.map((x) => x.questionId)).toEqual(['c']);
  });
});
