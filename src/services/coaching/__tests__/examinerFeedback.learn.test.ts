import { describe, it, expect } from 'vitest';
import { parseAndGroundExaminerFeedback, type ExaminerParseInput, type LearnExaminerFeedback } from '../examinerFeedback';

const TRANSCRIPT =
  "Le weekend je joue au football avec mes amis parce que j'aime le sport. Hier j'ai mange une pizza et je suis alle au cinema.";

const spoken: ExaminerParseInput = { transcript: TRANSCRIPT, turnKind: 'topic', inputMode: 'speech' };

const STRENGTH = { claim: 'You gave a reason with "parce que", which makes the answer fuller.', quote: "parce que j'aime le sport" };
const ERROR = { quote: "j'ai mange une pizza", correction: "j'ai mangé une pizza", category: 'auxiliary' };
const NEXT = {
  claim: 'Add a second reason for one of your opinions to make the answer richer.',
  quote: 'je joue au football avec mes amis',
  descriptorId: 'C3',
};

function learn(raw: unknown, input = spoken): LearnExaminerFeedback {
  const r = parseAndGroundExaminerFeedback(raw, 'learn', input);
  expect(r).not.toBeNull();
  expect(r!.profile).toBe('learn');
  return r as LearnExaminerFeedback;
}

describe('learn profile — parseAndGroundExaminerFeedback', () => {
  it('parses a full, grounded reply', () => {
    const r = learn({ strengths: [STRENGTH], errors: [ERROR], nextStep: NEXT });
    expect(r.strengths).toEqual([STRENGTH]);
    expect(r.errors).toEqual([{ ...ERROR, category: 'auxiliary' }]);
    expect(r.nextStep).toEqual(NEXT);
  });

  it('accepts a next step with no quote', () => {
    const r = learn({ strengths: [], errors: [], nextStep: { claim: 'Try opening with your opinion.', quote: null, descriptorId: 'C1' } });
    expect(r.nextStep).toEqual({ claim: 'Try opening with your opinion.', quote: null, descriptorId: 'C1' });
  });

  it('drops ungrounded and too-short quotes', () => {
    const r = learn({
      strengths: [
        STRENGTH,
        { claim: 'Invented.', quote: 'ceci ne figure pas ici du tout' },
        { claim: 'Too short a quote.', quote: 'je joue' },
      ],
      errors: [
        ERROR,
        { quote: 'faux', correction: 'faux', category: 'other' },
        { quote: 'jamais dit ça', correction: "jamais dit ça", category: 'other' },
        { quote: 'je', correction: 'tu', category: 'other' },
      ],
      nextStep: NEXT,
    });
    expect(r.strengths).toHaveLength(1);
    expect(r.errors).toHaveLength(1);
  });

  it('caps strengths at 3', () => {
    const quotes = ['je joue au football', 'avec mes amis parce que', "j'aime le sport", 'une pizza et je suis'];
    const r = learn({
      strengths: quotes.map((q, i) => ({ claim: `Specific point ${i}.`, quote: q })),
      errors: [],
      nextStep: NEXT,
    });
    expect(r.strengths).toHaveLength(3);
  });

  it('drops a claim with mark or band language, never rewriting it', () => {
    const r = learn({
      strengths: [
        { claim: 'This would be a good mark for range.', quote: "parce que j'aime le sport" },
        STRENGTH,
      ],
      errors: [],
      nextStep: { claim: 'Aim for a higher band by adding detail.', quote: null, descriptorId: 'C3' },
    });
    expect(r.strengths).toEqual([STRENGTH]);
    expect(r.nextStep).toBeNull();
  });

  it('drops a claim that copies a canonical descriptor (whole short bullet or 8-word run)', () => {
    const r = learn({
      strengths: [
        { claim: 'Accurate use of a wide range of vocabulary, well done.', quote: "parce que j'aime le sport" },
        { claim: 'Justifies and explains some answers.', quote: 'je joue au football avec' },
        STRENGTH,
      ],
      errors: [],
      nextStep: NEXT,
    });
    expect(r.strengths).toEqual([STRENGTH]);
  });

  it('drops a strength whose quote overlaps a reported error', () => {
    const r = learn({
      strengths: [{ claim: 'A nicely connected past event.', quote: "j'ai mange une pizza et" }, STRENGTH],
      errors: [ERROR],
      nextStep: NEXT,
    });
    expect(r.strengths).toEqual([STRENGTH]);
  });

  it('keeps a strength that overlaps an error that was itself dropped', () => {
    const r = learn({
      strengths: [{ claim: 'A nicely connected past event.', quote: "j'ai mange une pizza et" }],
      errors: [{ quote: 'une pizza', correction: 'une pizza', category: 'other' }],
      nextStep: NEXT,
    });
    expect(r.strengths).toHaveLength(1);
  });

  it('drops a next step whose descriptor id is not on the list, or whose quote is ungrounded', () => {
    const unknownId = learn({ strengths: [STRENGTH], errors: [], nextStep: { ...NEXT, descriptorId: 'Z9' } });
    expect(unknownId.nextStep).toBeNull();
    const badQuote = learn({ strengths: [STRENGTH], errors: [], nextStep: { ...NEXT, quote: 'pas dans la réponse' } });
    expect(badQuote.nextStep).toBeNull();
  });

  it('coerces an unknown category to other and reports a duplicate quote once', () => {
    const r = learn({
      strengths: [],
      errors: [{ ...ERROR, category: 'made-up' }, { ...ERROR, correction: "j'ai mangé une pizza." }],
      nextStep: NEXT,
    });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].category).toBe('other');
  });

  it('spoken: sound-alike-only errors are dropped; an audible final é is kept', () => {
    const t = "Il y a beaucoup de chose a la maison et j'ai mange hier soir.";
    const input: ExaminerParseInput = { transcript: t, turnKind: 'topic', inputMode: 'speech' };
    const raw = {
      strengths: [],
      errors: [
        { quote: 'beaucoup de chose', correction: 'beaucoup de choses', category: 'agreement' },
        { quote: 'chose a la maison', correction: 'chose à la maison', category: 'preposition' },
        { quote: "j'ai mange hier", correction: "j'ai mangé hier", category: 'verb_form' },
      ],
      nextStep: { claim: 'Add one more detail about the house.', quote: null, descriptorId: 'V2' },
    };
    const spokenResult = learn(raw, input);
    expect(spokenResult.errors.map((e) => e.correction)).toEqual(["j'ai mangé hier"]);
    const typedResult = learn(raw, { ...input, inputMode: 'text' });
    expect(typedResult.errors).toHaveLength(3);
  });

  it('typed: keeps the sound-alike errors the spoken filter drops', () => {
    const raw = { strengths: [], errors: [{ quote: 'une chose', correction: 'une choses', category: 'agreement' }], nextStep: NEXT };
    const t = { transcript: 'Il y a une chose ici et je joue au football avec mes amis.', turnKind: 'topic' as const };
    expect(learn(raw, { ...t, inputMode: 'text' }).errors).toHaveLength(1);
    expect(learn(raw, { ...t, inputMode: 'speech' }).errors).toHaveLength(0);
  });

  it('an unknown input mode is treated as speech', () => {
    const t = { transcript: 'Il y a beaucoup de chose ici et je joue au football.', turnKind: 'topic' as const };
    const raw = { strengths: [], errors: [{ quote: 'beaucoup de chose', correction: 'beaucoup de choses', category: 'agreement' }], nextStep: NEXT };
    expect(learn(raw, t).errors).toHaveLength(0);
  });

  it('returns null (retry) for malformed, empty, or entirely ungrounded replies', () => {
    expect(parseAndGroundExaminerFeedback(null, 'learn', spoken)).toBeNull();
    expect(parseAndGroundExaminerFeedback('x', 'learn', spoken)).toBeNull();
    expect(parseAndGroundExaminerFeedback({ currentDescriptorCommentary: [] }, 'learn', spoken)).toBeNull();
    expect(parseAndGroundExaminerFeedback({ strengths: [], errors: [], nextStep: null }, 'learn', spoken)).toBeNull();
    expect(
      parseAndGroundExaminerFeedback(
        { strengths: [{ claim: 'x', quote: 'rien de tout cela' }], errors: [], nextStep: null },
        'learn',
        spoken,
      ),
    ).toBeNull();
  });

  it('a grounded reply whose items are all filtered out is an honest empty result, not a retry', () => {
    const r = learn({
      strengths: [{ claim: 'Worth a high mark.', quote: "parce que j'aime le sport" }],
      errors: [],
      nextStep: null,
    });
    expect(r).toEqual({ profile: 'learn', strengths: [], errors: [], nextStep: null });
  });

  it('typed output has no numeric field', () => {
    const r = learn({ strengths: [STRENGTH], errors: [ERROR], nextStep: NEXT });
    const walk = (v: unknown): void => {
      expect(typeof v).not.toBe('number');
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    };
    walk(r);
  });
});
