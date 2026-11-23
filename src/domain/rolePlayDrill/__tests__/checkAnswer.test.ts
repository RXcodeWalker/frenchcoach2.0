import { describe, expect, it } from 'vitest';
import { checkAnswer, isSilentAnswer } from '../checkAnswer';
import { STORY_CARDS, type StoryTask } from '../../../data/storyCards';

function task(id: string, taskId: number): StoryTask {
  const card = STORY_CARDS.find((c) => c.id === id)!;
  return card.tasks.find((t) => t.taskId === taskId)!;
}

// rpc_24_01: Nice. Task 1 "how long" (present), 3 "likes" + "why" (present),
// 4 "what they visited" + "what it was like" (past), 5 "what they will do" (future).
const howLong = task('rpc_24_01', 1);
const likesWhy = task('rpc_24_01', 3);
const visited = task('rpc_24_01', 4);
const tomorrow = task('rpc_24_01', 5);

describe('isSilentAnswer', () => {
  it.each(['', '   ', '.', '…', '?!', 'euh', 'Euh... hmm', 'um, uh'])('treats %j as nothing heard', (t) => {
    expect(isSilentAnswer(t)).toBe(true);
  });
  it.each(['Oui.', 'Demain', 'Au musée.', 'Euh... une semaine'])('treats %j as an answer', (t) => {
    expect(isSilentAnswer(t)).toBe(false);
  });
});

describe('checkAnswer — what was heard', () => {
  it('a silent reply is not heard, covers nothing, and says so', () => {
    const c = checkAnswer('', howLong);
    expect(c.heard).toBe(false);
    expect(c.complete).toBe(false);
    expect(c.partsCovered).toEqual([]);
    expect(c.partsMissing).toEqual(['how long']);
    expect(c.tip).toMatch(/nothing was heard/i);
    expect(c.modelShort).toBe(howLong.modelShort);
  });

  it('a filler-only reply is not heard', () => {
    expect(checkAnswer('euh... hmm', howLong).heard).toBe(false);
  });

  it('a heard reply that covers nothing lists every part as missing', () => {
    const c = checkAnswer('Je ne sais pas.', likesWhy);
    expect(c.heard).toBe(true);
    expect(c.complete).toBe(false);
    expect(c.partsMissing).toEqual(['what they like', 'why']);
    expect(c.tip).toMatch(/still to say: what they like and why/i);
  });
});

describe('checkAnswer — short answers that communicate fully', () => {
  it('« Au musée. » passes the "what they visited" part of a task', () => {
    const museum = task('rpc_24_01', 4);
    const c = checkAnswer('Au musée.', { ...museum, parts: [museum.parts[0]] });
    expect(c.partsCovered).toEqual(['what they visited']);
    expect(c.complete).toBe(true);
    expect(c.tip).toBeUndefined();
  });

  it('a one-word / two-word answer to a one-part task is complete', () => {
    expect(checkAnswer('Une semaine.', howLong).complete).toBe(true);
    expect(checkAnswer('une semaine', howLong).complete).toBe(true);
  });

  it('each task\'s own modelShort is accepted by that task', () => {
    for (const card of STORY_CARDS) {
      for (const t of card.tasks) {
        const c = checkAnswer(t.modelShort, t);
        expect(c.complete, `${card.id}#${t.taskId}: ${t.modelShort}`).toBe(true);
        expect(c.timeFrameIssue, `${card.id}#${t.taskId}`).toBeUndefined();
      }
    }
  });

  it('a long, developed answer is not penalised and earns no tip', () => {
    const c = checkAnswer(
      "Alors, je reste à Nice pendant une semaine avec ma famille parce que nous aimons beaucoup la mer et le soleil.",
      howLong,
    );
    expect(c.complete).toBe(true);
    expect(c.tip).toBeUndefined();
  });
});

describe('checkAnswer — accent and case insensitivity', () => {
  it('ignores accents and capitals in the answer', () => {
    expect(checkAnswer('LA VIEILLE VILLE. C’ETAIT TRES BEAU.', visited).complete).toBe(true);
    expect(checkAnswer('la vieille ville. c\'était très beau', visited).complete).toBe(true);
  });
});

describe('checkAnswer — a half-answered two-part task', () => {
  it('reports the covered and the missing part, in task order', () => {
    const c = checkAnswer("J'ai visité la vieille ville.", visited);
    expect(c.heard).toBe(true);
    expect(c.partsCovered).toEqual(['what they visited']);
    expect(c.partsMissing).toEqual(['what it was like']);
    expect(c.complete).toBe(false);
    expect(c.parts).toEqual([
      { label: 'what they visited', found: true },
      { label: 'what it was like', found: false },
    ]);
    expect(c.tip).toBe('Still to say: what it was like. A few words is enough.');
  });

  it('works the other way round (the second part alone)', () => {
    const c = checkAnswer("C'était très beau.", visited);
    expect(c.partsCovered).toEqual(['what it was like']);
    expect(c.partsMissing).toEqual(['what they visited']);
  });

  it('a two-part task answered fully is complete', () => {
    const c = checkAnswer("Le musée Matisse, c'était intéressant.", visited);
    expect(c.complete).toBe(true);
    expect(c.partsMissing).toEqual([]);
  });
});

describe('checkAnswer — time frame', () => {
  it('flags a past question answered with the near future', () => {
    const c = checkAnswer('Je vais visiter la vieille ville. Ça va être très beau.', visited);
    expect(c.timeFrameIssue).toEqual({ expected: 'past', found: 'future' });
  });

  it('with every part covered, the time-frame tip is the one tip', () => {
    const c = checkAnswer('Je vais visiter le musée, ça va être intéressant.', visited);
    expect(c.complete).toBe(true);
    expect(c.timeFrameIssue?.expected).toBe('past');
    expect(c.tip).toMatch(/past/i);
  });

  it('when parts are missing the tip names the parts, not the tense (one tip only)', () => {
    const c = checkAnswer('Je vais visiter la vieille ville.', visited);
    expect(c.timeFrameIssue?.expected).toBe('past');
    expect(c.tip).toMatch(/still to say/i);
  });

  it('accepts a past-tense answer to a past question (passé composé and imparfait)', () => {
    expect(checkAnswer("J'ai visité la vieille ville, c'était beau.", visited).timeFrameIssue).toBeUndefined();
    expect(checkAnswer('Je suis allé au musée. Il était grand.', visited).timeFrameIssue).toBeUndefined();
  });

  it('flags a future question answered in the past', () => {
    const c = checkAnswer("J'ai visité le marché hier.", tomorrow);
    expect(c.timeFrameIssue).toEqual({ expected: 'future', found: 'past' });
  });

  it('accepts « je vais », the futur simple and an infinitive for a future question', () => {
    expect(checkAnswer('Je vais aller au marché.', tomorrow).timeFrameIssue).toBeUndefined();
    expect(checkAnswer("J'irai au marché.", tomorrow).timeFrameIssue).toBeUndefined();
    expect(checkAnswer('Demain, nous visiterons le château.', tomorrow).timeFrameIssue).toBeUndefined();
    expect(checkAnswer('Aller au marché.', tomorrow).timeFrameIssue).toBeUndefined();
  });

  it('never flags an elliptical answer, whatever the question\'s frame', () => {
    expect(checkAnswer('Au musée.', visited).timeFrameIssue).toBeUndefined();
    expect(checkAnswer('À Nice.', tomorrow).timeFrameIssue).toBeUndefined();
    expect(checkAnswer('Le marché.', tomorrow).timeFrameIssue).toBeUndefined();
  });

  it('does not read « à » (to) as « a » (has), nor « il a du pain » as a past tense', () => {
    expect(checkAnswer('À Nice, avec des amis.', tomorrow).timeFrameIssue).toBeUndefined();
    expect(checkAnswer("Il a du temps et j'ai envie de nager.", tomorrow).timeFrameIssue).toBeUndefined();
  });

  it('never flags a present-frame question', () => {
    expect(checkAnswer("J'ai réservé une semaine.", howLong).timeFrameIssue).toBeUndefined();
    expect(checkAnswer('Je vais rester une semaine.', howLong).timeFrameIssue).toBeUndefined();
  });

  it('a question with no frame is never flagged', () => {
    const bare = { parts: howLong.parts, modelShort: 'Une semaine.' };
    expect(checkAnswer('Je vais rester une semaine.', bare).timeFrameIssue).toBeUndefined();
  });
});

describe('checkAnswer — no marks', () => {
  it('returns no score, mark or number-bearing field', () => {
    const c = checkAnswer("J'ai visité la vieille ville.", visited);
    expect(Object.keys(c).sort()).toEqual(['complete', 'heard', 'modelShort', 'parts', 'partsCovered', 'partsMissing', 'tip'].sort());
  });

  it('never puts a digit in a tip', () => {
    for (const t of ['', 'Je ne sais pas.', "J'ai visité la vieille ville.", 'Je vais visiter le musée, ça va être beau.']) {
      expect(checkAnswer(t, visited).tip ?? '').not.toMatch(/\d/);
    }
  });

  it('is pure: the same input gives the same output', () => {
    expect(checkAnswer('Une semaine.', howLong)).toEqual(checkAnswer('Une semaine.', howLong));
  });
});
